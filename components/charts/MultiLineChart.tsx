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
import { formatValue, formatAxisTick } from "@/lib/format";
import { ChartFormat } from "@/components/charts/LineTrendChart";

/** ≥2 series on one axis — never dual-axis. Legend always present for 2+ series. */
export function MultiLineChart({
  title,
  data,
  seriesKeys,
  format = "number",
  decimals,
  height = 200,
  colors,
  pointLabelKeys,
}: {
  title: string;
  data: Record<string, unknown>[];
  seriesKeys: string[];
  /** How tooltip values are formatted — plain string so this data can come straight from a Server Component. */
  format?: ChartFormat;
  decimals?: number;
  height?: number;
  /** Explicit color per series (parallel to seriesKeys) — overrides the default categorical cycling, e.g. to group series by tier instead of assigning each its own hue. */
  colors?: string[];
  /**
   * Parallel to seriesKeys — when set for a series, prints that data point's
   * value from this alternate field (e.g. that week's raw revenue) above
   * each point on the line, instead of leaving the number hover-only. Pass
   * undefined for a series to leave it unlabeled.
   */
  pointLabelKeys?: (string | undefined)[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3">
      <div className="mb-1 text-xs font-medium text-muted">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
            {seriesKeys.map((key, i) => {
              const color = colors?.[i] ?? CATEGORICAL[i % CATEGORICAL.length];
              const labelKey = pointLabelKeys?.[i];
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: color, strokeWidth: 0 }}
                  connectNulls
                  label={
                    labelKey
                      ? (props: { x?: string | number; y?: string | number; payload?: Record<string, unknown> }) => {
                          const raw = props.payload?.[labelKey];
                          const x = Number(props.x);
                          const y = Number(props.y);
                          if (typeof raw !== "number") return <g key={`${x}-${y}`} />;
                          return (
                            <text
                              key={`${x}-${y}`}
                              x={x}
                              y={y - 10}
                              textAnchor="middle"
                              fontSize={10}
                              fill={CHART_CHROME.secondaryInk}
                            >
                              {formatValue(raw, format, decimals)}
                            </text>
                          );
                        }
                      : undefined
                  }
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
