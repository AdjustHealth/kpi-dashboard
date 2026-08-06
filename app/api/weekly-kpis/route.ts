import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { shiftWeek } from "@/lib/week";

export async function GET(request: NextRequest) {
  const week = request.nextUrl.searchParams.get("week");
  if (!week) {
    return NextResponse.json({ error: "week is required" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_kpis")
    .select("*")
    .eq("week_ending", week)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? { week_ending: week } });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { week_ending, patch } = body as { week_ending?: string; patch?: Record<string, unknown> };
  if (!week_ending || !patch) {
    return NextResponse.json({ error: "week_ending and patch are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_kpis")
    .upsert({ week_ending, ...patch }, { onConflict: "week_ending" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // "Total Bookings for Following Week" IS next week's "Bookings at Start
  // of Week" — the same number either way, so carry it forward
  // automatically instead of it being retyped every week.
  if ("bookings_following_week" in patch) {
    const { error: carryError } = await supabase.from("weekly_kpis").upsert(
      { week_ending: shiftWeek(week_ending, 1), bookings_start_week: patch.bookings_following_week },
      { onConflict: "week_ending" }
    );
    if (carryError) return NextResponse.json({ error: carryError.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
