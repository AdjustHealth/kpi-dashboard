"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { STATUS } from "@/components/charts/palette";
import { formatValue } from "@/lib/format";
import { ProviderField } from "@/lib/providerSchema";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";

export interface WeekMetrics {
  week_ending: string;
  metrics: Record<string, unknown>;
}

function trendArrow(current: unknown, previous: unknown) {
  if (typeof current !== "number" || typeof previous !== "number") return null;
  if (current === previous) return <span className="text-muted">→</span>;
  const up = current > previous;
  return (
    <span style={{ color: up ? STATUS.good : STATUS.critical }}>{up ? "↑" : "↓"}</span>
  );
}

export function PerformanceTable({
  title,
  fields,
  targets,
  providerId,
  currentWeek,
  history,
}: {
  title: string;
  fields: ProviderField[];
  targets: Record<string, unknown>;
  providerId: string;
  currentWeek: string;
  /** Last N weeks ascending, last entry = currentWeek. */
  history: WeekMetrics[];
}) {
  const currentIndex = history.length - 1;
  const previousIndex = currentIndex - 1;
  const [current, setCurrent] = useState<Record<string, unknown>>(
    history[currentIndex]?.metrics ?? {}
  );

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: currentWeek, section: "metrics", patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  function updateNumber(key: string, raw: string, type: ProviderField["type"]) {
    if (raw === "") {
      setCurrent((prev) => ({ ...prev, [key]: null }));
      set(key, null);
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    const value = type === "percent" ? num / 100 : num;
    setCurrent((prev) => ({ ...prev, [key]: value }));
    set(key, value);
  }

  function updateBoolean(key: string, checked: boolean) {
    setCurrent((prev) => ({ ...prev, [key]: checked }));
    set(key, checked);
  }

  return (
    <Card title={title} action={<SaveIndicator status={status} />}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-medium">KPI</th>
              <th className="py-2 pr-3 font-medium">Target</th>
              <th className="py-2 pr-3 font-medium">Current Week</th>
              <th className="py-2 pr-3 font-medium">Previous Week</th>
              <th className="py-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const target = targets[field.key];
              const previousValue = previousIndex >= 0 ? history[previousIndex]?.metrics[field.key] : undefined;
              const currentValue = current[field.key];

              return (
                <tr key={field.key} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 text-foreground">{field.label}</td>
                  <td className="py-2 pr-3 text-muted">
                    {typeof target === "number" ? formatValue(target, field.type, field.decimals) : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {field.type === "boolean" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(currentValue)}
                        onChange={(e) => updateBoolean(field.key, e.target.checked)}
                        className="h-4 w-4 rounded border-border bg-surface-raised accent-accent"
                      />
                    ) : (
                      <input
                        type="number"
                        inputMode="decimal"
                        value={
                          currentValue === null || currentValue === undefined
                            ? ""
                            : field.type === "percent"
                              ? Math.round((currentValue as number) * 10000) / 100
                              : (currentValue as number)
                        }
                        onChange={(e) => updateNumber(field.key, e.target.value, field.type)}
                        className="w-24 rounded-md border border-border bg-surface-raised px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
                      />
                    )}
                  </td>
                  <td className="py-2 pr-3 text-muted">
                    {field.type === "boolean"
                      ? previousValue
                        ? "Yes"
                        : previousValue === false
                          ? "No"
                          : "—"
                      : formatValue(previousValue as number | null, field.type, field.decimals)}
                  </td>
                  <td className="py-2">{trendArrow(currentValue, previousValue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
