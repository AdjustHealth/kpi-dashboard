"use client";

import { Cell, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORICAL, CHART_CHROME } from "@/components/charts/palette";
import { formatValue } from "@/lib/format";
import { ChartFormat } from "@/components/charts/LineTrendChart";

export interface PieSlice {
  name: string;
  value: number;
}

/**
 * Beyond 4 categorical slots the palette can't guarantee full pairwise
 * separation, so every slice is direct-labeled (name + percent) rather
 * than relying on a legend — per the dataviz skill's guidance for charts
 * with more than 4 series. No separate legend: it would just repeat the
 * direct labels and eats the margin those labels need to not clip.
 */
export function PieChart({
  title,
  data,
  format = "currency",
  height = 320,
}: {
  title: string;
  data: PieSlice[];
  format?: ChartFormat;
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-3">
      <div className="mb-1 text-xs font-medium text-muted">{title}</div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart margin={{ top: 24, right: 60, bottom: 24, left: 60 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="45%"
              outerRadius="65%"
              paddingAngle={2}
              label={({ name, value }) =>
                total > 0 ? `${name} ${Math.round((value / total) * 100)}%` : name
              }
              labelLine={{ stroke: CHART_CHROME.mutedInk }}
            >
              {data.map((slice, i) => (
                <Cell key={slice.name} fill={CATEGORICAL[i % CATEGORICAL.length]} stroke="var(--surface-raised)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => formatValue(Number(v), format)}
            />
          </RePieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
