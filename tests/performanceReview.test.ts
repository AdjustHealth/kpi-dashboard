import { describe, expect, it } from "vitest";
import {
  computeKpiRollups,
  computeKpaRollups,
  reviewCadenceMonths,
  nextReviewDue,
  WeeklyRow,
} from "@/lib/performanceReview";
import { ProviderField } from "@/lib/providerSchema";

describe("computeKpiRollups", () => {
  const fields: ProviderField[] = [{ key: "fba", label: "FBA", type: "decimal" }];

  it("averages only rows within each window, excluding rows outside it", () => {
    const rows: WeeklyRow[] = [
      { week_ending: "2025-01-04", metrics: { fba: 100 }, kpas: {} }, // > 1yr before asOf, excluded from 1yr
      { week_ending: "2025-08-02", metrics: { fba: 4 }, kpas: {} },
      { week_ending: "2026-02-07", metrics: { fba: 6 }, kpas: {} },
      { week_ending: "2026-07-04", metrics: { fba: 8 }, kpas: {} },
    ];
    const asOf = "2026-07-25";
    const result = computeKpiRollups(rows, fields, asOf);
    // 6mth window (since ~2026-01-25): only 2026-02-07 and 2026-07-04 rows
    expect(result.fba["6mth"]).toBeCloseTo((6 + 8) / 2);
    // 1yr window (since ~2025-07-25): excludes the 2025-01-04 row
    expect(result.fba["1yr"]).toBeCloseTo((4 + 6 + 8) / 3);
  });

  it("returns null for a window with no data", () => {
    const result = computeKpiRollups([], fields, "2026-07-25");
    expect(result.fba["6mth"]).toBeNull();
  });
});

describe("computeKpaRollups", () => {
  const fields: ProviderField[] = [{ key: "courage", label: "Courage", type: "rating" }];

  it("weighted-averages the ratings in the window, not just the most frequent one", () => {
    const rows: WeeklyRow[] = [
      { week_ending: "2026-07-04", metrics: {}, kpas: { courage: "demonstrated" } },
      { week_ending: "2026-07-11", metrics: {}, kpas: { courage: "above_and_beyond" } },
      { week_ending: "2026-07-18", metrics: {}, kpas: { courage: "above_and_beyond" } },
    ];
    const result = computeKpaRollups(rows, fields, "2026-07-25");
    // (1 + 2 + 2) / 3 = 1.667 -> rounds to above_and_beyond
    expect(result.courage["6mth"]).toBe("above_and_beyond");
  });

  it("a real mix of ratings lands in the middle instead of wherever has a plurality (4 demonstrated + 5 above_and_beyond + 3 not_met -> demonstrated, not above_and_beyond despite it having the most individual weeks)", () => {
    const demonstrated = Array.from({ length: 4 }, (_, i) => ({
      week_ending: `2026-01-${String(i + 1).padStart(2, "0")}`,
      metrics: {},
      kpas: { courage: "demonstrated" as const },
    }));
    const aboveAndBeyond = Array.from({ length: 5 }, (_, i) => ({
      week_ending: `2026-02-${String(i + 1).padStart(2, "0")}`,
      metrics: {},
      kpas: { courage: "above_and_beyond" as const },
    }));
    const notMet = Array.from({ length: 3 }, (_, i) => ({
      week_ending: `2026-03-${String(i + 1).padStart(2, "0")}`,
      metrics: {},
      kpas: { courage: "not_met" as const },
    }));
    const result = computeKpaRollups([...demonstrated, ...aboveAndBeyond, ...notMet], fields, "2026-07-25");
    // (4*1 + 5*2 + 3*0) / 12 = 1.167 -> rounds to demonstrated
    expect(result.courage["6mth"]).toBe("demonstrated");
  });

  it("an exact tie between two tiers resolves to the lower one, not the higher — a mix shouldn't read as better than it is", () => {
    const rows: WeeklyRow[] = [
      { week_ending: "2026-07-04", metrics: {}, kpas: { courage: "not_met" } },
      { week_ending: "2026-07-11", metrics: {}, kpas: { courage: "above_and_beyond" } },
    ];
    const result = computeKpaRollups(rows, fields, "2026-07-25");
    // (0 + 2) / 2 = 1.0 exactly -> rounds DOWN to demonstrated
    expect(result.courage["6mth"]).toBe("demonstrated");
  });
});

describe("reviewCadenceMonths / nextReviewDue", () => {
  it("gives new grads a 6-month cadence and everyone else 12", () => {
    expect(reviewCadenceMonths({ role: "physio", targets: { experience_tier: "new_grad" } })).toBe(6);
    expect(reviewCadenceMonths({ role: "physio", targets: { experience_tier: "senior" } })).toBe(12);
    expect(reviewCadenceMonths({ role: "admin", targets: {} })).toBe(12);
  });

  it("nextReviewDue is null (due now) when never reviewed, else last + cadence", () => {
    expect(nextReviewDue(null, 12)).toBeNull();
    expect(nextReviewDue("2025-07-24", 6)).toBe("2026-01-24");
    expect(nextReviewDue("2025-07-24", 12)).toBe("2026-07-24");
  });
});
