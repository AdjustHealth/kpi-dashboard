"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { formatValue } from "@/lib/format";
import { formatWeekLabel } from "@/lib/week";
import { ProviderField, KPA_RATINGS, KPA_RATING_LABELS, KpaRating } from "@/lib/providerSchema";
import { STATUS } from "@/components/charts/palette";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { targetColor } from "@/lib/targetColor";

const RATING_COLOR: Record<KpaRating, string> = {
  above_and_beyond: STATUS.good,
  demonstrated: STATUS.warning,
  not_met: STATUS.critical,
};

export interface WeekMetrics {
  week_ending: string;
  metrics: Record<string, unknown>;
  kpas: Record<string, unknown>;
}

/**
 * One row per KPI, one column per week (target/minimum-expectation first),
 * matching the real "Accountability Meeting" scorecard: KPI | Target |
 * 7.3.26 | 14.3.26 | ... Only the currently-selected week (the last entry
 * in `history`) is editable; older weeks are the saved historical record.
 */
export function WeeklyScorecardTable({
  title,
  fields,
  targets,
  providerId,
  currentWeek,
  history,
  section = "metrics",
}: {
  title: string;
  fields: ProviderField[];
  targets: Record<string, unknown>;
  providerId: string;
  currentWeek: string;
  /** Weeks ascending, last entry = currentWeek (the editable column). */
  history: WeekMetrics[];
  section?: "metrics" | "kpas";
}) {
  const currentIndex = history.length - 1;
  const [current, setCurrent] = useState<Record<string, unknown>>(history[currentIndex]?.[section] ?? {});

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: currentWeek, section, patch }),
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

  function updateRating(key: string, rating: KpaRating) {
    setCurrent((prev) => ({ ...prev, [key]: rating }));
    set(key, rating);
  }

  return (
    <Card title={title} action={<SaveIndicator status={status} />}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="sticky left-0 bg-surface py-2 pr-3 font-medium">KPI</th>
              <th className="py-2 px-3 font-medium">Target</th>
              {history.map((w, i) => (
                <th
                  key={w.week_ending}
                  className={`py-2 px-3 font-medium whitespace-nowrap ${i === currentIndex ? "text-accent" : ""}`}
                >
                  {formatWeekLabel(w.week_ending)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const target = targets[field.key];
              return (
                <tr key={field.key} className="border-b border-border/60 last:border-0">
                  <td className="sticky left-0 bg-surface py-2 pr-3 text-foreground whitespace-nowrap">
                    {field.label}
                  </td>
                  <td className="py-2 px-3 text-muted whitespace-nowrap">
                    {typeof target === "number" ? formatValue(target, field.type, field.decimals) : "—"}
                  </td>
                  {history.map((w, i) => {
                    const isCurrent = i === currentIndex;
                    const value = isCurrent ? current[field.key] : w[section][field.key];
                    const color = targetColor(value, target, field.betterWhen);
                    return (
                      <td key={w.week_ending} className="py-2 px-3 whitespace-nowrap">
                        {isCurrent ? (
                          field.type === "boolean" ? (
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(e) => updateBoolean(field.key, e.target.checked)}
                              className="h-4 w-4 rounded border-border bg-surface-raised accent-accent"
                            />
                          ) : field.type === "rating" ? (
                            <div className="flex gap-1">
                              {KPA_RATINGS.map((r) => {
                                const active = value === r;
                                const color = RATING_COLOR[r];
                                return (
                                  <button
                                    key={r}
                                    type="button"
                                    title={KPA_RATING_LABELS[r]}
                                    onClick={() => updateRating(field.key, r)}
                                    className="h-5 w-5 rounded-full border-2 transition-transform"
                                    style={{
                                      backgroundColor: active ? color : "transparent",
                                      borderColor: color,
                                      transform: active ? "scale(1.1)" : "scale(1)",
                                    }}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              type="number"
                              inputMode="decimal"
                              value={
                                value === null || value === undefined
                                  ? ""
                                  : field.type === "percent"
                                    ? Math.round((value as number) * 10000) / 100
                                    : (value as number)
                              }
                              onChange={(e) => updateNumber(field.key, e.target.value, field.type)}
                              className="w-20 rounded-md border px-2 py-1 text-sm outline-none focus:border-accent"
                              style={
                                color
                                  ? { borderColor: color, backgroundColor: `${color}1a`, color }
                                  : { borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-raised)" }
                              }
                            />
                          )
                        ) : field.type === "boolean" ? (
                          <span className="text-muted">{value === true ? "Y" : value === false ? "N" : "—"}</span>
                        ) : field.type === "rating" ? (
                          KPA_RATINGS.includes(value as KpaRating) ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{
                                color: RATING_COLOR[value as KpaRating],
                                backgroundColor: `${RATING_COLOR[value as KpaRating]}1a`,
                              }}
                            >
                              {KPA_RATING_LABELS[value as KpaRating]}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )
                        ) : (
                          <span className={color ? "font-medium" : "text-muted"} style={color ? { color } : undefined}>
                            {formatValue(value as number | null, field.type, field.decimals)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
