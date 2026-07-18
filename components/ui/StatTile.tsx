import { STATUS } from "@/components/charts/palette";

function formatDelta(deltaPct: number | null) {
  if (deltaPct === null || Number.isNaN(deltaPct)) return null;
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${deltaPct.toFixed(1)}%`;
}

export function StatTile({
  label,
  value,
  deltaPct = null,
  goodDirection = "up",
  sublabel,
  rawValue = null,
  target = null,
  betterWhen,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  goodDirection?: "up" | "down";
  sublabel?: string;
  /** The unformatted number `value` was rendered from — needed to compare against `target`. */
  rawValue?: number | null;
  /** When set alongside rawValue + betterWhen, colors the headline value red/green vs. this target instead of plain text. */
  target?: number | null;
  betterWhen?: "higher" | "lower";
}) {
  const delta = formatDelta(deltaPct);
  const isGood =
    deltaPct !== null &&
    (goodDirection === "up" ? deltaPct >= 0 : deltaPct <= 0);
  const targetMet =
    rawValue !== null && target !== null && betterWhen
      ? betterWhen === "higher"
        ? rawValue >= target
        : rawValue <= target
      : null;
  const valueColor = targetMet === null ? undefined : targetMet ? STATUS.good : STATUS.critical;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold" style={valueColor ? { color: valueColor } : { color: "var(--color-foreground)" }}>
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta && (
          <span
            style={{ color: isGood ? STATUS.good : STATUS.critical }}
            className="font-medium"
          >
            {delta}
          </span>
        )}
        {sublabel && <span className="text-muted">{sublabel}</span>}
      </div>
    </div>
  );
}
