"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Field, Textarea, Input } from "@/components/ui/Field";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { useRealtimeMeetingNotes } from "@/lib/useRealtimeMeetingNotes";
import { MULTI_DISC_LABELS, MultiDiscUtilisation, ProviderMeetingNotes } from "@/lib/providerSchema";

const DISC_KEYS = ["hydro", "ep_ms", "rmt", "gym"] as const;

function namesToText(names: string[] | undefined): string {
  return Array.isArray(names) ? names.join("\n") : "";
}

function textToNames(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function MeetingNotesCard({
  providerId,
  week,
  initialNotes,
  showMultiDisc = true,
}: {
  providerId: string;
  week: string;
  initialNotes: ProviderMeetingNotes;
  /** Admin staff don't see clients directly, so Multi-Disciplinary Team Utilisation (Hydro/EP-MS/RMT/Gym referrals) doesn't apply to their meeting. */
  showMultiDisc?: boolean;
}) {
  const [notes, setNotes] = useState<ProviderMeetingNotes>({
    agenda_items: "",
    review_previous_actions: "",
    wins: ["", "", ""],
    things_to_work_on: ["", "", ""],
    multi_disc_utilisation: {},
    ...initialNotes,
  });

  const [discText, setDiscText] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const key of DISC_KEYS) init[key] = namesToText(initialNotes.multi_disc_utilisation?.[key]);
    return init;
  });

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: week, section: "meeting_notes", patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  const { markActive, markInactive } = useRealtimeMeetingNotes(providerId, week, (remote) => {
    setNotes((prev) => ({ ...prev, ...remote }));
    if (remote.multi_disc_utilisation) {
      const remoteDisc = remote.multi_disc_utilisation as MultiDiscUtilisation;
      setDiscText((prev) => {
        const next = { ...prev };
        for (const key of DISC_KEYS) {
          if (remoteDisc[key] !== undefined) next[key] = namesToText(remoteDisc[key]);
        }
        return next;
      });
    }
  });
  function fieldFocusHandlers(key: string) {
    return {
      onFocus: () => markActive(key),
      onBlur: () => markInactive(key),
    };
  }

  function updateText(key: "agenda_items" | "review_previous_actions", value: string) {
    setNotes((prev) => ({ ...prev, [key]: value }));
    set(key, value);
  }

  function updateListItem(key: "wins" | "things_to_work_on", index: number, value: string) {
    setNotes((prev) => {
      const list = [...(prev[key] ?? ["", "", ""])];
      list[index] = value;
      set(key, list);
      return { ...prev, [key]: list };
    });
  }

  function updateDisc(key: (typeof DISC_KEYS)[number], text: string) {
    setDiscText((prev) => ({ ...prev, [key]: text }));
    setNotes((prev) => {
      const util = { ...(prev.multi_disc_utilisation ?? {}), [key]: textToNames(text) };
      set("multi_disc_utilisation", util);
      return { ...prev, multi_disc_utilisation: util };
    });
  }

  return (
    <Card title="Meeting Notes" action={<SaveIndicator status={status} />}>
      <div className="flex flex-col gap-4">
        <Field label="New Agenda Items" hint="Start a line with “- ” to dot-point it — it carries onto the next line automatically.">
          <Textarea
            value={notes.agenda_items ?? ""}
            onChange={(e) => updateText("agenda_items", e.target.value)}
            {...fieldFocusHandlers("agenda_items")}
          />
        </Field>
        <Field label="Review from Last Week / Action Steps">
          <Textarea
            value={notes.review_previous_actions ?? ""}
            onChange={(e) => updateText("review_previous_actions", e.target.value)}
            {...fieldFocusHandlers("review_previous_actions")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted">3 Wins for the Week</span>
            {[0, 1, 2].map((i) => (
              <Input
                key={i}
                value={notes.wins?.[i] ?? ""}
                placeholder={`Win ${i + 1}`}
                onChange={(e) => updateListItem("wins", i, e.target.value)}
                {...fieldFocusHandlers("wins")}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted">3 Things to Work On</span>
            {[0, 1, 2].map((i) => (
              <Input
                key={i}
                value={notes.things_to_work_on?.[i] ?? ""}
                placeholder={`Item ${i + 1}`}
                onChange={(e) => updateListItem("things_to_work_on", i, e.target.value)}
                {...fieldFocusHandlers("things_to_work_on")}
              />
            ))}
          </div>
        </div>

        {showMultiDisc && (
          <div>
            <span className="text-xs font-medium text-muted">Multi-Disciplinary Team Utilisation</span>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DISC_KEYS.map((key) => {
                const count = notes.multi_disc_utilisation?.[key]?.length ?? 0;
                return (
                  <Field key={key} label={count > 0 ? `${MULTI_DISC_LABELS[key]} (${count})` : MULTI_DISC_LABELS[key]}>
                    <Textarea
                      rows={3}
                      placeholder="One client name per line"
                      value={discText[key] ?? ""}
                      onChange={(e) => updateDisc(key, e.target.value)}
                      {...fieldFocusHandlers("multi_disc_utilisation")}
                    />
                  </Field>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
