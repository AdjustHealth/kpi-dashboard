import { getClinicField } from "@/lib/schema";
import { formatValue } from "@/lib/format";
import { periodOverPeriodChange } from "@/lib/calc";
import { ClinicWeekRow, ProviderCvaSeries } from "@/lib/clinicData";
import { formatWeekLabel } from "@/lib/week";
import { CATEGORICAL } from "@/components/charts/palette";
import { CvaTier } from "@/lib/cvaTier";

export function clinicStatTile(
  history: ClinicWeekRow[],
  fieldId: string,
  goodDirection: "up" | "down" = "up",
  opts?: { target?: number | null; betterWhen?: "higher" | "lower" }
) {
  const field = getClinicField(fieldId);
  const latest = history[history.length - 1]?.[fieldId];
  const value = typeof latest === "number" ? latest : null;
  const deltaPct = periodOverPeriodChange(history as never, fieldId);

  return {
    label: field?.label ?? fieldId,
    value: formatValue(value, field?.type ?? "number", field?.decimals),
    deltaPct,
    goodDirection,
    rawValue: value,
    target: opts?.target ?? null,
    betterWhen: opts?.betterWhen,
  };
}

export function toTrendSeries(history: ClinicWeekRow[], fieldId: string) {
  return history.map((h) => ({
    week_ending: h.week_ending,
    value: typeof h[fieldId] === "number" ? (h[fieldId] as number) : null,
  }));
}

/** Groups every provider's line by CVA tier (New Grad / 2-5yr / Senior / Massage / EP) instead of one colour per person — same tier, same colour. */
const TIER_COLOR_INDEX: Record<CvaTier, number> = {
  new_grad: 1, // green
  "2_5yr": 6, // violet
  senior: 0, // blue
  massage: 2, // magenta
  ep: 5, // orange
};
const FALLBACK_COLOR_INDEX = 7; // red — only hit if a provider has no tier set yet

/** Pivots one series per provider into MultiLineChart's wide row shape — every provider as its own line on one chart, to compare them directly. Colour is grouped by tier, not one hue per person. */
export function providerSeriesToWideRows(series: ProviderCvaSeries[]): {
  rows: Record<string, unknown>[];
  keys: string[];
  colors: string[];
} {
  if (series.length === 0) return { rows: [], keys: [], colors: [] };
  const weeks = series[0].points.map((p) => p.week_ending);
  const rows = weeks.map((w, i) => {
    const row: Record<string, unknown> = { label: formatWeekLabel(w) };
    for (const s of series) row[s.providerName] = s.points[i]?.value ?? null;
    return row;
  });
  const colors = series.map((s) => CATEGORICAL[(s.tier ? TIER_COLOR_INDEX[s.tier] : FALLBACK_COLOR_INDEX) % CATEGORICAL.length]);
  return { rows, keys: series.map((s) => s.providerName), colors };
}

/** Same tier-colour grouping as providerSeriesToWideRows, exposed for other chart types (e.g. RankedBarChart). */
export function tierColorIndex(tier: CvaTier | null): number {
  return tier ? TIER_COLOR_INDEX[tier] : FALLBACK_COLOR_INDEX;
}

/**
 * Every provider's most recent value, sorted highest first — for comparing
 * everyone against each other right now (a ranking), rather than plotting
 * everyone's full trend on one line chart, which reads as noise once there
 * are more than a handful of providers.
 */
export function latestProviderValues(
  series: ProviderCvaSeries[]
): { providerName: string; tier: CvaTier | null; value: number }[] {
  return series
    .map((s) => ({ providerName: s.providerName, tier: s.tier, value: s.points[s.points.length - 1]?.value ?? null }))
    .filter((r): r is { providerName: string; tier: CvaTier | null; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value);
}
