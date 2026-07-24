import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeKpiRollups, computeKpaRollups, WeeklyRow } from "@/lib/performanceReview";
import { metricFieldsForRole, kpaGroupsForRole, ProviderRole } from "@/lib/providerSchema";
import { Goal } from "@/lib/types";

/** Prep Review — snapshots rolling averages and current goals as of right now, into a new draft review row. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider_id, reviewer } = body as { provider_id?: string; reviewer?: string };
  if (!provider_id) return NextResponse.json({ error: "provider_id is required" }, { status: 400 });

  const supabase = await createClient();
  const [{ data: provider, error: providerError }, { data: weeklyRows, error: weeklyError }] = await Promise.all([
    supabase.from("providers").select("role, goals").eq("id", provider_id).single(),
    supabase.from("provider_weekly").select("week_ending, metrics, kpas").eq("provider_id", provider_id),
  ]);
  if (providerError) return NextResponse.json({ error: providerError.message }, { status: 500 });
  if (weeklyError) return NextResponse.json({ error: weeklyError.message }, { status: 500 });

  const role = provider.role as ProviderRole;
  const rows = (weeklyRows ?? []) as WeeklyRow[];
  const asOf = new Date().toISOString().slice(0, 10);

  const kpaFields = kpaGroupsForRole(role).flatMap((g) => g.fields);
  const kpiRollups = computeKpiRollups(rows, metricFieldsForRole(role), asOf);
  const kpaRollups = computeKpaRollups(rows, kpaFields, asOf);

  const goals = (provider.goals ?? []) as Goal[];
  const goalsReflection = goals
    .filter((g) => g.text.trim().length > 0)
    .map((g) => ({ text: g.text, achieved: g.achieved, note: "" }));

  const { data, error } = await supabase
    .from("performance_reviews")
    .insert({
      provider_id,
      review_date: asOf,
      reviewer: reviewer ?? null,
      goals_reflection: goalsReflection,
      kpi_rollups: kpiRollups,
      kpa_rollups: kpaRollups,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

interface NewGoal {
  text: string;
  how: string;
}
interface NewGoals {
  short_term: NewGoal[];
  long_term: NewGoal[];
}

/**
 * Only the first 3 non-empty new goals (short-term first) carry over to the
 * provider's persistent weekly Goals card — that card is a fixed 3-slot
 * "what to track week to week" tool, not the full review record. Every goal
 * set in the review stays on the review itself regardless.
 */
function newGoalsToPersistentGoals(newGoals: NewGoals): Goal[] {
  const combined = [...(newGoals.short_term ?? []), ...(newGoals.long_term ?? [])]
    .filter((g) => g.text.trim().length > 0)
    .slice(0, 3)
    .map((g) => ({ text: g.text, achieved: false }));
  while (combined.length < 3) combined.push({ text: "", achieved: false });
  return combined;
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, patch, complete } = body as {
    id?: string;
    patch?: Record<string, unknown>;
    complete?: boolean;
  };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createClient();
  const update: Record<string, unknown> = { ...(patch ?? {}) };
  if (complete) update.completed_at = new Date().toISOString();

  const { data, error } = await supabase.from("performance_reviews").update(update).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (complete) {
    const newGoals = (data.new_goals ?? { short_term: [], long_term: [] }) as NewGoals;
    await supabase
      .from("providers")
      .update({ goals: newGoalsToPersistentGoals(newGoals) })
      .eq("id", data.provider_id);
  }

  return NextResponse.json({ data });
}
