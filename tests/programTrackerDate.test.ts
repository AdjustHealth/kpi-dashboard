import { describe, expect, it } from "vitest";
import { calcDueStatus, holdEndOf } from "@/lib/programTracker/date";

describe("calcDueStatus", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const daysFromNow = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return iso(d);
  };
  // "This week" is Monday-Sunday, so how many days out Sunday falls varies
  // by which day the suite happens to run on — computed here the same way
  // calcDueStatus itself does, rather than a fixed offset, so these tests
  // are correct on every day of the week (including Sunday, where today
  // itself is the last day of the current week).
  const day = today.getDay();
  const daysToSunday = day === 0 ? 0 : 7 - day;

  it("is empty when there's no next_due and not on hold", () => {
    expect(calcDueStatus(null, "Active", null)).toBe("");
  });

  it("is OVERDUE when next_due is in the past", () => {
    expect(calcDueStatus(daysFromNow(-1), "Active", null)).toBe("OVERDUE");
  });

  it("is Due this week for today through the end of this Monday-Sunday week", () => {
    expect(calcDueStatus(daysFromNow(0), "Active", null)).toBe("Due this week");
    expect(calcDueStatus(daysFromNow(daysToSunday), "Active", null)).toBe("Due this week");
  });

  it("is Upcoming once next_due falls into next week", () => {
    expect(calcDueStatus(daysFromNow(daysToSunday + 1), "Active", null)).toBe("Upcoming");
  });

  it("On hold with no hold_end is just On hold", () => {
    expect(calcDueStatus(null, "Hold", null)).toBe("On hold");
  });

  it("Hold overdue once the hold's end date has passed", () => {
    expect(calcDueStatus(null, "Hold", daysFromNow(-1))).toBe("Hold overdue");
  });

  it("Hold ending soon through the end of this Monday-Sunday week", () => {
    expect(calcDueStatus(null, "Hold", daysFromNow(daysToSunday))).toBe("Hold ending soon");
  });

  it("On hold when the hold's end date falls into next week", () => {
    expect(calcDueStatus(null, "Hold", daysFromNow(daysToSunday + 1))).toBe("On hold");
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
