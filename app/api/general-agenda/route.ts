import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * The "General" agenda box shown on every provider/senior/admin meeting
 * page for a given week — filled in once and shared by everyone that week,
 * unlike each provider's own "Individual" agenda_items in
 * provider_weekly.meeting_notes. See components/provider/MeetingNotesCard.tsx.
 */
export async function PATCH(request: NextRequest) {
  const { week_ending, text } = (await request.json()) as { week_ending?: string; text?: string };
  if (!week_ending || typeof text !== "string") {
    return NextResponse.json({ error: "week_ending and text are required" }, { status: 400 });
  }

  const supabase = await createClient();

  // general_agenda_items.week_ending has a foreign key into
  // weekly_kpis(week_ending), same reason /api/provider-weekly ensures this
  // first — see migration 0031.
  const { error: ensureError } = await supabase.rpc("ensure_weekly_kpis_row", { p_week_ending: week_ending });
  if (ensureError) return NextResponse.json({ error: ensureError.message }, { status: 500 });

  const { error } = await supabase.from("general_agenda_items").upsert({ week_ending, text }, { onConflict: "week_ending" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
