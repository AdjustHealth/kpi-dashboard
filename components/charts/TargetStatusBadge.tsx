import { Badge } from "@/components/ui/Badge";
import { ProviderField } from "@/lib/providerSchema";

/**
 * One consistent "did this hit its target" signal, meant to sit in a Card's
 * header action slot right next to every target/break-even chart on this
 * page — so hit-or-miss is readable from the badge alone, not by squinting
 * at which of several lines is on top. Renders nothing if either number is
 * missing (target not yet set) rather than a misleading badge.
 */
export function TargetStatusBadge({
  value,
  target,
  betterWhen,
  hitLabel = "On Track",
  missLabel = "Behind",
}: {
  value: unknown;
  target: unknown;
  betterWhen: ProviderField["betterWhen"];
  hitLabel?: string;
  missLabel?: string;
}) {
  if (!betterWhen || typeof value !== "number" || typeof target !== "number") return null;
  const met = betterWhen === "higher" ? value >= target : value <= target;
  return <Badge tone={met ? "good" : "critical"}>{met ? hitLabel : missLabel}</Badge>;
}
