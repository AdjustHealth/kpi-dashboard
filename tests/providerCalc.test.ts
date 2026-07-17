import { describe, expect, it } from "vitest";
import {
  baseTargetSeries,
  compoundingTrendSeries,
  computeSpecialtyCalcMetrics,
  cumulativeTurnoverSeries,
  turnoverPacingPct,
  weeklyBaseTarget,
} from "@/lib/providerCalc";

// Fixture values transcribed directly from the Adjust Health senior-physio
// meeting spreadsheet (Sam Johnson tab), weeks 1-2.
const SAM_TARGETS = { annual_turnover_target: 200000, working_weeks: 48 };
const SAM_WEEKLY_TURNOVER = [4511.25, 3933.84];

describe("providerCalc — verified against the real spreadsheet", () => {
  it("weeklyBaseTarget matches the sheet's $4,166.67", () => {
    expect(weeklyBaseTarget(SAM_TARGETS)).toBeCloseTo(4166.67, 2);
  });

  it("cumulativeTurnoverSeries matches the sheet's $4,511.25 / $8,445.09", () => {
    const series = cumulativeTurnoverSeries(SAM_WEEKLY_TURNOVER);
    expect(series[0]).toBeCloseTo(4511.25, 2);
    expect(series[1]).toBeCloseTo(8445.09, 2);
  });

  it("cumulative sum carries forward through a week with no turnover entered", () => {
    const series = cumulativeTurnoverSeries([4511.25, 3933.84, null]);
    expect(series[2]).toBeCloseTo(8445.09, 2);
  });

  it("baseTargetSeries matches the sheet's $4,166.67 / $8,333.33 / $12,500.00", () => {
    const series = baseTargetSeries(SAM_TARGETS, 3);
    expect(series[0]).toBeCloseTo(4166.67, 1);
    expect(series[1]).toBeCloseTo(8333.33, 1);
    expect(series[2]).toBeCloseTo(12500.0, 1);
  });

  it("turnoverPacingPct matches the sheet's 101.3% at week 2", () => {
    const cumTO = cumulativeTurnoverSeries(SAM_WEEKLY_TURNOVER)[1];
    const baseTgt = baseTargetSeries(SAM_TARGETS, 2)[1]!;
    expect(turnoverPacingPct(cumTO, baseTgt)).toBeCloseTo(101.3, 1);
  });

  it("compoundingTrendSeries matches the sheet's JBV trend 17.00 → 17.51 → 18.04 → 18.58 → 19.14", () => {
    const series = compoundingTrendSeries(17, 0.03, 5);
    expect(series).toEqual([17, 17.51, 18.04, 18.58, 19.14]);
  });

  it("computeSpecialtyCalcMetrics matches Marcio's Headache Total = Init + Sub", () => {
    const specialtyMetrics = [
      { key: "headache_init", type: "number", source: "manual" as const },
      { key: "headache_sub", type: "number", source: "manual" as const },
      { key: "headache_total", type: "number", source: "calc" as const },
    ];
    const result = computeSpecialtyCalcMetrics(specialtyMetrics, {
      headache_init: 2,
      headache_sub: 7,
    });
    expect(result).toEqual({ headache_total: 9 });
  });
});
