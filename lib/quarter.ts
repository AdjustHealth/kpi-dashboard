/**
 * Calendar-quarter helpers (Q1 = Jan-Mar, ... Q4 = Oct-Dec), keyed by a
 * "YYYY-QN" string — used by the Quarterly Review page to bucket
 * week_ending rows into quarters and compare quarter to quarter.
 */

export interface QuarterKey {
  year: number;
  q: 1 | 2 | 3 | 4;
}

export function quarterOfWeek(weekEnding: string): QuarterKey {
  const d = new Date(`${weekEnding}T00:00:00Z`);
  const q = (Math.floor(d.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return { year: d.getUTCFullYear(), q };
}

export function quarterKeyString({ year, q }: QuarterKey): string {
  return `${year}-Q${q}`;
}

export function parseQuarterKey(key: string): QuarterKey {
  const [yearStr, qStr] = key.split("-Q");
  return { year: Number(yearStr), q: Number(qStr) as 1 | 2 | 3 | 4 };
}

export function quarterLabel(key: string): string {
  const { year, q } = parseQuarterKey(key);
  return `Q${q} ${year}`;
}

/** Inclusive [start, end] calendar-date bounds for a quarter, as YYYY-MM-DD strings. */
export function quarterDateRange({ year, q }: QuarterKey): { start: string; end: string } {
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** The quarter `delta` quarters away from `key` (negative for earlier). */
export function adjacentQuarter(key: string, delta: number): string {
  const { year, q } = parseQuarterKey(key);
  const zeroBased = year * 4 + (q - 1) + delta;
  const newYear = Math.floor(zeroBased / 4);
  const newQ = (((zeroBased % 4) + 4) % 4) + 1;
  return quarterKeyString({ year: newYear, q: newQ as 1 | 2 | 3 | 4 });
}
