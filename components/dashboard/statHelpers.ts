import { getClinicField } from "@/lib/schema";
import { formatValue } from "@/lib/format";
import { periodOverPeriodChange } from "@/lib/calc";
import { ClinicWeekRow } from "@/lib/clinicData";

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
