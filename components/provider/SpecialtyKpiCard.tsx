"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { NumberField } from "@/components/inputs/NumberField";
import { formatValue } from "@/lib/format";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { computeSpecialtyCalcMetrics } from "@/lib/providerCalc";
import { SpecialtyMetricDef } from "@/lib/types";

export function SpecialtyKpiCard({
  providerId,
  week,
  specialtyMetrics,
  targets,
  initialValues,
}: {
  providerId: string;
  week: string;
  specialtyMetrics: SpecialtyMetricDef[];
  targets: Record<string, unknown>;
  initialValues: Record<string, unknown>;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: week, section: "metrics", patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  const manualMetrics = specialtyMetrics.filter((m) => m.source !== "calc");
  const calcMetrics = specialtyMetrics.filter((m) => m.source === "calc");
  const calcValues = computeSpecialtyCalcMetrics(specialtyMetrics, values);

  function update(key: string, value: number | null) {
    const next = { ...values, [key]: value };
    setValues(next);
    set(key, value);
    // Persist the recomputed calc metric(s) too, so history reads correctly.
    const recalculated = computeSpecialtyCalcMetrics(specialtyMetrics, next);
    for (const [calcKey, calcValue] of Object.entries(recalculated)) {
      set(calcKey, calcValue);
    }
  }

  if (specialtyMetrics.length === 0) return null;

  return (
    <Card title="Specialty KPIs" action={<SaveIndicator status={status} />}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {manualMetrics.map((metric) => (
          <NumberField
            key={metric.key}
            label={metric.label}
            type={metric.type === "boolean" ? "number" : metric.type}
            value={values[metric.key] as number | null | undefined}
            onChange={(v) => update(metric.key, v)}
          />
        ))}
        {calcMetrics.map((metric) => (
          <div key={metric.key} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">{metric.label}</span>
            <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground">
              {formatValue(calcValues[metric.key] ?? null, metric.type === "boolean" ? "number" : metric.type)}
            </div>
            {typeof targets[metric.key] === "number" && (
              <span className="text-[11px] text-muted">
                Target: {formatValue(targets[metric.key] as number, metric.type === "boolean" ? "number" : metric.type)}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
