"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORICAL, CHART_CHROME } from "@/components/charts/palette";
import { formatWeekLabel } from "@/lib/week";
import { formatValue, formatAxisTick } from "@/lib/format";
import { ChartFormat, TrendPoint } from "@/components/charts/LineTrendChart";

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
}: {
  title: string;
  data: TrendPoint[];
  format?: ChartFormat;
  decimals?: number;
  colorIndex?: number;
  height?: number;
  accent?: boolean;
}) {
  const chartData = data.map((d) => ({ ...d, label: formatWeekLabel(d.week_ending) }));
  const color = CATEGORICAL[colorIndex % CATEGORICAL.length];

  return (
    <div
      className="rounded-lg border border-border bg-surface-raised p-3"
      style={accent ? { borderTopColor: color, borderTopWidth: 3 } : undefined}
    >
      <div className="mb-1 text-xs font-medium text-muted">{title}</div>
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
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
