"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Textarea } from "@/components/ui/Field";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { useRealtimeMeetingNotes } from "@/lib/useRealtimeMeetingNotes";
import { ProviderMeetingNotes } from "@/lib/providerSchema";

/**
 * Sam's separate Programming Meeting needs its own prep notes, distinct from
 * the regular weekly Meeting Notes. Unlike MeetingNotesCard/ActionStepsCard,
 * this used to keep no realtime subscription at all — if the page was open
 * in more than one tab/browser at once (e.g. left open from an earlier
 * session), each tab's own stale local copy could autosave over whatever the
 * other tab had just typed, making text seem to randomly vanish and then
 * "come back" a moment later when the tab with the current text next saved.
 * Wired to the same live-sync + focus-tracking every other meeting-notes
 * field already uses so a remote change is picked up as soon as this field
 * isn't focused, instead of only at the next full page load.
 */
export function ProgrammingPrepCard({
  providerId,
  week,
  initialNotes,
}: {
  providerId: string;
  week: string;
  initialNotes: ProviderMeetingNotes;
}) {
  const [value, setValue] = useState(initialNotes.programming_prep ?? "");

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: week, section: "meeting_notes", patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  const { markActive, markInactive } = useRealtimeMeetingNotes(providerId, week, (remote) => {
    if (typeof remote.programming_prep === "string") setValue(remote.programming_prep);
  });

  return (
    <Card title="Programming Meeting Prep" action={<SaveIndicator status={status} />}>
      <Textarea
        value={value}
        placeholder="Notes to prep for the Programming Meeting..."
        onChange={(e) => {
          setValue(e.target.value);
          set("programming_prep", e.target.value);
        }}
        onFocus={() => markActive("programming_prep")}
        onBlur={() => markInactive("programming_prep")}
      />
    </Card>
  );
}
