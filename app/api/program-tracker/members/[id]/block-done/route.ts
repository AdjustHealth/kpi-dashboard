import { NextResponse } from "next/server";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { requireLogin } from "@/lib/programTracker/auth";
import { addWeeks, calcDueStatus, nextMonday } from "@/lib/programTracker/date";
import { Member } from "@/lib/programTracker/types";

/** Archives the current block, then rolls block_start to next Monday and next_due forward — same as the Program Tracker's own "✓ Done" button. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const supabase = createProgramTrackerAdminClient();
  const { data: member, error: fetchError } = await supabase.from("members").select("*").eq("id", id).single();
  if (fetchError || !member) return NextResponse.json({ error: fetchError?.message ?? "Member not found" }, { status: 404 });
  const m = member as Member;

  const weeks = m.block_weeks || 4;
  const newStart = nextMonday();
  const newNextDue = addWeeks(newStart, weeks);
  const newDueStatus = calcDueStatus(newNextDue, m.status, null);

  const { error: archiveError } = await supabase.from("archive").insert({
    member_id: m.id,
    name: m.name,
    coach: m.coach,
    type: m.type,
    status: m.status,
    block_start: m.block_start,
    block_weeks: weeks,
    next_due: m.next_due,
    notes: m.notes,
    archive_type: "block_complete",
  });
  if (archiveError) return NextResponse.json({ error: archiveError.message }, { status: 500 });

  const { data, error: updateError } = await supabase
    .from("members")
    .update({ block_start: newStart, next_due: newNextDue, due_status: newDueStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ data });
}
