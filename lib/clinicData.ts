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
