import { describe, expect, it } from "vitest";
import { cumulativeSum, periodOverPeriodChange, rollingAverage } from "@/lib/calc";
import type { WeeklyRow } from "@/lib/calc";

const rows: WeeklyRow[] = [
  { week_ending: "2026-07-05", total_rev: 10000 },
  { week_ending: "2026-07-12", total_rev: 12000 },
  { week_ending: "2026-07-19", total_rev: 11000 },
  { week_ending: "2026-07-26", total_rev: null },
];

describe("calc", () => {
  it("rollingAverage averages the trailing window, ignoring nulls", () => {
    const avg = rollingAverage(rows, "total_rev", 2);
    expect(avg[0]).toBe(10000);
    expect(avg[1]).toBe(11000);
    expect(avg[2]).toBe(11500);
    expect(avg[3]).toBe(11000); // window is [11000, null] -> null ignored
  });

  it("periodOverPeriodChange compares the last two rows", () => {
    const change = periodOverPeriodChange(rows.slice(0, 2), "total_rev");
    expect(change).toBeCloseTo(20, 5); // 10000 -> 12000 is +20%
  });

  it("periodOverPeriodChange returns null with fewer than 2 rows", () => {
    expect(periodOverPeriodChange(rows.slice(0, 1), "total_rev")).toBeNull();
  });

  it("cumulativeSum treats missing values as 0", () => {
    expect(cumulativeSum(rows, "total_rev")).toBe(33000);
  });
});
