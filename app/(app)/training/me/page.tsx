import { PageHeader } from "@/components/nav/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { myProvider } from "@/lib/providerIdentity";
import { trainingGroupForProvider, trainingGroupLabel, initialsForProvider } from "@/lib/trainingGroup";
import { getTrainingTopics, getCompletionsForProvider, groupTopicsByCategory } from "@/lib/trainingData";
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

  const group = provider ? trainingGroupForProvider(provider) : null;

  if (!provider || !group) {
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

  const [topics, completions] = await Promise.all([getTrainingTopics(group), getCompletionsForProvider(provider.id)]);
  const completionsByTopic = new Map(completions.map((c) => [c.topic_id, { completed_at: c.completed_at, marked_by: c.marked_by }]));
  const completeCount = topics.filter((t) => completionsByTopic.has(t.id)).length;
  const pct = topics.length > 0 ? Math.round((completeCount / topics.length) * 100) : null;
  const categories = groupTopicsByCategory(topics);
  const self = [{ id: provider.id, initials: initialsForProvider(provider.name), name: provider.name }];

  return (
    <>
      <PageHeader title="My Training" subtitle={trainingGroupLabel(group)} showWeekSelector={false} />
      <div className="flex flex-col gap-6 p-8">
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-surface p-6">
          <div className="relative h-24 w-24 flex-none rounded-full" style={{ background: `conic-gradient(var(--color-accent) 0deg ${(pct ?? 0) * 3.6}deg, var(--color-surface-raised) ${(pct ?? 0) * 3.6}deg 360deg)` }}>
            <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-surface">
              <div className="text-xl font-bold text-foreground">{pct === null ? "—" : `${pct}%`}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted">complete</div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-foreground">
              {completeCount} of {topics.length} topics complete
            </div>
            <p className="mt-1.5 text-sm text-muted">A director ticks each one off as it&apos;s run — this page is just your progress, there&apos;s nothing for you to click here.</p>
          </div>
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
                providers={self}
                initialCompletions={completionsByTopic.has(topic.id) ? { [provider.id]: completionsByTopic.get(topic.id)! } : {}}
                canEdit={false}
                directorName=""
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
