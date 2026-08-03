import { createClient } from "@/lib/supabase/server";
import { recentWeeks, shiftWeek } from "@/lib/week";
import { Provider, ProviderWeekly } from "@/lib/types";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

/**
 * Retention Rate is the complement of Not Rebooked % — computed here rather
 * than stored, so it's never out of sync with whichever "not rebooked"
 * field a role actually has (clinicians: not_rebooked_pct, admin:
 * cancellations_not_rebooked_pct).
 */
export function retentionPct(metrics: Record<string, unknown>): number | undefined {
  const notRebooked = metrics.not_rebooked_pct ?? metrics.cancellations_not_rebooked_pct;
  return typeof notRebooked === "number" ? 1 - notRebooked : undefined;
}

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

  const history: WeekMetrics[] = weeks.map((w) => {
    const metrics = rowsByWeek.get(w)?.metrics ?? {};
    return {
      week_ending: w,
      metrics: { ...metrics, retention_pct: retentionPct(metrics) },
      kpas: rowsByWeek.get(w)?.kpas ?? {},
    };
  });

  const current = rowsByWeek.get(week);

  // Last week's Action Steps/Action Plan — carried into this week's "Review
  // from Last Week / Action Steps" field (see MeetingNotesCard) so the team
  // sees what they committed to at the top of the next meeting instead of
  // starting from a blank box. Only reaches back one week (not a chain of
  // "last non-empty week") since action_steps/action_plan is the durable
  // per-week record this is sourced from.
  const previousMeetingNotes = rowsByWeek.get(shiftWeek(week, -1))?.meeting_notes ?? {};

  return {
    provider,
    history,
    currentMeetingNotes: current?.meeting_notes ?? {},
    previousMeetingNotes,
  };
}

