"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { NumberField } from "@/components/inputs/NumberField";
import { LineTrendChart, TrendPoint } from "@/components/charts/LineTrendChart";
import { MultiLineChart } from "@/components/charts/MultiLineChart";
import { formatValue } from "@/lib/format";
import { formatWeekLabel } from "@/lib/week";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { computeSpecialtyCalcMetrics } from "@/lib/providerCalc";
import { SpecialtyMetricDef } from "@/lib/types";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

const CHART_FORMATS = new Set(["number", "decimal", "currency", "percent"]);

export function SpecialtyKpiCard({
  providerId,
  week,
  specialtyMetrics,
  targets,
  initialValues,
  history,
}: {
  providerId: string;
  week: string;
  specialtyMetrics: SpecialtyMetricDef[];
  targets: Record<string, unknown>;
  initialValues: Record<string, unknown>;
  /** Weekly history, for a trend chart per metric — omit to just show the current-week inputs. */
  history?: WeekMetrics[];
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
  const chartableMetrics = specialtyMetrics.filter((m) => CHART_FORMATS.has(m.type));

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
    <Card
      title="⭐ Specialty KPIs"
      action={<SaveIndicator status={status} />}
      className="border-2 border-accent-secondary/50 bg-accent-secondary/[0.05]"
    >
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

      {history && chartableMetrics.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-accent-secondary/20 pt-5 sm:grid-cols-2 xl:grid-cols-3">
          {chartableMetrics.map((metric, i) => {
            const format = metric.type as "number" | "decimal" | "currency" | "percent";
            const target = targets[metric.key];
            const trend: TrendPoint[] = history.map((h) => ({
              week_ending: h.week_ending,
              value: typeof h.metrics[metric.key] === "number" ? (h.metrics[metric.key] as number) : null,
            }));
            if (typeof target !== "number") {
              return (
                <LineTrendChart key={metric.key} title={metric.label} data={trend} format={format} colorIndex={i} accent />
              );
            }
            const data = history.map((h, idx) => ({
              label: formatWeekLabel(h.week_ending),
              [metric.label]: trend[idx].value,
              Target: target,
            }));
            return (
              <MultiLineChart
                key={metric.key}
                title={`${metric.label} vs Target`}
                data={data}
                seriesKeys={[metric.label, "Target"]}
                format={format}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
