"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { NumberField } from "@/components/inputs/NumberField";
import { ProviderField } from "@/lib/providerSchema";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";

export function ChecklistCard({
  title,
  fields,
  providerId,
  week,
  initialValues,
}: {
  title: string;
  fields: ProviderField[];
  providerId: string;
  week: string;
  initialValues: Record<string, unknown>;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: week, section: "kpas", patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  function toggle(key: string, checked: boolean) {
    setValues((prev) => ({ ...prev, [key]: checked }));
    set(key, checked);
  }

  function updateNumber(key: string, value: number | null) {
    setValues((prev) => ({ ...prev, [key]: value }));
    set(key, value);
  }

  return (
    <Card title={title} action={<SaveIndicator status={status} />}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {fields.map((field) =>
          field.type === "boolean" ? (
            <Checkbox
              key={field.key}
              label={field.label}
              checked={Boolean(values[field.key])}
              onChange={(checked) => toggle(field.key, checked)}
            />
          ) : (
            <NumberField
              key={field.key}
              label={field.label}
              type={field.type === "rating" ? "number" : field.type}
              decimals={field.decimals}
              value={values[field.key] as number | null | undefined}
              onChange={(v) => updateNumber(field.key, v)}
            />
          )
        )}
      </div>
    </Card>
  );
}
