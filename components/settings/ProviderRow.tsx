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

const EXPERIENCE_TIERS = [
  { value: "", label: "— Not set —" },
  { value: "new_grad", label: "New Grad" },
  { value: "2_5yr", label: "2-5yr" },
] as const;

export function ProviderRow({ provider }: { provider: Provider }) {
  const [name, setName] = useState(provider.name);
  const [role, setRole] = useState<ProviderRole>(provider.role);
  const [active, setActive] = useState(provider.active);
  const [metrics, setMetrics] = useState<SpecialtyMetricDef[]>(provider.specialty_metrics ?? []);
  const [experienceTier, setExperienceTier] = useState<string>(
    typeof provider.targets?.experience_tier === "string" ? (provider.targets.experience_tier as string) : ""
  );

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: provider.id, fields: patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  // Experience tier lives in providers.targets (jsonb), not a plain column,
  // so it's written via targets_patch rather than the fields patch above —
  // no migration needed for a New Grad/2-5yr split that only applies to
  // the "physio" role.
  const { status: tierStatus, set: setTierField } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: provider.id, targets_patch: patch }),
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

        {role === "physio" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Experience Tier" tag={<SaveIndicator status={tierStatus} />}>
              <select
                value={experienceTier}
                onChange={(e) => {
                  const next = e.target.value;
                  setExperienceTier(next);
                  setTierField("experience_tier", next || null);
                }}
                className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground"
              >
                {EXPERIENCE_TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

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
