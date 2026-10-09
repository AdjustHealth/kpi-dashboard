import { describe, expect, it } from "vitest";
import { trainingGroupForProvider, providersInTrainingGroup, initialsForProvider, TRAINING_GROUPS } from "@/lib/trainingGroup";
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

describe("trainingGroupForProvider", () => {
  it("buckets senior_physio, massage and ep by role alone", () => {
    expect(trainingGroupForProvider(provider({ role: "senior_physio" }))).toBe("senior_physio");
    expect(trainingGroupForProvider(provider({ role: "massage" }))).toBe("massage");
    expect(trainingGroupForProvider(provider({ role: "ep" }))).toBe("ep");
  });

  it("buckets a physio by experience_tier — new_grad stays its own group", () => {
    expect(trainingGroupForProvider(provider({ role: "physio", targets: { experience_tier: "new_grad" } }))).toBe("new_grad");
  });

  it("merges 2-5yr and senior-tier physios into the one Associate Physio group — not split into Tier 2/3 the way the director's own sheet had them", () => {
    expect(trainingGroupForProvider(provider({ role: "physio", targets: { experience_tier: "2_5yr" } }))).toBe("associate");
    expect(trainingGroupForProvider(provider({ role: "physio", targets: { experience_tier: "senior" } }))).toBe("associate");
  });

  it("returns null for a physio with no experience_tier set, and for admin", () => {
    expect(trainingGroupForProvider(provider({ role: "physio", targets: {} }))).toBeNull();
    expect(trainingGroupForProvider(provider({ role: "admin" }))).toBeNull();
  });
});

describe("providersInTrainingGroup", () => {
  it("filters a provider list down to just the one group", () => {
    const providers = [
      provider({ id: "a", role: "senior_physio" }),
      provider({ id: "b", role: "massage" }),
      provider({ id: "c", role: "physio", targets: { experience_tier: "new_grad" } }),
    ];
    expect(providersInTrainingGroup(providers, "senior_physio").map((p) => p.id)).toEqual(["a"]);
    expect(providersInTrainingGroup(providers, "new_grad").map((p) => p.id)).toEqual(["c"]);
  });
});

describe("initialsForProvider", () => {
  it("combines first and last initials for a two-part name", () => {
    expect(initialsForProvider("Sam Johnson")).toBe("SJ");
  });

  it("falls back to the first two letters for a single-word name", () => {
    expect(initialsForProvider("Dean")).toBe("DE");
  });
});

describe("TRAINING_GROUPS", () => {
  it("has exactly the 5 groups the director named, in order", () => {
    expect(TRAINING_GROUPS.map((g) => g.label)).toEqual(["New Graduates", "Associate Physio", "Senior Physio", "Exercise Physiology", "Massage Therapy"]);
  });
});
