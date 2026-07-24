import { ProviderField, ProviderRole, KpaRating, KPA_RATINGS } from "@/lib/providerSchema";

export interface RollingWindow {
  key: string;
  label: string;
  months: number;
}

/** Matches the director's original sheet's 6MTH/1YR/2YR/3YR columns. */
export const ROLLING_WINDOWS: RollingWindow[] = [
  { key: "6mth", label: "6 Month", months: 6 },
  { key: "1yr", label: "1 Year", months: 12 },
  { key: "2yr", label: "2 Year", months: 24 },
  { key: "3yr", label: "3 Year", months: 36 },
];

const NUMERIC_TYPES = new Set(["number", "decimal", "currency", "percent"]);

function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Highest-rating-wins tiebreak order for the mode calculation below. */
const RATING_RANK: Record<KpaRating, number> = { not_met: 0, demonstrated: 1, above_and_beyond: 2 };

function modeRating(ratings: KpaRating[]): KpaRating | null {
  if (ratings.length === 0) return null;
  const counts = new Map<KpaRating, number>();
  for (const r of ratings) counts.set(r, (counts.get(r) ?? 0) + 1);
  let best: KpaRating | null = null;
  let bestCount = -1;
  for (const [rating, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && RATING_RANK[rating] > RATING_RANK[best])) {
      best = rating;
      bestCount = count;
    }
  }
  return best;
}

export interface WeeklyRow {
  week_ending: string;
  metrics: Record<string, unknown>;
  kpas: Record<string, unknown>;
}

export type KpiRollups = Record<string, Record<string, number | null>>;
export type KpaRollups = Record<string, Record<string, KpaRating | null>>;

/**
 * Average of every numeric KPI Scorecard field over each rolling window
 * ending at `asOf` — the automated replacement for manually averaging the
 * weekly numbers into 6mth/1yr/2yr/3yr columns.
 */
export function computeKpiRollups(rows: WeeklyRow[], fields: ProviderField[], asOf: string): KpiRollups {
  const numericFields = fields.filter((f) => NUMERIC_TYPES.has(f.type));
  const result: KpiRollups = {};
  for (const field of numericFields) {
    result[field.key] = {};
    for (const window of ROLLING_WINDOWS) {
      const start = addMonths(asOf, window.months);
      const values = rows
        .filter((r) => r.week_ending > start && r.week_ending <= asOf)
        .map((r) => r.metrics[field.key])
        .filter((v): v is number => typeof v === "number");
      result[field.key][window.key] = average(values);
    }
  }
  return result;
}

/**
 * Modal (most common) rating for every KPA field over each rolling window —
 * ratings are categorical, so "average" means the representative rating for
 * that period, not a number. Ties favour the higher rating.
 */
export function computeKpaRollups(rows: WeeklyRow[], fields: ProviderField[], asOf: string): KpaRollups {
  const result: KpaRollups = {};
  for (const field of fields) {
    result[field.key] = {};
    for (const window of ROLLING_WINDOWS) {
      const start = addMonths(asOf, window.months);
      const ratings = rows
        .filter((r) => r.week_ending > start && r.week_ending <= asOf)
        .map((r) => r.kpas[field.key])
        .filter((v): v is KpaRating => typeof v === "string" && (KPA_RATINGS as readonly string[]).includes(v));
      result[field.key][window.key] = modeRating(ratings);
    }
  }
  return result;
}

/** New grads are reviewed every 6 months; everyone else annually. */
export function reviewCadenceMonths(provider: { role: ProviderRole; targets: Record<string, unknown> | null }): number {
  return provider.targets?.experience_tier === "new_grad" ? 6 : 12;
}

/** null lastReviewDate means "never reviewed" — due now, not a future date. */
export function nextReviewDue(lastReviewDate: string | null, cadenceMonths: number): string | null {
  if (!lastReviewDate) return null;
  const d = new Date(`${lastReviewDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + cadenceMonths);
  return d.toISOString().slice(0, 10);
}
