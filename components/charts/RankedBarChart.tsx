"use client";

import { CATEGORICAL } from "@/components/charts/palette";
import { formatValue } from "@/lib/format";
import { ChartFormat } from "@/components/charts/LineTrendChart";

export interface RankedBarRow {
  label: string;
  value: number;
  colorIndex: number;
}

/**
 * Every provider's current value as a sorted horizontal bar, coloured by
 * tier — a "who's where right now" ranking, not a trend. Reuses the same
 * bar-against-max look as OccupancyBars.
 */
export function RankedBarChart({
  title,
  rows,
  format = "decimal",
  decimals,
}: {
  title: string;
  rows: RankedBarRow[];
  format?: ChartFormat;
  decimals?: number;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0.0001);

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3">
      <div className="mb-3 text-xs font-medium text-muted">{title}</div>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const color = CATEGORICAL[row.colorIndex % CATEGORICAL.length];
          const pct = Math.max(2, (row.value / max) * 100);
          return (
            <div key={row.label}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="font-medium text-foreground">{row.label}</span>
                <span className="font-semibold" style={{ color }}>
                  {formatValue(row.value, format, decimals)}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
