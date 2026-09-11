import { NextResponse } from "next/server";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { requireLogin } from "@/lib/programTracker/auth";
import { Member } from "@/lib/programTracker/types";

/** Moves a member to Cancelled — archives their current state, then removes the live row. Same as the Program Tracker's own "Remove from tracker" action. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const supabase = createProgramTrackerAdminClient();
  const { data: member, error: fetchError } = await supabase.from("members").select("*").eq("id", id).single();
  if (fetchError || !member) return NextResponse.json({ error: fetchError?.message ?? "Member not found" }, { status: 404 });
  const m = member as Member;

  const { error: archiveError } = await supabase.from("archive").insert({
    member_id: m.id,
    name: m.name,
    coach: m.coach,
    type: m.type,
    status: "Cancelled",
    block_start: m.block_start,
    block_weeks: m.block_weeks,
    next_due: m.next_due,
    notes: m.notes,
    archive_type: "cancelled",
  });
  if (archiveError) return NextResponse.json({ error: archiveError.message }, { status: 500 });

  const { error: deleteError } = await supabase.from("members").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
