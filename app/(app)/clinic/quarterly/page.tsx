import { PageHeader } from "@/components/nav/PageHeader";
import { QuarterSelector } from "@/components/nav/QuarterSelector";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { BarTrendChart } from "@/components/charts/BarTrendChart";
import { TrendPoint, ChartFormat } from "@/components/charts/LineTrendChart";
import { QuarterlyProviderTable } from "@/components/clinic/QuarterlyProviderTable";
import {
  getAvailableQuarters,
  getQuarterlyClinicStats,
  getQuarterlyProviderBreakdown,
  QuarterlyClinicStats,
} from "@/lib/quarterlyData";
import { getClinicTargets } from "@/lib/clinicData";
import { quarterLabel, adjacentQuarter } from "@/lib/quarter";
import { formatValue } from "@/lib/format";
import { requireDirector } from "@/lib/auth/access";

/** Same relative-percent-change convention as periodOverPeriodChange() (lib/calc.ts), used by every other StatTile in the app. */
function deltaPct(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** A quarter total isn't comparable to a prior quarter's total once the two cover different week counts (e.g. this quarter is still in progress) — compare the per-week rate instead. */
function perWeek(total: number | null, weeks: number): number | null {
  if (total === null || weeks === 0) return null;
  return total / weeks;
}

/** One bar per quarter — sum-type fields are shown as their per-week rate (perWeek=true) so a still-in-progress quarter is directly comparable to a completed one; rate fields (occupancy, %s) are already comparable as-is. */
function toBars(
  allStats: QuarterlyClinicStats[],
  pick: (s: QuarterlyClinicStats) => number | null,
  perWeekRate: boolean
): TrendPoint[] {
  return allStats.map((s) => ({
    label: quarterLabel(s.quarter),
    value: perWeekRate ? perWeek(pick(s), s.weeksCount) : pick(s),
  }));
}

interface MetricCard {
  title: string;
  format: ChartFormat;
  decimals?: number;
  data: TrendPoint[];
  target?: number | null;
  betterWhen?: "higher" | "lower";
}

export default async function QuarterlyReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ quarter?: string }>;
}) {
  await requireDirector();
  const { quarter: quarterParam } = await searchParams;
  const quarters = await getAvailableQuarters();

  if (quarters.length === 0) {
    return (
      <>
        <PageHeader title="Quarterly Review" subtitle="Compare quarters." showWeekSelector={false} />
        <div className="p-8">
          <Card>
            <p className="text-sm text-muted">No data yet — upload at least one week on Weekly Input first.</p>
          </Card>
        </div>
      </>
    );
  }

  const quarter = quarterParam && quarters.includes(quarterParam) ? quarterParam : quarters[quarters.length - 1];
  const previousQuarter = adjacentQuarter(quarter, -1);

  const [stats, previousStats, providerBreakdown, clinicTargets, allQuarterStats] = await Promise.all([
    getQuarterlyClinicStats(quarter),
    quarters.includes(previousQuarter) ? getQuarterlyClinicStats(previousQuarter) : Promise.resolve(null),
    getQuarterlyProviderBreakdown(quarter),
    getClinicTargets(),
    Promise.all(quarters.map((q) => getQuarterlyClinicStats(q))),
  ]);

  const weeklyRevenueTarget = typeof clinicTargets.weekly_revenue_target === "number" ? clinicTargets.weekly_revenue_target : null;
  const weeklyGymTarget = typeof clinicTargets.weekly_gym_revenue_target === "number" ? clinicTargets.weekly_gym_revenue_target : null;
  const quarterlyRevenueTarget = weeklyRevenueTarget !== null ? weeklyRevenueTarget * stats.weeksCount : null;
  const clinicOccTarget = typeof clinicTargets.clinic_occ_target === "number" ? clinicTargets.clinic_occ_target : 0.85;
  const cxPctTarget = typeof clinicTargets.cx_pct_target === "number" ? clinicTargets.cx_pct_target : null;
  const rsxTarget = 0.3;
  const retentionTarget = 0.7;

  const metricCards: MetricCard[] = [
    { title: "Total Revenue (avg/wk)", format: "currency", data: toBars(allQuarterStats, (s) => s.totalRevenue, true), target: weeklyRevenueTarget, betterWhen: "higher" },
    { title: "Gym Revenue (avg/wk)", format: "currency", data: toBars(allQuarterStats, (s) => s.totalGymRevenue, true), target: weeklyGymTarget, betterWhen: "higher" },
    { title: "Podiatry Revenue (avg/wk)", format: "currency", data: toBars(allQuarterStats, (s) => s.totalPodiatryRevenue, true) },
    { title: "Ageing Debt (end of quarter)", format: "currency", data: toBars(allQuarterStats, (s) => s.agedDebtEndOfQuarter, false) },
    { title: "Occupancy", format: "percent", data: toBars(allQuarterStats, (s) => s.occupancy, false), target: clinicOccTarget, betterWhen: "higher" },
    { title: "Retention Rate", format: "percent", data: toBars(allQuarterStats, (s) => s.retentionRate, false), target: retentionTarget, betterWhen: "higher" },
    { title: "Reschedule Rate", format: "percent", data: toBars(allQuarterStats, (s) => s.rescheduleRate, false), target: rsxTarget, betterWhen: "higher" },
    { title: "Cancellation %", format: "percent", data: toBars(allQuarterStats, (s) => s.cancellationPct, false), target: cxPctTarget, betterWhen: "lower" },
    { title: "Diary Management", format: "percent", data: toBars(allQuarterStats, (s) => s.diaryMgmtPct, false) },
    { title: "Online Booking %", format: "percent", data: toBars(allQuarterStats, (s) => s.onlineBookingPct, false) },
    { title: "New Patients (avg/wk)", format: "decimal", decimals: 1, data: toBars(allQuarterStats, (s) => s.totalNewPatients, true) },
    { title: "Completed Appointments (avg/wk)", format: "decimal", decimals: 1, data: toBars(allQuarterStats, (s) => s.totalConsults, true) },
    { title: "JBV Consults (avg/wk)", format: "decimal", decimals: 1, data: toBars(allQuarterStats, (s) => s.totalJbv, true) },
    { title: "Specialty Consults Total (avg/wk)", format: "decimal", decimals: 1, data: toBars(allQuarterStats, (s) => s.totalSpecialtyConsults, true) },
  ];

  return (
    <>
      <PageHeader
        title="Quarterly Review"
        subtitle="Compare quarters — clinic-wide totals and the per-provider/tier breakdown."
        showWeekSelector={false}
        actions={<QuarterSelector quarters={quarters} current={quarter} />}
      />
      <div className="flex flex-col gap-6 p-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {quarterLabel(quarter)}
            <span className="ml-2 text-xs font-normal text-muted">
              {stats.weeksCount} week{stats.weeksCount === 1 ? "" : "s"} of data
              {previousStats && ` — vs ${quarterLabel(previousQuarter)}`}
            </span>
          </h2>
          {previousStats && stats.weeksCount !== previousStats.weeksCount && (
            <p className="mb-3 text-[11px] text-muted">
              {quarterLabel(quarter)} has {stats.weeksCount} week{stats.weeksCount === 1 ? "" : "s"} of data so far
              vs {previousStats.weeksCount} for {quarterLabel(previousQuarter)} — Total Revenue/New Patients/Appointments
              deltas compare the per-week average, not the raw totals, so a still-in-progress quarter isn&apos;t
              penalised for having fewer weeks.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              label="Total Revenue"
              value={formatValue(stats.totalRevenue, "currency")}
              rawValue={stats.totalRevenue}
              target={quarterlyRevenueTarget}
              betterWhen="higher"
              deltaPct={deltaPct(perWeek(stats.totalRevenue, stats.weeksCount), perWeek(previousStats?.totalRevenue ?? null, previousStats?.weeksCount ?? 0))}
              sublabel={quarterlyRevenueTarget !== null ? `target ${formatValue(quarterlyRevenueTarget, "currency")}` : undefined}
            />
            <StatTile
              label="Total New Patients"
              value={formatValue(stats.totalNewPatients, "number")}
              deltaPct={deltaPct(
                perWeek(stats.totalNewPatients, stats.weeksCount),
                perWeek(previousStats?.totalNewPatients ?? null, previousStats?.weeksCount ?? 0)
              )}
            />
            <StatTile
              label="Total Completed Appointments"
              value={formatValue(stats.totalConsults, "number")}
              deltaPct={deltaPct(
                perWeek(stats.totalConsults, stats.weeksCount),
                perWeek(previousStats?.totalConsults ?? null, previousStats?.weeksCount ?? 0)
              )}
            />
            <StatTile
              label="Occupancy (avg/wk)"
              value={formatValue(stats.occupancy, "percent")}
              rawValue={stats.occupancy}
              target={clinicOccTarget}
              betterWhen="higher"
              deltaPct={deltaPct(stats.occupancy, previousStats?.occupancy ?? null)}
            />
            <StatTile
              label="Retention Rate (avg/wk)"
              value={formatValue(stats.retentionRate, "percent")}
              rawValue={stats.retentionRate}
              target={retentionTarget}
              betterWhen="higher"
              deltaPct={deltaPct(stats.retentionRate, previousStats?.retentionRate ?? null)}
            />
            <StatTile
              label="Reschedule Rate (avg/wk)"
              value={formatValue(stats.rescheduleRate, "percent")}
              rawValue={stats.rescheduleRate}
              target={rsxTarget}
              betterWhen="higher"
              deltaPct={deltaPct(stats.rescheduleRate, previousStats?.rescheduleRate ?? null)}
            />
            <StatTile
              label="Cancellation % (avg/wk)"
              value={formatValue(stats.cancellationPct, "percent")}
              rawValue={stats.cancellationPct}
              target={cxPctTarget}
              betterWhen="lower"
              goodDirection="down"
              deltaPct={deltaPct(stats.cancellationPct, previousStats?.cancellationPct ?? null)}
            />
            <StatTile
              label="Diary Management (avg/wk)"
              value={formatValue(stats.diaryMgmtPct, "percent")}
              deltaPct={deltaPct(stats.diaryMgmtPct, previousStats?.diaryMgmtPct ?? null)}
            />
            <StatTile
              label="Online Booking %"
              value={formatValue(stats.onlineBookingPct, "percent")}
              deltaPct={deltaPct(stats.onlineBookingPct, previousStats?.onlineBookingPct ?? null)}
            />
          </div>
        </div>

        {quarters.length > 1 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Quarter over Quarter</h2>
            <p className="mb-3 text-xs text-muted">
              One bar per quarter, oldest to newest. $/count metrics are shown as a per-week average so an
              in-progress quarter is comparable to a completed one — the totals themselves are in the cards above.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metricCards.map((card, i) => (
                <BarTrendChart
                  key={card.title}
                  title={card.title}
                  data={card.data}
                  format={card.format}
                  decimals={card.decimals}
                  colorIndex={i}
                  target={card.target}
                  betterWhen={card.betterWhen}
                  accent
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Clinic &amp; Tier Averages — {quarterLabel(quarter)}</h2>
          <p className="mb-3 text-xs text-muted">
            Quarterly average of each week&apos;s figure across everyone in that tier — New Grad / 2-5yr / Senior /
            Massage / EP, same grouping as the KPI Scorecard targets.
          </p>
          <Card>
            <QuarterlyProviderTable data={providerBreakdown} columns={providerBreakdown.tierColumns} />
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">By Provider — {quarterLabel(quarter)}</h2>
          <p className="mb-3 text-xs text-muted">
            Quarterly average of each week&apos;s figure, per person. Providers with no data for this quarter (e.g.
            before they joined, or before the July 2026 tracking rollout) show as —.
          </p>
          <Card>
            <QuarterlyProviderTable data={providerBreakdown} columns={providerBreakdown.providerColumns} />
          </Card>
        </div>
      </div>
    </>
  );
}
