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

function hasActionContent(notes: Record<string, unknown> | undefined): boolean {
  if (!notes) return false;
  const steps = notes.action_steps;
  const plan = notes.action_plan;
  return (
    (Array.isArray(steps) && steps.length > 0) || (plan !== null && typeof plan === "object" && Object.keys(plan as object).length > 0)
  );
}

/**
 * The most recent REAL meeting's Action Steps/Action Plan, for carrying
 * into this week's "Review from Last Week / Action Steps" field (see
 * MeetingNotesCard) so the team sees what they committed to at the top of
 * the next meeting instead of starting from a blank box. Walks backward
 * through `rowsByWeek` (up to `historyWeeks`) for the most recent week that
 * actually has action content, rather than hardcoding exactly one week
 * back — a provider away on leave has empty weeks with nothing typed in,
 * and hardcoding one week back used to silently drop their real last
 * action items the moment the gap was more than one week, even though that
 * data was still sitting right there in the older week's row, just never
 * looked at.
 */
export function findPreviousActionNotes(
  rowsByWeek: Map<string, { meeting_notes?: Record<string, unknown> }>,
  week: string,
  historyWeeks: number
): Record<string, unknown> {
  for (let weeksBack = 1; weeksBack <= historyWeeks; weeksBack++) {
    const candidate = rowsByWeek.get(shiftWeek(week, -weeksBack))?.meeting_notes;
    if (hasActionContent(candidate)) return candidate!;
  }
  return {};
}

export async function getProviderDetailData(providerId: string, week: string, historyWeeks = 12) {
  const supabase = await createClient();
  const weeks = recentWeeks(week, historyWeeks);
  const sixWeeksAgo = shiftWeek(week, -SIX_WEEK_REVIEW_OFFSET);

  const [providerResult, historyResult, sixWeekAgoResult, generalAgendaResult] = await Promise.all([
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
    // Shared across every provider's meeting for the week — see
    // components/provider/MeetingNotesCard.tsx's General Agenda Items.
    // Falls back to "" (below) if the table isn't there yet or the query
    // errors, rather than taking the whole page down with it.
    supabase.from("general_agenda_items").select("text").eq("week_ending", week).maybeSingle(),
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

  const previousMeetingNotes = findPreviousActionNotes(rowsByWeek, week, historyWeeks);

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

  const generalAgendaText = typeof generalAgendaResult.data?.text === "string" ? generalAgendaResult.data.text : "";

  return {
    provider,
    history,
    currentMeetingNotes: current?.meeting_notes ?? {},
    previousMeetingNotes,
    sixWeekReviewNames,
    sixWeekReviewWeek: sixWeeksAgo,
    generalAgendaText,
  };
}

