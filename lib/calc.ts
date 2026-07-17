/**
 * Clinic-wide derived values that don't belong in SQL.
 *
 * Pure arithmetic roll-ups (gym_total, jbv_total, total_adjust_pod_rev,
 * diary_mgmt_pct) are Postgres generated columns — see
 * supabase/migrations/0001_init.sql. Everything here is either a rollup
 * across multiple weeks (rolling average, period-over-period change) or a
 * calculation dependent on config the app knows about but SQL doesn't.
 *
 * NOTE: total_rev, total_consults, total_nc, occupancy %, and the cx_*
 * fields are currently manual entry (staff read them off Nookal reports) —
 * they will become fully automatic once Nookal report parsing ships. There
 * is no "calc_prov" business logic to replicate here yet.
 */

export interface WeeklyRow {
  week_ending: string;
  [key: string]: unknown;
}

/** Simple moving average of `field` over the trailing `windowSize` rows (nulls ignored). */
export function rollingAverage(
  rows: WeeklyRow[],
  field: string,
  windowSize: number
): (number | null)[] {
  return rows.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = rows
      .slice(start, i + 1)
      .map((r) => r[field])
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    if (window.length === 0) return null;
    return window.reduce((sum, v) => sum + v, 0) / window.length;
  });
}

/** % change of `field` between the last two rows, or null if not computable. */
export function periodOverPeriodChange(rows: WeeklyRow[], field: string): number | null {
  if (rows.length < 2) return null;
  const current = rows[rows.length - 1][field];
  const previous = rows[rows.length - 2][field];
  if (typeof current !== "number" || typeof previous !== "number" || previous === 0) {
    return null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Sum of `field` across rows (nulls treated as 0) — for cumulative-to-date figures. */
export function cumulativeSum(rows: WeeklyRow[], field: string): number {
  return rows.reduce((sum, r) => {
    const v = r[field];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
}
