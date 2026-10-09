import { describe, expect, it } from "vitest";
import { groupTopicsByCategory, getRelevantTrainingGroups, TrainingTopic, TrainingCompletion } from "@/lib/trainingData";

function topic(overrides: Partial<TrainingTopic>): TrainingTopic {
  return {
    id: "t1",
    training_group: "new_grad",
    category: null,
    name: "Topic",
    description: null,
    sort_order: 0,
    ...overrides,
  };
}

describe("groupTopicsByCategory", () => {
  it("groups topics by category in sort_order order, each category's own topics also sorted", () => {
    const topics = [
      topic({ id: "a", category: "Spine", name: "Lumbar", sort_order: 10 }),
      topic({ id: "b", category: "Upper Limb", name: "Shoulder", sort_order: 20 }),
      topic({ id: "c", category: "Spine", name: "Cervical", sort_order: 11 }),
    ];
    const grouped = groupTopicsByCategory(topics);
    expect(grouped.map((g) => g.category)).toEqual(["Spine", "Upper Limb"]);
    expect(grouped[0].topics.map((t) => t.name)).toEqual(["Lumbar", "Cervical"]);
    expect(grouped[1].topics.map((t) => t.name)).toEqual(["Shoulder"]);
  });

  it("sorts a null category (cross-cutting topics) after every named category, not by its own sort_order position", () => {
    const topics = [
      topic({ id: "a", category: null, name: "Red Flags", sort_order: 1 }),
      topic({ id: "b", category: "Spine", name: "Lumbar", sort_order: 10 }),
    ];
    const grouped = groupTopicsByCategory(topics);
    expect(grouped.map((g) => g.category)).toEqual(["Spine", null]);
  });

  it("returns an empty array for no topics", () => {
    expect(groupTopicsByCategory([])).toEqual([]);
  });
});

describe("getRelevantTrainingGroups", () => {
  function completion(topicId: string): TrainingCompletion {
    return { id: "c", topic_id: topicId, provider_id: "p", completed_at: "2026-01-01", marked_by: null, note: null };
  }
  const newGradTopic = topic({ id: "ng1", training_group: "new_grad" });
  const associateTopic = topic({ id: "as1", training_group: "associate" });
  const allTopics = [newGradTopic, associateTopic];

  it("includes the current group even with no completions yet", () => {
    expect(getRelevantTrainingGroups("new_grad", [], allTopics)).toEqual(["new_grad"]);
  });

  it("keeps a PREVIOUS group's history visible after moving on — the bug this exists to fix: a promoted New Grad's unfinished (or finished) topics must not vanish just because their current group changed", () => {
    const groups = getRelevantTrainingGroups("associate", [completion("ng1")], allTopics);
    expect(groups).toEqual(["new_grad", "associate"]);
  });

  it("orders groups by career progression (TRAINING_GROUPS order), not completion order", () => {
    const groups = getRelevantTrainingGroups("new_grad", [completion("as1")], allTopics);
    expect(groups).toEqual(["new_grad", "associate"]);
  });

  it("returns an empty array for no current group and no completions", () => {
    expect(getRelevantTrainingGroups(null, [], allTopics)).toEqual([]);
  });
});
