import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeKpiRollups, computeKpaRollups, WeeklyRow } from "@/lib/performanceReview";
import { metricFieldsForRole, kpaGroupsForRole, ProviderRole } from "@/lib/providerSchema";
import { weeklyBaseTarget, cumulativeTurnoverSeries, turnoverPacingPct, computeSpecialtyCalcMetrics } from "@/lib/providerCalc";
import { Goal, SpecialtyMetricDef } from "@/lib/types";

/**
 * A senior physio's Bonus & Growth snapshot as of right now — same numbers
 * BonusTierCard shows on their live page, frozen at prep time. "achieved"
 * and "notes" start blank: never auto-verdict a bonus tier, same reasoning
 * as BonusTierCard (the exact formula was never confirmed with the business).
 */
function computeBonusSummary(
  targets: Record<string, unknown> | null,
  rows: WeeklyRow[]
): Record<string, unknown> {
  if (!targets || typeof targets.annual_turnover_target !== "number") return {};

  const seniorSince = typeof targets.senior_since === "string" ? targets.senior_since : null;
  const bonusRows = seniorSince ? rows.filter((r) => r.week_ending >= seniorSince) : rows;
  const weeklyTurnover = bonusRows.map((r) => (typeof r.metrics.turnover === "number" ? (r.metrics.turnover as number) : null));
  const cumTO = cumulativeTurnoverSeries(weeklyTurnover);
  const base = weeklyBaseTarget(targets as never);
  const baseTargetCumulative = base !== null ? base * weeklyTurnover.length : null;
  const pacingPct = turnoverPacingPct(cumTO[cumTO.length - 1] ?? 0, baseTargetCumulative);

  const bonusMetricKey = typeof targets.bonus_metric_key === "string" ? targets.bonus_metric_key : null;
  const bonusMetricLabel = typeof targets.bonus_metric_label === "string" ? targets.bonus_metric_label : bonusMetricKey;
  const bonusMetricTarget = bonusMetricKey && typeof targets[bonusMetricKey] === "number" ? (targets[bonusMetricKey] as number) : null;
  const latestBonusMetric = bonusMetricKey
    ? [...bonusRows].reverse().map((r) => r.metrics[bonusMetricKey]).find((v): v is number => typeof v === "number") ?? null
    : null;

  return {
    cumulative_turnover: cumTO[cumTO.length - 1] ?? 0,
    base_target_cumulative: baseTargetCumulative,
    pacing_pct: pacingPct,
    bonus_tiers: targets.bonus_tiers ?? null,
    bonus_metric_label: bonusMetricLabel,
    bonus_metric_value: latestBonusMetric,
    bonus_metric_target: bonusMetricTarget,
    achieved: null,
    notes: "",
  };
}

/**
 * Snapshots rolling averages, current goals, and bonus pacing as of right
 * now for a provider — the computation shared by a brand new Prep Review
 * (POST below) and refreshing an existing draft's numbers (PATCH's
 * `refresh` below) without touching anything the director has already
 * typed into that draft (reviewer/notes/proud-of/new goals).
 */
async function buildReviewSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  providerId: string
): Promise<{ error: string } | { kpiRollups: ReturnType<typeof computeKpiRollups>; kpaRollups: ReturnType<typeof computeKpaRollups>; bonusSummary: Record<string, unknown>; goalsReflection: { text: string; achieved: boolean; note: string }[]; asOf: string }> {
  const [{ data: provider, error: providerError }, { data: weeklyRows, error: weeklyError }] = await Promise.all([
    supabase.from("providers").select("role, goals, targets, specialty_metrics").eq("id", providerId).single(),
    supabase.from("provider_weekly").select("week_ending, metrics, kpas").eq("provider_id", providerId),
  ]);
  if (providerError) return { error: providerError.message };
  if (weeklyError) return { error: weeklyError.message };

  const role = provider.role as ProviderRole;
  const rows = (weeklyRows ?? []) as WeeklyRow[];
  const asOf = new Date().toISOString().slice(0, 10);

  const kpaFields = kpaGroupsForRole(role).flatMap((g) => g.fields);
  const kpiRollups = computeKpiRollups(rows, metricFieldsForRole(role, provider.targets), asOf);
  const kpaRollups = computeKpaRollups(rows, kpaFields, asOf);

  // A senior's own specialty metrics (e.g. Sam's Memberships, Marcio's
  // Headache Total) aren't in the fixed KPI Scorecard schema — merge their
  // rollups in alongside the regular KPIs so the review shows one table.
  // A calc-source field (e.g. Headache Total = Init + Sub) is never itself
  // written to provider_weekly.metrics, so recompute it into each row first —
  // same as ProviderDetailView does for the live Bonus Tier chart.
  const specialtyMetrics = (provider.specialty_metrics ?? []) as SpecialtyMetricDef[];
  const rowsWithCalc: WeeklyRow[] = specialtyMetrics.some((m) => m.source === "calc")
    ? rows.map((r) => ({ ...r, metrics: { ...r.metrics, ...computeSpecialtyCalcMetrics(specialtyMetrics, r.metrics) } }))
    : rows;
  if (specialtyMetrics.length > 0) {
    Object.assign(kpiRollups, computeKpiRollups(rowsWithCalc, specialtyMetrics, asOf));
  }

  const bonusSummary = computeBonusSummary(provider.targets as Record<string, unknown> | null, rowsWithCalc);

  const goals = (provider.goals ?? []) as Goal[];
  const goalsReflection = goals
    .filter((g) => g.text.trim().length > 0)
    .map((g) => ({ text: g.text, achieved: (g.status ?? (g.achieved ? "complete" : "not_started")) === "complete", note: "" }));

  return { kpiRollups, kpaRollups, bonusSummary, goalsReflection, asOf };
}

