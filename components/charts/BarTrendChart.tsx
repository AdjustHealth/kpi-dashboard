"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NEUTRAL_CATEGORICAL, CHART_CHROME, STATUS } from "@/components/charts/palette";
import { formatWeekLabel } from "@/lib/week";
import { formatValue, formatAxisTick } from "@/lib/format";
import { ChartFormat, TrendPoint } from "@/components/charts/LineTrendChart";
import { trendTargetColor } from "@/lib/chartTarget";

function TooltipContent({
  active,
  payload,
  format,
  decimals,
}: {
  active?: boolean;
  payload?: { value: number }[];
  format: ChartFormat;
  decimals?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs shadow-lg">
      <span className="font-medium text-foreground">{formatValue(payload[0].value, format, decimals)}</span>
    </div>
  );
}

/**
 * A single metric as weekly bars rather than a line — same data shape as
 * LineTrendChart, just a different mark so a page of many small trend charts
 * doesn't read as one undifferentiated wall of lines (e.g. TPR next to
 * Turnover/CVA/NCVA, which are already lines).
 */
export function BarTrendChart({
  title,
  data,
  format = "number",
  decimals,
  colorIndex = 0,
  height = 160,
  accent = false,
  target,
  betterWhen,
}: {
  title: string;
  data: TrendPoint[];
  format?: ChartFormat;
  decimals?: number;
  colorIndex?: number;
  height?: number;
  accent?: boolean;
  /** When set alongside betterWhen, draws a neutral dashed reference line at this value and colors the bars green/red based on the latest point vs target — same convention as StatTile/table cells. */
  target?: number | null;
  betterWhen?: "higher" | "lower";
}) {
  const chartData = data.map((d) => ({ ...d, label: d.label ?? (d.week_ending ? formatWeekLabel(d.week_ending) : "") }));
  const dynamicColor = trendTargetColor(data, target, betterWhen);
  const color = dynamicColor ?? NEUTRAL_CATEGORICAL[colorIndex % NEUTRAL_CATEGORICAL.length];
  const onTrack = dynamicColor === undefined ? null : dynamicColor === STATUS.good;

  return (
    <div
      className="rounded-lg border border-border bg-surface-raised p-3"
      style={accent ? { borderTopColor: color, borderTopWidth: 3 } : undefined}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{title}</span>
        {onTrack !== null && (
          <span
            className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              color: onTrack ? STATUS.good : STATUS.critical,
              backgroundColor: `color-mix(in srgb, ${onTrack ? "var(--color-success)" : "var(--color-danger)"} 15%, transparent)`,
            }}
          >
            {onTrack ? "On Target" : "Off Target"}
          </span>
        )}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_CHROME.gridline} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART_CHROME.mutedInk, fontSize: 10 }}
              axisLine={{ stroke: CHART_CHROME.baseline }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: CHART_CHROME.mutedInk, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => formatAxisTick(Number(v), format, decimals)}
            />
            <Tooltip
              content={<TooltipContent format={format} decimals={decimals} />}
              cursor={{ fill: CHART_CHROME.gridline }}
            />
            {typeof target === "number" && (
              <ReferenceLine y={target} stroke={CHART_CHROME.mutedInk} strokeDasharray="4 4" strokeWidth={1.5} />
            )}
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
