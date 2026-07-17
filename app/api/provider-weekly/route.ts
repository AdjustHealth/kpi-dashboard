import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const providerId = params.get("provider_id");
  const week = params.get("week_ending");
  const weeksParam = params.get("weeks"); // comma-separated week_ending list

  const supabase = await createClient();
  let query = supabase.from("provider_weekly").select("*");

  if (providerId) query = query.eq("provider_id", providerId);
  if (week) query = query.eq("week_ending", week);
  if (weeksParam) query = query.in("week_ending", weeksParam.split(","));

  const { data, error } = await query.order("week_ending", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

const JSONB_SECTIONS = ["metrics", "kpas", "meeting_notes"] as const;
type JsonbSection = (typeof JSONB_SECTIONS)[number];

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { provider_id, week_ending, section, patch } = body as {
    provider_id?: string;
    week_ending?: string;
    section?: JsonbSection;
    patch?: Record<string, unknown>;
  };

  if (!provider_id || !week_ending || !section || !patch) {
    return NextResponse.json(
      { error: "provider_id, week_ending, section, and patch are required" },
      { status: 400 }
    );
  }
  if (!JSONB_SECTIONS.includes(section)) {
    return NextResponse.json({ error: "invalid section" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("provider_weekly")
    .select(section)
    .eq("provider_id", provider_id)
    .eq("week_ending", week_ending)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const existingRow = existing as unknown as Record<string, Record<string, unknown>> | null;
  const existingSection = existingRow?.[section] ?? {};
  const merged = { ...existingSection, ...patch };

  const { data, error } = await supabase
    .from("provider_weekly")
    .upsert(
      { provider_id, week_ending, [section]: merged },
      { onConflict: "provider_id,week_ending" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
