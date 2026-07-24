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

  it("picks the modal rating in the window", () => {
    const rows: WeeklyRow[] = [
      { week_ending: "2026-07-04", metrics: {}, kpas: { courage: "demonstrated" } },
      { week_ending: "2026-07-11", metrics: {}, kpas: { courage: "above_and_beyond" } },
      { week_ending: "2026-07-18", metrics: {}, kpas: { courage: "above_and_beyond" } },
    ];
    const result = computeKpaRollups(rows, fields, "2026-07-25");
    expect(result.courage["6mth"]).toBe("above_and_beyond");
  });

  it("breaks a tie in favour of the higher rating", () => {
    const rows: WeeklyRow[] = [
      { week_ending: "2026-07-04", metrics: {}, kpas: { courage: "not_met" } },
      { week_ending: "2026-07-11", metrics: {}, kpas: { courage: "above_and_beyond" } },
    ];
    const result = computeKpaRollups(rows, fields, "2026-07-25");
    expect(result.courage["6mth"]).toBe("above_and_beyond");
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
