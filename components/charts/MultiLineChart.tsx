"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORICAL, CHART_CHROME } from "@/components/charts/palette";
import { formatValue } from "@/lib/format";
import { ChartFormat } from "@/components/charts/LineTrendChart";

/** ≥2 series on one axis — never dual-axis. Legend always present for 2+ series. */
export function MultiLineChart({
  title,
  data,
  seriesKeys,
  format = "number",
  decimals,
  height = 200,
}: {
  title: string;
  data: Record<string, unknown>[];
  seriesKeys: string[];
  /** How tooltip values are formatted — plain string so this data can come straight from a Server Component. */
  format?: ChartFormat;
  decimals?: number;
  height?: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3">
      <div className="mb-1 text-xs font-medium text-muted">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CHART_CHROME.gridline} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART_CHROME.mutedInk, fontSize: 10 }}
              axisLine={{ stroke: CHART_CHROME.baseline }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis tick={{ fill: CHART_CHROME.mutedInk, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
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
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CATEGORICAL[i % CATEGORICAL.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: CATEGORICAL[i % CATEGORICAL.length], strokeWidth: 0 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
