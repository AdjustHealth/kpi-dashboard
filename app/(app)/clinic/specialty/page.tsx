import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { getClinicHistory, ClinicWeekRow } from "@/lib/clinicData";
import { toTrendSeries } from "@/components/dashboard/statHelpers";
import { compoundingTrendSeries } from "@/lib/providerCalc";
import { formatWeekLabel, defaultWeekEnding, clinicHistoryWeeks } from "@/lib/week";
import { StatTile } from "@/components/ui/StatTile";
import { clinicStatTile } from "@/components/dashboard/statHelpers";
import { JBV_PARTNERS } from "@/lib/jbvPartners";
import { STATUS } from "@/components/charts/palette";

/**
 * Clinic-wide specialty consult categories, from the director's own
 * "SPECIALTY SERVICES CONSULTATIONS" tracker — Vestibular/Headaches/Paeds
 * auto-fill from the Activity Report the same way JBV does (see
 * lib/nookal/parsers.ts SPECIALTY_CATEGORY_PATTERNS). These are whole-clinic
 * totals, not tied to any one provider's specialty_metrics — a provider's
 * *personal* specialty KPI (e.g. Marcio's Headache Init/Sub target) is a
 * separate, provider-scoped number shown on their own meeting page.
 */
const SPECIALTIES: { name: string; key: string; colorIndex: number }[] = [
  { name: "Vestibular", key: "specialty_vestibular", colorIndex: 0 },
  { name: "Headaches / TMJ", key: "specialty_headaches", colorIndex: 3 },
  { name: "Paediatrics", key: "specialty_paeds", colorIndex: 4 },
];

/** % change from `weeksBack` weeks ago to the latest week — a growth-rate framing, not a target (none is stated for these categories). */
function growthRatePct(history: ClinicWeekRow[], key: string, weeksBack: number): number | null {
  const latest = history[history.length - 1]?.[key];
  const past = history[history.length - 1 - weeksBack]?.[key];
  if (typeof latest !== "number" || typeof past !== "number" || past === 0) return null;
  return ((latest - past) / past) * 100;
}

function GrowthStat({ label, pct }: { label: string; pct: number | null }) {
  const color = pct === null ? undefined : pct >= 0 ? STATUS.good : STATUS.critical;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-lg font-semibold text-foreground" style={color ? { color } : undefined}>
        {pct === null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
      </div>
    </div>
  );
}

export default async function SpecialtyServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  const historyWeeks = clinicHistoryWeeks(week);
  const clinicHistory = await getClinicHistory(week, historyWeeks);
  const growthWindow = Math.min(4, clinicHistory.length - 1);

  // Verified against the real senior-physio sheet's JBV Trend column
  // (17.00 -> 17.51 -> 18.04 -> 18.58 compounds at 3%/week, not 5%).
  const jbvTargetGrowthRate = 0.03;
  const firstJbv = clinicHistory.find((h) => typeof h.jbv_total === "number")?.jbv_total as number | undefined;
  const jbvTrend = firstJbv !== undefined ? compoundingTrendSeries(firstJbv, jbvTargetGrowthRate, clinicHistory.length) : [];
  const jbvChartData = clinicHistory.map((h, i) => ({
    label: formatWeekLabel(h.week_ending),
    "JBV Actual": typeof h.jbv_total === "number" ? h.jbv_total : null,
    "JBV Trend (3%/wk)": jbvTrend[i] ?? null,
  }));

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
                {growthWindow > 0 && (
                  <GrowthStat label={`${growthWindow}-Week Growth`} pct={growthRatePct(clinicHistory, `${s.key}_total`, growthWindow)} />
                )}
              </div>
              <LineTrendChart
                title={`${s.name} — Total Consults`}
                data={toTrendSeries(clinicHistory, `${s.key}_total`)}
                format="number"
                colorIndex={s.colorIndex}
              />
            </Card>
          ))}

          <Card title="Women's Health">
            <p className="mb-3 text-xs text-muted">
              Auto-detected from the Activity Report (Women&apos;s Health / pelvic health item names) — no longer manual.
            </p>
            <div className="mb-3 flex flex-wrap gap-6">
              <StatTile {...clinicStatTile(clinicHistory, "specialty_womens_health_initial")} label="Initial Consults" />
              <StatTile {...clinicStatTile(clinicHistory, "specialty_womens_health_total")} label="Total Consults" />
            </div>
            <div className="mt-3">
              <LineTrendChart
                title="Women's Health — Total Consults"
                data={toTrendSeries(clinicHistory, "specialty_womens_health_total")}
                format="number"
                colorIndex={1}
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
          <MultiLineChart
            title="JBV Actual vs 3% Growth Trend"
            data={jbvChartData}
            seriesKeys={["JBV Actual", "JBV Trend (3%/wk)"]}
            format="number"
            height={240}
          />

          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium text-muted">JBV Partners ({JBV_PARTNERS.length})</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
              {JBV_PARTNERS.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
