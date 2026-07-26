"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORICAL, CHART_CHROME } from "@/components/charts/palette";
import { formatValue, formatAxisTick } from "@/lib/format";
import { ChartFormat } from "@/components/charts/LineTrendChart";

/** Composition over time — one bar per period, segments stacked so both the total and the mix shift are visible at once. */
export function StackedBarChart({
  title,
  data,
  seriesKeys,
  format = "number",
  decimals,
  height = 240,
}: {
  title: string;
  data: Record<string, unknown>[];
  seriesKeys: string[];
  format?: ChartFormat;
  decimals?: number;
  height?: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3">
      <div className="mb-1 text-xs font-medium text-muted">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
              width={44}
              tickFormatter={(v) => formatAxisTick(Number(v), format, decimals)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => formatValue(Number(v), format, decimals)}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: CHART_CHROME.secondaryInk }} />
            {seriesKeys.map((key, i) => (
              <Bar key={key} dataKey={key} stackId="stack" fill={CATEGORICAL[i % CATEGORICAL.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
