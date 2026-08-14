"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { NumberField } from "@/components/inputs/NumberField";
import { RoleTargetGroup } from "@/lib/targetsSchema";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";

/**
 * Massage/EP targets card — collapsed by default (showing "Using Providers
 * targets") unless the director has already customised at least one field,
 * since most of the time these roles should just inherit the shared
 * Providers group (see getEffectiveTargets in lib/defaultTargets.ts).
 * Toggling on reveals the same field grid as RoleTargetsCard, still blank
 * unless already overridden — a blank field keeps inheriting the Providers
 * value, it isn't "0". Toggling off clears every field for this group so it
 * fully reverts to inheriting again.
 */
export function RoleOverrideTargetsCard({ group, initialValues }: { group: RoleTargetGroup; initialValues: Record<string, unknown> }) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});
  const [expanded, setExpanded] = useState(Object.keys(initialValues ?? {}).length > 0);

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

  function toggle() {
    if (expanded) {
      // Turning off reverts to fully inheriting the Providers group — clear
      // every field this group might have set rather than just hiding them.
      const cleared = Object.fromEntries(group.fields.map((f) => [f.key, null]));
      setValues({});
      for (const [key, value] of Object.entries(cleared)) set(key, value as null);
    }
    setExpanded((prev) => !prev);
  }

  return (
    <Card
      title={group.label}
      action={
        <div className="flex items-center gap-3">
          {expanded && <SaveIndicator status={status} />}
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground"
          >
            {expanded ? "Customizing" : "Using Providers targets"}
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${expanded ? "bg-accent" : "bg-border"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${expanded ? "translate-x-4" : "translate-x-0.5"}`}
              />
            </span>
          </button>
        </div>
      }
    >
      {expanded ? (
        <>
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
        </>
      ) : (
        <p className="text-xs text-muted">Toggle on to set custom targets for {group.label.toLowerCase()} — e.g. a different Completed Consults target.</p>
      )}
    </Card>
  );
}
