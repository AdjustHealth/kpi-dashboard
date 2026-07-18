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

export interface ClinicWideCvaRollup {
  avgCva: number | null;
  avgNcva: number | null;
  totalTpr: number | null;
  providerCount: number;
}

export interface ProviderNewClients {
  providerName: string;
  names: string[];
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
    avgCva: cvas.length > 0 ? cvas.reduce((a, b) => a + b, 0) / cvas.length : null,
    avgNcva: ncvas.length > 0 ? ncvas.reduce((a, b) => a + b, 0) / ncvas.length : null,
    totalTpr: tprs.length > 0 ? tprs.reduce((a, b) => a + b, 0) : null,
    providerCount: cvas.length,
  };
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
