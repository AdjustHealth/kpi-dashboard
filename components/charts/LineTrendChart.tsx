"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORICAL, CHART_CHROME } from "@/components/charts/palette";
import { formatWeekLabel } from "@/lib/week";
import { formatValue } from "@/lib/format";

export interface TrendPoint {
  week_ending: string;
  value: number | null;
}

export type ChartFormat = "currency" | "number" | "percent" | "decimal";

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

export function LineTrendChart({
  title,
  data,
  format = "number",
  decimals,
  colorIndex = 0,
  height = 160,
}: {
  title: string;
  data: TrendPoint[];
  /** How tooltip values are formatted — plain string so this data can come straight from a Server Component. */
  format?: ChartFormat;
  decimals?: number;
  colorIndex?: number;
  height?: number;
}) {
  const chartData = data.map((d) => ({ ...d, label: formatWeekLabel(d.week_ending) }));
  const color = CATEGORICAL[colorIndex % CATEGORICAL.length];

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3">
      <div className="mb-1 text-xs font-medium text-muted">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
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
              width={36}
            />
            <Tooltip
              content={<TooltipContent format={format} decimals={decimals} />}
              cursor={{ stroke: CHART_CHROME.baseline }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
