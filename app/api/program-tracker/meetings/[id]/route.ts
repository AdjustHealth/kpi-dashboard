import { NextRequest, NextResponse } from "next/server";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { requireLogin } from "@/lib/programTracker/auth";

/** Merges one agenda item's text into meetings.notes atomically via merge_meeting_note — the same Postgres function added to fix the standalone site's identical save race, so two people saving different boxes here can't clobber each other either. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const body = (await request.json()) as { idx: number; text: string };
  if (typeof body.idx !== "number") return NextResponse.json({ error: "idx is required" }, { status: 400 });

  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase.rpc("merge_meeting_note", {
    p_meeting_id: id,
    p_idx: String(body.idx),
    p_text: body.text ?? "",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const supabase = createProgramTrackerAdminClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
