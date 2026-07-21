import { STATUS } from "@/components/charts/palette";
import { ProviderField } from "@/lib/providerSchema";

/** Red/green vs a field's target — only when both a numeric value and a numeric target exist, and the field declares a direction. */
export function targetColor(value: unknown, target: unknown, betterWhen: ProviderField["betterWhen"]): string | undefined {
  if (!betterWhen || typeof value !== "number" || typeof target !== "number") return undefined;
  const met = betterWhen === "higher" ? value >= target : value <= target;
  return met ? STATUS.good : STATUS.critical;
}
