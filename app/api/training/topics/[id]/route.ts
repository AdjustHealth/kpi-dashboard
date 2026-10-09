import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Edits a topic's name/category/description — director-only via RLS (see migration 0044_clinical_training.sql), same trust split as every other Clinical Training write. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { category, name, description } = (await request.json()) as {
    category?: string | null;
    name?: string;
    description?: string | null;
  };
  if (name !== undefined && !name.trim()) return NextResponse.json({ error: "name can't be blank" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (category !== undefined) patch.category = category;
  if (name !== undefined) patch.name = name.trim();
  if (description !== undefined) patch.description = description;

  const supabase = await createClient();
  const { data, error } = await supabase.from("training_topics").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/** Removes a topic entirely — cascades to every completion recorded against it (training_completions' on delete cascade). Director-only via RLS. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("training_topics").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: true });
}
