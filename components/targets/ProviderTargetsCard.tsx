"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { NumberField } from "@/components/inputs/NumberField";
import { BONUS_TIER_FIELDS, PROVIDER_TARGET_FIELDS } from "@/lib/targetsSchema";
import { metricFieldsForRole, ProviderField } from "@/lib/providerSchema";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { Provider } from "@/lib/types";

export function ProviderTargetsCard({ provider }: { provider: Provider }) {
  const [targets, setTargets] = useState<Record<string, unknown>>(provider.targets ?? {});

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: provider.id, targets_patch: patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  function update(key: string, value: number | null) {
    setTargets((prev) => ({ ...prev, [key]: value }));
    set(key, value);
  }

  function updateBonusTier(tierKey: string, value: number | null) {
    const bonusTiers = { ...(targets.bonus_tiers as Record<string, unknown> | undefined), [tierKey]: value };
    setTargets((prev) => ({ ...prev, bonus_tiers: bonusTiers }));
    set("bonus_tiers", bonusTiers);
  }

  // Every non-boolean KPI Scorecard field gets an editable target here — the
  // same "targets[field.key]" value the meeting page's Target column reads —
  // plus a few target-only fields (personal_cva, annual_turnover_target,
  // working_weeks) that don't have a matching weekly metric.
  const metricTargetFields = metricFieldsForRole(provider.role).filter(
    (f): f is ProviderField & { type: Exclude<ProviderField["type"], "boolean" | "rating"> } =>
      f.type !== "boolean" && f.type !== "rating"
  );
  const baseFields = [...metricTargetFields, ...(provider.role === "admin" ? [] : PROVIDER_TARGET_FIELDS)];

  return (
    <Card title={provider.name} action={<SaveIndicator status={status} />}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {baseFields.map((field) => (
          <NumberField
            key={field.key}
            label={field.label}
            type={field.type}
            value={targets[field.key] as number | null | undefined}
            onChange={(v) => update(field.key, v)}
          />
        ))}

        {provider.specialty_metrics.map((metric) => (
          <NumberField
            key={metric.key}
            label={`${metric.label} Target`}
            type={metric.type === "boolean" ? "number" : metric.type}
            value={targets[metric.key] as number | null | undefined}
            onChange={(v) => update(metric.key, v)}
          />
        ))}
      </div>

      {provider.role === "senior_physio" && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 text-xs font-medium text-muted">Bonus Tier Thresholds</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {BONUS_TIER_FIELDS.map((tier) => (
              <NumberField
                key={tier.key}
                label={tier.label}
                type="number"
                value={
                  (targets.bonus_tiers as Record<string, number> | undefined)?.[tier.key] ?? null
                }
                onChange={(v) => updateBonusTier(tier.key, v)}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
