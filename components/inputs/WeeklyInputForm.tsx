"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { ClinicFieldGrid } from "@/components/inputs/ClinicFieldGrid";
import { NumberField } from "@/components/inputs/NumberField";
import { NookalUpload } from "@/components/inputs/NookalUpload";
import { ChecklistCard } from "@/components/provider/ChecklistCard";
import { getClinicFieldsByCategory } from "@/lib/schema";
import { COMPLIANCE_FIELDS } from "@/lib/providerSchema";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { shiftWeek, formatWeekLabel } from "@/lib/week";
import { Provider, ProviderWeekly, WeeklyKpis } from "@/lib/types";

export function WeeklyInputForm({
  week,
  initialWeekly,
  providers,
  initialProviderWeekly,
}: {
  week: string;
  initialWeekly: WeeklyKpis;
  providers: Provider[];
  initialProviderWeekly: ProviderWeekly[];
}) {
  const [weekly, setWeekly] = useState<WeeklyKpis>(initialWeekly);

  // A Nookal upload can auto-fill fields server-side; router.refresh() (called
  // by NookalUpload after a parsed upload) re-fetches initialWeekly with new
  // data. Adjust local state during render when that prop object changes,
  // rather than via useEffect (React's recommended pattern — avoids an
  // extra render and the "setState in an effect" cascading-render issue).
  const [syncedWeekly, setSyncedWeekly] = useState(initialWeekly);
  if (initialWeekly !== syncedWeekly) {
    setSyncedWeekly(initialWeekly);
    setWeekly(initialWeekly);
  }

  const router = useRouter();
  const { status, set, flush } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/weekly-kpis", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_ending: week, patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  async function goToWeek(nextWeek: string) {
    await flush();
    router.push(`/inputs?week=${nextWeek}`);
  }

  function onChange(id: string, value: number | null) {
    setWeekly((prev) => ({ ...prev, [id]: value }));
    set(id, value);
  }

  const kpasByProvider = new Map(initialProviderWeekly.map((r) => [r.provider_id, r.kpas]));

  return (
    <div className="flex flex-col gap-6 p-8">
      <NookalUpload week={week} />

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-2.5">
        <span className="text-sm text-muted">
          Editing week ending <span className="font-medium text-foreground">{formatWeekLabel(week)}</span> — everything
          above autosaves as you type.
        </span>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          <button
            type="button"
            onClick={() => goToWeek(shiftWeek(week, -1))}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:text-accent"
          >
            ‹ Previous Week
          </button>
          <button
            type="button"
            onClick={() => goToWeek(shiftWeek(week, 1))}
            className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/15"
          >
            Next Week ›
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-foreground">Manual Entry</h2>
        <p className="mb-3 text-xs text-muted">
          These numbers aren&apos;t in any Nookal report — they need to be typed in every week.
        </p>
        <div className="flex flex-col gap-6">
          <Card title="Gym">
            <ClinicFieldGrid
              fields={getClinicFieldsByCategory("Gym").filter((f) => f.id !== "gym_total" && f.id !== "m_gym3p")}
              values={weekly}
              onChange={onChange}
            />
          </Card>

          <Card title="Podiatry">
            <ClinicFieldGrid fields={getClinicFieldsByCategory("Podiatry")} values={weekly} onChange={onChange} />
          </Card>

          <Card title="Diary Management">
            <ClinicFieldGrid
              fields={getClinicFieldsByCategory("Diary").filter((f) => f.id !== "diary_mgmt_pct")}
              values={weekly}
              onChange={onChange}
            />
          </Card>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Provider Meeting Prep</h3>
            {providers.filter((p) => p.role !== "admin").length === 0 && (
              <p className="text-sm text-muted">
                No active clinicians yet — add them on the Settings page.
              </p>
            )}
            {providers.filter((p) => p.role !== "admin").map((provider) => (
              <ChecklistCard
                key={provider.id}
                title={provider.name}
                fields={COMPLIANCE_FIELDS}
                providerId={provider.id}
                week={week}
                initialValues={kpasByProvider.get(provider.id) ?? {}}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Admin Meeting Prep</h3>
            <p className="text-xs text-muted">
              Entered once, shown identically on every admin staff member&apos;s page. OBV Number Not Sent and Rx
              Notes Made are each admin&apos;s own number now — edit those on their individual page instead.
            </p>
            <Card title="Admin">
              <ClinicFieldGrid
                fields={getClinicFieldsByCategory("Admin").filter(
                  (f) => f.id !== "admin_answered_calls_pct" && !f.id.startsWith("admin_answered_calls_")
                )}
                values={weekly}
                onChange={onChange}
              />
              <div className="mt-5 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-accent">
                  Answered Calls — Daily
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {getClinicFieldsByCategory("Admin")
                    .filter((f) => f.id.startsWith("admin_answered_calls_") && f.id !== "admin_answered_calls_pct")
                    .map((f) => (
                      <NumberField
                        key={f.id}
                        label={f.label.replace("Answered Calls % — ", "").slice(0, 3)}
                        type={f.type === "date" ? "number" : f.type}
                        decimals={f.decimals}
                        value={weekly[f.id] as number | null | undefined}
                        onChange={(v) => onChange(f.id, v)}
                        source="manual"
                      />
                    ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-foreground">Auto-Filled from CSV Reports</h2>
        <p className="mb-3 text-xs text-muted">
          Populated by the report uploads above — check them, but you shouldn&apos;t normally need to type into these.
        </p>
        <div className="flex flex-col gap-6">
          <Card title="Clinic Activity &amp; Occupancy">
            <ClinicFieldGrid
              fields={[
                ...getClinicFieldsByCategory("Revenue").filter((f) => f.source !== "date" && f.id !== "total_adjust_pod_rev"),
                ...getClinicFieldsByCategory("Occupancy"),
              ]}
              values={weekly}
              onChange={onChange}
            />
          </Card>

          <Card title="Revenue by Payer">
            <ClinicFieldGrid fields={getClinicFieldsByCategory("Payer")} values={weekly} onChange={onChange} />
          </Card>

          <Card title="Cancellations & CX">
            <ClinicFieldGrid fields={getClinicFieldsByCategory("CX")} values={weekly} onChange={onChange} />
          </Card>

          <Card title="Ageing Debts — Adjust (Auto)">
            <p className="mb-4 text-xs text-muted">
              Bucketed from the Aged Debtors report by payer (Private / NDIS / 3rd Party / Medicare-DVA), same
              categorization as Revenue by Payer above.
            </p>
            <ClinicFieldGrid fields={getClinicFieldsByCategory("AgeingDebt")} values={weekly} onChange={onChange} />
          </Card>

          <Card title="Clinic — UCVA, JBV &amp; Specialty Consults">
            <p className="mb-4 text-xs text-muted">
              UCVA by tier auto-fills from the Business Performance Report upload above, averaged by experience
              tier. JBV, Vestibular/Headaches/Paeds/Women&apos;s Health Initial/Subsequent, and 3rd Party Gym Revenue
              all auto-fill from the Activity Report by matching each row&apos;s service item against a fixed list.
              Every field below is still editable if you need to correct one.
            </p>
            <ClinicFieldGrid
              fields={[
                ...getClinicFieldsByCategory("Clinic").filter(
                  (f) =>
                    ![
                      "jbv_total",
                      "specialty_vestibular_total",
                      "specialty_headaches_total",
                      "specialty_paeds_total",
                      "specialty_womens_health_total",
                    ].includes(f.id)
                ),
                ...getClinicFieldsByCategory("Gym").filter((f) => f.id === "m_gym3p"),
              ]}
              values={weekly}
              onChange={onChange}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
