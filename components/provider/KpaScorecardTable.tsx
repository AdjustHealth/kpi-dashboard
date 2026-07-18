"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { formatWeekLabel } from "@/lib/week";
import { ProviderField, KPA_RATINGS, KPA_RATING_LABELS, KpaRating } from "@/lib/providerSchema";
import { STATUS } from "@/components/charts/palette";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

const RATING_COLOR: Record<KpaRating, string> = {
  above_and_beyond: STATUS.good,
  demonstrated: STATUS.warning,
  not_met: STATUS.critical,
};

/**
 * KPA Scorecard, modernized: no Target column (KPA ratings aren't scored
 * against a number) — each row is a KPI label plus a chronological
 * left-to-right sequence of rating dots, one per week, connected by a
 * hairline. Only the current (rightmost) week is editable, via a small
 * popover of the 3 rating choices.
 */
export function KpaScorecardTable({
  title,
  fields,
  providerId,
  currentWeek,
  history,
  section = "kpas",
}: {
  title: string;
  fields: ProviderField[];
  providerId: string;
  currentWeek: string;
  /** Weeks ascending, last entry = currentWeek (the editable column). */
  history: WeekMetrics[];
  section?: "metrics" | "kpas";
}) {
  const currentIndex = history.length - 1;
  const [current, setCurrent] = useState<Record<string, unknown>>(history[currentIndex]?.[section] ?? {});
  const [openKey, setOpenKey] = useState<string | null>(null);

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: currentWeek, section, patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  function updateRating(key: string, rating: KpaRating) {
    setCurrent((prev) => ({ ...prev, [key]: rating }));
    set(key, rating);
    setOpenKey(null);
  }

  return (
    <Card title={title} action={<SaveIndicator status={status} />}>
      <div className="flex flex-col divide-y divide-border/60">
        {fields.map((field) => (
          <div key={field.key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="max-w-xl text-sm text-foreground">{field.label}</div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {history.map((w, i) => {
                const isCurrent = i === currentIndex;
                const value = isCurrent ? current[field.key] : w[section][field.key];
                const rating = KPA_RATINGS.includes(value as KpaRating) ? (value as KpaRating) : null;
                const color = rating ? RATING_COLOR[rating] : undefined;
                return (
                  <div key={w.week_ending} className="relative flex items-center">
                    {i > 0 && <span className="mr-1.5 h-px w-3 bg-border" aria-hidden />}
                    <button
                      type="button"
                      title={`${formatWeekLabel(w.week_ending)}${rating ? ` — ${KPA_RATING_LABELS[rating]}` : ""}`}
                      onClick={() => isCurrent && setOpenKey(openKey === field.key ? null : field.key)}
                      className={`h-3.5 w-3.5 rounded-full border-2 transition-transform ${
                        isCurrent ? "cursor-pointer hover:scale-125" : "cursor-default"
                      } ${isCurrent && !rating ? "border-dashed" : ""}`}
                      style={{
                        backgroundColor: color ?? "transparent",
                        borderColor: color ?? "var(--color-border)",
                      }}
                    />
                    {isCurrent && openKey === field.key && (
                      <div className="absolute right-0 top-6 z-10 flex gap-1 rounded-lg border border-border bg-surface-raised p-1.5 shadow-lg">
                        {KPA_RATINGS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            title={KPA_RATING_LABELS[r]}
                            onClick={() => updateRating(field.key, r)}
                            className="h-5 w-5 rounded-full border-2 hover:scale-110"
                            style={{
                              backgroundColor: value === r ? RATING_COLOR[r] : "transparent",
                              borderColor: RATING_COLOR[r],
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-border/60 pt-3 text-[11px] text-muted">
        {KPA_RATINGS.map((r) => (
          <span key={r} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RATING_COLOR[r] }} />
            {KPA_RATING_LABELS[r]}
          </span>
        ))}
      </div>
    </Card>
  );
}
