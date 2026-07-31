import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { clinicStatTile } from "@/components/dashboard/statHelpers";
import { ClinicWeekRow } from "@/lib/clinicData";
import { cvaTierTarget } from "@/lib/defaultTargets";

/**
 * Shared clinic-wide data (entered once on Weekly Input) surfaced back on
 * the Senior Physio meeting page instead of being re-entered — matches the
 * real sheet's "Clinic Analysis" box exactly: Diary %, all 4 UCVA tiers,
 * and JBV Initial/Sub/Total. A senior's own UCVA is in their personal KPI
 * Scorecard already, so it isn't repeated here. StatTile already shows the
 * week-over-week % change as a delta badge, so "Total JBVs" doubles as the
 * JBV growth rate.
 */
export function ClinicAnalysisCard({
  history,
  roleTargets = {},
}: {
  history: ClinicWeekRow[];
  /** Providers/Senior/Admin role target groups — used to look up the New Grad/2-5yr UCVA tier targets instead of hardcoding them. */
  roleTargets?: Record<string, Record<string, unknown>>;
}) {
  const newGradTarget = cvaTierTarget("new_grad", roleTargets);
  const tier25Target = cvaTierTarget("2_5yr", roleTargets);
  return (
    <Card title="Clinic Analysis" action={<span className="text-xs text-muted">Shared clinic-wide data</span>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile {...clinicStatTile(history, "diary_mgmt_pct")} label="Diary Management" />
        <StatTile
          {...clinicStatTile(history, "cva_new_grads", "up", newGradTarget !== null ? { target: newGradTarget, betterWhen: "higher" } : undefined)}
          label="UCVA — New Grads"
        />
        <StatTile
          {...clinicStatTile(history, "cva_2_5yr", "up", tier25Target !== null ? { target: tier25Target, betterWhen: "higher" } : undefined)}
          label="UCVA — 2-5yr"
        />
        <StatTile {...clinicStatTile(history, "cva_ep")} label="UCVA — EP" />
        <StatTile {...clinicStatTile(history, "cva_massage")} label="UCVA — Massage" />
        <StatTile {...clinicStatTile(history, "jbv_initial")} label="JBV Initial" />
        <StatTile {...clinicStatTile(history, "jbv_sub")} label="JBV Subsequent" />
        <StatTile {...clinicStatTile(history, "jbv_total")} label="Total JBVs (growth rate)" />
      </div>
    </Card>
  );
}
