"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Field, Input } from "@/components/ui/Field";
import { SpecialtyMetricsEditor } from "@/components/settings/SpecialtyMetricsEditor";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { ROLE_LABELS, ProviderRole } from "@/lib/providerSchema";
import { Provider, SpecialtyMetricDef } from "@/lib/types";

const ROLES: ProviderRole[] = ["senior_physio", "physio", "massage", "ep", "admin"];

export function ProviderRow({ provider }: { provider: Provider }) {
  const [name, setName] = useState(provider.name);
  const [role, setRole] = useState<ProviderRole>(provider.role);
  const [active, setActive] = useState(provider.active);
  const [metrics, setMetrics] = useState<SpecialtyMetricDef[]>(provider.specialty_metrics ?? []);

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: provider.id, fields: patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {name || "Untitled"}
          {!active && <span className="text-xs font-normal text-muted">(inactive)</span>}
        </span>
      }
      action={<SaveIndicator status={status} />}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                set("name", e.target.value);
              }}
            />
          </Field>
          <Field label="Role">
            <select
              value={role}
              onChange={(e) => {
                const next = e.target.value as ProviderRole;
                setRole(next);
                set("role", next);
              }}
              className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <button
              type="button"
              onClick={() => {
                const next = !active;
                setActive(next);
                set("active", next);
              }}
              className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground hover:border-accent"
            >
              {active ? "Deactivate" : "Activate"}
            </button>
          </Field>
        </div>

        <SpecialtyMetricsEditor
          metrics={metrics}
          onChange={(next) => {
            setMetrics(next);
            set("specialty_metrics", next);
          }}
        />
      </div>
    </Card>
  );
}
