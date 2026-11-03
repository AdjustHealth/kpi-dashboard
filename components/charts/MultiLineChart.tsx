"use client";

import { useId } from "react";
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
import { CATEGORICAL, CHART_CHROME, STATUS } from "@/components/charts/palette";
import { formatValue, formatAxisTick } from "@/lib/format";
import { ChartFormat } from "@/components/charts/LineTrendChart";
import { trendlinePercentChange, trendlineSeries } from "@/lib/trendline";

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
  trendlineKey,
  referenceSeriesKeys,
  thresholdColoring,
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
  /**
   * Subset of seriesKeys that are static reference/threshold lines (e.g. a
   * break-even tier), not real trend data — rendered thinner and without
   * per-week dot markers so they read as background context instead of
   * competing with the actual data line(s) at equal visual weight. Doesn't
   * change color; pass a muted color for these keys via `colors` too.
   */
  referenceSeriesKeys?: string[];
  /**
   * One of seriesKeys (normally the actual-value series, not a target/trend
   * reference line already on the chart) — overlays a dashed least-squares
   * trendline for it, green if climbing, red if falling. Off by default;
   * most MultiLineCharts already have their own actual-vs-target/trend pair
   * and a third overlay would just be clutter — opt in per chart.
   */
  trendlineKey?: string;
  /**
   * Colors ONE series point-by-point (and segment-by-segment) against a
   * per-row threshold, instead of one flat color for the whole line — e.g.
   * a weekly figure that was above target some weeks and below others
   * should actually show red where it dipped, not just reflect its latest
   * value. `thresholdKey` names another key already in `data` holding that
   * row's threshold (so a tier/target that itself varies works too, though
   * a flat reference line's key works just as well). Real dips disappear
   * entirely if this is left off and a flat `colors` entry is used instead.
   */
  thresholdColoring?: { seriesKey: string; thresholdKey: string; betterWhen: "higher" | "lower" };
}) {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const trend = trendlineKey
    ? trendlineSeries(data.map((d) => (typeof d[trendlineKey] === "number" ? (d[trendlineKey] as number) : null)))
    : null;
  const trendColor = !trend
    ? undefined
    : trend[trend.length - 1]! > trend[0]!
      ? STATUS.good
      : trend[trend.length - 1]! < trend[0]!
        ? STATUS.critical
        : CHART_CHROME.mutedInk;
  const chartData = trend ? data.map((d, i) => ({ ...d, __trend: trend[i] })) : data;
  const trendPct = trendlineKey
    ? trendlinePercentChange(data.map((d) => (typeof d[trendlineKey] === "number" ? (d[trendlineKey] as number) : null)))
    : null;

  // Per-point status, and hard-edged gradient stops built from it — each
  // segment between two points takes the ARRIVING point's color, so the
  // transition lands exactly where the real crossing happened instead of
  // smearing across the segment.
  const thresholdColors = thresholdColoring
    ? chartData.map((d) => {
        const row = d as Record<string, unknown>;
        const v = row[thresholdColoring.seriesKey];
        const t = row[thresholdColoring.thresholdKey];
        if (typeof v !== "number" || typeof t !== "number") return CHART_CHROME.mutedInk;
        const met = thresholdColoring.betterWhen === "higher" ? v >= t : v <= t;
        return met ? STATUS.good : STATUS.critical;
      })
    : null;
  const gradientStops =
    thresholdColors && thresholdColors.length > 1
      ? thresholdColors.flatMap((color, i) => {
          if (i === 0) return [];
          const start = ((i - 1) / (thresholdColors.length - 1)) * 100;
          const end = (i / (thresholdColors.length - 1)) * 100;
          return [
            { offset: start, color },
            { offset: end, color },
          ];
        })
      : null;

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{title}</span>
        {trendPct !== null && (
          <span
            className="whitespace-nowrap text-[11px] font-semibold"
            style={{ color: trendColor }}
            title="% change from the start to the end of the trendline"
          >
            {trendPct >= 0 ? "▲" : "▼"} {Math.abs(trendPct).toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            {gradientStops && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  {gradientStops.map((stop, i) => (
                    <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />
                  ))}
                </linearGradient>
              </defs>
            )}
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
              const isReference = referenceSeriesKeys?.includes(key) ?? false;
              const isThresholdColored = thresholdColoring?.seriesKey === key && gradientStops;
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={isThresholdColored ? `url(#${gradientId})` : color}
                  strokeWidth={isReference ? 1.5 : 2}
                  dot={
                    isReference
                      ? false
                      : isThresholdColored
                        ? (props: { cx?: number; cy?: number; index?: number }) => {
                            const { cx, cy, index } = props;
                            if (cx == null || cy == null || index == null) return <g key={`dot-${index}`} />;
                            return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill={thresholdColors![index]} stroke="none" />;
                          }
                        : { r: 3, fill: color, strokeWidth: 0 }
                  }
                  activeDot={isReference ? false : undefined}
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
            {trend && (
              <Line
                type="linear"
                dataKey="__trend"
                name="Trend"
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
