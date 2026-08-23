import { describe, expect, it } from "vitest";
import { linearRegression, trendlineSeries } from "@/lib/trendline";

describe("linearRegression", () => {
  it("returns null with fewer than 2 real points", () => {
    expect(linearRegression([])).toBeNull();
    expect(linearRegression([5])).toBeNull();
    expect(linearRegression([null, null, 5])).toBeNull();
  });

  it("fits a perfect upward line exactly", () => {
    const fit = linearRegression([1, 2, 3, 4, 5]);
    expect(fit?.slope).toBeCloseTo(1, 6);
    expect(fit?.intercept).toBeCloseTo(1, 6);
  });

  it("fits a perfect downward line exactly", () => {
    const fit = linearRegression([10, 8, 6, 4, 2]);
    expect(fit?.slope).toBeCloseTo(-2, 6);
  });

  it("skips nulls rather than treating them as 0", () => {
    // Same upward line as above, with gaps — slope must still be 1, not dragged toward 0.
    const fit = linearRegression([1, null, 3, null, 5]);
    expect(fit?.slope).toBeCloseTo(1, 6);
  });

  it("returns a flat line's slope as ~0", () => {
    const fit = linearRegression([5, 5, 5, 5]);
    expect(fit?.slope).toBeCloseTo(0, 6);
  });
});

describe("trendlineSeries", () => {
  it("returns null when the underlying regression can't be fit", () => {
    expect(trendlineSeries([5])).toBeNull();
  });

  it("returns a value at every index, including where the source was null", () => {
    const series = trendlineSeries([1, null, 3, null, 5]);
    expect(series).toHaveLength(5);
    expect(series?.[1]).toBeCloseTo(2, 6);
    expect(series?.[3]).toBeCloseTo(4, 6);
  });
});
