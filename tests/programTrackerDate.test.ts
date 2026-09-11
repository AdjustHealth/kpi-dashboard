import { describe, expect, it } from "vitest";
import { calcDueStatus, holdEndOf } from "@/lib/programTracker/date";

describe("calcDueStatus", () => {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysFromNow = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return iso(d);
  };

  it("is empty when there's no next_due and not on hold", () => {
    expect(calcDueStatus(null, "Active", null)).toBe("");
  });

  it("is OVERDUE when next_due is in the past", () => {
    expect(calcDueStatus(daysFromNow(-1), "Active", null)).toBe("OVERDUE");
  });

  it("is Due this week when next_due is within 7 days", () => {
    expect(calcDueStatus(daysFromNow(3), "Active", null)).toBe("Due this week");
    expect(calcDueStatus(daysFromNow(7), "Active", null)).toBe("Due this week");
  });

  it("is Upcoming when next_due is more than 7 days out", () => {
    expect(calcDueStatus(daysFromNow(8), "Active", null)).toBe("Upcoming");
  });

  it("On hold with no hold_end is just On hold", () => {
    expect(calcDueStatus(null, "Hold", null)).toBe("On hold");
  });

  it("Hold overdue once the hold's end date has passed", () => {
    expect(calcDueStatus(null, "Hold", daysFromNow(-1))).toBe("Hold overdue");
  });

  it("Hold ending soon within 7 days of the hold's end date", () => {
    expect(calcDueStatus(null, "Hold", daysFromNow(5))).toBe("Hold ending soon");
  });

  it("On hold when the hold's end date is more than 7 days out", () => {
    expect(calcDueStatus(null, "Hold", daysFromNow(10))).toBe("On hold");
  });
});

describe("holdEndOf", () => {
  it("adds hold_weeks onto hold_start", () => {
    expect(holdEndOf({ hold_start: "2026-01-05", hold_weeks: 2 })).toBe("2026-01-19");
  });

  it("null when either field is missing", () => {
    expect(holdEndOf({ hold_start: null, hold_weeks: 2 })).toBeNull();
    expect(holdEndOf({ hold_start: "2026-01-05", hold_weeks: null })).toBeNull();
  });
});
