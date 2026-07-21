"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Input } from "@/components/ui/Field";
import { STATUS } from "@/components/charts/palette";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { Goal } from "@/lib/types";

const GOAL_LABELS = ["Short Term Goal 1", "Short Term Goal 2", "Short Term Goal 3"];

/**
 * Performance Review Goals — persistent on the provider, not scoped to a
 * week: the goal text and whether it's been achieved stay exactly as typed
 * until the director changes them. "Achieved" isn't meant to reset weekly —
 * it clears at the next performance review (not built yet).
 */
export function GoalsCard({ providerId, initialGoals }: { providerId: string; initialGoals: Goal[] }) {
  const [goals, setGoals] = useState<Goal[]>(
    initialGoals.length === 3 ? initialGoals : [0, 1, 2].map((i) => initialGoals[i] ?? { text: "", achieved: false })
  );

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

  return (
    <Card title="Performance Review Goals" action={<SaveIndicator status={status} />}>
      <p className="mb-3 text-xs text-muted">
        Stays exactly as-is week to week — achieved goals stay ticked until the next performance review, not reset weekly.
      </p>
      <div className="flex flex-col gap-3">
        {goals.map((goal, i) => (
          <div key={i} className="flex items-center gap-3">
            <button
              type="button"
              title={goal.achieved ? "Achieved — click to un-mark" : "Mark as achieved"}
              onClick={() => updateGoal(i, { achieved: !goal.achieved })}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: goal.achieved ? STATUS.good : "transparent",
                borderColor: goal.achieved ? STATUS.good : "var(--color-border)",
              }}
            >
              {goal.achieved && (
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                  <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <Input
              value={goal.text}
              placeholder={GOAL_LABELS[i]}
              onChange={(e) => updateGoal(i, { text: e.target.value })}
              className={goal.achieved ? "line-through opacity-60" : undefined}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
