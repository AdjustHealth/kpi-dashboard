import { createClient } from "@/lib/supabase/server";
import { recentWeeks } from "@/lib/week";
import { Provider, ProviderWeekly } from "@/lib/types";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

export async function getProviderDetailData(providerId: string, week: string, historyWeeks = 12) {
  const supabase = await createClient();
  const weeks = recentWeeks(week, historyWeeks);

  const [providerResult, historyResult] = await Promise.all([
    supabase.from("providers").select("*").eq("id", providerId).maybeSingle(),
    supabase
      .from("provider_weekly")
      .select("*")
      .eq("provider_id", providerId)
      .in("week_ending", weeks),
  ]);

  const provider = providerResult.data as Provider | null;
  const rows = (historyResult.data ?? []) as ProviderWeekly[];
  const rowsByWeek = new Map(rows.map((r) => [r.week_ending, r]));

  const history: WeekMetrics[] = weeks.map((w) => ({
    week_ending: w,
    metrics: rowsByWeek.get(w)?.metrics ?? {},
  }));

  const current = rowsByWeek.get(week);

  return {
    provider,
    history,
    currentKpas: current?.kpas ?? {},
    currentMeetingNotes: current?.meeting_notes ?? {},
  };
}

export async function getClinicJbvHistory(week: string, historyWeeks = 12): Promise<(number | null)[]> {
  const supabase = await createClient();
  const weeks = recentWeeks(week, historyWeeks);
  const { data } = await supabase
    .from("weekly_kpis")
    .select("week_ending, jbv_total")
    .in("week_ending", weeks);

  const byWeek = new Map((data ?? []).map((r) => [r.week_ending as string, r.jbv_total as number | null]));
  return weeks.map((w) => byWeek.get(w) ?? null);
}
