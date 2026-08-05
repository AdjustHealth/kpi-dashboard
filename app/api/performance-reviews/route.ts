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

/** Prep Review — snapshots rolling averages and current goals as of right now, into a new draft review row. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider_id, reviewer } = body as { provider_id?: string; reviewer?: string };
  if (!provider_id) return NextResponse.json({ error: "provider_id is required" }, { status: 400 });

  const supabase = await createClient();
  const [{ data: provider, error: providerError }, { data: weeklyRows, error: weeklyError }] = await Promise.all([
    supabase.from("providers").select("role, goals, targets, specialty_metrics").eq("id", provider_id).single(),
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
