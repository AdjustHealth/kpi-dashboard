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

/** Percentage change from `previous` to `current`, or null if not computable. */
export function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
