import { createClient } from "@/lib/supabase/server";
import { quarterDateRange, parseQuarterKey, quarterKeyString, quarterOfWeek } from "@/lib/quarter";
import { cvaTierBucket, CvaTier } from "@/lib/cvaTier";
import { retentionPct } from "@/lib/providerData";
import { getEffectiveTargets } from "@/lib/defaultTargets";
import { CLINICIAN_METRIC_FIELDS } from "@/lib/providerSchema";
import { Provider } from "@/lib/types";
import { ClinicFieldType } from "@/lib/schema";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sum(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0);
}

function nums(rows: Record<string, unknown>[], key: string): number[] {
  return rows.map((r) => r[key]).filter((v): v is number => typeof v === "number");
}

/** For balance-style fields (ageing debt) — the most recent week's figure, not a sum or average across weeks. Rows must already be ordered oldest-to-newest. */
function latestNonNull(rows: Record<string, unknown>[], key: string): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i][key];
    if (typeof v === "number") return v;
  }
  return null;
}

/** Every quarter with at least one weekly_kpis row, oldest first. */
export async function getAvailableQuarters(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("weekly_kpis").select("week_ending");
  const weeks = (data ?? []).map((r) => r.week_ending as string);
  const keys = new Set(weeks.map((w) => quarterKeyString(quarterOfWeek(w))));
  return Array.from(keys).sort();
}

export interface QuarterlyClinicStats {
  quarter: string;
  /** Every week in [start, end] with a weekly_kpis row at all — includes weeks still in the future (a row can exist ahead of time) and any week whose report just wasn't uploaded. Fine for "N weeks of data so far" display text and for scaling a target, but NOT a safe denominator for any of the totals below — see the avg*PerWeek fields instead. */
  weeksCount: number;
  totalRevenue: number | null;
  totalNewPatients: number | null;
  totalConsults: number | null;
  occupancy: number | null;
  retentionRate: number | null;
  cancellationPct: number | null;
  rescheduleRate: number | null;
  diaryMgmtPct: number | null;
  onlineBookingPct: number | null;
  totalGymRevenue: number | null;
  totalPodiatryRevenue: number | null;
  /** End-of-quarter snapshot, not a sum — ageing debt is a balance, summing weeks would double-count the same debt. */
  agedDebtEndOfQuarter: number | null;
  totalJbv: number | null;
  totalSpecialtyConsults: number | null;
  /**
   * Average per week for each total above, dividing only by the weeks that
   * actually have a real recorded value for that specific field — NOT by
   * weeksCount. A still-upcoming week (its weekly_kpis row already exists,
   * e.g. the upload route creates one ahead of time) or a week whose report
   * just wasn't uploaded has no real figure to average in, so it shouldn't
   * count toward "how many weeks" either. Dividing by weeksCount instead
   * silently understated every one of these — confirmed against real data:
   * Q4 2026 had 3 real New Patients weeks (21/14/18) and one not-yet-
   * happened week (null), and totalNewPatients/weeksCount (53/4 = 13.3)
   * read as a sharp, confusing drop from Q1/Q2's real ~24/week, when the
   * true in-progress average (53/3 = 17.7) wasn't actually that different.
   */
  avgRevenuePerWeek: number | null;
  avgNewPatientsPerWeek: number | null;
  avgConsultsPerWeek: number | null;
  avgGymRevenuePerWeek: number | null;
  avgPodiatryRevenuePerWeek: number | null;
  avgJbvPerWeek: number | null;
  avgSpecialtyConsultsPerWeek: number | null;
}

