import { Card } from "@/components/ui/Card";
import { formatValue } from "@/lib/format";
import { formatWeekLabel } from "@/lib/week";
import { ADMIN_SHARED_COMPLIANCE_FIELDS } from "@/lib/providerSchema";
import { ClinicWeekRow } from "@/lib/clinicData";

/**
 * Read-only view of the admin-team fields every admin staff member shares
 * identically (Diary Management, Follow Up Phone Calls, OBV Number Not
 * Sent, Rx Notes Made, Answered Calls) — sourced straight from clinic-wide
 * weekly_kpis, not this provider's own metrics. Edited on Weekly Input's
 * Admin Meeting Prep section, not here.
 */
export function AdminSharedComplianceTable({ clinicHistory }: { clinicHistory: ClinicWeekRow[] }) {
  return (
    <Card title="Compliance">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="sticky left-0 bg-surface py-2 pr-3 font-medium">KPI</th>
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
            {ADMIN_SHARED_COMPLIANCE_FIELDS.map((field) => (
              <tr key={field.key} className="border-b border-border/60 last:border-0">
                <td className="sticky left-0 bg-surface py-2 pr-3 text-foreground whitespace-nowrap">{field.label}</td>
                {clinicHistory.map((w) => (
                  <td key={w.week_ending} className="py-2 px-3 whitespace-nowrap text-muted">
                    {formatValue(w[field.clinicFieldId] as number | null, field.type, field.decimals)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Shared across every admin staff member — edit on Weekly Input&apos;s Admin Meeting Prep section.
      </p>
    </Card>
  );
}
