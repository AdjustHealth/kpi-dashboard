import { createClient } from "@/lib/supabase/server";
import { TrainingGroupId, TRAINING_GROUPS, providersInTrainingGroup, isExcludedFromTraining } from "@/lib/trainingGroup";
import { Provider } from "@/lib/types";

export interface TrainingTopic {
  id: string;
  training_group: TrainingGroupId;
  category: string | null;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface TrainingCompletion {
  id: string;
  topic_id: string;
  provider_id: string;
  completed_at: string;
  marked_by: string | null;
  note: string | null;
}

/** A topic's category, in first-seen (sort_order) order — "no category" topics (none seeded today) sort last under a null key. */
export function groupTopicsByCategory(topics: TrainingTopic[]): { category: string | null; topics: TrainingTopic[] }[] {
  const sorted = [...topics].sort((a, b) => a.sort_order - b.sort_order);
  const order: (string | null)[] = [];
  const byCategory = new Map<string | null, TrainingTopic[]>();
  for (const t of sorted) {
    if (!byCategory.has(t.category)) {
      byCategory.set(t.category, []);
      order.push(t.category);
    }
    byCategory.get(t.category)!.push(t);
  }
  // Null-category topics (cross-cutting, no single home) sort after every named category.
  order.sort((a, b) => (a === null ? 1 : 0) - (b === null ? 1 : 0));
  return order.map((category) => ({ category, topics: byCategory.get(category)! }));
}

export async function getTrainingTopics(group: TrainingGroupId): Promise<TrainingTopic[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("training_topics").select("*").eq("training_group", group).order("sort_order");
  return (data ?? []) as TrainingTopic[];
}

/** Every topic, across every group — what a personal record needs to show a provider's history in a PREVIOUS group they've since moved on from (see getRelevantTrainingGroups below), not just their current one. */
export async function getAllTrainingTopics(): Promise<TrainingTopic[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("training_topics").select("*").order("sort_order");
  return (data ?? []) as TrainingTopic[];
}

/** Every completion for a set of topic ids — fetched in one query so a group detail page doesn't round-trip per topic. */
export async function getCompletionsForTopics(topicIds: string[]): Promise<TrainingCompletion[]> {
  if (topicIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("training_completions").select("*").in("topic_id", topicIds);
  return (data ?? []) as TrainingCompletion[];
}

/** Every completion for one provider, across every group — what a personal "My Training" or cross-stream staff record page needs. */
export async function getCompletionsForProvider(providerId: string): Promise<TrainingCompletion[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("training_completions").select("*").eq("provider_id", providerId);
  return (data ?? []) as TrainingCompletion[];
}

/**
 * Which groups a provider's own "My Training" page needs to show — their
 * current group (lib/trainingGroup.ts's trainingGroupForProvider), plus any
 * OTHER group they have at least one completion in. Without this, a New
 * Grad who gets moved to Associate Physio before finishing every New Grad
 * topic would simply lose sight of what's still outstanding there — the
 * page would only ever fetch their current group's topics, so the
 * unfinished ones (and the provider's own completed ones) silently
 * disappear from their own view the moment they're reclassified. Order
 * matches TRAINING_GROUPS (career-progression order), current group first.
 */
export function getRelevantTrainingGroups(currentGroup: TrainingGroupId | null, completions: TrainingCompletion[], allTopics: TrainingTopic[]): TrainingGroupId[] {
  const topicGroupById = new Map(allTopics.map((t) => [t.id, t.training_group]));
  const groupsWithCompletions = new Set(completions.map((c) => topicGroupById.get(c.topic_id)).filter((g): g is TrainingGroupId => g !== undefined));
  if (currentGroup) groupsWithCompletions.add(currentGroup);
  return TRAINING_GROUPS.map((g) => g.id).filter((id) => groupsWithCompletions.has(id));
}

/**
 * Everyone a group's page needs to show as a column — current members (by
 * role/tier) PLUS anyone who's moved on but has at least one completion
 * recorded against one of this group's topics (e.g. every physio who's
 * ever been a New Grad, not just the 1-2 currently working through it).
 * This is the other half of getRelevantTrainingGroups' fix: that one makes
 * sure a PERSON's own page keeps showing a group they've left; this one
 * makes sure a GROUP's own page keeps showing a PERSON who's left it —
 * without it, a group's "team completion" stat silently divides completions
 * against a shrunken current-only roster and can run over 100%. Current
 * members come first (their existing sort_order), then everyone else who
 * has history here, also by sort_order. Michael (or anyone else in
 * lib/trainingGroup.ts's EXCLUDED_TRAINING_FIRST_NAMES) never appears,
 * current or historical, even if a stray completion exists for him.
 */
export function rosterForTrainingGroup(group: TrainingGroupId, allProviders: Provider[], completionsForGroupTopics: TrainingCompletion[]): Provider[] {
  const current = providersInTrainingGroup(allProviders, group);
  const currentIds = new Set(current.map((p) => p.id));
  const providerById = new Map(allProviders.map((p) => [p.id, p]));
  const historicalOnlyIds = [...new Set(completionsForGroupTopics.map((c) => c.provider_id))].filter((id) => !currentIds.has(id));
  const historicalOnly = historicalOnlyIds
    .map((id) => providerById.get(id))
    .filter((p): p is Provider => p !== undefined && !isExcludedFromTraining(p.name))
    .sort((a, b) => a.sort_order - b.sort_order);
  return [...current, ...historicalOnly];
}
