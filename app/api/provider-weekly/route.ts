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

  // provider_weekly.week_ending has a foreign key into weekly_kpis(week_ending)
  // — a week only ever gets a weekly_kpis row via a Nookal upload, so any save
  // on a provider/admin/senior page for a week that hasn't had one uploaded
  // yet (e.g. navigating ahead to a future week) fails this FK with no
  // visible reason beyond "couldn't save". Ensure a placeholder row exists
  // first — ignoreDuplicates means this never touches real data that's
  // already there.
  const { error: weekEnsureError } = await supabase
    .from("weekly_kpis")
    .upsert({ week_ending }, { onConflict: "week_ending", ignoreDuplicates: true });
  if (weekEnsureError) return NextResponse.json({ error: weekEnsureError.message }, { status: 500 });

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
