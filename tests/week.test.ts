import { describe, expect, it } from "vitest";
import {
  trackingHistoryWeeks,
  recentWeeks,
  TRACKING_START_WEEK_ENDING,
  clinicHistoryWeeks,
  CLINIC_HISTORY_START_WEEK_ENDING,
} from "@/lib/week";

describe("trackingHistoryWeeks", () => {
  it("never includes weeks before TRACKING_START_WEEK_ENDING", () => {
    // Only 3 weeks have elapsed since rollout — must NOT pad out to a bigger window.
    const week = "2026-07-18"; // 2 weeks after the first tracked Saturday (07-04)
    const count = trackingHistoryWeeks(week);
    const weeks = recentWeeks(week, count);
    for (const w of weeks) {
      expect(w >= TRACKING_START_WEEK_ENDING).toBe(true);
    }
  });

  it("computes the first tracked week-ending as the Saturday on/after TRACKING_START_WEEK", () => {
    // TRACKING_START_WEEK is 2026-07-01 (a Wednesday) — the practice's week runs
    // Sun-Sat, so the first Saturday on/after it is 2026-07-04.
    expect(TRACKING_START_WEEK_ENDING).toBe("2026-07-04");
  });

  it("grows as more weeks elapse since rollout", () => {
    expect(trackingHistoryWeeks("2026-07-04")).toBe(1);
    expect(trackingHistoryWeeks("2026-07-11")).toBe(2);
    expect(trackingHistoryWeeks("2026-09-19")).toBeGreaterThan(10);
  });

  it("is capped at max for far-future weeks", () => {
    expect(trackingHistoryWeeks("2030-01-01", 52)).toBe(52);
  });
});

describe("clinicHistoryWeeks", () => {
  it("starts from January 2026, well before the per-provider TRACKING_START_WEEK", () => {
    expect(CLINIC_HISTORY_START_WEEK_ENDING < TRACKING_START_WEEK_ENDING).toBe(true);
    expect(CLINIC_HISTORY_START_WEEK_ENDING).toBe("2026-01-03");
  });

  it("covers far more weeks than trackingHistoryWeeks for the same current week", () => {
    const week = "2026-07-18";
    expect(clinicHistoryWeeks(week)).toBeGreaterThan(trackingHistoryWeeks(week));
  });

  it("is capped at max for far-future weeks", () => {
    expect(clinicHistoryWeeks("2030-01-01", 52)).toBe(52);
  });
});
