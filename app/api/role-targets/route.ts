import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("role_targets").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const { id, patch } = (await request.json()) as { id?: string; patch?: Record<string, unknown> };
  if (!id || !patch) return NextResponse.json({ error: "id and patch are required" }, { status: 400 });

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("role_targets")
    .select("values")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const merged = { ...(existing?.values ?? {}), ...patch };
  const { data, error } = await supabase
    .from("role_targets")
    .upsert({ id, values: merged }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
