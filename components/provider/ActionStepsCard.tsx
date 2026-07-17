"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Textarea, Input } from "@/components/ui/Field";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { ProviderMeetingNotes } from "@/lib/providerSchema";

const ACTION_STEP_COUNT = 4;

/**
 * Action Steps & Agreements + Performance Review Goals — kept separate
 * from MeetingNotesCard so the Senior Physio page can render this as its
 * own big note section at the bottom of the meeting (per the director's
 * sheet), while standard/admin pages keep it up with the rest of the
 * meeting notes.
 */
export function ActionStepsCard({
  providerId,
  week,
  initialNotes,
  size = "standard",
}: {
  providerId: string;
  week: string;
  initialNotes: ProviderMeetingNotes;
  size?: "standard" | "large";
}) {
  const [notes, setNotes] = useState<ProviderMeetingNotes>({
    action_steps: ["", "", "", ""],
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

  function updateGoals(value: string) {
    setNotes((prev) => ({ ...prev, performance_review_goals: value }));
    set("performance_review_goals", value);
  }

  const large = size === "large";

  return (
    <Card title="Action Steps & Agreements for This Week" action={<SaveIndicator status={status} />}>
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

      <div className="mt-6">
        <div className="mb-1.5 text-xs font-medium text-muted">Performance Review Goals</div>
        <Textarea
          value={notes.performance_review_goals ?? ""}
          onChange={(e) => updateGoals(e.target.value)}
          className={large ? "min-h-40 text-base" : undefined}
        />
      </div>
    </Card>
  );
}
