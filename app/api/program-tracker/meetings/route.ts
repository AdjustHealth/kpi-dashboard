import { NextResponse } from "next/server";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { requireLogin } from "@/lib/programTracker/auth";
import { thisWednesday } from "@/lib/programTracker/date";

export async function GET() {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;

  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase.from("meetings").select("*").order("meeting_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

/** Creates this week's meeting (Wednesday) if it doesn't already exist — same one-per-week rule as the standalone site. */
export async function POST() {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;

  const wed = thisWednesday();
  const supabase = createProgramTrackerAdminClient();
  const { data: existing } = await supabase.from("meetings").select("id").eq("meeting_date", wed).maybeSingle();
  if (existing) return NextResponse.json({ error: "Meeting for this week already exists" }, { status: 409 });

  const { data, error } = await supabase.from("meetings").insert({ meeting_date: wed, notes: {} }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
