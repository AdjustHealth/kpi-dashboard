import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinic_targets")
    .select("*")
    .eq("id", "clinic")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? { id: "clinic", values: {} } });
}

export async function PATCH(request: NextRequest) {
  const { patch } = (await request.json()) as { patch?: Record<string, unknown> };
  if (!patch) return NextResponse.json({ error: "patch is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("clinic_targets")
    .select("values")
    .eq("id", "clinic")
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const merged = { ...(existing?.values ?? {}), ...patch };
  const { data, error } = await supabase
    .from("clinic_targets")
    .upsert({ id: "clinic", values: merged }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