/** Clinic-wide quarter rollup — $/count fields summed for the quarter, rate/% fields averaged across its weeks, balances (ageing debt) taken as of the last week. */
export async function getQuarterlyClinicStats(quarterKey: string): Promise<QuarterlyClinicStats> {
  const { start, end } = quarterDateRange(parseQuarterKey(quarterKey));
  const supabase = await createClient();
  const { data } = await supabase
    .from("weekly_kpis")
    .select("*")
    .gte("week_ending", start)
    .lte("week_ending", end)
    .order("week_ending", { ascending: true });
  const rows = (data ?? []) as Record<string, unknown>[];

  const onlineTotal = sum(nums(rows, "online_bookings_total"));
  const onlineNew = sum(nums(rows, "online_bookings_new"));
  const retentionValues = rows
    .map((r) => (typeof r.cx_nr_pct === "number" ? 1 - (r.cx_nr_pct as number) : null))
    .filter((v): v is number => v !== null);
  const specialtyKeys = [
    "specialty_vestibular_total",
    "specialty_headaches_total",
    "specialty_paeds_total",
    "specialty_womens_health_total",
    "specialty_hydro_total",
  ];
  // null (not 0) for a week where the Activity Report simply wasn't
  // uploaded at all, so that week doesn't drag the average down as if it
  // were a real zero — but a week that WAS uploaded still defaults any one
  // missing specialty column to 0 (a real category can genuinely have no
  // consults that week).
  const specialtyPerWeek = rows
    .map((r) => {
      const values = specialtyKeys.map((k) => (typeof r[k] === "number" ? (r[k] as number) : null));
      if (values.every((v) => v === null)) return null;
      return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
    })
    .filter((v): v is number => v !== null);
  const totalSpecialtyConsults = rows.length ? sum(specialtyPerWeek) : null;

  return {
    quarter: quarterKey,
    weeksCount: rows.length,
    totalRevenue: sum(nums(rows, "total_rev")),
    totalNewPatients: sum(nums(rows, "total_nc")),
    totalConsults: sum(nums(rows, "total_consults")),
    occupancy: average(nums(rows, "clinic_occ")),
    retentionRate: average(retentionValues),
    cancellationPct: average(nums(rows, "cx_pct")),
    rescheduleRate: average(nums(rows, "cx_rsx_pct")),
    diaryMgmtPct: average(nums(rows, "diary_mgmt_pct")),
    totalGymRevenue: sum(nums(rows, "gym_total")),
    totalPodiatryRevenue: sum(nums(rows, "m_pod_rev")),
    agedDebtEndOfQuarter: latestNonNull(rows, "ad_total"),
    totalJbv: sum(nums(rows, "jbv_total")),
    totalSpecialtyConsults,
    onlineBookingPct: onlineTotal !== null && onlineTotal > 0 && onlineNew !== null ? onlineNew / onlineTotal : null,
    avgRevenuePerWeek: average(nums(rows, "total_rev")),
    avgNewPatientsPerWeek: average(nums(rows, "total_nc")),
    avgConsultsPerWeek: average(nums(rows, "total_consults")),
    avgGymRevenuePerWeek: average(nums(rows, "gym_total")),
    avgPodiatryRevenuePerWeek: average(nums(rows, "m_pod_rev")),
    avgJbvPerWeek: average(nums(rows, "jbv_total")),
    avgSpecialtyConsultsPerWeek: average(specialtyPerWeek),
  };
}

export interface QuarterlyMetricDef {
  key: string;
  label: string;
  type: ClinicFieldType;
  decimals?: number;
  /** "retention" reads not_rebooked_pct (or the admin equivalent) and inverts it, same as retentionPct(). */
  derived?: "retention";
  betterWhen?: "higher" | "lower";
}

function betterWhenFor(key: string): "higher" | "lower" | undefined {
  return CLINICIAN_METRIC_FIELDS.find((f) => f.key === key)?.betterWhen;
}

const PROVIDER_METRICS: QuarterlyMetricDef[] = [
  { key: "turnover", label: "Turnover (avg/wk)", type: "currency", betterWhen: betterWhenFor("turnover") },
  { key: "fba", label: "Forward Booking Average", type: "decimal", decimals: 1, betterWhen: betterWhenFor("fba") },
  { key: "occupancy_pct", label: "Occupancy", type: "percent", betterWhen: betterWhenFor("occupancy_pct") },
  { key: "ucva", label: "PVA", type: "decimal", decimals: 1, betterWhen: betterWhenFor("ucva") },
  { key: "ncva", label: "NCVA", type: "decimal", decimals: 1, betterWhen: betterWhenFor("ncva") },
  { key: "tpr", label: "TPR", type: "currency", betterWhen: betterWhenFor("tpr") },
  { key: "new_patients", label: "New Patients (avg/wk)", type: "decimal", decimals: 1, betterWhen: betterWhenFor("new_patients") },
  { key: "cancellations", label: "Cancellations (avg/wk)", type: "decimal", decimals: 1, betterWhen: betterWhenFor("cancellations") },
  { key: "retention_pct", label: "Retention Rate", type: "percent", derived: "retention", betterWhen: betterWhenFor("retention_pct") },
];

/**
 * One representative "provider" per tier, purely to reuse getEffectiveTargets'
 * existing role-group + tier resolution — not a real person. "Senior" tier is
 * genuinely a mix of role:senior_physio and experienced role:physio providers
 * with potentially different individual overrides; senior_physio is used as
 * the tier's representative since that's the primary/canonical case.
 */
const TIER_REPRESENTATIVE: Record<CvaTier, Pick<Provider, "role" | "targets">> = {
  new_grad: { role: "physio", targets: { experience_tier: "new_grad" } },
  "2_5yr": { role: "physio", targets: { experience_tier: "2_5yr" } },
  senior: { role: "senior_physio", targets: {} },
  massage: { role: "massage", targets: {} },
  ep: { role: "ep", targets: {} },
};

const TIERS: { key: CvaTier; label: string }[] = [
  { key: "new_grad", label: "New Grads" },
  { key: "2_5yr", label: "2-5 Years" },
  { key: "senior", label: "Seniors" },
  { key: "massage", label: "Massage" },
  { key: "ep", label: "EP" },
];

