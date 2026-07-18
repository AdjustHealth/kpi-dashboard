import { createClient } from "@/lib/supabase/server";
import { recentWeeks } from "@/lib/week";

export interface ClinicWeekRow {
  week_ending: string;
  [key: string]: unknown;
}

export async function getClinicHistory(week: string, historyWeeks = 12): Promise<ClinicWeekRow[]> {
  const supabase = await createClient();
  const weeks = recentWeeks(week, historyWeeks);
  const { data } = await supabase.from("weekly_kpis").select("*").in("week_ending", weeks);
  const byWeek = new Map((data ?? []).map((r) => [r.week_ending as string, r as ClinicWeekRow]));
  return weeks.map((w) => byWeek.get(w) ?? { week_ending: w });
}

export async function getClinicTargets(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data } = await supabase.from("clinic_targets").select("values").eq("id", "clinic").maybeSingle();
  return data?.values ?? {};
}

/** Role-level target sets ("providers" / "senior" / "admin"), keyed by group id — see lib/targetsSchema.ts. */
export async function getRoleTargets(): Promise<Record<string, Record<string, unknown>>> {
  const supabase = await createClient();
  const { data } = await supabase.from("role_targets").select("id, values");
  const out: Record<string, Record<string, unknown>> = {};
  for (const row of data ?? []) {
    out[row.id as string] = (row.values as Record<string, unknown>) ?? {};
  }
  return out;
}

export interface ClinicWideCvaRollup {
  avgCva: number | null;
  avgNcva: number | null;
  /** TPR is already a per-provider total (e.g. 5 consults x $100 = $500) — the clinic-wide figure averages those totals across providers, it doesn't sum them again. */
  avgTpr: number | null;
  providerCount: number;
}

export interface ProviderNewClients {
  providerName: string;
  names: string[];
}

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/**
 * A clinic-level rollup of provider CVA/NCVA/TPR — no dedicated Weekly
 * Input field for this exists, so it's computed on the fly from that
 * week's provider_weekly rows rather than typed in separately.
 */
export async function getClinicWideCvaRollup(week: string): Promise<ClinicWideCvaRollup> {
  const supabase = await createClient();
  const [providersResult, weeklyResult] = await Promise.all([
    supabase.from("providers").select("id, role").eq("active", true),
    supabase.from("provider_weekly").select("provider_id, metrics").eq("week_ending", week),
  ]);
  const clinicianIds = new Set(
    (providersResult.data ?? []).filter((p) => p.role !== "admin").map((p) => p.id as string)
  );
  const rows = (weeklyResult.data ?? []).filter((r) => clinicianIds.has(r.provider_id as string));

  const cvas = rows.map((r) => (r.metrics as Record<string, unknown>)?.ucva).filter((v): v is number => typeof v === "number");
  const ncvas = rows.map((r) => (r.metrics as Record<string, unknown>)?.ncva).filter((v): v is number => typeof v === "number");
  const tprs = rows.map((r) => (r.metrics as Record<string, unknown>)?.tpr).filter((v): v is number => typeof v === "number");

  return {
    avgCva: average(cvas),
    avgNcva: average(ncvas),
    avgTpr: average(tprs),
    providerCount: cvas.length,
  };
}

export interface ProviderCvaSeries {
  providerName: string;
  role: string;
  points: { week_ending: string; value: number | null }[];
}

/** Each active clinician's own value for a given provider_weekly.metrics key over time, for a per-provider comparison chart. */
export async function getProviderMetricHistory(
  week: string,
  historyWeeks: number,
  metricKey: string
): Promise<ProviderCvaSeries[]> {
  const supabase = await createClient();
  const weeks = recentWeeks(week, historyWeeks);
  const [providersResult, weeklyResult] = await Promise.all([
    supabase.from("providers").select("id, name, role").eq("active", true).order("sort_order"),
    supabase.from("provider_weekly").select("provider_id, week_ending, metrics").in("week_ending", weeks),
  ]);
  const providers = (providersResult.data ?? []) as { id: string; name: string; role: string }[];
  const rows = (weeklyResult.data ?? []) as { provider_id: string; week_ending: string; metrics: Record<string, unknown> }[];
  const byProviderWeek = new Map(rows.map((r) => [`${r.provider_id}:${r.week_ending}`, r.metrics]));

  return providers
    .filter((p) => p.role !== "admin")
    .map((p) => ({
      providerName: p.name,
      role: p.role,
      points: weeks.map((w) => {
        const v = byProviderWeek.get(`${p.id}:${w}`)?.[metricKey];
        return { week_ending: w, value: typeof v === "number" ? v : null };
      }),
    }))
    .filter((s) => s.points.some((pt) => pt.value !== null));
}

/** Each clinician's list of new patients this week (from the Clients & Cases upload), for the director to review. */
export async function getNewClientsByProvider(week: string): Promise<ProviderNewClients[]> {
  const supabase = await createClient();
  const [providersResult, weeklyResult] = await Promise.all([
    supabase.from("providers").select("id, name, role").eq("active", true).order("sort_order"),
    supabase.from("provider_weekly").select("provider_id, metrics").eq("week_ending", week),
  ]);
  const providers = (providersResult.data ?? []) as { id: string; name: string; role: string }[];
  const metricsByProvider = new Map(
    (weeklyResult.data ?? []).map((r) => [r.provider_id as string, r.metrics as Record<string, unknown>])
  );

  return providers
    .filter((p) => p.role !== "admin")
    .map((p) => {
      const names = metricsByProvider.get(p.id)?.new_patient_names;
      return { providerName: p.name, names: Array.isArray(names) ? (names as string[]) : [] };
    })
    .filter((p) => p.names.length > 0);
}
