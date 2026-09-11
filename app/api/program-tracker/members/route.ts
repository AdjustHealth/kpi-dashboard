import { NextRequest, NextResponse } from "next/server";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { requireLogin } from "@/lib/programTracker/auth";
import { addWeeks, calcDueStatus, holdEndOf } from "@/lib/programTracker/date";
import { Member, MemberInput } from "@/lib/programTracker/types";

export async function GET() {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;

  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase.from("members").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // due_status is recomputed live, never trusted from the stored column —
  // it depends on today's date and hold_end, so a stored value goes stale
  // the moment time passes without anyone re-saving the row.
  const members: Member[] = ((data ?? []) as Member[]).map((m) => ({
    ...m,
    due_status: calcDueStatus(m.next_due, m.status, holdEndOf(m)),
  }));

  return NextResponse.json({ data: members });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as MemberInput;
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const weeks = body.block_weeks || 4;
  const computedNextDue = body.block_start ? addWeeks(body.block_start, weeks) : null;
  const holdStart = body.status === "Hold" ? body.hold_start : null;
  const holdWeeks = body.status === "Hold" ? body.hold_weeks : null;
  const dueStatus = calcDueStatus(computedNextDue, body.status, holdEndOf({ hold_start: holdStart, hold_weeks: holdWeeks }));

  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase
    .from("members")
    .insert({
      name: body.name.trim(),
      coach: body.coach || null,
      type: body.type || null,
      status: body.status,
      block_start: body.block_start || null,
      block_weeks: weeks,
      next_due: computedNextDue,
      due_status: dueStatus,
      hold_start: holdStart,
      hold_weeks: holdWeeks,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
