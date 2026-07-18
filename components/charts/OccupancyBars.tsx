"use client";

import { STATUS, CATEGORICAL } from "@/components/charts/palette";

export interface OccupancyRow {
  label: string;
  value: number | null;
  /** Percentage-point change vs. the prior week, so this weekly snapshot still reads chronologically. */
  deltaPts?: number | null;
}

/**
 * Occupancy as horizontal bars against a target, not a line over time —
 * this week's snapshot per service line reads faster as "how full are we
 * right now" than a 12-week line chart, which is better suited to trend
 * questions (still available via "Show table"/history elsewhere).
 */
export function OccupancyBars({ rows, target = 0.85 }: { rows: OccupancyRow[]; target?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, i) => {
        const pct = row.value ?? 0;
        const barPct = Math.min(100, pct * 100);
        const targetPct = Math.min(100, target * 100);
        const met = row.value !== null && row.value >= target;
        const color = row.value === null ? CATEGORICAL[i % CATEGORICAL.length] : met ? STATUS.good : STATUS.critical;
        return (
          <div key={row.label}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="flex items-center gap-2">
                {typeof row.deltaPts === "number" && (
                  <span className="text-[11px] font-medium" style={{ color: row.deltaPts >= 0 ? STATUS.good : STATUS.critical }}>
                    {row.deltaPts >= 0 ? "+" : ""}
                    {row.deltaPts.toFixed(1)}pt vs last week
                  </span>
                )}
                <span className="font-semibold" style={{ color }}>
                  {row.value === null ? "—" : `${(row.value * 100).toFixed(1)}%`}
                </span>
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${barPct}%`, backgroundColor: color }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground/70"
                style={{ left: `${targetPct}%` }}
                title={`Target ${(target * 100).toFixed(0)}%`}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        <span className="inline-block h-3 w-0.5 bg-foreground/70" /> Target {(target * 100).toFixed(0)}%
      </div>
    </div>
  );
}
