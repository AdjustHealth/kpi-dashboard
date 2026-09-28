import { createClient } from "@/lib/supabase/server";
import { recentWeeks, shiftWeek } from "@/lib/week";
import { Provider, ProviderWeekly } from "@/lib/types";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

/**
 * Retention Rate is the complement of Unretained %, derived live from the
 * same raw "Unretained" count and cancellation total shown on the KPI
 * Scorecard (clinicians: cancellations, admin: cancellations_handled) —
 * NOT from the separately-stored *_pct fields the Nookal parse also writes.
 * Those percentages are computed once at upload time and go stale the
 * moment either raw count is hand-corrected afterwards (the KPI Scorecard
 * cells are editable, and a save only PATCHes the field actually typed —
 * see app/api/provider-weekly), leaving Retention Rate silently
 * contradicting the very counts it's meant to summarise.
 */
export function retentionPct(metrics: Record<string, unknown>): number | undefined {
  const notRebooked = metrics.not_rebooked;
  const total = metrics.cancellations ?? metrics.cancellations_handled;
  if (typeof notRebooked !== "number" || typeof total !== "number" || total <= 0) return undefined;
  return 1 - notRebooked / total;
}

/** New patients are checked in on 6 weeks after their first visit — director's own clinical follow-up cadence. */
export const SIX_WEEK_REVIEW_OFFSET = 6;

export async function getProviderDetailData(providerId: string, week: string, historyWeeks = 12) {
  const supabase = await createClient();
  const weeks = recentWeeks(week, historyWeeks);
  const sixWeeksAgo = shiftWeek(week, -SIX_WEEK_REVIEW_OFFSET);

  const [providerResult, historyResult, sixWeekAgoResult] = await Promise.all([
    supabase.from("providers").select("*").eq("id", providerId).maybeSingle(),
    supabase
      .from("provider_weekly")
      .select("*")
      .eq("provider_id", providerId)
      .in("week_ending", weeks),
    // historyWeeks is usually a short trailing window (charts only need the
    // last few weeks) and rarely reaches back 6 weeks, so this is fetched
    // separately rather than assumed to already be in `weeks` above.
    supabase
      .from("provider_weekly")
      .select("metrics")
      .eq("provider_id", providerId)
      .eq("week_ending", sixWeeksAgo)
      .maybeSingle(),
  ]);

  const provider = providerResult.data as Provider | null;
  const rows = (historyResult.data ?? []) as ProviderWeekly[];
  const rowsByWeek = new Map(rows.map((r) => [r.week_ending, r]));

  const sixWeekAgoNames = sixWeekAgoResult.data?.metrics?.new_patient_names;
  const sixWeekReviewNames = Array.isArray(sixWeekAgoNames) ? (sixWeekAgoNames as string[]) : [];

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

  // Whichever provider has a "memberships" specialty metric (currently just
  // Sam) no longer types this in by hand — it's the exact same live count
  // shown on the Revenue page's "Paid Gym Members" tile, kept in sync here
  // so the two numbers can't drift apart. Recorded into provider_weekly too
  // (not just shown), so the trend chart/bonus history for this week has a
  // real value without anyone having to enter one.
  const hasMembershipsField = provider?.specialty_metrics?.some((m) => m.key === "memberships" && m.source !== "calc") ?? false;
  const currentEntry = history[history.length - 1];
  if (hasMembershipsField && provider && currentEntry?.week_ending === week) {
    // Imported lazily — this module also backs tests/providerData.test.ts
    // (for the pure retentionPct helper), and a static top-level import
    // would drag in server-only's import-time throw under plain Node/vitest.
    const { getPaidGymMemberCount } = await import("@/lib/programTracker/getPaidGymMemberCount");
    const liveCount = await getPaidGymMemberCount();
    if (liveCount !== null && currentEntry.metrics.memberships !== liveCount) {
      currentEntry.metrics = { ...currentEntry.metrics, memberships: liveCount };
      const { error: ensureError } = await supabase.rpc("ensure_weekly_kpis_row", { p_week_ending: week });
      if (!ensureError) {
        await supabase.rpc("merge_provider_weekly_section", {
          p_provider_id: providerId,
          p_week_ending: week,
          p_section: "metrics",
          p_patch: { memberships: liveCount },
        });
      }
    }
  }

  return {
    provider,
    history,
    currentMeetingNotes: current?.meeting_notes ?? {},
    previousMeetingNotes,
    sixWeekReviewNames,
    sixWeekReviewWeek: sixWeeksAgo,
  };
}

