"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { NEUTRAL_CATEGORICAL, CHART_CHROME, STATUS } from "@/components/charts/palette";
import { formatWeekLabel } from "@/lib/week";
import { formatValue, formatAxisTick } from "@/lib/format";
import { trendTargetColor } from "@/lib/chartTarget";
import { trendlinePercentChange, trendlineSeries } from "@/lib/trendline";

export interface TrendPoint {
  /** A week-ending date, formatted via formatWeekLabel — omit and set `label` directly for non-weekly axes (e.g. quarters). */
  week_ending?: string;
  /** Pre-formatted x-axis label, overriding week_ending's date formatting — for categories that aren't a week. */
  label?: string;
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
  payload?: { dataKey?: string; value: number }[];
  format: ChartFormat;
  decimals?: number;
}) {
  if (!active || !payload?.length) return null;
  // The trendline overlay shares this tooltip's payload — always show the
  // real "value" series, never the regression line, regardless of draw order.
  const point = payload.find((p) => p.dataKey === "value") ?? payload[0];
  return (
    <div className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs shadow-lg">
      <span className="font-medium text-foreground">{formatValue(point.value, format, decimals)}</span>
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
  accent = false,
  target,
  betterWhen,
  showTrendline = true,
}: {
  title: string;
  data: TrendPoint[];
  /** How tooltip values are formatted — plain string so this data can come straight from a Server Component. */
  format?: ChartFormat;
  decimals?: number;
  colorIndex?: number;
  height?: number;
  /** Adds a coloured top border matching the line's colour — a bit more polish for a page of many small charts side by side. */
  accent?: boolean;
  /** When set alongside betterWhen, draws a neutral dashed reference line at this value and colors the trend line green/red based on the latest point vs target — same convention as StatTile/table cells. */
  target?: number | null;
  betterWhen?: "higher" | "lower";
  /** A dashed least-squares trendline overlay, green when the series is climbing and red when it's falling (literal direction, independent of target/betterWhen — a lower-is-better metric trending up is still shown red here since it's climbing, not "worse"). Needs at least 2 real points; hidden otherwise. */
  showTrendline?: boolean;
}) {
  const chartData = data.map((d) => ({ ...d, label: d.label ?? (d.week_ending ? formatWeekLabel(d.week_ending) : "") }));
  const dynamicColor = trendTargetColor(data, target, betterWhen);
  const color = dynamicColor ?? NEUTRAL_CATEGORICAL[colorIndex % NEUTRAL_CATEGORICAL.length];
  const onTrack = dynamicColor === undefined ? null : dynamicColor === STATUS.good;

  const trend = showTrendline ? trendlineSeries(data.map((d) => d.value)) : null;
  const trendColor = !trend
    ? undefined
    : trend[trend.length - 1]! > trend[0]!
      ? STATUS.good
      : trend[trend.length - 1]! < trend[0]!
        ? STATUS.critical
        : CHART_CHROME.mutedInk;
  const trendChartData = trend ? chartData.map((d, i) => ({ ...d, trend: trend[i] })) : chartData;
  const trendPct = showTrendline ? trendlinePercentChange(data.map((d) => d.value)) : null;

  return (
    <div
      className="rounded-lg border border-border bg-surface-raised p-3"
      style={accent ? { borderTopColor: color, borderTopWidth: 3 } : undefined}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{title}</span>
        <div className="flex items-center gap-1.5">
          {trendPct !== null && (
            <span
              className="whitespace-nowrap text-[11px] font-semibold"
              style={{ color: trendColor }}
              title="% change from the start to the end of the trendline"
            >
              {trendPct >= 0 ? "▲" : "▼"} {Math.abs(trendPct).toFixed(1)}%
            </span>
          )}
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
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
              cursor={{ stroke: CHART_CHROME.baseline }}
            />
            {typeof target === "number" && (
              <ReferenceLine y={target} stroke={CHART_CHROME.mutedInk} strokeDasharray="4 4" strokeWidth={1.5} />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
            {trend && (
              <Line
                type="linear"
                dataKey="trend"
                stroke={trendColor}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
