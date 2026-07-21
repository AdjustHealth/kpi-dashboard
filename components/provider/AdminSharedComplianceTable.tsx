import { Card } from "@/components/ui/Card";
import { formatValue } from "@/lib/format";
import { formatWeekLabel } from "@/lib/week";
import { ADMIN_SHARED_COMPLIANCE_FIELDS } from "@/lib/providerSchema";
import { targetColor } from "@/lib/targetColor";
import { ClinicWeekRow } from "@/lib/clinicData";

/**
 * Read-only view of the admin-team fields every admin staff member shares
 * identically (Diary Management, Follow Up Phone Calls, OBV Number Not
 * Sent, Rx Notes Made, Answered Calls) — sourced straight from clinic-wide
 * weekly_kpis, not this provider's own metrics. Edited on Weekly Input's
 * Admin Meeting Prep section, not here. Coloured red/green against the
 * same "admin" role_targets group the KPI Scorecard above uses, keyed by
 * field.key (not clinicFieldId — that's only for reading the raw value).
 */
export function AdminSharedComplianceTable({
  clinicHistory,
  targets,
}: {
  clinicHistory: ClinicWeekRow[];
  targets: Record<string, unknown>;
}) {
  return (
    <Card title="Compliance">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="sticky left-0 bg-surface py-2 pr-3 font-medium">KPI</th>
              <th className="py-2 px-3 font-medium">Target</th>
              {clinicHistory.map((w, i) => (
                <th
                  key={w.week_ending}
                  className={`py-2 px-3 font-medium whitespace-nowrap ${
                    i === clinicHistory.length - 1 ? "text-accent" : ""
                  }`}
                >
                  {formatWeekLabel(w.week_ending)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMIN_SHARED_COMPLIANCE_FIELDS.map((field) => {
              const target = targets[field.key];
              return (
                <tr key={field.key} className="border-b border-border/60 last:border-0">
                  <td className="sticky left-0 bg-surface py-2 pr-3 text-foreground whitespace-nowrap">{field.label}</td>
                  <td className="py-2 px-3 text-muted whitespace-nowrap">
                    {typeof target === "number" ? formatValue(target, field.type, field.decimals) : "—"}
                  </td>
                  {clinicHistory.map((w) => {
                    const value = w[field.clinicFieldId] as number | null;
                    const color = targetColor(value, target, field.betterWhen);
                    return (
                      <td key={w.week_ending} className="py-2 px-3 whitespace-nowrap">
                        <span className={color ? "font-medium" : "text-muted"} style={color ? { color } : undefined}>
                          {formatValue(value, field.type, field.decimals)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Shared across every admin staff member — edit on Weekly Input&apos;s Admin Meeting Prep section.
      </p>
    </Card>
  );
}
