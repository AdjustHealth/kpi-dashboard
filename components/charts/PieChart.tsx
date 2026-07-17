"use client";

import { Cell, Legend, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORICAL, CHART_CHROME } from "@/components/charts/palette";
import { formatValue } from "@/lib/format";
import { ChartFormat } from "@/components/charts/LineTrendChart";

export interface PieSlice {
  name: string;
  value: number;
}

/**
 * Beyond 4 categorical slots the palette can't guarantee full pairwise
 * separation, so every slice is direct-labeled (name + value) rather than
 * relying on color/legend alone — per the dataviz skill's guidance for
 * charts with more than 4 series.
 */
export function PieChart({
  title,
  data,
  format = "currency",
  height = 260,
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
          <RePieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="80%"
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
            <Legend wrapperStyle={{ fontSize: 11, color: CHART_CHROME.secondaryInk }} />
          </RePieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
