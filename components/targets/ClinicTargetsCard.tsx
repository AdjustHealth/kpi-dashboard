"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { NumberField } from "@/components/inputs/NumberField";
import { CLINIC_TARGET_FIELDS } from "@/lib/targetsSchema";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";

export function ClinicTargetsCard({ initialValues }: { initialValues: Record<string, unknown> }) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/clinic-targets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  return (
    <Card title="Clinic Targets" action={<SaveIndicator status={status} />}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLINIC_TARGET_FIELDS.map((field) => (
          <NumberField
            key={field.key}
            label={field.label}
            type={field.type}
            value={values[field.key] as number | null | undefined}
            onChange={(v) => {
              setValues((prev) => ({ ...prev, [field.key]: v }));
              set(field.key, v);
            }}
          />
        ))}
      </div>
    </Card>
  );
}
