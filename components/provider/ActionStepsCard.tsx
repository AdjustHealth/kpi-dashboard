"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Textarea, Input } from "@/components/ui/Field";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { ProviderMeetingNotes, ACTION_PLAN_CATEGORIES } from "@/lib/providerSchema";

const ACTION_STEP_COUNT = 3;

/**
 * Action Steps & Agreements + Performance Review Goals — kept separate
 * from MeetingNotesCard so the Senior Physio page can render this as its
 * own big note section at the bottom of the meeting (per the director's
 * sheet), while standard/admin pages keep just Action Steps up with the
 * rest of the meeting notes — Performance Review Goals is senior-only.
 *
 * Senior physios use `categorized` mode: one note per Action Plan
 * category (Turnover / Gym / Junior Team / Marketing / Culture), matching
 * the real Senior Physio Worksheet's Action Plan tab, instead of 3 free
 * numbered slots.
 */
export function ActionStepsCard({
  providerId,
  week,
  initialNotes,
  size = "standard",
  showGoals = true,
  categorized = false,
}: {
  providerId: string;
  week: string;
  initialNotes: ProviderMeetingNotes;
  size?: "standard" | "large";
  showGoals?: boolean;
  categorized?: boolean;
}) {
  const [notes, setNotes] = useState<ProviderMeetingNotes>({
    action_steps: Array(ACTION_STEP_COUNT).fill(""),
    action_plan: {},
    performance_review_goals: "",
    ...initialNotes,
  });

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: week, section: "meeting_notes", patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  function updateActionStep(index: number, value: string) {
    setNotes((prev) => {
      const list = [...(prev.action_steps ?? Array(ACTION_STEP_COUNT).fill(""))];
      list[index] = value;
      set("action_steps", list);
      return { ...prev, action_steps: list };
    });
  }

  function updateActionPlan(categoryKey: string, value: string) {
    setNotes((prev) => {
      const plan = { ...(prev.action_plan ?? {}), [categoryKey]: value };
      set("action_plan", plan);
      return { ...prev, action_plan: plan };
    });
  }

  function updateGoals(value: string) {
    setNotes((prev) => ({ ...prev, performance_review_goals: value }));
    set("performance_review_goals", value);
  }

  const large = size === "large";

  return (
    <Card title={categorized ? "Action Plan for This Week" : "Action Steps & Agreements for This Week"} action={<SaveIndicator status={status} />}>
      {categorized ? (
        <div className="flex flex-col gap-4">
          {ACTION_PLAN_CATEGORIES.map((category) => (
            <div key={category.key}>
              <div className="mb-1.5 text-xs font-medium text-muted">{category.label}</div>
              <Textarea
                value={notes.action_plan?.[category.key] ?? ""}
                placeholder={`Notes for ${category.label}`}
                className={large ? "min-h-20 text-base" : undefined}
                onChange={(e) => updateActionPlan(category.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={`flex flex-col gap-2 ${large ? "text-base" : ""}`}>
          {Array.from({ length: ACTION_STEP_COUNT }).map((_, i) => (
            <Input
              key={i}
              value={notes.action_steps?.[i] ?? ""}
              placeholder={`Action Step / Agreement ${i + 1}`}
              className={large ? "py-3 text-base" : undefined}
              onChange={(e) => updateActionStep(i, e.target.value)}
            />
          ))}
        </div>
      )}

      {showGoals && (
        <div className="mt-6">
          <div className="mb-1.5 text-xs font-medium text-muted">Performance Review Goals</div>
          <Textarea
            value={notes.performance_review_goals ?? ""}
            onChange={(e) => updateGoals(e.target.value)}
            className={large ? "min-h-40 text-base" : undefined}
          />
        </div>
      )}
    </Card>
  );
}
