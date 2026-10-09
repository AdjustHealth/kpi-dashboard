import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { requireSection, getAccessContext } from "@/lib/auth/access";
import { firstNameFromEmail } from "@/lib/userDisplay";
import { Provider } from "@/lib/types";
import { TRAINING_GROUPS, providersInTrainingGroup, initialsForProvider, TrainingGroupId } from "@/lib/trainingGroup";
import { getTrainingTopics, getCompletionsForTopics, groupTopicsByCategory } from "@/lib/trainingData";
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
  const groupProviders = providersInTrainingGroup(allProviders, groupId);
  const rowProviders: TopicRowProvider[] = groupProviders.map((p) => ({ id: p.id, initials: initialsForProvider(p.name), name: p.name }));

  const completions = await getCompletionsForTopics(topics.map((t) => t.id));
  const completionsByTopic = new Map<string, Record<string, { completed_at: string; marked_by: string | null }>>();
  for (const c of completions) {
    if (!completionsByTopic.has(c.topic_id)) completionsByTopic.set(c.topic_id, {});
    completionsByTopic.get(c.topic_id)![c.provider_id] = { completed_at: c.completed_at, marked_by: c.marked_by };
  }

  const totalAssignments = topics.length * groupProviders.length;
  const completeAssignments = completions.length;
  const pct = totalAssignments > 0 ? Math.round((completeAssignments / totalAssignments) * 100) : null;

  const directorName = firstNameFromEmail(userData.user?.email) ?? "A director";
  const categories = groupTopicsByCategory(topics);

  return (
    <>
      <PageHeader title={group.label} subtitle={`${topics.length} topic${topics.length === 1 ? "" : "s"} · ${groupProviders.length} staff`} showWeekSelector={false} backTo="history" />
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

        {groupProviders.length === 0 || topics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            {topics.length === 0 ? `No topics in ${group.label} yet.` : `No active staff currently in ${group.label}.`}
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
