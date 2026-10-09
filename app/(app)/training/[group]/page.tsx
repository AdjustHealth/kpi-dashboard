import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { requireSection, getAccessContext } from "@/lib/auth/access";
import { firstNameFromEmail } from "@/lib/userDisplay";
import { Provider } from "@/lib/types";
import { TRAINING_GROUPS, providersInTrainingGroup, initialsForProvider, isExcludedFromTraining, TrainingGroupId } from "@/lib/trainingGroup";
import { getTrainingTopics, getCompletionsForTopics, groupTopicsByCategory, rosterForTrainingGroup } from "@/lib/trainingData";
import { TopicRow, TopicRowProvider } from "@/components/training/TopicRow";
import { AddTopicForm } from "@/components/training/AddTopicForm";

export default async function TrainingGroupPage({ params }: { params: Promise<{ group: string }> }) {
  await requireSection("team");
  const { group: groupParam } = await params;
  const group = TRAINING_GROUPS.find((g) => g.id === groupParam);
  if (!group) notFound();
  const groupId = group.id as TrainingGroupId;

  const supabase = await createClient();
  const [{ data: providersData }, topics, { isDirector }, { data: userData }] = await Promise.all([
    supabase.from("providers").select("*").eq("active", true).order("sort_order"),
    getTrainingTopics(groupId),
    getAccessContext(),
    supabase.auth.getUser(),
  ]);
  const allProviders = (providersData ?? []) as Provider[];
  const currentProviders = providersInTrainingGroup(allProviders, groupId);
  const currentIds = new Set(currentProviders.map((p) => p.id));

  // Excludes anyone in EXCLUDED_TRAINING_FIRST_NAMES (Michael) up front — same
  // reasoning as the Overview page — so a stray completion for him can't
  // inflate the numerator below without him ever appearing in the roster
  // that forms its denominator.
  const excludedProviderIds = new Set(allProviders.filter((p) => isExcludedFromTraining(p.name)).map((p) => p.id));
  const completions = (await getCompletionsForTopics(topics.map((t) => t.id))).filter((c) => !excludedProviderIds.has(c.provider_id));
  const completionsByTopic = new Map<string, Record<string, { completed_at: string; marked_by: string | null }>>();
  for (const c of completions) {
    if (!completionsByTopic.has(c.topic_id)) completionsByTopic.set(c.topic_id, {});
    completionsByTopic.get(c.topic_id)![c.provider_id] = { completed_at: c.completed_at, marked_by: c.marked_by };
  }

  // The full roster is current members PLUS anyone who's moved on but has
  // history here — without the latter, the stats below would count
  // completions that don't belong to anyone shown, and could run over 100%.
  const roster = rosterForTrainingGroup(groupId, allProviders, completions);
  const rowProviders: TopicRowProvider[] = roster.map((p) => ({
    id: p.id,
    initials: initialsForProvider(p.name),
    name: currentIds.has(p.id) ? p.name : `${p.name} — no longer in this group`,
  }));

  const totalAssignments = topics.length * roster.length;
  const completeAssignments = completions.length;
  const pct = totalAssignments > 0 ? Math.round((completeAssignments / totalAssignments) * 100) : null;

  const directorName = firstNameFromEmail(userData.user?.email) ?? "A director";
  const categories = groupTopicsByCategory(topics);

  return (
    <>
      <PageHeader
        title={group.label}
        subtitle={`${topics.length} topic${topics.length === 1 ? "" : "s"} · ${currentProviders.length} current${roster.length > currentProviders.length ? `, ${roster.length - currentProviders.length} with history` : ""}`}
        showWeekSelector={false}
        backTo="history"
      />
      <div className="flex flex-col gap-6 p-8">
        <Link href="/training" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground">
          ← Clinical Training
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-xl text-xs text-muted">
            {isDirector
              ? "You tick these off as they're run, with the date it happened. Staff can't tick their own."
              : "Directors tick these off as they're run — this is a read-only view of where everyone's up to."}
          </p>
          {isDirector && <AddTopicForm trainingGroup={groupId} />}
        </div>

        {roster.length === 0 || topics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            {topics.length === 0 ? `No topics in ${group.label} yet.` : `No staff currently in ${group.label}, and no one with history here yet.`}
            {isDirector && topics.length === 0 && " Add the first one above."}
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="text-muted">Group completion</span>
                <span className="font-bold text-foreground">
                  {completeAssignments} of {totalAssignments} topic assignments complete · {pct === null ? "—" : `${pct}%`}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-raised">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct ?? 0}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <div className="flex-1">Topic</div>
              <div className="flex flex-none gap-2">
                {rowProviders.map((p) => (
                  <div key={p.id} title={p.name} className="w-7 text-center">
                    {p.initials}
                  </div>
                ))}
              </div>
              <div className="w-14 flex-none text-right">Done</div>
            </div>

            {categories.map(({ category, topics: catTopics }) => (
              <div key={category ?? "none"} className="flex flex-col gap-2.5">
                {category && <div className="text-[11px] font-bold uppercase tracking-wide text-accent">{category}</div>}
                {catTopics.map((topic) => (
                  <TopicRow
                    key={topic.id}
                    topicId={topic.id}
                    name={topic.name}
                    category={topic.category}
                    description={topic.description}
                    providers={rowProviders}
                    initialCompletions={completionsByTopic.get(topic.id) ?? {}}
                    canEdit={isDirector}
                    directorName={directorName}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
