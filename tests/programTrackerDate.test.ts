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
  // "Due this week" runs through the coming Monday inclusive (due dates
  // land on Mondays, since blocks run in whole weeks) — how many days out
  // that Monday falls varies by which day the suite happens to run on,
  // computed here the same way calcDueStatus itself does (dueWindowEnd),
  // so these tests are correct on every day of the week, Monday included
  // (where the window still reaches all the way to the FOLLOWING Monday,
  // not today).
  const day = today.getDay();
  const daysToNextMonday = ((8 - day) % 7) || 7;

  it("is empty when there's no next_due and not on hold", () => {
    expect(calcDueStatus(null, "Active", null)).toBe("");
  });

  it("is OVERDUE when next_due is in the past", () => {
    expect(calcDueStatus(daysFromNow(-1), "Active", null)).toBe("OVERDUE");
  });

  it("is Due this week for today through the coming Monday, inclusive", () => {
    expect(calcDueStatus(daysFromNow(0), "Active", null)).toBe("Due this week");
    expect(calcDueStatus(daysFromNow(daysToNextMonday), "Active", null)).toBe("Due this week");
  });

  it("is Upcoming once next_due falls after the coming Monday", () => {
    expect(calcDueStatus(daysFromNow(daysToNextMonday + 1), "Active", null)).toBe("Upcoming");
  });

  it("On hold with no hold_end is just On hold", () => {
    expect(calcDueStatus(null, "Hold", null)).toBe("On hold");
  });

  it("Hold overdue once the hold's end date has passed", () => {
    expect(calcDueStatus(null, "Hold", daysFromNow(-1))).toBe("Hold overdue");
  });

  it("Hold ending soon through the coming Monday, inclusive", () => {
    expect(calcDueStatus(null, "Hold", daysFromNow(daysToNextMonday))).toBe("Hold ending soon");
  });

  it("On hold when the hold's end date falls after the coming Monday", () => {
    expect(calcDueStatus(null, "Hold", daysFromNow(daysToNextMonday + 1))).toBe("On hold");
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