/** Prep Review — snapshots rolling averages and current goals as of right now, into a new draft review row. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider_id, reviewer } = body as { provider_id?: string; reviewer?: string };
  if (!provider_id) return NextResponse.json({ error: "provider_id is required" }, { status: 400 });

  const supabase = await createClient();
  const snapshot = await buildReviewSnapshot(supabase, provider_id);
  if ("error" in snapshot) return NextResponse.json({ error: snapshot.error }, { status: 500 });
  const { kpiRollups, kpaRollups, bonusSummary, goalsReflection, asOf } = snapshot;

  const { data, error } = await supabase
    .from("performance_reviews")
    .insert({
      provider_id,
      review_date: asOf,
      reviewer: reviewer ?? null,
      goals_reflection: goalsReflection,
      kpi_rollups: kpiRollups,
      kpa_rollups: kpaRollups,
      bonus_summary: bonusSummary,
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
 * The first 3 non-empty new goals of each kind carry over to the provider's
 * persistent weekly Goals card — that card is a fixed 3 short_term + 3
 * long_term slot "what to track week to week" tool, not the full review
 * record. Every goal set in the review stays on the review itself
 * regardless. Fresh goals always start "not_started".
 */
function newGoalsToPersistentGoals(newGoals: NewGoals): Goal[] {
  function slots(list: NewGoal[] | undefined, kind: Goal["kind"]): Goal[] {
    const nonEmpty = (list ?? []).filter((g) => g.text.trim().length > 0).slice(0, 3);
    return [0, 1, 2].map((i) => ({ text: nonEmpty[i]?.text ?? "", status: "not_started" as const, kind }));
  }
  return [...slots(newGoals.short_term, "short_term"), ...slots(newGoals.long_term, "long_term")];
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, patch, complete, refresh } = body as {
    id?: string;
    patch?: Record<string, unknown>;
    complete?: boolean;
    refresh?: boolean;
  };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createClient();
  const update: Record<string, unknown> = { ...(patch ?? {}) };
  if (complete) update.completed_at = new Date().toISOString();

  // Re-prep: a stale draft (started months ago, never finished) gets its
  // KPI/KPA rollups, bonus pacing and goals reflection re-snapshotted to
  // right now, same computation as a brand new Prep Review — without
  // touching anything already typed into this draft (reviewer, notes,
  // proud-of, new goals) or its completed_at state. Lets the director
  // bring an old draft up to date in one click instead of having to
  // finish or abandon it first to start a real one.
  if (refresh) {
    const { data: existing, error: existingError } = await supabase
      .from("performance_reviews")
      .select("provider_id")
      .eq("id", id)
      .single();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

    const snapshot = await buildReviewSnapshot(supabase, existing.provider_id);
    if ("error" in snapshot) return NextResponse.json({ error: snapshot.error }, { status: 500 });
    update.review_date = snapshot.asOf;
    update.kpi_rollups = snapshot.kpiRollups;
    update.kpa_rollups = snapshot.kpaRollups;
    update.bonus_summary = snapshot.bonusSummary;
    update.goals_reflection = snapshot.goalsReflection;
  }

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
