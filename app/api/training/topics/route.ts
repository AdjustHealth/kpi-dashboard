import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Adds a new topic to a Clinical Training group — director-only via RLS (see migration 0044_clinical_training.sql), same trust split as the completions route. */
export async function POST(request: NextRequest) {
  const { trainingGroup, category, name, description } = (await request.json()) as {
    trainingGroup?: string;
    category?: string | null;
    name?: string;
    description?: string | null;
  };
  if (!trainingGroup || !name) return NextResponse.json({ error: "trainingGroup and name are required" }, { status: 400 });

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("training_topics")
    .select("sort_order")
    .eq("training_group", trainingGroup)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((existing?.sort_order as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("training_topics")
    .insert({ training_group: trainingGroup, category: category ?? null, name, description: description ?? null, sort_order: sortOrder })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
