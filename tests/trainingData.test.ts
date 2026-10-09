import { describe, expect, it } from "vitest";
import { groupTopicsByCategory, getRelevantTrainingGroups, rosterForTrainingGroup, TrainingTopic, TrainingCompletion } from "@/lib/trainingData";
import { Provider } from "@/lib/types";

function provider(overrides: Partial<Provider>): Provider {
  return {
    id: "p1",
    name: "Test Provider",
    role: "physio",
    active: true,
    sort_order: 1,
    specialty_metrics: [],
    targets: {},
    goals: [],
    created_at: "",
    updated_at: "",
    ...overrides,
  } as Provider;
}

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

describe("rosterForTrainingGroup", () => {
  function completion(providerId: string): TrainingCompletion {
    return { id: `c-${providerId}`, topic_id: "t1", provider_id: providerId, completed_at: "2026-01-01", marked_by: null, note: null };
  }

  it("includes current members even with no completions", () => {
    const imogen = provider({ id: "imogen", name: "Imogen", role: "physio", targets: { experience_tier: "new_grad" } });
    expect(rosterForTrainingGroup("new_grad", [imogen], []).map((p) => p.id)).toEqual(["imogen"]);
  });

  it("the bug this exists to fix: adds anyone who's moved on from the group but has completions in it, so a group's stats don't drop people who finished it and divide against a shrunken current-only roster", () => {
    const imogen = provider({ id: "imogen", name: "Imogen", role: "physio", sort_order: 1, targets: { experience_tier: "new_grad" } });
    const dean = provider({ id: "dean", name: "Dean", role: "physio", sort_order: 2, targets: { experience_tier: "2_5yr" } }); // now Associate Physio, not New Grad
    const roster = rosterForTrainingGroup("new_grad", [imogen, dean], [completion("dean")]);
    expect(roster.map((p) => p.id)).toEqual(["imogen", "dean"]);
  });

  it("never includes Michael (or anyone else excluded from training), current or historical, even with a completion on record for him", () => {
    const michael = provider({ id: "michael", name: "Michael", role: "physio", targets: { experience_tier: "new_grad" } });
    expect(rosterForTrainingGroup("new_grad", [michael], [completion("michael")])).toEqual([]);
  });

  it("orders historical-only members after current ones, by sort_order", () => {
    const riley = provider({ id: "riley", name: "Riley", role: "physio", sort_order: 1, targets: { experience_tier: "new_grad" } });
    const wilson = provider({ id: "wilson", name: "Wilson", role: "physio", sort_order: 5, targets: { experience_tier: "senior" } });
    const dean = provider({ id: "dean", name: "Dean", role: "physio", sort_order: 2, targets: { experience_tier: "senior" } });
    const roster = rosterForTrainingGroup("new_grad", [riley, wilson, dean], [completion("wilson"), completion("dean")]);
    expect(roster.map((p) => p.id)).toEqual(["riley", "dean", "wilson"]);
  });
});
