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

describe("rosterForTrainingGroup — New Grad/Associate/Senior Physio (PHYSIO_TRACK_GROUPS)", () => {
  it("includes every physio regardless of current tier — one career path, not three separate audiences", () => {
    const imogen = provider({ id: "imogen", name: "Imogen", role: "physio", sort_order: 1, targets: { experience_tier: "new_grad" } });
    const dean = provider({ id: "dean", name: "Dean", role: "physio", sort_order: 2, targets: { experience_tier: "2_5yr" } });
    const nick = provider({ id: "nick", name: "Nick", role: "physio", sort_order: 3, targets: { experience_tier: "senior" } });
    // Viewing New Grad: Dean and Nick show up even though neither is new_grad tier and
    // neither has a single New Grad completion — a New Grad needs to be visible on
    // Associate/Senior ahead of next year's promotion, and a Senior already has real
    // history on both earlier curricula, completions recorded or not.
    expect(rosterForTrainingGroup("new_grad", [imogen, dean, nick], []).map((p) => p.id)).toEqual(["imogen", "dean", "nick"]);
    expect(rosterForTrainingGroup("associate", [imogen, dean, nick], []).map((p) => p.id)).toEqual(["imogen", "dean", "nick"]);
    expect(rosterForTrainingGroup("senior_physio", [imogen, dean, nick], []).map((p) => p.id)).toEqual(["imogen", "dean", "nick"]);
  });

  it("includes senior_physio-role providers too, not just role physio", () => {
    const sam = provider({ id: "sam", name: "Sam", role: "senior_physio", sort_order: 1 });
    expect(rosterForTrainingGroup("senior_physio", [sam], []).map((p) => p.id)).toEqual(["sam"]);
  });

  it("excludes massage/ep roles — not part of the physio career path", () => {
    const erin = provider({ id: "erin", name: "Erin", role: "massage", sort_order: 1 });
    const lachie = provider({ id: "lachie", name: "Lachie", role: "ep", sort_order: 2 });
    expect(rosterForTrainingGroup("new_grad", [erin, lachie], [])).toEqual([]);
  });

  it("never includes Michael, even with a completion on record for him", () => {
    const michael = provider({ id: "michael", name: "Michael", role: "physio", targets: { experience_tier: "new_grad" } });
    expect(rosterForTrainingGroup("new_grad", [michael], [{ id: "c", topic_id: "t1", provider_id: "michael", completed_at: "2026-01-01", marked_by: null, note: null }])).toEqual([]);
  });
});

describe("rosterForTrainingGroup — EP/Massage (no career-path progression)", () => {
  function completion(providerId: string): TrainingCompletion {
    return { id: `c-${providerId}`, topic_id: "t1", provider_id: providerId, completed_at: "2026-01-01", marked_by: null, note: null };
  }

  it("includes current-role members even with no completions", () => {
    const erin = provider({ id: "erin", name: "Erin", role: "massage" });
    expect(rosterForTrainingGroup("massage", [erin], []).map((p) => p.id)).toEqual(["erin"]);
  });

  it("the bug this exists to fix: adds anyone who's changed role but has completions in it, so a group's stats don't drop people who finished it and divide against a shrunken current-only roster", () => {
    const erin = provider({ id: "erin", name: "Erin", role: "massage", sort_order: 1 });
    const jake = provider({ id: "jake", name: "Jake", role: "physio", sort_order: 2, targets: { experience_tier: "new_grad" } }); // moved on from massage
    const roster = rosterForTrainingGroup("massage", [erin, jake], [completion("jake")]);
    expect(roster.map((p) => p.id)).toEqual(["erin", "jake"]);
  });

  it("never includes Michael, current or historical, even with a completion on record for him", () => {
    const michael = provider({ id: "michael", name: "Michael", role: "massage" });
    expect(rosterForTrainingGroup("massage", [michael], [completion("michael")])).toEqual([]);
  });

  it("orders historical-only members after current ones, by sort_order", () => {
    const erin = provider({ id: "erin", name: "Erin", role: "massage", sort_order: 1 });
    const jake = provider({ id: "jake", name: "Jake", role: "ep", sort_order: 5 }); // moved on from massage
    const karly = provider({ id: "karly", name: "Karly", role: "ep", sort_order: 2 }); // moved on from massage
    const roster = rosterForTrainingGroup("massage", [erin, jake, karly], [completion("jake"), completion("karly")]);
    expect(roster.map((p) => p.id)).toEqual(["erin", "karly", "jake"]);
  });
});
