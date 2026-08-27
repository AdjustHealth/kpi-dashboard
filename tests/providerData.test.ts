import { describe, expect, it } from "vitest";
import { retentionPct } from "@/lib/providerData";

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
