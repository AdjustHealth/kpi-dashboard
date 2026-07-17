"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Field, Textarea, Input } from "@/components/ui/Field";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { ProviderMeetingNotes } from "@/lib/providerSchema";

const DISC_KEYS = ["hydro", "massage", "ep", "gym"] as const;

export function MeetingNotesCard({
  providerId,
  week,
  initialNotes,
}: {
  providerId: string;
  week: string;
  initialNotes: ProviderMeetingNotes;
}) {
  const [notes, setNotes] = useState<ProviderMeetingNotes>({
    agenda_items: "",
    review_previous_actions: "",
    wins: ["", "", ""],
    improvements: ["", "", ""],
    multi_disc_utilisation: {},
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

  function updateText(key: "agenda_items" | "review_previous_actions", value: string) {
    setNotes((prev) => ({ ...prev, [key]: value }));
    set(key, value);
  }

  function updateListItem(key: "wins" | "improvements", index: number, value: string) {
    setNotes((prev) => {
      const list = [...(prev[key] ?? ["", "", ""])];
      list[index] = value;
      set(key, list);
      return { ...prev, [key]: list };
    });
  }

  function updateDisc(key: (typeof DISC_KEYS)[number], value: number | null) {
    setNotes((prev) => {
      const util = { ...(prev.multi_disc_utilisation ?? {}), [key]: value };
      set("multi_disc_utilisation", util);
      return { ...prev, multi_disc_utilisation: util };
    });
  }

  return (
    <Card title="Meeting Notes" action={<SaveIndicator status={status} />}>
      <div className="flex flex-col gap-4">
        <Field label="New Agenda Items">
          <Textarea
            value={notes.agenda_items ?? ""}
            onChange={(e) => updateText("agenda_items", e.target.value)}
          />
        </Field>
        <Field label="Review Previous Action Steps">
          <Textarea
            value={notes.review_previous_actions ?? ""}
            onChange={(e) => updateText("review_previous_actions", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted">Three Wins</span>
            {[0, 1, 2].map((i) => (
              <Input
                key={i}
                value={notes.wins?.[i] ?? ""}
                placeholder={`Win ${i + 1}`}
                onChange={(e) => updateListItem("wins", i, e.target.value)}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted">Three Improvements</span>
            {[0, 1, 2].map((i) => (
              <Input
                key={i}
                value={notes.improvements?.[i] ?? ""}
                placeholder={`Improvement ${i + 1}`}
                onChange={(e) => updateListItem("improvements", i, e.target.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs font-medium text-muted">Multi-Disciplinary Utilisation</span>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DISC_KEYS.map((key) => (
              <Field key={key} label={key[0].toUpperCase() + key.slice(1)}>
                <Input
                  type="number"
                  value={notes.multi_disc_utilisation?.[key] ?? ""}
                  onChange={(e) =>
                    updateDisc(key, e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </Field>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
