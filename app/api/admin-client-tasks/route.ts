import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ClientTaskRow {
  id: string;
  week_ending: string;
  provider_id: string;
  client_name: string;
  online_booking: boolean | null;
  onboarding_video_sent: boolean | null;
  followup_call_made: boolean | null;
}

/**
 * GET ?week=YYYY-MM-DD — ensures a checklist row exists for every new client
 * seen that week (sourced from each clinician's provider_weekly.metrics.
 * new_patient_names, which already excludes Pre-Employment — see
 * lib/nookal/parsers.ts), then returns the full list including provider
 * name, so the Weekly Input page never needs a separate sync step.
 */
export async function GET(request: NextRequest) {
  const week = request.nextUrl.searchParams.get("week");
  if (!week) return NextResponse.json({ error: "week is required" }, { status: 400 });

  const supabase = await createClient();

  const [providersResult, providerWeeklyResult] = await Promise.all([
    supabase.from("providers").select("id, name").eq("active", true).neq("role", "admin"),
    supabase.from("provider_weekly").select("provider_id, metrics").eq("week_ending", week),
  ]);
  if (providersResult.error) return NextResponse.json({ error: providersResult.error.message }, { status: 500 });
  if (providerWeeklyResult.error) return NextResponse.json({ error: providerWeeklyResult.error.message }, { status: 500 });

  const providerNames = new Map((providersResult.data ?? []).map((p) => [p.id, p.name as string]));

  const expectedRows: { week_ending: string; provider_id: string; client_name: string }[] = [];
  for (const row of providerWeeklyResult.data ?? []) {
    const names = (row.metrics as Record<string, unknown> | null)?.new_patient_names;
    if (!Array.isArray(names)) continue;
    for (const name of names) {
      if (typeof name === "string" && name.trim()) {
        expectedRows.push({ week_ending: week, provider_id: row.provider_id, client_name: name });
      }
    }
  }

  if (expectedRows.length > 0) {
    const { error: syncError } = await supabase
      .from("admin_new_client_tasks")
      .upsert(expectedRows, { onConflict: "week_ending,provider_id,client_name", ignoreDuplicates: true });
    if (syncError) return NextResponse.json({ error: syncError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("admin_new_client_tasks")
    .select("id, week_ending, provider_id, client_name, online_booking, onboarding_video_sent, followup_call_made")
    .eq("week_ending", week);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((r) => ({ ...r, provider_name: providerNames.get(r.provider_id) ?? "—" }));
  return NextResponse.json({ data: rows });
}

const TASK_KEYS = ["online_booking", "onboarding_video_sent", "followup_call_made"] as const;
type TaskKey = (typeof TASK_KEYS)[number];

/**
 * PATCH { id, patch: { online_booking?, onboarding_video_sent?, followup_call_made? } }
 * — toggles one client's checklist, then recomputes that week's aggregate
 * counts/percentages and writes them into weekly_kpis (online_bookings_
 * total/new, admin_followup_calls, admin_onboarding_video_pct) so Dayle
 * never re-sums these by hand. An unset (null) box counts as "not done yet"
 * in the %, same as the task genuinely not being complete.
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, patch } = body as { id?: string; patch?: Partial<Record<TaskKey, boolean | null>> };
  if (!id || !patch) return NextResponse.json({ error: "id and patch are required" }, { status: 400 });

  const supabase = await createClient();

  const { data: updated, error: updateError } = await supabase
    .from("admin_new_client_tasks")
    .update(patch)
    .eq("id", id)
    .select("week_ending")
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const weekEnding = updated.week_ending as string;

  const { data: weekRows, error: weekRowsError } = await supabase
    .from("admin_new_client_tasks")
    .select("online_booking, onboarding_video_sent, followup_call_made")
    .eq("week_ending", weekEnding);
  if (weekRowsError) return NextResponse.json({ error: weekRowsError.message }, { status: 500 });

  const rows = (weekRows ?? []) as ClientTaskRow[];
  const total = rows.length;
  const pct = (key: TaskKey) => (total > 0 ? rows.filter((r) => r[key] === true).length / total : null);

  const { error: kpiError } = await supabase.from("weekly_kpis").upsert(
    {
      week_ending: weekEnding,
      online_bookings_total: total > 0 ? total : null,
      online_bookings_new: rows.filter((r) => r.online_booking === true).length,
      admin_followup_calls: pct("followup_call_made"),
      admin_onboarding_video_pct: pct("onboarding_video_sent"),
    },
    { onConflict: "week_ending" }
  );
  if (kpiError) return NextResponse.json({ error: kpiError.message }, { status: 500 });

  return NextResponse.json({ data: { id, ...patch } });
}
