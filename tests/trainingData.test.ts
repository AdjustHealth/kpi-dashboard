import { describe, expect, it } from "vitest";
import { groupTopicsByCategory, TrainingTopic } from "@/lib/trainingData";

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
