"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Input } from "@/components/ui/Field";
import { STATUS } from "@/components/charts/palette";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { Goal, GoalKind, GoalStatus } from "@/lib/types";

const SHORT_TERM_LABELS = ["Short Term Goal 1", "Short Term Goal 2", "Short Term Goal 3"];
const LONG_TERM_LABELS = ["Long Term Goal 1", "Long Term Goal 2", "Long Term Goal 3"];

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

const STATUS_COLOR: Record<GoalStatus, string> = {
  not_started: "var(--color-muted)",
  in_progress: STATUS.warning,
  complete: STATUS.good,
};

/** Reads a goal written before the 3-state status existed — `achieved: true` meant "complete", anything else meant "not started". Never written going forward. */
function normalizeGoal(g: Partial<Goal> | undefined, kind: GoalKind): Goal {
  const status: GoalStatus = g?.status ?? (g?.achieved ? "complete" : "not_started");
  return { text: g?.text ?? "", status, kind };
}

/**
 * Splits whatever's stored on providers.goals into 3 short_term + 3
 * long_term slots. Old data (pre this feature) is a flat array of 3 goals
 * with no `kind` at all — treated as short_term so nothing already typed
 * in gets silently dropped, with 3 fresh blank long_term slots alongside.
 */
function buildInitialGoals(initialGoals: Goal[]): Goal[] {
  const short = initialGoals.filter((g) => g.kind !== "long_term");
  const long = initialGoals.filter((g) => g.kind === "long_term");
  return [
    ...[0, 1, 2].map((i) => normalizeGoal(short[i], "short_term")),
    ...[0, 1, 2].map((i) => normalizeGoal(long[i], "long_term")),
  ];
}

/**
 * Performance Review Goals — persistent on the provider, not scoped to a
 * week: goal text and status stay exactly as set until the director
 * changes them (so a goal set "In Progress" this week is still "In
 * Progress" next week, automatically — there's nothing week-scoped to
 * carry over here in the first place).
 */
export function GoalsCard({ providerId, initialGoals }: { providerId: string; initialGoals: Goal[] }) {
  const [goals, setGoals] = useState<Goal[]>(() => buildInitialGoals(initialGoals));

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: providerId, goals: patch.goals }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  function updateGoal(index: number, next: Partial<Goal>) {
    setGoals((prev) => {
      const updated = prev.map((g, i) => (i === index ? { ...g, ...next } : g));
      set("goals", updated);
      return updated;
    });
  }

  function renderGoalRow(goal: Goal, index: number, placeholder: string) {
    return (
      <div key={index} className="flex items-center gap-3">
        <select
          value={goal.status}
          onChange={(e) => updateGoal(index, { status: e.target.value as GoalStatus })}
          className="flex-shrink-0 rounded-lg border border-border bg-surface-raised px-2 py-2 text-xs font-medium"
          style={{ color: STATUS_COLOR[goal.status] }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Input
          value={goal.text}
          placeholder={placeholder}
          onChange={(e) => updateGoal(index, { text: e.target.value })}
          className={goal.status === "complete" ? "line-through opacity-60" : undefined}
        />
      </div>
    );
  }

  return (
    <Card title="Performance Review Goals" action={<SaveIndicator status={status} />}>
      <p className="mb-4 text-xs text-muted">
        Stays exactly as-is week to week — status and text carry over automatically until changed at the next
        performance review.
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Short Term Goals</h4>
          {goals.slice(0, 3).map((goal, i) => renderGoalRow(goal, i, SHORT_TERM_LABELS[i]))}
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Long Term Goals</h4>
          {goals.slice(3, 6).map((goal, i) => renderGoalRow(goal, i + 3, LONG_TERM_LABELS[i]))}
        </div>
      </div>
    </Card>
  );
}
