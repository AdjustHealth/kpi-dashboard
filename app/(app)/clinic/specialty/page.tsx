import { PageHeader } from "@/components/nav/PageHeader";
import { Card } from "@/components/ui/Card";
import { LineTrendChart } from "@/components/charts/LineTrendChart";
import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { getClinicHistory, ClinicWeekRow } from "@/lib/clinicData";
import { toTrendSeries } from "@/components/dashboard/statHelpers";
import { compoundingTrendSeries } from "@/lib/providerCalc";
import { formatWeekLabel, defaultWeekEnding, clinicHistoryWeeks } from "@/lib/week";
import { StatTile } from "@/components/ui/StatTile";
import { clinicStatTile } from "@/components/dashboard/statHelpers";
import { JBV_PARTNERS } from "@/lib/jbvPartners";
import { JbvPartnerGrid } from "@/components/dashboard/JbvPartnerGrid";
import { STATUS, CATEGORICAL } from "@/components/charts/palette";
import { requireAnySection } from "@/lib/auth/access";
import { formatValue } from "@/lib/format";

/**
 * Clinic-wide specialty consult categories, from the director's own
 * "SPECIALTY SERVICES CONSULTATIONS" tracker — Vestibular/Headaches/Paeds
 * auto-fill from the Activity Report the same way JBV does (see
 * lib/nookal/parsers.ts SPECIALTY_CATEGORY_PATTERNS). These are whole-clinic
 * totals, not tied to any one provider's specialty_metrics — a provider's
 * *personal* specialty KPI (e.g. Marcio's Headache Init/Sub target) is a
 * separate, provider-scoped number shown on their own meeting page.
 */
const SPECIALTIES: { name: string; key: string; colorIndex: number; hasInitialSubSplit?: boolean }[] = [
  { name: "Vestibular", key: "specialty_vestibular", colorIndex: 0, hasInitialSubSplit: true },
  { name: "Headaches / TMJ", key: "specialty_headaches", colorIndex: 3, hasInitialSubSplit: true },
  { name: "Paediatrics", key: "specialty_paeds", colorIndex: 4, hasInitialSubSplit: true },
  // Hydro items almost never say "Initial"/"Subsequent" in Nookal (unlike the
  // others above), so an Initial Consults stat here would misleadingly read
  // as ~0 every week — Total Consults (the real matched-row count) is the
  // only trustworthy number for this specialty.
  { name: "Hydro", key: "specialty_hydro", colorIndex: 7, hasInitialSubSplit: false },
];

/**
 * % change from the first week this category has a real (non-null) value
 * through to the latest week — i.e. growth since tracking began, not a
 * fixed recent window. Most of these specialties only started being
 * auto-detected from the Activity Report recently, so "since tracking
 * began" is a meaningful, stable figure rather than a moving 4-week
 * comparison that swings on whatever two weeks happen to get compared.
 * Also returns how many weeks of history that covers, and the implied
 * average weekly compounding rate — the total % alone isn't comparable
 * between two specialties tracked for very different lengths of time,
 * the weekly rate is (same framing JBV's own 3%/week target already uses).
 */
function totalGrowth(history: ClinicWeekRow[], key: string): { pct: number | null; weeks: number; weeklyPct: number | null } {
  const firstIdx = history.findIndex((h) => typeof h[key] === "number");
  const latest = history[history.length - 1]?.[key];
  if (firstIdx === -1 || typeof latest !== "number") return { pct: null, weeks: 0, weeklyPct: null };
  const first = history[firstIdx][key] as number;
  const weeks = history.length - 1 - firstIdx;
  if (first === 0 || weeks === 0) return { pct: null, weeks, weeklyPct: null };
  const pct = ((latest - first) / first) * 100;
  const weeklyPct = (Math.pow(latest / first, 1 / weeks) - 1) * 100;
  return { pct, weeks, weeklyPct };
}

