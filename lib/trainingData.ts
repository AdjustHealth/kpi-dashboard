import { createClient } from "@/lib/supabase/server";
import { TrainingGroupId } from "@/lib/trainingGroup";

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
