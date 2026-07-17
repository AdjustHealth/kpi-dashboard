import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { getClinicHistory } from "@/lib/clinicData";
import { toTrendSeries } from "@/components/dashboard/statHelpers";
import { compoundingTrendSeries } from "@/lib/providerCalc";
import { formatWeekLabel, defaultWeekEnding, trackingHistoryWeeks } from "@/lib/week";
import { StatTile } from "@/components/ui/StatTile";
import { clinicStatTile } from "@/components/dashboard/statHelpers";

/**
 * Clinic-wide specialty consult categories, from the director's own
 * "SPECIALTY SERVICES CONSULTATIONS" tracker — Vestibular/Headaches/Paeds
 * auto-fill from the Activity Report the same way JBV does (see
 * lib/nookal/parsers.ts SPECIALTY_CATEGORY_PATTERNS). These are whole-clinic
 * totals, not tied to any one provider's specialty_metrics — a provider's
 * *personal* specialty KPI (e.g. Marcio's Headache Init/Sub target) is a
 * separate, provider-scoped number shown on their own meeting page.
 */
const SPECIALTIES: { name: string; key: string }[] = [
  { name: "Vestibular", key: "specialty_vestibular" },
  { name: "Headaches / TMJ", key: "specialty_headaches" },
  { name: "Paediatrics", key: "specialty_paeds" },
];

export default async function SpecialtyServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  const historyWeeks = trackingHistoryWeeks(week);
  const clinicHistory = await getClinicHistory(week, historyWeeks);

  // Verified against the real senior-physio sheet's JBV Trend column
  // (17.00 -> 17.51 -> 18.04 -> 18.58 compounds at 3%/week, not 5%).
  const jbvTargetGrowthRate = 0.03;
  const firstJbv = clinicHistory.find((h) => typeof h.jbv_total === "number")?.jbv_total as number | undefined;
  const jbvTrendTarget = firstJbv !== undefined ? compoundingTrendSeries(firstJbv, jbvTargetGrowthRate, clinicHistory.length) : [];

  return (
    <>
      <PageHeader title="Specialty Services" subtitle="Consults by specialty, clinic-wide." />
      <div className="flex flex-col gap-6 p-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {SPECIALTIES.map((s) => (
            <Card key={s.key} title={s.name}>
              <div className="mb-3 flex flex-wrap gap-6">
                <StatTile {...clinicStatTile(clinicHistory, `${s.key}_initial`)} label="Initial Consults" />
                <StatTile {...clinicStatTile(clinicHistory, `${s.key}_total`)} label="Total Consults" />
              </div>
              <LineTrendChart
                title={`${s.name} — Total Consults`}
                data={toTrendSeries(clinicHistory, `${s.key}_total`)}
                format="number"
              />
            </Card>
          ))}

          <Card title="Women's Health">
            <p className="mb-3 text-xs text-muted">
              No Nookal report source for this category on the director&apos;s sheet — entered manually on
              Weekly Input.
            </p>
            <StatTile {...clinicStatTile(clinicHistory, "specialty_womens_health_total")} label="Total Consults" />
            <div className="mt-3">
              <LineTrendChart
                title="Women's Health — Total Consults"
                data={toTrendSeries(clinicHistory, "specialty_womens_health_total")}
                format="number"
              />
            </div>
          </Card>
        </div>

        <Card title="Joint Business Ventures">
          <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile {...clinicStatTile(clinicHistory, "jbv_total")} label="JBV Total" />
            <StatTile {...clinicStatTile(clinicHistory, "jbv_initial")} label="JBV Initial Consults" />
            <StatTile {...clinicStatTile(clinicHistory, "jbv_sub")} label="JBV Subsequent Consults" />
          </div>
          <p className="mb-3 text-[11px] text-muted">Target growth: 3% per week.</p>
          <LineTrendChart
            title="JBV Total vs 3% Growth Target"
            data={toTrendSeries(clinicHistory, "jbv_total")}
            format="number"
            colorIndex={6}
          />
          {jbvTrendTarget.length > 0 && (
            <p className="mt-2 text-[11px] text-muted">
              Target trajectory from {formatWeekLabel(clinicHistory[0].week_ending)}: {jbvTrendTarget.map((v) => v.toFixed(1)).join(" → ")}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
