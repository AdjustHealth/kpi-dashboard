import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { SpecialtyServiceCard } from "@/components/dashboard/SpecialtyServiceCard";
import { createClient } from "@/lib/supabase/server";
import { getClinicHistory } from "@/lib/clinicData";
import { toTrendSeries } from "@/components/dashboard/statHelpers";
import { compoundingTrendSeries } from "@/lib/providerCalc";
import { recentWeeks, defaultWeekEnding, formatWeekLabel } from "@/lib/week";
import { StatTile } from "@/components/ui/StatTile";
import { clinicStatTile } from "@/components/dashboard/statHelpers";
import { Provider, ProviderWeekly } from "@/lib/types";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

const SPECIALTIES: { name: string; keyword: RegExp }[] = [
  { name: "Vestibular", keyword: /vestib/i },
  { name: "Headaches / TMJ", keyword: /headache|tmj/i },
  { name: "Paediatrics", keyword: /paed|pediatric/i },
  { name: "Women's Health", keyword: /women/i },
  { name: "Hydrotherapy", keyword: /hydro/i },
];

export default async function SpecialtyServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  const weeks = recentWeeks(week, 12);

  const supabase = await createClient();
  const [providersResult, allWeeklyResult, clinicHistory] = await Promise.all([
    supabase.from("providers").select("*").eq("active", true),
    supabase.from("provider_weekly").select("*").in("week_ending", weeks),
    getClinicHistory(week, 12),
  ]);

  const providers = (providersResult.data ?? []) as Provider[];
  const allWeekly = (allWeeklyResult.data ?? []) as ProviderWeekly[];

  function historyFor(providerId: string): WeekMetrics[] {
    const byWeek = new Map(allWeekly.filter((r) => r.provider_id === providerId).map((r) => [r.week_ending, r]));
    return weeks.map((w) => ({ week_ending: w, metrics: byWeek.get(w)?.metrics ?? {}, kpas: byWeek.get(w)?.kpas ?? {} }));
  }

  function findProvider(keyword: RegExp) {
    return (
      providers.find((p) => p.specialty_metrics.some((m) => keyword.test(m.key) || keyword.test(m.label))) ?? null
    );
  }

  // Verified against the real senior-physio sheet's JBV Trend column
  // (17.00 -> 17.51 -> 18.04 -> 18.58 compounds at 3%/week, not 5%).
  const jbvTargetGrowthRate = 0.03;
  const firstJbv = clinicHistory.find((h) => typeof h.jbv_total === "number")?.jbv_total as number | undefined;
  const jbvTrendTarget = firstJbv !== undefined ? compoundingTrendSeries(firstJbv, jbvTargetGrowthRate, clinicHistory.length) : [];

  return (
    <>
      <PageHeader title="Specialty Services" subtitle="Consults, revenue, and growth by specialty." />
      <div className="flex flex-col gap-6 p-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {SPECIALTIES.map((s) => {
            const provider = findProvider(s.keyword);
            if (!provider) {
              return (
                <SpecialtyServiceCard
                  key={s.name}
                  name={s.name}
                  provider={null}
                  history={[]}
                  initialKey=""
                  totalKey=""
                />
              );
            }
            const metrics = provider.specialty_metrics;
            const totalMetric = metrics.find((m) => m.source === "calc") ?? metrics.find((m) => /total/.test(m.key));
            const initialMetric = metrics.find((m) => /init/.test(m.key)) ?? metrics[0];
            return (
              <SpecialtyServiceCard
                key={s.name}
                name={s.name}
                provider={provider}
                history={historyFor(provider.id)}
                initialKey={initialMetric?.key ?? ""}
                totalKey={totalMetric?.key ?? initialMetric?.key ?? ""}
              />
            );
          })}
        </div>

        <Card title="Joint Business Ventures">
          <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile {...clinicStatTile(clinicHistory, "jbv_total")} label="JBV Total" />
            <StatTile {...clinicStatTile(clinicHistory, "jbv_initial")} label="JBV Initial Consults" />
            <StatTile {...clinicStatTile(clinicHistory, "jbv_sub")} label="JBV Subsequent Consults" />
          </div>
          <p className="mb-3 text-[11px] text-muted">Target growth: 3% per week.</p>
          <LineTrendChart
            title="JBV Total vs 5% Growth Target"
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
