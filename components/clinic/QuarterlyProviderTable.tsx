import { formatValue } from "@/lib/format";
import { QuarterlyProviderBreakdown } from "@/lib/quarterlyData";
import { targetColor } from "@/lib/targetColor";

/**
 * Quarterly averages, one row per metric, for a given set of columns —
 * pass tierColumns and providerColumns from the same QuarterlyProviderBreakdown
 * separately so tier/clinic averages and real individual providers render as
 * two distinct tables instead of one table mixing averages with people.
 */
export function QuarterlyProviderTable({
  data,
  columns,
}: {
  data: QuarterlyProviderBreakdown;
  columns: { key: string; label: string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-10 bg-surface-raised py-2 pr-3 pl-0 font-medium">Metric</th>
            {columns.map((col) => (
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
              {columns.map((col) => {
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
  );
}
