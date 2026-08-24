"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Badge } from "@/components/ui/Badge";
import { Field, Textarea, Input } from "@/components/ui/Field";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { useRealtimeMeetingNotes } from "@/lib/useRealtimeMeetingNotes";
import { MULTI_DISC_LABELS, MultiDiscUtilisation, ProviderMeetingNotes } from "@/lib/providerSchema";

const DEFAULT_DISC_KEYS: (keyof MultiDiscUtilisation)[] = ["hydro", "ep_ms", "rmt", "gym"];

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
  discKeys = DEFAULT_DISC_KEYS,
  adminMode = false,
  previousMultiDisc,
}: {
  providerId: string;
  week: string;
  initialNotes: ProviderMeetingNotes;
  /** Admin staff don't see clients directly, so Multi-Disciplinary Team Utilisation (Hydro/EP-MS/RMT/Gym referrals) doesn't apply to their meeting. */
  showMultiDisc?: boolean;
  /** Which referral categories to show — see multiDiscKeysForRole in lib/providerSchema.ts (massage therapists get an extra "Physio" category). */
  discKeys?: (keyof MultiDiscUtilisation)[];
  /** Admin meetings only — swaps "3 Wins / 3 Things to Work On" for "Proud Of / Grateful For", one slot each for the admin and one each for directors. */
  adminMode?: boolean;
  /** Last week's Multi-Disciplinary Team Utilisation names — kept on the list every week (not just carried once) so referral names aren't forgotten; see the mount effect below. */
  previousMultiDisc?: MultiDiscUtilisation;
}) {
  // Names carry indefinitely (not just a one-off suggestion like Action
  // Steps) — a name typed under Hydro this week should still be there next
  // week, and the week after, until someone removes it. So this is eagerly
  // persisted (see mount effect) rather than left as a display-only default
  // — otherwise a week nobody opens/edits would break the chain for the week after it.
  const carriedDiscKeys = discKeys.filter(
    (key) => initialNotes.multi_disc_utilisation?.[key] === undefined && (previousMultiDisc?.[key]?.length ?? 0) > 0
  );
  const mergedMultiDisc = {
    ...initialNotes.multi_disc_utilisation,
    ...Object.fromEntries(carriedDiscKeys.map((key) => [key, previousMultiDisc![key]])),
  };
  const [notes, setNotes] = useState<ProviderMeetingNotes>({
    agenda_items: "",
    wins: ["", "", ""],
    things_to_work_on: ["", "", ""],
    ...initialNotes,
    multi_disc_utilisation: mergedMultiDisc,
  });
  const [carriedOverDiscKeys, setCarriedOverDiscKeys] = useState<Set<string>>(() => new Set(carriedDiscKeys));

  const [discText, setDiscText] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const key of discKeys) init[key] = namesToText(mergedMultiDisc[key]);
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

  useEffect(() => {
    if (carriedDiscKeys.length > 0) set("multi_disc_utilisation", mergedMultiDisc);
    // Runs once at mount, using the carry-over snapshot computed above —
    // persists it as this week's real saved value (see comment above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { markActive, markInactive } = useRealtimeMeetingNotes(providerId, week, (remote) => {
    setNotes((prev) => ({ ...prev, ...remote }));
    if (remote.multi_disc_utilisation) {
      const remoteDisc = remote.multi_disc_utilisation as MultiDiscUtilisation;
      setDiscText((prev) => {
        const next = { ...prev };
        for (const key of discKeys) {
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

  function updateText(
    key: "agenda_items" | "proud_of_self" | "proud_of_director" | "grateful_for_self" | "grateful_for_director",
    value: string
  ) {
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

  function updateDisc(key: (keyof MultiDiscUtilisation), text: string) {
    setCarriedOverDiscKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
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
            rows={9}
            value={notes.agenda_items ?? ""}
            onChange={(e) => updateText("agenda_items", e.target.value)}
            {...fieldFocusHandlers("agenda_items")}
          />
        </Field>
        {adminMode ? (
          <div
            className="rounded-xl p-[3px]"
            style={{
              background:
                "linear-gradient(90deg, #ff3b3b, #ff9f1c, #ffe135, #4ade80, #22d3ee, #3b82f6, #a855f7, #ff3b3b)",
            }}
          >
            <div className="rounded-[10px] bg-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <span aria-hidden className="text-lg">🦄</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">Proud Of &amp; Grateful For</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted">Proud Of</span>
                  <Field label="You">
                    <Input
                      value={notes.proud_of_self ?? ""}
                      onChange={(e) => updateText("proud_of_self", e.target.value)}
                      {...fieldFocusHandlers("proud_of_self")}
                    />
                  </Field>
                  <Field label="Directors">
                    <Input
                      value={notes.proud_of_director ?? ""}
                      onChange={(e) => updateText("proud_of_director", e.target.value)}
                      {...fieldFocusHandlers("proud_of_director")}
                    />
                  </Field>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted">Grateful For</span>
                  <Field label="You">
                    <Input
                      value={notes.grateful_for_self ?? ""}
                      onChange={(e) => updateText("grateful_for_self", e.target.value)}
                      {...fieldFocusHandlers("grateful_for_self")}
                    />
                  </Field>
                  <Field label="Directors">
                    <Input
                      value={notes.grateful_for_director ?? ""}
                      onChange={(e) => updateText("grateful_for_director", e.target.value)}
                      {...fieldFocusHandlers("grateful_for_director")}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
        )}

        {showMultiDisc && (
          <div>
            <span className="text-xs font-medium text-muted">Multi-Disciplinary Team Utilisation</span>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {discKeys.map((key) => {
                const count = notes.multi_disc_utilisation?.[key]?.length ?? 0;
                const label = count > 0 ? `${MULTI_DISC_LABELS[key]} (${count})` : MULTI_DISC_LABELS[key];
                return (
                  <Field
                    key={key}
                    label={label}
                    tag={carriedOverDiscKeys.has(key) ? <Badge tone="neutral">Carried over</Badge> : undefined}
                  >
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
