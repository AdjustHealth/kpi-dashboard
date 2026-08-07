"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { formatValue } from "@/lib/format";
import { formatWeekLabel } from "@/lib/week";
import { ADMIN_COMPLIANCE_FIELDS } from "@/lib/providerSchema";
import { targetColor } from "@/lib/targetColor";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { ClinicWeekRow } from "@/lib/clinicData";
import { WeekMetrics } from "@/components/provider/PerformanceTable";

const DAILY_ANSWERED_CALLS_FIELDS: { id: string; day: string }[] = [
  { id: "admin_answered_calls_mon", day: "Mon" },
  { id: "admin_answered_calls_tue", day: "Tue" },
  { id: "admin_answered_calls_wed", day: "Wed" },
  { id: "admin_answered_calls_thu", day: "Thu" },
  { id: "admin_answered_calls_fri", day: "Fri" },
  { id: "admin_answered_calls_sat", day: "Sat" },
];

/**
 * Admin "Compliance" — a mix of fields shared identically across every
 * admin (Diary Management, Follow Up Phone Calls, Onboarding Videos Sent,
 * New Clients Subscribed, Answered Calls — all sourced from clinic-wide
 * weekly_kpis via `clinicHistory`, read-only here, edited on Weekly
 * Input's Admin Meeting Prep section) and each admin's own individual
 * number (currently just Rx Notes Made — sourced from `history`, this
 * provider's own weekly metrics; editable right here, current week only,
 * same as the KPI Scorecard above). Grouped together in one table per the
 * director, since they're conceptually all "compliance" regardless of who
 * enters them. Coloured red/green against the "admin" role_targets group,
 * keyed by field.key (not clinicFieldId — that's only for reading the raw
 * clinic-wide value).
 */
export function AdminSharedComplianceTable({
  providerId,
  currentWeek,
  clinicHistory,
  history,
  targets,
}: {
  providerId: string;
  currentWeek: string;
  clinicHistory: ClinicWeekRow[];
  /** This admin's own weekly metrics — same weeks/order as clinicHistory. */
  history: WeekMetrics[];
  targets: Record<string, unknown>;
}) {
  const currentIndex = history.length - 1;
  const [current, setCurrent] = useState<Record<string, unknown>>(history[currentIndex]?.metrics ?? {});
  const latestClinicWeek = clinicHistory[clinicHistory.length - 1];

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: currentWeek, section: "metrics", patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  function updateOwnField(key: string, raw: string) {
    if (raw === "") {
      setCurrent((prev) => ({ ...prev, [key]: null }));
      set(key, null);
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    const value = num / 100; // percent fields only, stored as a 0-1 fraction
    setCurrent((prev) => ({ ...prev, [key]: value }));
    set(key, value);
  }

  return (
    <Card title="Compliance" action={<SaveIndicator status={status} />}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="sticky left-0 bg-surface py-2 pr-3 font-medium">KPI</th>
              <th className="py-2 px-3 font-medium">Target</th>
              {clinicHistory.map((w, i) => (
                <th
                  key={w.week_ending}
                  className={`py-2 px-3 font-medium whitespace-nowrap ${
                    i === clinicHistory.length - 1 ? "text-accent" : ""
                  }`}
                >
                  {formatWeekLabel(w.week_ending)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMIN_COMPLIANCE_FIELDS.map((field) => {
              const target = targets[field.key];
              return (
                <tr key={field.key} className="border-b border-border/60 last:border-0">
                  <td className="sticky left-0 bg-surface py-2 pr-3 text-foreground whitespace-nowrap">{field.label}</td>
                  <td className="py-2 px-3 text-muted whitespace-nowrap">
                    {typeof target === "number" ? formatValue(target, field.type, field.decimals) : "—"}
                  </td>
                  {clinicHistory.map((w, i) => {
                    const isCurrent = field.source === "own" && i === currentIndex;
                    const value =
                      field.source === "own"
                        ? isCurrent
                          ? ((current[field.key] as number | null | undefined) ?? null)
                          : ((history[i]?.metrics[field.key] as number | null | undefined) ?? null)
                        : ((w[field.clinicFieldId as string] as number | null | undefined) ?? null);
                    const color = targetColor(value, target, field.betterWhen);
                    return (
                      <td key={w.week_ending} className="py-2 px-3 whitespace-nowrap">
                        {isCurrent ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            value={value === null ? "" : Math.round(value * 10000) / 100}
                            onChange={(e) => updateOwnField(field.key, e.target.value)}
                            className="w-20 rounded-md border px-2 py-1 text-sm outline-none focus:border-accent"
                            style={
                              color
                                ? { borderColor: color, backgroundColor: `${color}1a`, color }
                                : { borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-raised)" }
                            }
                          />
                        ) : (
                          <span className={color ? "font-medium" : "text-muted"} style={color ? { color } : undefined}>
                            {formatValue(value, field.type, field.decimals)}
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

      {latestClinicWeek && (
        <div className="mt-5 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-accent">
            Answered Calls — Daily ({formatWeekLabel(latestClinicWeek.week_ending)})
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {DAILY_ANSWERED_CALLS_FIELDS.map((f) => (
              <div key={f.id} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">{f.day}</span>
                <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground">
                  {formatValue(latestClinicWeek[f.id] as number | null, "percent")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Diary Management/Follow Up Phone Calls/Onboarding Videos/New Clients Subscribed/Answered Calls are shared
        across every admin staff member — edit on Weekly Input&apos;s Admin Meeting Prep section. Rx Notes Made is
        each admin&apos;s own number — edit it directly here (this week only).
      </p>
    </Card>
  );
}
