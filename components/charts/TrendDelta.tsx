import { STATUS } from "@/components/charts/palette";
import { formatValue } from "@/lib/format";
import { ClinicFieldType } from "@/lib/schema";
import { ProviderField, ProviderFieldType } from "@/lib/providerSchema";

/**
 * Replaces the old inline Sparkline (a bare, unlabelled 56x22px line —
 * readable only as "some shape happened", not as a trend) with the actual
 * number: first vs most recent value in the window, as a % change (or the
 * raw delta when the starting value is 0, where a % isn't meaningful).
 * Coloured green/red by whether that direction is actually an improvement
 * for this field (betterWhen) — a field with no declared direction, or no
 * real movement, stays neutral.
 */
export function TrendDelta({
  values,
  betterWhen,
  type,
  decimals,
  showPrevious,
}: {
  values: (number | null)[];
  betterWhen?: ProviderField["betterWhen"];
  type: ClinicFieldType | ProviderFieldType;
  decimals?: number;
  /** Prefix the old value itself (not just the tooltip) — for a review-to-review comparison, where "what was it last time" matters as much as the % change. */
  showPrevious?: boolean;
}) {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return <span className="text-xs text-muted">—</span>;

  const first = known[0];
  const last = known[known.length - 1];
  const delta = last - first;
  const flat = delta === 0;
  const improved = !betterWhen || flat ? null : betterWhen === "higher" ? delta > 0 : delta < 0;
  const color = flat || improved === null ? "var(--color-muted)" : improved ? STATUS.good : STATUS.critical;
  const arrow = flat ? "→" : delta > 0 ? "▲" : "▼";
  const pct = first !== 0 ? (delta / Math.abs(first)) * 100 : null;
  const text = pct !== null ? `${pct > 0 ? "+" : ""}${Math.round(pct)}%` : `${delta > 0 ? "+" : ""}${formatValue(delta, type, decimals)}`;

  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold"
      style={{ color }}
      title={`${formatValue(first, type, decimals)} → ${formatValue(last, type, decimals)}`}
    >
      {showPrevious && <span className="font-normal text-muted">{formatValue(first, type, decimals)}</span>}
      {arrow} {text}
    </span>
  );
}
