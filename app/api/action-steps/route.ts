import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shiftWeek } from "@/lib/week";
import { normalizeActionItems, newActionItem } from "@/lib/actionItems";

/**
 * POST — "Carry over" an action step: appends a fresh open item with the
 * same text onto NEXT week's action_steps (or action_plan[category]) for
 * this provider, read-merge-write same as the weekly_kpis carry-forward
 * side effects (bookings_following_week, m_pod_fortnightly). The item's
 * own week keeps its "carried" status as-is (set by the normal meeting_notes
 * PATCH from the client) — this only touches next week's row.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider_id, week_ending, field, category, text } = body as {
    provider_id?: string;
    week_ending?: string;
    field?: "action_steps" | "action_plan";
    category?: string;
    text?: string;
  };

  if (!provider_id || !week_ending || !field || !text) {
    return NextResponse.json({ error: "provider_id, week_ending, field, and text are required" }, { status: 400 });
  }
  if (field === "action_plan" && !category) {
    return NextResponse.json({ error: "category is required for action_plan" }, { status: 400 });
  }

  const supabase = await createClient();
  const nextWeek = shiftWeek(week_ending, 1);

  // Same FK-guard as /api/provider-weekly — a week only gets a weekly_kpis
  // row via a Nookal upload, so carrying into a week that hasn't had one
  // yet would otherwise fail with no visible reason.
  const { error: weekEnsureError } = await supabase
    .from("weekly_kpis")
    .upsert({ week_ending: nextWeek }, { onConflict: "week_ending", ignoreDuplicates: true });
  if (weekEnsureError) return NextResponse.json({ error: weekEnsureError.message }, { status: 500 });

  const { data: existing, error: fetchError } = await supabase
    .from("provider_weekly")
    .select("meeting_notes")
    .eq("provider_id", provider_id)
    .eq("week_ending", nextWeek)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const meetingNotes = (existing?.meeting_notes as Record<string, unknown>) ?? {};
  const item = newActionItem(text);

  let patchedNotes: Record<string, unknown>;
  if (field === "action_steps") {
    const items = normalizeActionItems(meetingNotes.action_steps);
    patchedNotes = { ...meetingNotes, action_steps: [...items, item] };
  } else {
    const plan = (meetingNotes.action_plan as Record<string, unknown>) ?? {};
    const items = normalizeActionItems(plan[category as string]);
    patchedNotes = { ...meetingNotes, action_plan: { ...plan, [category as string]: [...items, item] } };
  }

  const { error } = await supabase
    .from("provider_weekly")
    .upsert({ provider_id, week_ending: nextWeek, meeting_notes: patchedNotes }, { onConflict: "provider_id,week_ending" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { carried_to: nextWeek, item } });
}
