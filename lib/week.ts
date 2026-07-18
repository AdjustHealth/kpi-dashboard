/**
 * Weeks are keyed by their "week ending" date (YYYY-MM-DD). The practice's
 * own week runs Sunday-through-Saturday — confirmed directly against the
 * director's KPI spreadsheet ("WEEK ENDING" cell reads a Saturday date,
 * e.g. 11/07/2026, for the week whose Nookal reports span Mon 06/07 -
 * Sun 12/07) — NOT the calendar week (Mon-Sun ending Sunday) Nookal's own
 * report date ranges suggest at a glance.
 */

export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Most recent Saturday on or before `from` (defaults to today). */
export function defaultWeekEnding(from: Date = new Date()): string {
  const d = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  const day = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  d.setUTCDate(d.getUTCDate() - ((day + 1) % 7));
  return toDateKey(d);
}

export function shiftWeek(weekEnding: string, deltaWeeks: number): string {
  const d = new Date(`${weekEnding}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7);
  return toDateKey(d);
}

/** Numeric DD/MM/YYYY, matching the director's spreadsheet (e.g. "11/07/2026"). */
export function formatWeekLabel(weekEnding: string): string {
  const d = new Date(`${weekEnding}T00:00:00Z`);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Last `count` week-ending dates, oldest first, ending at `weekEnding`. */
export function recentWeeks(weekEnding: string, count: number): string[] {
  const weeks: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    weeks.push(shiftWeek(weekEnding, -i));
  }
  return weeks;
}

/** Whole weeks between two week-ending dates (rounded). */
export function weeksBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / (7 * 24 * 60 * 60 * 1000));
}

/** First week-ending (Saturday) on or after `dateStr` — dateStr isn't necessarily a Saturday itself. */
function firstWeekEndingOnOrAfter(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  d.setUTCDate(d.getUTCDate() + ((6 - day + 7) % 7));
  return toDateKey(d);
}

/** When this KPI system's tracking starts for every provider, admin, and clinic page — nothing before this week is meaningful history. */
export const TRACKING_START_WEEK = "2026-07-01";
export const TRACKING_START_WEEK_ENDING = firstWeekEndingOnOrAfter(TRACKING_START_WEEK);

/**
 * How many weeks of history to fetch to cover TRACKING_START_WEEK_ENDING through `week`.
 * Never goes earlier than TRACKING_START_WEEK_ENDING (this system's rollout date) —
 * capped at `max` so a far-future week doesn't trigger an unbounded query. Both
 * dates are Saturdays, so weeksBetween is exact here (no rounding drift).
 */
export function trackingHistoryWeeks(week: string, max = 52): number {
  return Math.min(max, Math.max(1, weeksBetween(TRACKING_START_WEEK_ENDING, week) + 1));
}

/**
 * Clinic-wide (weekly_kpis) data has real backfilled history going back to
 * January 2026 — much further than the per-provider system's July 2026
 * rollout, since provider_weekly was never backfilled. Clinic-wide-only
 * pages (Dashboard, Clinic Health, Specialty Services, Revenue) use this
 * longer window so their trend charts read as an actual timeline instead of
 * 1-2 points; provider/admin/senior pages keep the shorter window above.
 */
export const CLINIC_HISTORY_START_WEEK = "2026-01-01";
export const CLINIC_HISTORY_START_WEEK_ENDING = firstWeekEndingOnOrAfter(CLINIC_HISTORY_START_WEEK);

export function clinicHistoryWeeks(week: string, max = 52): number {
  return Math.min(max, Math.max(1, weeksBetween(CLINIC_HISTORY_START_WEEK_ENDING, week) + 1));
}