function GrowthStat({ label, pct, sublabel }: { label: string; pct: number | null; sublabel?: string }) {
  const color = pct === null ? undefined : pct >= 0 ? STATUS.good : STATUS.critical;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="text-lg font-semibold text-foreground" style={color ? { color } : undefined}>
        {pct === null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
      </div>
      {sublabel && <div className="text-[11px] text-muted">{sublabel}</div>}
    </div>
  );
}

export default async function SpecialtyServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireAnySection(["clinic_reports", "specialty_services"]);
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  const historyWeeks = clinicHistoryWeeks(week);
  const clinicHistory = await getClinicHistory(week, historyWeeks);

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

  const allServicesData = clinicHistory.map((h) => ({
    label: formatWeekLabel(h.week_ending),
    ...Object.fromEntries(SPECIALTIES.map((s) => [s.name, typeof h[`${s.key}_total`] === "number" ? h[`${s.key}_total`] : null])),
    "Women's Health": typeof h.specialty_womens_health_total === "number" ? h.specialty_womens_health_total : null,
  }));
  const allServicesKeys = [...SPECIALTIES.map((s) => s.name), "Women's Health"];
  const allServicesColors = [...SPECIALTIES.map((s) => s.colorIndex), 1];

  // "New clients" here means each specialty's own Initial-consult count —
  // Hydro is deliberately excluded (see SPECIALTIES above: it has no
  // reliable Initial/Subsequent split in Nookal, so its "initial" figure
  // would understate it). Women's Health isn't in SPECIALTIES (it gets its
  // own Card below) but does have a reliable Initial count via the same
  // Activity Report auto-detection as Vestibular/Headaches/Paeds.
  const specialtyNewClientKeys = [
    ...SPECIALTIES.filter((s) => s.hasInitialSubSplit !== false).map((s) => `${s.key}_initial`),
    "specialty_womens_health_initial",
  ];
  const specialtyNewShareData = clinicHistory.map((h) => {
    const values = specialtyNewClientKeys.map((k) => (typeof h[k] === "number" ? (h[k] as number) : null));
    // null (not 0) for a week none of these were reported at all, same
    // "don't count an unknown week as a real zero" reasoning as the
    // specialty consult totals elsewhere on this page.
    const specialtyNew = values.every((v) => v === null) ? null : values.reduce((acc: number, v) => acc + (v ?? 0), 0);
    const totalNew = typeof h.total_nc === "number" ? h.total_nc : null;
    // A fraction (0-1), matching every other "percent"-typed field in this
    // app (formatValue multiplies by 100 itself) — not already *100.
    const sharePct = specialtyNew !== null && totalNew !== null && totalNew > 0 ? specialtyNew / totalNew : null;
    return { label: formatWeekLabel(h.week_ending), value: sharePct };
  });
  const latestSpecialtyNewSharePct = specialtyNewShareData[specialtyNewShareData.length - 1]?.value ?? null;

  return (
    <>
      <PageHeader title="Specialty Services" subtitle="Consults by specialty, clinic-wide." />
      <div className="flex flex-col gap-6 p-8">
        <Card title="All Specialty Services — Total Consults">
          <p className="mb-3 text-xs text-muted">Every specialty on one chart, so growth can be compared directly.</p>
          <MultiLineChart
            title="Specialty Services vs Each Other"
            data={allServicesData}
            seriesKeys={allServicesKeys}
            colors={allServicesColors.map((i) => CATEGORICAL[i % CATEGORICAL.length])}
            format="number"
            height={280}
          />
        </Card>

        <Card title="Specialty Share of New Clients">
          <p className="mb-3 text-xs text-muted">
            Each specialty&apos;s own Initial-consult count (Vestibular, Headaches/TMJ, Paediatrics, Women&apos;s Health —
            Hydro excluded, no reliable Initial/Subsequent split) added together, as a % of the clinic&apos;s total new
            clients for the week.
          </p>
          {latestSpecialtyNewSharePct !== null && (
            <div className="mb-3 flex flex-wrap gap-6">
              <StatTile
                label="Specialty Share of New Clients"
                value={formatValue(latestSpecialtyNewSharePct, "percent")}
                rawValue={latestSpecialtyNewSharePct}
                goodDirection="up"
              />
            </div>
          )}
          <BarTrendChart title="Specialty Share of New Clients" data={specialtyNewShareData} format="percent" colorIndex={2} height={240} />
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {SPECIALTIES.map((s) => {
            const growth = totalGrowth(clinicHistory, `${s.key}_total`);
            const hasInitial = s.hasInitialSubSplit !== false;
            const chartData = clinicHistory.map((h) => ({
              label: formatWeekLabel(h.week_ending),
              "Total Consults": typeof h[`${s.key}_total`] === "number" ? h[`${s.key}_total`] : null,
              ...(hasInitial
                ? { "Initial Consults": typeof h[`${s.key}_initial`] === "number" ? h[`${s.key}_initial`] : null }
                : {}),
            }));
            return (
            <Card key={s.key} title={s.name}>
              <div className="mb-3 flex flex-wrap gap-6">
                {hasInitial && <StatTile {...clinicStatTile(clinicHistory, `${s.key}_initial`)} label="Initial Consults" />}
                <StatTile {...clinicStatTile(clinicHistory, `${s.key}_total`)} label="Total Consults" />
                {growth.weeks > 0 && (
                  <GrowthStat
                    label={`Growth Since Tracking Began (${growth.weeks}wk)`}
                    pct={growth.pct}
                    sublabel={growth.weeklyPct !== null ? `${growth.weeklyPct >= 0 ? "+" : ""}${growth.weeklyPct.toFixed(1)}%/week avg` : undefined}
                  />
                )}
              </div>
              {hasInitial ? (
                <MultiLineChart
                  title={`${s.name} — Total vs Initial Consults`}
                  data={chartData}
                  seriesKeys={["Total Consults", "Initial Consults"]}
                  colors={[CATEGORICAL[s.colorIndex % CATEGORICAL.length], CATEGORICAL[(s.colorIndex + 4) % CATEGORICAL.length]]}
                  format="number"
                  trendlineKey="Initial Consults"
                />
              ) : (
                <LineTrendChart
                  title={`${s.name} — Total Consults`}
                  data={toTrendSeries(clinicHistory, `${s.key}_total`)}
                  format="number"
                  colorIndex={s.colorIndex}
                />
              )}
            </Card>
            );
          })}

          <Card title="Women's Health">
            <p className="mb-3 text-xs text-muted">
              Auto-detected from the Activity Report (Women&apos;s Health / pelvic health item names) — no longer manual.
            </p>
            <div className="mb-3 flex flex-wrap gap-6">
              <StatTile {...clinicStatTile(clinicHistory, "specialty_womens_health_initial")} label="Initial Consults" />
              <StatTile {...clinicStatTile(clinicHistory, "specialty_womens_health_total")} label="Total Consults" />
            </div>
            <div className="mt-3">
              <MultiLineChart
                title="Women's Health — Total vs Initial Consults"
                data={clinicHistory.map((h) => ({
                  label: formatWeekLabel(h.week_ending),
                  "Total Consults": typeof h.specialty_womens_health_total === "number" ? h.specialty_womens_health_total : null,
                  "Initial Consults": typeof h.specialty_womens_health_initial === "number" ? h.specialty_womens_health_initial : null,
                }))}
                seriesKeys={["Total Consults", "Initial Consults"]}
                colors={[CATEGORICAL[1], CATEGORICAL[5]]}
                format="number"
                trendlineKey="Initial Consults"
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
            <p className="mb-3 text-xs font-medium text-muted">JBV Partners ({JBV_PARTNERS.length})</p>
            <JbvPartnerGrid partners={JBV_PARTNERS} />
          </div>
        </Card>
      </div>
    </>
  );
}
