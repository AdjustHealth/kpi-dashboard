import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, flagged_for_discussion } = body as { id?: string; flagged_for_discussion?: boolean };

  if (!id || typeof flagged_for_discussion !== "boolean") {
    return NextResponse.json({ error: "id and flagged_for_discussion are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cancellation_events").update({ flagged_for_discussion }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
