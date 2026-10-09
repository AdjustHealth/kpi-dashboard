import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Marks a topic complete for a provider (upsert — ticking an already-complete
 * box just moves completed_at/marked_by/note forward). No role check here:
 * migration 0044_clinical_training.sql's RLS already restricts writes on
 * training_completions to directors (is_director_user()), the same trust
 * split role_targets' own PATCH route relies on — a staff login's direct API
 * call would be rejected by Postgres itself, not just hidden from its UI.
 */
export async function POST(request: NextRequest) {
  const { topicId, providerId, completedAt, markedBy, note } = (await request.json()) as {
    topicId?: string;
    providerId?: string;
    completedAt?: string;
    markedBy?: string;
    note?: string | null;
  };
  if (!topicId || !providerId || !completedAt || !markedBy) {
    return NextResponse.json({ error: "topicId, providerId, completedAt and markedBy are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_completions")
    .upsert({ topic_id: topicId, provider_id: providerId, completed_at: completedAt, marked_by: markedBy, note: note ?? null }, { onConflict: "topic_id,provider_id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

/** Unticks a topic for a provider — removes the completion row entirely rather than flagging it incomplete, since there's no "undo" value in keeping a stale completed_at/marked_by around. */
export async function DELETE(request: NextRequest) {
  const { topicId, providerId } = (await request.json()) as { topicId?: string; providerId?: string };
  if (!topicId || !providerId) return NextResponse.json({ error: "topicId and providerId are required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("training_completions").delete().eq("topic_id", topicId).eq("provider_id", providerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: true });
}
