"use client";

import { Input } from "@/components/ui/Field";
import { SpecialtyMetricDef } from "@/lib/types";

const TYPE_OPTIONS: SpecialtyMetricDef["type"][] = ["number", "currency", "decimal", "percent", "boolean"];

export function SpecialtyMetricsEditor({
  metrics,
  onChange,
}: {
  metrics: SpecialtyMetricDef[];
  onChange: (metrics: SpecialtyMetricDef[]) => void;
}) {
  function update(index: number, patch: Partial<SpecialtyMetricDef>) {
    const next = metrics.map((m, i) => (i === index ? { ...m, ...patch } : m));
    onChange(next);
  }

  function remove(index: number) {
    onChange(metrics.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...metrics, { key: "", label: "", type: "number", source: "manual" }]);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted">Specialty KPIs (this provider only)</span>
      {metrics.map((metric, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-raised p-2">
          <Input
            placeholder="key (e.g. headache_init)"
            value={metric.key}
            onChange={(e) => update(i, { key: e.target.value })}
            className="w-40"
          />
          <Input
            placeholder="Label"
            value={metric.label}
            onChange={(e) => update(i, { label: e.target.value })}
            className="w-40"
          />
          <select
            value={metric.type}
            onChange={(e) => update(i, { type: e.target.value as SpecialtyMetricDef["type"] })}
            className="rounded-lg border border-border bg-surface-raised px-2 py-2 text-sm text-foreground"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={metric.source === "calc"}
              onChange={(e) => update(i, { source: e.target.checked ? "calc" : "manual" })}
              className="h-3.5 w-3.5 accent-accent"
            />
            computed (sum of the others)
          </label>
          <button
            type="button"
            onClick={() => remove(i)}
            className="ml-auto text-xs text-danger hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="self-start rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent"
      >
        + Add specialty KPI
      </button>
    </div>
  );
}
