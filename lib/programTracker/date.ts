/**
 * Originally ported 1:1 from adjust-programming.netlify.app's index.html so
 * a member's status here always agreed with what the standalone Program
 * Tracker site showed. That site is retired now — the Hub is the only
 * place this is tracked — so calcDueStatus below has since moved off its
 * original rolling-7-day "due this week" window onto a real Monday-Sunday
 * calendar week; everything else here (block/hold date math) is unchanged.
 */

export function localISO(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addWeeks(dateStr: string, weeks: number): string {
  const dt = new Date(dateStr + "T00:00:00");
  dt.setDate(dt.getDate() + weeks * 7);
  return localISO(dt);
}

/** The start of the NEXT block — always the coming Monday, strictly after today (even if today is itself a Monday). */
export function nextMonday(): string {
  const dt = new Date();
  dt.setHours(0, 0, 0, 0);
  const days = ((8 - dt.getDay()) % 7) || 7;
  dt.setDate(dt.getDate() + days);
  return localISO(dt);
}

/** The Wednesday of the current Mon-Sun week, whatever day it is when a meeting is created — meetings always land on the day the team actually meets. */
export function thisWednesday(): string {
  const dt = new Date();
  dt.setHours(0, 0, 0, 0);
  const day = dt.getDay();
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day) + 2);
  return localISO(dt);
}

export function holdEndOf(m: { hold_start?: string | null; hold_weeks?: number | null }): string | null {
  return m?.hold_start && m?.hold_weeks ? addWeeks(m.hold_start, m.hold_weeks) : null;
}

export type DueStatus = "" | "OVERDUE" | "Due this week" | "Upcoming" | "On hold" | "Hold overdue" | "Hold ending soon";

/** The coming Sunday (today itself, if today is a Sunday) — the end of the
 * current Monday-through-Sunday week, at midnight. */
function endOfWeek(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return d;
}

/**
 * "Due this week" means the current Monday-Sunday calendar week, not a
 * rolling 7-days-from-whenever-you-look window — so opening this on a
 * Monday shows everything due through Sunday, and it doesn't quietly go
 * near-empty by the weekend the way a rolling window does. (Previously
 * kept as a rolling window to match the standalone Program Tracker site's
 * own math 1:1 — that site is retired now the Hub is the only place this
 * is tracked, so nothing external needs to agree with this anymore.)
 */
export function calcDueStatus(nextDue: string | null, status: string | null, holdEnd: string | null): DueStatus {
  if (status === "Hold") {
    if (!holdEnd) return "On hold";
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const d = new Date(holdEnd + "T00:00:00");
    if (d < t) return "Hold overdue";
    if (d <= endOfWeek(t)) return "Hold ending soon";
    return "On hold";
  }
  if (!nextDue) return "";
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const d = new Date(nextDue + "T00:00:00");
  if (d < t) return "OVERDUE";
  if (d <= endOfWeek(t)) return "Due this week";
  return "Upcoming";
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" });
}
