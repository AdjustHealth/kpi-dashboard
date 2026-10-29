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

/** A KPA rating that actually carries a performance signal — excludes "not_applicable", which behaves like a blank/unrated week for rollup purposes (see computeKpaRollups). */
type ScoredRating = Exclude<KpaRating, "not_applicable">;

const RATING_VALUE: Record<ScoredRating, number> = { not_met: 0, demonstrated: 1, above_and_beyond: 2 };
const VALUE_TO_RATING: ScoredRating[] = ["not_met", "demonstrated", "above_and_beyond"];

/**
 * Weighted-average rating over the window, not the modal (most frequent)
 * one — a count-based mode let a provider's worst weeks get drowned out by
 * sheer volume of middling ones (5 "demonstrated" + 4 "above and beyond" +
 * 3 "not met" used to roll up to "demonstrated" purely because it had the
 * most votes, same as if there'd been zero "not met" weeks at all). Scoring
 * the ratings 0/1/2, averaging, and rounding HALF DOWN instead means every
 * week pulls the average in its direction and a genuine mix of good and bad
 * weeks lands in the middle rather than wherever had a plurality — and a
 * rating exactly between two tiers (e.g. one "not met" + one "above and
 * beyond") resolves to the lower of the two, not the higher, on the
 * director's call that a mixed result shouldn't read as better than it is.
 */
function averageRating(ratings: ScoredRating[]): ScoredRating | null {
  if (ratings.length === 0) return null;
  const mean = ratings.reduce((sum, r) => sum + RATING_VALUE[r], 0) / ratings.length;
  const idx = Math.min(Math.max(Math.ceil(mean - 0.5), 0), VALUE_TO_RATING.length - 1);
  return VALUE_TO_RATING[idx];
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
 * Weighted-average rating for every KPA field over each rolling window —
 * see averageRating above for how a mixed set of weekly ratings resolves to
 * one representative rating.
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
        .filter(
          (v): v is ScoredRating =>
            typeof v === "string" && v !== "not_applicable" && (KPA_RATINGS as readonly string[]).includes(v)
        );
      result[field.key][window.key] = averageRating(ratings);
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
