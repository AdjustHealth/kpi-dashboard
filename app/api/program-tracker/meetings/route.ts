import { NextRequest, NextResponse } from "next/server";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { requireSection } from "@/lib/requireLogin";
import { thisWednesday, addWeeks } from "@/lib/programTracker/date";

export async function GET() {
  const unauthorized = await requireSection("adjust_gym");
  if (unauthorized) return unauthorized;

  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase.from("meetings").select("*").order("meeting_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

/**
 * Creates this week's meeting (Wednesday) if it doesn't already exist — same
 * one-per-week rule as the standalone site. Pass `{ "which": "next" }` to
 * create NEXT week's instead, so an agenda can be prepped ahead of time
 * rather than only once that week's own Wednesday has come around.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireSection("adjust_gym");
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({}));
  const which = (body as { which?: string })?.which === "next" ? "next" : "this";
  const wed = which === "next" ? addWeeks(thisWednesday(), 1) : thisWednesday();

  const supabase = createProgramTrackerAdminClient();
  const { data: existing } = await supabase.from("meetings").select("id").eq("meeting_date", wed).maybeSingle();
  if (existing) return NextResponse.json({ error: `Meeting for ${which === "next" ? "next" : "this"} week already exists` }, { status: 409 });

  const { data, error } = await supabase.from("meetings").insert({ meeting_date: wed, notes: {} }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