export interface QuarterlyProviderBreakdown {
  quarter: string;
  metrics: QuarterlyMetricDef[];
  /** Clinic Average + the 5 experience tiers — kept separate from providerColumns since averaging a tier and averaging one real person are different things. */
  tierColumns: { key: string; label: string }[];
  providerColumns: { key: string; label: string }[];
  /** metricKey -> columnKey -> quarter average */
  values: Record<string, Record<string, number | null>>;
  /** metricKey -> columnKey -> target, for red/green colouring. No target for "clinic" — a blended average across people with different individual targets doesn't have one coherent target to colour against. */
  targets: Record<string, Record<string, number | null>>;
}

function metricValueForRows(metric: QuarterlyMetricDef, rows: Record<string, unknown>[]): number | null {
  if (metric.derived === "retention") {
    return average(rows.map((r) => retentionPct(r)).filter((v): v is number => typeof v === "number"));
  }
  return average(nums(rows, metric.key));
}

/**
 * Per-provider and per-tier quarterly averages — mirrors the director's old
 * "Quarterly Retention Stats" sheet (Clinic Average / tier columns /
 * per-provider columns), computed from this app's own provider_weekly
 * history instead of being hand-maintained.
 */
export async function getQuarterlyProviderBreakdown(quarterKey: string): Promise<QuarterlyProviderBreakdown> {
  const { start, end } = quarterDateRange(parseQuarterKey(quarterKey));
  const supabase = await createClient();
  const [providersResult, weeklyResult, roleTargetsResult, weeklyKpisResult] = await Promise.all([
    supabase.from("providers").select("*").neq("role", "admin").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("provider_weekly").select("provider_id, week_ending, metrics").gte("week_ending", start).lte("week_ending", end),
    supabase.from("role_targets").select("id, values"),
    supabase.from("weekly_kpis").select("total_nc").gte("week_ending", start).lte("week_ending", end),
  ]);
  const providers = (providersResult.data ?? []) as Provider[];
  const weeklyRows = (weeklyResult.data ?? []) as { provider_id: string; week_ending: string; metrics: Record<string, unknown> | null }[];
  const roleTargets: Record<string, Record<string, unknown>> = {};
  for (const row of roleTargetsResult.data ?? []) {
    roleTargets[row.id as string] = (row.values as Record<string, unknown>) ?? {};
  }
  // New Patients is a volume count, not a rate — "Clinic Average" for it
  // should read as the clinic's own average weekly total (same total_nc
  // used on Clinic Health/the quarter summary above), not the average of
  // what one individual provider brings in (clinic total ÷ headcount,
  // which reads as a confusingly small number next to Clinic Health's
  // per-week figure). Every other metric in PROVIDER_METRICS is a
  // per-provider rate/KPI where averaging across providers is exactly the
  // point, so this is the one deliberate exception.
  const clinicWeeklyNewPatients = average(nums((weeklyKpisResult.data ?? []) as Record<string, unknown>[], "total_nc"));

  const rowsByProvider = new Map<string, Record<string, unknown>[]>();
  for (const row of weeklyRows) {
    const arr = rowsByProvider.get(row.provider_id) ?? [];
    arr.push(row.metrics ?? {});
    rowsByProvider.set(row.provider_id, arr);
  }

  const tierColumns: { key: string; label: string }[] = [{ key: "clinic", label: "Clinic Average" }, ...TIERS];
  const providerColumns: { key: string; label: string }[] = providers.map((p) => ({ key: p.id, label: p.name }));

  const values: Record<string, Record<string, number | null>> = {};
  for (const metric of PROVIDER_METRICS) {
    const col: Record<string, number | null> = {};
    const allRows: Record<string, unknown>[] = [];
    const tierRows: Record<CvaTier, Record<string, unknown>[]> = {
      new_grad: [],
      "2_5yr": [],
      senior: [],
      massage: [],
      ep: [],
    };
    for (const p of providers) {
      const rows = rowsByProvider.get(p.id) ?? [];
      allRows.push(...rows);
      const tier = cvaTierBucket(p);
      if (tier) tierRows[tier].push(...rows);
      col[p.id] = metricValueForRows(metric, rows);
    }
    col.clinic = metric.key === "new_patients" ? clinicWeeklyNewPatients : metricValueForRows(metric, allRows);
    for (const tier of TIERS) col[tier.key] = metricValueForRows(metric, tierRows[tier.key]);
    values[metric.key] = col;
  }

  const targets: Record<string, Record<string, number | null>> = {};
  for (const metric of PROVIDER_METRICS) {
    const col: Record<string, number | null> = { clinic: null };
    for (const tier of TIERS) {
      const t = getEffectiveTargets(TIER_REPRESENTATIVE[tier.key], roleTargets)[metric.key];
      col[tier.key] = typeof t === "number" ? t : null;
    }
    for (const p of providers) {
      const t = getEffectiveTargets(p, roleTargets)[metric.key];
      col[p.id] = typeof t === "number" ? t : null;
    }
    targets[metric.key] = col;
  }

  return { quarter: quarterKey, metrics: PROVIDER_METRICS, tierColumns, providerColumns, values, targets };
}
