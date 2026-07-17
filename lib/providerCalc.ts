/**
 * Provider bonus / turnover-pacing engine.
 *
 * Derived from the Adjust Health senior-physio meeting spreadsheet
 * (Sam Johnson / Marcio dos Santos sheets). The three calculations below —
 * weekly base target, cumulative turnover, and turnover pacing % — are
 * verified against that sheet's real numbers in
 * tests/providerCalc.test.ts (Sam week 1-2: pacing 101.3% at week 2).
 *
 * The sheet's "Bonus" and "T1-T4" columns could not be reverse-engineered
 * with confidence from the rendered values alone (no access to the
 * underlying formulas), so this module does NOT compute a "tier reached"
 * verdict — that would risk silently misrepresenting numbers tied to staff
 * bonus pay. Instead, T1-T4 thresholds are surfaced as configured targets
 * (providers.targets.bonus_tiers) for the directors to compare against the
 * specialty metric themselves. Confirm the exact bonus formula with the
 * business before automating it.
 */

export interface BonusTiers {
  t1?: number;
  t2?: number;
  t3?: number;
  t4?: number;
}

export interface ProviderTargets {
  annual_turnover_target?: number;
  working_weeks?: number;
  bonus_tiers?: BonusTiers;
  [key: string]: unknown;
}

/** Weekly slice of the base annual target (annual_turnover_target / working_weeks). */
export function weeklyBaseTarget(targets: ProviderTargets): number | null {
  const { annual_turnover_target, working_weeks } = targets;
  if (!annual_turnover_target || !working_weeks) return null;
  return annual_turnover_target / working_weeks;
}

/** Running cumulative sum of weekly turnover, oldest first (missing weeks contribute 0). */
export function cumulativeTurnoverSeries(weeklyTurnover: (number | null)[]): number[] {
  let running = 0;
  return weeklyTurnover.map((v) => {
    running += v ?? 0;
    return running;
  });
}

/** Cumulative base target line: weeklyBaseTarget * week number (1-indexed), oldest first. */
export function baseTargetSeries(targets: ProviderTargets, weekCount: number): (number | null)[] {
  const base = weeklyBaseTarget(targets);
  return Array.from({ length: weekCount }, (_, i) => (base === null ? null : base * (i + 1)));
}

/** Cumulative turnover as a % of the cumulative base target for that week. */
export function turnoverPacingPct(cumulativeTurnover: number, baseTarget: number | null): number | null {
  if (baseTarget === null || baseTarget === 0) return null;
  return (cumulativeTurnover / baseTarget) * 100;
}

/**
 * Compounding trend line seeded at `seed`, growing by `weeklyGrowthRate`
 * each week, rounded to 2dp at every step (matches the sheet's "JBV Trend"
 * column, which compounds on its own previous rounded value rather than on
 * the unrounded exponential — verified against Sam's week 1-5 values).
 */
export function compoundingTrendSeries(
  seed: number,
  weeklyGrowthRate: number,
  weekCount: number
): number[] {
  const series: number[] = [];
  let value = seed;
  for (let i = 0; i < weekCount; i++) {
    if (i === 0) {
      value = round2(seed);
    } else {
      value = round2(value * (1 + weeklyGrowthRate));
    }
    series.push(value);
  }
  return series;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface SpecialtyMetricLike {
  key: string;
  type: string;
  source?: "manual" | "calc";
}

/**
 * A provider's "calc"-source specialty metric (e.g. Marcio's Headache Total)
 * is the sum of that provider's manual number/currency specialty metrics
 * (e.g. Headache Init + Headache Sub). Percent-type metrics are never
 * summed. Returns { [calcKey]: total } for every calc metric found.
 */
export function computeSpecialtyCalcMetrics(
  specialtyMetrics: SpecialtyMetricLike[],
  values: Record<string, unknown>
): Record<string, number> {
  const manualSum = specialtyMetrics
    .filter((m) => m.source !== "calc" && (m.type === "number" || m.type === "currency"))
    .reduce((sum, m) => {
      const v = values[m.key];
      return sum + (typeof v === "number" ? v : 0);
    }, 0);

  const result: Record<string, number> = {};
  for (const m of specialtyMetrics) {
    if (m.source === "calc") result[m.key] = manualSum;
  }
  return result;
}
