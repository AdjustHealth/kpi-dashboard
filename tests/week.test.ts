import { describe, expect, it } from "vitest";
import {
  trackingHistoryWeeks,
  recentWeeks,
  TRACKING_START_WEEK_ENDING,
  clinicHistoryWeeks,
  CLINIC_HISTORY_START_WEEK_ENDING,
  financialYearStartWeekEnding,
  financialYearToDateWeeks,
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

  it("grows only up to the rollout floor, then holds at the default 8-week window", () => {
    expect(trackingHistoryWeeks("2026-07-04")).toBe(1);
    expect(trackingHistoryWeeks("2026-07-11")).toBe(2);
    // Charts default to a fixed trailing 8-week window (not an ever-growing
    // one) so they don't stretch further right as more weeks accumulate —
    // a page that genuinely needs the full history (e.g. a senior physio's
    // cumulative turnover pacing) passes an explicit larger `max`.
    expect(trackingHistoryWeeks("2026-09-19")).toBe(8);
  });

  it("still honours an explicit larger max, for calculations that need full history", () => {
    expect(trackingHistoryWeeks("2026-09-19", 52)).toBeGreaterThan(10);
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

  it("defaults to the same fixed 8-week window as trackingHistoryWeeks, not the full backfilled history", () => {
    expect(clinicHistoryWeeks("2026-09-19")).toBe(8);
  });

  it("can still reach much further back than trackingHistoryWeeks when an explicit max is passed", () => {
    const week = "2026-07-18";
    expect(clinicHistoryWeeks(week, 52)).toBeGreaterThan(trackingHistoryWeeks(week, 52));
  });

  it("is capped at max for far-future weeks", () => {
    expect(clinicHistoryWeeks("2030-01-01", 52)).toBe(52);
  });
});

describe("financialYearStartWeekEnding", () => {
  it("resolves to the Saturday on/after 1 July of the FY a week falls in, for a week in Jul-Jun H1", () => {
    // 1 July 2026 is a Wednesday, same as TRACKING_START_WEEK — first Saturday on/after is 4 July 2026.
    expect(financialYearStartWeekEnding("2026-10-03")).toBe("2026-07-04");
    expect(financialYearStartWeekEnding("2026-07-04")).toBe("2026-07-04");
  });

  it("uses the PREVIOUS 1 July for a week in Jan-Jun (still that same financial year)", () => {
    // A week in e.g. March falls in the FY that started the previous July —
    // but 1 July 2025 predates CLINIC_HISTORY_START_WEEK_ENDING, so it clamps.
    expect(financialYearStartWeekEnding("2026-03-07")).toBe(CLINIC_HISTORY_START_WEEK_ENDING);
  });

  it("never goes earlier than CLINIC_HISTORY_START_WEEK_ENDING, even when the real FY start predates it", () => {
    expect(financialYearStartWeekEnding("2026-01-10") >= CLINIC_HISTORY_START_WEEK_ENDING).toBe(true);
  });
});

describe("financialYearToDateWeeks", () => {
  it("is 1 for the first week of the financial year", () => {
    expect(financialYearToDateWeeks("2026-07-04")).toBe(1);
  });

  it("grows by one for every week further into the financial year", () => {
    expect(financialYearToDateWeeks("2026-07-11")).toBe(2);
    expect(financialYearToDateWeeks("2026-07-18")).toBe(3);
  });

  it("is uncapped, unlike clinicHistoryWeeks/trackingHistoryWeeks — a YTD sum needs the whole year so far", () => {
    expect(financialYearToDateWeeks("2027-06-26")).toBeGreaterThan(8);
  });
});
