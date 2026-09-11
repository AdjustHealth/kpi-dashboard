import { NextRequest, NextResponse } from "next/server";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { requireLogin } from "@/lib/programTracker/auth";
import { addWeeks, calcDueStatus, holdEndOf } from "@/lib/programTracker/date";
import { MemberInput } from "@/lib/programTracker/types";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { id } = await params;

  const body = (await request.json()) as MemberInput;
  if (!body.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const weeks = body.block_weeks || 4;
  const nextDue = body.block_start ? addWeeks(body.block_start, weeks) : null;
  const holdStart = body.status === "Hold" ? body.hold_start : null;
  const holdWeeks = body.status === "Hold" ? body.hold_weeks : null;
  const dueStatus = calcDueStatus(nextDue, body.status, holdEndOf({ hold_start: holdStart, hold_weeks: holdWeeks }));

  const supabase = createProgramTrackerAdminClient();
  const { data, error } = await supabase
    .from("members")
    .update({
      name: body.name.trim(),
      coach: body.coach || null,
      type: body.type || null,
      status: body.status,
      block_start: body.block_start || null,
      block_weeks: weeks,
      next_due: nextDue,
      due_status: dueStatus,
      hold_start: holdStart,
      hold_weeks: holdWeeks,
      notes: body.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
