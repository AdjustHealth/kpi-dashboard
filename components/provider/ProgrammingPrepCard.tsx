"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Textarea } from "@/components/ui/Field";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { ProviderMeetingNotes } from "@/lib/providerSchema";

/** Sam's separate Programming Meeting needs its own prep notes, distinct from the regular weekly Meeting Notes. */
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

  return (
    <Card title="Programming Meeting Prep" action={<SaveIndicator status={status} />}>
      <Textarea
        value={value}
        placeholder="Notes to prep for the Programming Meeting..."
        onChange={(e) => {
          setValue(e.target.value);
          set("programming_prep", e.target.value);
        }}
      />
    </Card>
  );
}
