import { describe, expect, it } from "vitest";
import { retentionPct, findPreviousActionNotes } from "@/lib/providerData";

describe("retentionPct", () => {
  it("derives from the raw not_rebooked/cancellations counts, not a stored percentage", () => {
    // 2 of 10 cancellations not rebooked -> 80% retained, regardless of
    // whatever stale not_rebooked_pct might also be sitting in metrics.
    expect(retentionPct({ cancellations: 10, not_rebooked: 2, not_rebooked_pct: 0.9 })).toBeCloseTo(0.8, 6);
  });

  it("a hand-corrected Not Rebooked count of 0 means 100% retention, even with a stale not_rebooked_pct left over", () => {
    // Reproduces the real mismatch: Nookal originally reported 3/10 not
    // rebooked (not_rebooked_pct=0.3), staff later hand-corrected the
    // visible Not Rebooked count down to 0 once those clients rebooked, but
    // the separately-stored not_rebooked_pct was never recomputed. Retention
    // Rate must reflect the corrected count, not the stale percentage.
    expect(retentionPct({ cancellations: 10, not_rebooked: 0, not_rebooked_pct: 0.3 })).toBe(1);
  });

  it("uses cancellations_handled as the total for admin metrics", () => {
    expect(retentionPct({ cancellations_handled: 8, not_rebooked: 1, cancellations_not_rebooked_pct: 0.5 })).toBeCloseTo(0.875, 6);
  });

  it("returns undefined when there's no cancellation total to divide by", () => {
    expect(retentionPct({ not_rebooked: 0 })).toBeUndefined();
    expect(retentionPct({ cancellations: 0, not_rebooked: 0 })).toBeUndefined();
  });

  it("returns undefined when not_rebooked itself is missing", () => {
    expect(retentionPct({ cancellations: 10 })).toBeUndefined();
  });
});

describe("findPreviousActionNotes", () => {
  it("falls back to exactly last week when it has real action content, same as before", () => {
    const rowsByWeek = new Map([
      ["2026-10-31", { meeting_notes: { action_steps: [{ id: "1", text: "Book venue", status: "open" }] } }],
    ]);
    expect(findPreviousActionNotes(rowsByWeek, "2026-11-07", 12)).toEqual({
      action_steps: [{ id: "1", text: "Book venue", status: "open" }],
    });
  });

  it("walks back past empty leave weeks to the last real meeting — the real bug: Sam's 3 weeks of leave meant last week was empty, so his Action Steps from before leave used to vanish from view even though the row was still there", () => {
    const rowsByWeek = new Map([
      // 2026-10-31, 2026-10-24, 2026-10-17 -- on leave, no meeting, nothing saved.
      ["2026-10-10", { meeting_notes: { action_plan: { turnover: [{ id: "1", text: "Chase 3 new referrals", status: "open" }] } } }],
    ]);
    expect(findPreviousActionNotes(rowsByWeek, "2026-11-07", 12)).toEqual({
      action_plan: { turnover: [{ id: "1", text: "Chase 3 new referrals", status: "open" }] },
    });
  });

  it("skips a week whose row exists but has no real action content (e.g. only KPI metrics were ever entered that week)", () => {
    const rowsByWeek = new Map([
      ["2026-10-31", { meeting_notes: { action_steps: [] } }],
      ["2026-10-24", { meeting_notes: { action_steps: [{ id: "1", text: "Follow up with Dana", status: "open" }] } }],
    ]);
    expect(findPreviousActionNotes(rowsByWeek, "2026-11-07", 12)).toEqual({
      action_steps: [{ id: "1", text: "Follow up with Dana", status: "open" }],
    });
  });

  it("gives up and returns {} once it's looked back historyWeeks without finding anything", () => {
    const rowsByWeek = new Map([["2026-08-01", { meeting_notes: { action_steps: [{ id: "1", text: "Old", status: "open" }] } }]]);
    expect(findPreviousActionNotes(rowsByWeek, "2026-11-07", 4)).toEqual({});
  });
});
