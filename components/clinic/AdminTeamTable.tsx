import { Card } from "@/components/ui/Card";
import { formatValue } from "@/lib/format";
import { targetColor } from "@/lib/targetColor";
import { ADMIN_METRIC_FIELDS } from "@/lib/providerSchema";
import { AdminTeamRow } from "@/lib/clinicData";

/**
 * The admin team grouped against each other, one row per person — matches
 * the original spreadsheet's admin comparison tab. Only the per-person
 * cancellation-handling fields (ADMIN_METRIC_FIELDS) — the shared clinic-wide
 * admin fields (Diary Management, Follow Up Calls, etc.) are already their
 * own read-only table (AdminSharedComplianceTable) since every admin shares
 * one identical number for those, not a per-person figure.
 */
export function AdminTeamTable({ rows, targets }: { rows: AdminTeamRow[]; targets: Record<string, unknown> }) {
  if (rows.length === 0) return null;

  return (
    <Card title="Admin Team — This Week">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="sticky left-0 bg-surface py-2 pr-3 font-medium whitespace-nowrap">Name</th>
              {ADMIN_METRIC_FIELDS.map((field) => (
                <th key={field.key} className="py-2 px-3 font-medium whitespace-nowrap">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.providerId} className="border-b border-border/60 last:border-0">
                <td className="sticky left-0 bg-surface py-2 pr-3 font-medium text-foreground whitespace-nowrap">
                  {row.providerName}
                </td>
                {ADMIN_METRIC_FIELDS.map((field) => {
                  const value = row.metrics[field.key] as number | null | undefined;
                  const target = targets[field.key];
                  const color = targetColor(value ?? null, target, field.betterWhen);
                  return (
                    <td key={field.key} className="py-2 px-3 whitespace-nowrap">
                      <span className={color ? "font-medium" : "text-muted"} style={color ? { color } : undefined}>
                        {formatValue(value ?? null, field.type, field.decimals)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Auto-filled from the Cancellations report, grouped by which admin actioned it (&ldquo;Modified User&rdquo;).
      </p>
    </Card>
  );
}
