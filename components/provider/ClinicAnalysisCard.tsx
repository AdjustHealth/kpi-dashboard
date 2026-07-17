import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { clinicStatTile } from "@/components/dashboard/statHelpers";
import { ClinicWeekRow } from "@/lib/clinicData";

/**
 * Shared clinic-wide data (entered once on Weekly Input) surfaced back on
 * the Senior Physio meeting page — CVA/JBV context alongside their
 * personal KPI Scorecard, rather than re-entering it. StatTile already
 * shows the week-over-week % change as a delta badge, so "Total JBVs"
 * doubles as the JBV growth rate.
 */
export function ClinicAnalysisCard({ history }: { history: ClinicWeekRow[] }) {
  return (
    <Card title="Clinic Analysis" action={<span className="text-xs text-muted">Shared clinic-wide data</span>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile {...clinicStatTile(history, "clinic_occ")} label="Clinic Occupancy" />
        <StatTile {...clinicStatTile(history, "cva_senior")} label="CVA — Senior (6+yr)" />
        <StatTile {...clinicStatTile(history, "jbv_initial")} label="JBV Initial" />
        <StatTile {...clinicStatTile(history, "jbv_total")} label="Total JBVs (growth rate)" />
      </div>
    </Card>
  );
}
