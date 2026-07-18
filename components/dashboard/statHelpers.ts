import { getClinicField } from "@/lib/schema";
import { formatValue } from "@/lib/format";
import { periodOverPeriodChange } from "@/lib/calc";
import { ClinicWeekRow, ProviderCvaSeries } from "@/lib/clinicData";
import { formatWeekLabel } from "@/lib/week";

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

/** Pivots one series per provider into MultiLineChart's wide row shape — every provider as its own line on one chart, to compare them directly. */
export function providerSeriesToWideRows(series: ProviderCvaSeries[]): { rows: Record<string, unknown>[]; keys: string[] } {
  if (series.length === 0) return { rows: [], keys: [] };
  const weeks = series[0].points.map((p) => p.week_ending);
  const rows = weeks.map((w, i) => {
    const row: Record<string, unknown> = { label: formatWeekLabel(w) };
    for (const s of series) row[s.providerName] = s.points[i]?.value ?? null;
    return row;
  });
  return { rows, keys: series.map((s) => s.providerName) };
}
