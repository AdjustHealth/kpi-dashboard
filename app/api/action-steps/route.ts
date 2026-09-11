import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shiftWeek } from "@/lib/week";
import { newActionItem } from "@/lib/actionItems";

/**
 * POST — "Carry over" an action step: appends a fresh open item with the
 * same text onto NEXT week's action_steps (or action_plan[category]) for
 * this provider, atomically (see migration 0032). The item's own week keeps
 * its "carried" status as-is (set by the normal meeting_notes PATCH from
 * the client) — this only touches next week's row.
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

  // Same FK-guard as /api/provider-weekly, via the same SECURITY DEFINER RPC
  // — see migration 0031 for why a raw upsert 403s for a scoped staff login.
  const { error: weekEnsureError } = await supabase.rpc("ensure_weekly_kpis_row", { p_week_ending: nextWeek });
  if (weekEnsureError) return NextResponse.json({ error: weekEnsureError.message }, { status: 500 });

  const item = newActionItem(text);

  // Appending the carried-over item is done atomically inside Postgres (see
  // migration 0032) rather than SELECT-then-JS-append-then-upsert — this
  // could otherwise land in the same read/write gap as a normal Meeting
  // Notes save (or another carry-over) happening on the same row and
  // silently drop it. normalizeActionItems() (still used for display) is
  // no longer needed here since the DB function appends without touching
  // the rest of the array.
  const { error } = await supabase.rpc("append_provider_weekly_action_item", {
    p_provider_id: provider_id,
    p_week_ending: nextWeek,
    p_field: field,
    p_category: category ?? null,
    p_item: item,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { carried_to: nextWeek, item } });
}
