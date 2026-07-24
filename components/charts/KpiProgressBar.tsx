"use client";

import { STATUS } from "@/components/charts/palette";
import { formatValue } from "@/lib/format";
import { ChartFormat } from "@/components/charts/LineTrendChart";

/** A single KPI's value against its target as a filled bar — the target is a marker line, not just a number next to the value. */
export function KpiProgressBar({
  label,
  value,
  target,
  betterWhen,
  format = "decimal",
  decimals,
}: {
  label: string;
  value: number | null;
  target: number;
  betterWhen: "higher" | "lower" | undefined;
  format?: ChartFormat;
  decimals?: number;
}) {
  const met = value !== null && betterWhen && (betterWhen === "higher" ? value >= target : value <= target);
  const color = value === null ? "var(--color-muted)" : met ? STATUS.good : STATUS.critical;

  // Bar fills relative to whichever of value/target is larger, so the target marker always lands inside the visible track.
  const scaleMax = Math.max(value ?? 0, target) * 1.15 || 1;
  const valuePct = value === null ? 0 : Math.min(100, (value / scaleMax) * 100);
  const targetPct = Math.min(100, (target / scaleMax) * 100);

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-semibold" style={{ color }}>
          {value === null ? "—" : formatValue(value, format, decimals)}
          <span className="ml-1.5 font-normal text-muted">/ {formatValue(target, format, decimals)}</span>
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className="h-full rounded-full transition-all" style={{ width: `${valuePct}%`, backgroundColor: color }} />
        <div className="absolute top-0 h-full w-0.5 bg-foreground/70" style={{ left: `${targetPct}%` }} title={`Target ${formatValue(target, format, decimals)}`} />
      </div>
    </div>
  );
}
