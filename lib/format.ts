import { ClinicFieldType } from "@/lib/schema";
import { ProviderFieldType } from "@/lib/providerSchema";

export function formatValue(
  value: number | null | undefined,
  type: ClinicFieldType | ProviderFieldType,
  decimals?: number
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  switch (type) {
    case "currency":
      return value.toLocaleString("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
      });
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "decimal":
      return value.toFixed(decimals ?? 2);
    case "number":
      return value.toLocaleString("en-AU");
    case "boolean":
      return value ? "Yes" : "No";
    default:
      return String(value);
  }
}

/**
 * Short axis-tick label — full formatValue() output is too wide for a
 * narrow chart Y-axis (e.g. "$40,000" clips inside a ~40px-wide axis).
 * Abbreviates currency/number into k/m; percent and decimal stay as-is,
 * they're already short.
 */
export function formatAxisTick(value: number, type: ClinicFieldType | ProviderFieldType, decimals?: number): string {
  if (type === "currency" || type === "number") {
    const abs = Math.abs(value);
    const prefix = type === "currency" ? "$" : "";
    const sign = value < 0 ? "-" : "";
    if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(1)}m`;
    if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
    return `${sign}${prefix}${abs}`;
  }
  return formatValue(value, type, decimals);
}

/** Percentage change from `previous` to `current`, or null if not computable. */
export function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
