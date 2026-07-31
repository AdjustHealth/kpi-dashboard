"use client";

import { useMemo, useState } from "react";
import { formatValue } from "@/lib/format";
import { QuarterlyProviderBreakdown } from "@/lib/quarterlyData";
import { targetColor } from "@/lib/targetColor";

/**
 * Quarterly averages, one row per metric, for a given set of columns —
 * pass tierColumns and providerColumns from the same QuarterlyProviderBreakdown
 * separately so tier/clinic averages and real individual providers render as
 * two distinct tables instead of one table mixing averages with people.
 * Columns (providers/tiers) can be sorted by any metric's value.
 */
export function QuarterlyProviderTable({
  data,
  columns,
}: {
  data: QuarterlyProviderBreakdown;
  columns: { key: string; label: string }[];
}) {
  const [sortMetric, setSortMetric] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedColumns = useMemo(() => {
    if (!sortMetric) return columns;
    const values = data.values[sortMetric] ?? {};
    const sorted = [...columns].sort((a, b) => {
      const av = values[a.key];
      const bv = values[b.key];
      if (av === null || av === undefined) return 1; // nulls last regardless of direction
      if (bv === null || bv === undefined) return -1;
      return av - bv;
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [columns, data.values, sortMetric, sortDir]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs">
        <label className="text-muted" htmlFor={`sort-${columns[0]?.key ?? "table"}`}>
          Sort by
        </label>
        <select
          id={`sort-${columns[0]?.key ?? "table"}`}
          value={sortMetric}
          onChange={(e) => setSortMetric(e.target.value)}
          className="rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-foreground outline-none [color-scheme:dark]"
        >
          <option value="">Default order</option>
          {data.metrics.map((metric) => (
            <option key={metric.key} value={metric.key}>
              {metric.label}
            </option>
          ))}
        </select>
        {sortMetric && (
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-muted hover:text-foreground"
          >
            {sortDir === "desc" ? "Highest first ▼" : "Lowest first ▲"}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="sticky left-0 z-10 bg-surface-raised py-2 pr-3 pl-0 font-medium">Metric</th>
              {sortedColumns.map((col) => (
                <th key={col.key} className="whitespace-nowrap py-2 px-3 font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((metric) => (
              <tr key={metric.key} className="border-b border-border/60 last:border-0">
                <td className="sticky left-0 z-10 bg-surface py-2 pr-3 pl-0 font-medium text-foreground">{metric.label}</td>
                {sortedColumns.map((col) => {
                  const value = data.values[metric.key]?.[col.key] ?? null;
                  const target = data.targets[metric.key]?.[col.key] ?? null;
                  const color = targetColor(value, target, metric.betterWhen);
                  return (
                    <td
                      key={col.key}
                      className="whitespace-nowrap py-2 px-3"
                      style={color ? { color, fontWeight: 500 } : undefined}
                    >
                      {formatValue(value, metric.type, metric.decimals)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
