import { createClient } from "@/lib/supabase/server";
import { quarterDateRange, parseQuarterKey, quarterKeyString, quarterOfWeek } from "@/lib/quarter";
import { cvaTierBucket, CvaTier } from "@/lib/cvaTier";
import { retentionPct } from "@/lib/providerData";
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
}

/** Clinic-wide quarter rollup — $/count fields summed for the quarter, rate/% fields averaged across its weeks. */
export async function getQuarterlyClinicStats(quarterKey: string): Promise<QuarterlyClinicStats> {
  const { start, end } = quarterDateRange(parseQuarterKey(quarterKey));
  const supabase = await createClient();
  const { data } = await supabase.from("weekly_kpis").select("*").gte("week_ending", start).lte("week_ending", end);
  const rows = (data ?? []) as Record<string, unknown>[];

  const onlineTotal = sum(nums(rows, "online_bookings_total"));
  const onlineNew = sum(nums(rows, "online_bookings_new"));
  const retentionValues = rows
    .map((r) => (typeof r.cx_nr_pct === "number" ? 1 - (r.cx_nr_pct as number) : null))
    .filter((v): v is number => v !== null);

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
    onlineBookingPct: onlineTotal !== null && onlineTotal > 0 && onlineNew !== null ? onlineNew / onlineTotal : null,
  };
}

export interface QuarterlyMetricDef {
  key: string;
  label: string;
  type: ClinicFieldType;
  decimals?: number;
  /** "retention" reads not_rebooked_pct (or the admin equivalent) and inverts it, same as retentionPct(). */
  derived?: "retention";
}

const PROVIDER_METRICS: QuarterlyMetricDef[] = [
  { key: "turnover", label: "Turnover (avg/wk)", type: "currency" },
  { key: "fba", label: "Forward Booking Average", type: "decimal", decimals: 1 },
  { key: "occupancy_pct", label: "Occupancy", type: "percent" },
  { key: "ucva", label: "UCVA", type: "decimal", decimals: 1 },
  { key: "ncva", label: "NCVA", type: "decimal", decimals: 1 },
  { key: "tpr", label: "TPR", type: "currency" },
  { key: "new_patients", label: "New Patients (avg/wk)", type: "decimal", decimals: 1 },
  { key: "cancellations", label: "Cancellations (avg/wk)", type: "decimal", decimals: 1 },
  { key: "reschedule_rate_pct", label: "Reschedule Rate", type: "percent" },
  { key: "retention_pct", label: "Retention Rate", type: "percent", derived: "retention" },
];

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
  columns: { key: string; label: string }[];
  /** metricKey -> columnKey -> quarter average */
  values: Record<string, Record<string, number | null>>;
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
  const [providersResult, weeklyResult] = await Promise.all([
    supabase.from("providers").select("*").neq("role", "admin").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("provider_weekly").select("provider_id, week_ending, metrics").gte("week_ending", start).lte("week_ending", end),
  ]);
  const providers = (providersResult.data ?? []) as Provider[];
  const weeklyRows = (weeklyResult.data ?? []) as { provider_id: string; week_ending: string; metrics: Record<string, unknown> | null }[];

  const rowsByProvider = new Map<string, Record<string, unknown>[]>();
  for (const row of weeklyRows) {
    const arr = rowsByProvider.get(row.provider_id) ?? [];
    arr.push(row.metrics ?? {});
    rowsByProvider.set(row.provider_id, arr);
  }

  const columns: { key: string; label: string }[] = [
    { key: "clinic", label: "Clinic Average" },
    ...TIERS,
    ...providers.map((p) => ({ key: p.id, label: p.name })),
  ];

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
    col.clinic = metricValueForRows(metric, allRows);
    for (const tier of TIERS) col[tier.key] = metricValueForRows(metric, tierRows[tier.key]);
    values[metric.key] = col;
  }

  return { quarter: quarterKey, metrics: PROVIDER_METRICS, columns, values };
}
