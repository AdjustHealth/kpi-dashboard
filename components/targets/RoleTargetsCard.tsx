"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { NumberField } from "@/components/inputs/NumberField";
import { RoleTargetGroup } from "@/lib/targetsSchema";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";

/**
 * One shared target set per role group (Providers / Senior / Admin) —
 * editing it here applies to every provider in that group at once, instead
 * of opening each person's own card to change the same number repeatedly.
 */
export function RoleTargetsCard({ group, initialValues }: { group: RoleTargetGroup; initialValues: Record<string, unknown> }) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/role-targets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: group.id, patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  function update(key: string, value: number | null) {
    setValues((prev) => ({ ...prev, [key]: value }));
    set(key, value);
  }

  return (
    <Card title={group.label} action={<SaveIndicator status={status} />}>
      <p className="mb-3 text-xs text-muted">{group.description}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.fields.map((field) => (
          <NumberField
            key={field.key}
            label={field.label}
            type={field.type}
            value={values[field.key] as number | null | undefined}
            onChange={(v) => update(field.key, v)}
          />
        ))}
      </div>

      {group.cvaTierFields && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 text-xs font-medium text-muted">CVA Target by Experience Tier</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {group.cvaTierFields.map((field) => (
              <NumberField
                key={field.key}
                label={field.label}
                type="decimal"
                value={values[field.key] as number | null | undefined}
                onChange={(v) => update(field.key, v)}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
