import { PageHeader } from "@/components/nav/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { myProvider } from "@/lib/providerIdentity";
import { trainingGroupForProvider, trainingGroupLabel, initialsForProvider } from "@/lib/trainingGroup";
import { getAllTrainingTopics, getCompletionsForProvider, getRelevantTrainingGroups, groupTopicsByCategory } from "@/lib/trainingData";
import { TopicRow } from "@/components/training/TopicRow";

export default async function MyTrainingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { provider, error: providerLookupError } = await myProvider(user?.email);

  if (providerLookupError) {
    return (
      <>
        <PageHeader title="My Training" showWeekSelector={false} />
        <div className="p-8">
          <p className="text-sm text-danger">Could not load your training: {providerLookupError}</p>
        </div>
      </>
    );
  }

  const currentGroup = provider ? trainingGroupForProvider(provider) : null;

  if (!provider) {
    return (
      <>
        <PageHeader title="My Training" showWeekSelector={false} />
        <div className="p-8">
          <p className="text-sm text-muted">
            Couldn&apos;t match your login to a clinical training group. If this is your dashboard, let Michael know so this can be pointed at the
            right name.
          </p>
        </div>
      </>
    );
  }

  const [allTopics, completions] = await Promise.all([getAllTrainingTopics(), getCompletionsForProvider(provider.id)]);
  const completionsByTopic = new Map(completions.map((c) => [c.topic_id, { completed_at: c.completed_at, marked_by: c.marked_by }]));
  // Current group first, then any OTHER group with at least one completion in it — so moving
  // from New Grad to Associate Physio never makes unfinished (or finished) New Grad topics
  // disappear from view, it just stops being the "current" one up top. See
  // lib/trainingData.ts's getRelevantTrainingGroups for why this exists.
  const relevantGroups = getRelevantTrainingGroups(currentGroup, completions, allTopics);
  const self = [{ id: provider.id, initials: initialsForProvider(provider.name), name: provider.name }];

  if (relevantGroups.length === 0) {
    return (
      <>
        <PageHeader title="My Training" showWeekSelector={false} />
        <div className="p-8">
          <p className="text-sm text-muted">No clinical training group matched yet, and no completions on record. Let Michael know if this is wrong.</p>
        </div>
      </>
    );
  }

  const currentTopics = currentGroup ? allTopics.filter((t) => t.training_group === currentGroup) : [];
  const currentComplete = currentTopics.filter((t) => completionsByTopic.has(t.id)).length;
  const currentPct = currentTopics.length > 0 ? Math.round((currentComplete / currentTopics.length) * 100) : null;

  return (
    <>
      <PageHeader title="My Training" subtitle={currentGroup ? trainingGroupLabel(currentGroup) : undefined} showWeekSelector={false} />
      <div className="flex flex-col gap-10 p-8">
        {currentGroup && (
          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-surface p-6">
            <div
              className="relative h-24 w-24 flex-none rounded-full"
              style={{ background: `conic-gradient(var(--color-accent) 0deg ${(currentPct ?? 0) * 3.6}deg, var(--color-surface-raised) ${(currentPct ?? 0) * 3.6}deg 360deg)` }}
            >
              <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-surface">
                <div className="text-xl font-bold text-foreground">{currentPct === null ? "—" : `${currentPct}%`}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted">complete</div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-foreground">
                {currentComplete} of {currentTopics.length} {trainingGroupLabel(currentGroup)} topics complete
              </div>
              <p className="mt-1.5 text-sm text-muted">A director ticks each one off as it&apos;s run — this page is just your progress, there&apos;s nothing for you to click here.</p>
            </div>
          </div>
        )}

        {relevantGroups.map((groupId) => {
          const topics = allTopics.filter((t) => t.training_group === groupId);
          const complete = topics.filter((t) => completionsByTopic.has(t.id)).length;
          const pct = topics.length > 0 ? Math.round((complete / topics.length) * 100) : null;
          const categories = groupTopicsByCategory(topics);
          const isCurrent = groupId === currentGroup;

          return (
            <div key={groupId} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">{trainingGroupLabel(groupId)}</h2>
                  {isCurrent && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">Current</span>}
                </div>
                <span className="text-xs font-semibold text-muted">
                  {complete} of {topics.length} · {pct === null ? "—" : `${pct}%`}
                </span>
              </div>

              <div className="flex flex-col gap-6">
                {categories.map(({ category, topics: catTopics }) => (
                  <div key={category ?? "none"} className="flex flex-col gap-2.5">
                    {category && <div className="text-[11px] font-bold uppercase tracking-wide text-accent">{category}</div>}
                    {catTopics.map((topic) => (
                      <TopicRow
                        key={topic.id}
                        topicId={topic.id}
                        name={topic.name}
                        description={topic.description}
                        providers={self}
                        initialCompletions={completionsByTopic.has(topic.id) ? { [provider.id]: completionsByTopic.get(topic.id)! } : {}}
                        canEdit={false}
                        directorName=""
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
