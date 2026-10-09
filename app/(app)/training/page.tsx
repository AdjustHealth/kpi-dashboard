import Link from "next/link";
import { PageHeader } from "@/components/nav/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { Provider } from "@/lib/types";
import { TRAINING_GROUPS, TrainingGroupId, isExcludedFromTraining } from "@/lib/trainingGroup";
import { TrainingTopic, TrainingCompletion, rosterForTrainingGroup } from "@/lib/trainingData";
import { requireSection } from "@/lib/auth/access";

export default async function ClinicalTrainingPage() {
  await requireSection("team");
  const supabase = await createClient();
  const [providersResult, topicsResult] = await Promise.all([
    supabase.from("providers").select("*").eq("active", true).order("sort_order"),
    supabase.from("training_topics").select("*"),
  ]);
  const providers = (providersResult.data ?? []) as Provider[];
  const topics = (topicsResult.data ?? []) as TrainingTopic[];

  const topicIds = topics.map((t) => t.id);
  const { data: completionsData } = topicIds.length ? await supabase.from("training_completions").select("*").in("topic_id", topicIds) : { data: [] };
  // Excludes anyone in lib/trainingGroup.ts's EXCLUDED_TRAINING_FIRST_NAMES (Michael) up
  // front, so a stray completion for him can't appear in a count without him ever
  // appearing in the roster that count's denominator is built from.
  const excludedProviderIds = new Set(providers.filter((p) => isExcludedFromTraining(p.name)).map((p) => p.id));
  const completions = ((completionsData ?? []) as TrainingCompletion[]).filter((c) => !excludedProviderIds.has(c.provider_id));

  const topicsByGroup = new Map<TrainingGroupId, TrainingTopic[]>();
  for (const t of topics) topicsByGroup.set(t.training_group, [...(topicsByGroup.get(t.training_group) ?? []), t]);

  // Roster (not just currently-in-group providers) for both the count shown
  // and the stat math — otherwise a group whose team has mostly moved on
  // (New Graduates, almost by definition) would either undercount everyone
  // who's actually finished it, or — if completions for people no longer in
  // the group were counted without widening the roster too — run over 100%.
  // See lib/trainingData.ts's rosterForTrainingGroup.
  const groupStats = TRAINING_GROUPS.map((group) => {
    const groupTopics = topicsByGroup.get(group.id) ?? [];
    const groupTopicIds = new Set(groupTopics.map((t) => t.id));
    const groupCompletions = completions.filter((c) => groupTopicIds.has(c.topic_id));
    const roster = rosterForTrainingGroup(group.id, providers, groupCompletions);
    const totalAssignments = groupTopics.length * roster.length;
    const completeAssignments = groupCompletions.length;
    const pct = totalAssignments > 0 ? Math.round((completeAssignments / totalAssignments) * 100) : null;
    return { group, topicCount: groupTopics.length, providerCount: roster.length, pct };
  });

  const totalTopics = topics.length;
  const totalAssignmentsAll = groupStats.reduce((sum, g) => sum + g.topicCount * g.providerCount, 0);
  const totalCompleteAll = completions.filter((c) => topicIds.includes(c.topic_id)).length;
  const overallPct = totalAssignmentsAll > 0 ? Math.round((totalCompleteAll / totalAssignmentsAll) * 100) : null;

  return (
    <>
      <PageHeader
        title="Clinical Training"
        subtitle="Every clinical topic the team works through, grouped by experience and discipline."
        showWeekSelector={false}
        actions={
          <Link href="/training/me" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-accent">
            My Training
          </Link>
        }
      />
      <div className="flex flex-col gap-8 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Topics</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{totalTopics}</div>
            <div className="mt-1 text-xs text-muted">across {TRAINING_GROUPS.length} groups</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Team completion</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{overallPct === null ? "—" : `${overallPct}%`}</div>
            <div className="mt-1 text-xs text-muted">weighted across all staff</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Not started</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{totalAssignmentsAll - totalCompleteAll}</div>
            <div className="mt-1 text-xs text-muted">topic assignments, team-wide</div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Groups</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupStats.map(({ group, topicCount, providerCount, pct }) => (
              <Link
                key={group.id}
                href={`/training/${group.id}`}
                className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-raised"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-foreground">{group.label}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {topicCount} topic{topicCount === 1 ? "" : "s"} · {providerCount} staff
                    </div>
                  </div>
                  <span aria-hidden className="text-accent">
                    →
                  </span>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted">Team completion</span>
                    <span className="font-semibold text-foreground">{pct === null ? "—" : `${pct}%`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct ?? 0}%` }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
