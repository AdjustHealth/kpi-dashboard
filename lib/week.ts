/** Weeks are keyed by their "week ending" date (YYYY-MM-DD), matching Nookal reporting convention. */

export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Most recent Sunday on or before `from` (defaults to today). */
export function defaultWeekEnding(from: Date = new Date()): string {
  const d = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() - day);
  return toDateKey(d);
}

export function shiftWeek(weekEnding: string, deltaWeeks: number): string {
  const d = new Date(`${weekEnding}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaWeeks * 7);
  return toDateKey(d);
}

export function formatWeekLabel(weekEnding: string): string {
  const d = new Date(`${weekEnding}T00:00:00Z`);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
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
