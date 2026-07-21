import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const includeInactive = request.nextUrl.searchParams.get("all") === "1";
  const supabase = await createClient();
  let query = supabase.from("providers").select("*").order("sort_order");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("providers")
    .insert({
      name: body.name,
      role: body.role,
      specialty_metrics: body.specialty_metrics ?? [],
      targets: body.targets ?? {},
      sort_order: body.sort_order ?? 0,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, targets_patch, goals, fields } = body as {
    id?: string;
    targets_patch?: Record<string, unknown>;
    /** Full replacement — there are always exactly 3 fixed slots, so the caller just sends the whole array. */
    goals?: { text: string; achieved: boolean }[];
    fields?: Record<string, unknown>;
  };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createClient();
  const update: Record<string, unknown> = { ...(fields ?? {}) };

  if (targets_patch) {
    const { data: existing, error: fetchError } = await supabase
      .from("providers")
      .select("targets")
      .eq("id", id)
      .single();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    update.targets = { ...(existing?.targets ?? {}), ...targets_patch };
  }

  if (goals) update.goals = goals;

  const { data, error } = await supabase
    .from("providers")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
