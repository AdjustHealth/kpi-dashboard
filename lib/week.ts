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

/**
 * Today's calendar date in the clinic's own timezone (Brisbane — AEST,
 * UTC+10 year-round, no daylight saving) rather than the server's. Next.js
 * server code runs on Vercel in UTC, which trails Brisbane by a full
 * calendar day for part of every Australian business day — `new Date()`
 * on the server can report "yesterday" well into the clinic's morning.
 * Every server-side "what day is it" default in this app needs to agree
 * with the clinic's actual wall clock, not the server's, so this is the
 * one place that conversion happens — everything else here keeps using
 * plain UTC date math on the Y/M/D this returns, unchanged.
 */
export function todayInClinicTz(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  return new Date(y, m - 1, d);
}

/** Most recent Saturday on or before `from` (defaults to today, in the clinic's own timezone). */
export function defaultWeekEnding(from: Date = todayInClinicTz()): string {
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
 * capped at `max` (default 8, a fixed ~2-month trailing window so trend charts show a
 * real trend without stretching further right as more weeks accumulate — pass an
 * explicit `max` when a calculation genuinely needs the full history, e.g. a senior
 * physio's cumulative turnover pacing since they started the role). Both dates are
 * Saturdays, so weeksBetween is exact here (no rounding drift).
 */
export function trackingHistoryWeeks(week: string, max = 8): number {
  return Math.min(max, Math.max(1, weeksBetween(TRACKING_START_WEEK_ENDING, week) + 1));
}

/**
 * Clinic-wide (weekly_kpis) data has real backfilled history going back to
 * January 2026 — much further than the per-provider system's July 2026
 * rollout, since provider_weekly was never backfilled. Clinic-wide-only
 * pages (Dashboard, Clinic Health, Specialty Services, Revenue) can reach
 * back that far when an explicit `max` is passed, but default to the same
 * fixed 8-week trailing window as trackingHistoryWeeks so every chart shows
 * a consistent, unstretched recent timeline rather than growing wider (and
 * squeezing the recent weeks over to the right) as more history accumulates.
 */
export const CLINIC_HISTORY_START_WEEK = "2026-01-01";
export const CLINIC_HISTORY_START_WEEK_ENDING = firstWeekEndingOnOrAfter(CLINIC_HISTORY_START_WEEK);

export function clinicHistoryWeeks(week: string, max = 8): number {
  return Math.min(max, Math.max(1, weeksBetween(CLINIC_HISTORY_START_WEEK_ENDING, week) + 1));
}

/**
 * The week_ending (Saturday) of the week containing 1 July of the
 * Australian financial year `week` falls in — e.g. for any week in
 * Jul 2026-Jun 2027, this returns the week ending shortly after 1 Jul 2026.
 * Clamped to CLINIC_HISTORY_START_WEEK_ENDING since nothing before that
 * has real weekly_kpis data. Used for YTD-style cumulative figures (e.g.
 * Podiatry YTD Revenue) that need the whole financial year to date, not a
 * fixed trailing window.
 */
export function financialYearStartWeekEnding(week: string): string {
  const d = new Date(`${week}T00:00:00Z`);
  const fyStartYear = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; // FY starts 1 July (month 6, 0-indexed)
  const fyStart = firstWeekEndingOnOrAfter(`${fyStartYear}-07-01`);
  return fyStart > CLINIC_HISTORY_START_WEEK_ENDING ? fyStart : CLINIC_HISTORY_START_WEEK_ENDING;
}

/** How many weeks of history to fetch to cover the current Australian financial year to date through `week` — uncapped, unlike clinicHistoryWeeks/trackingHistoryWeeks, since a YTD sum needs the whole year so far, not a fixed trailing window. */
export function financialYearToDateWeeks(week: string): number {
  return Math.max(1, weeksBetween(financialYearStartWeekEnding(week), week) + 1);
}
