"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { ClinicFieldGrid } from "@/components/inputs/ClinicFieldGrid";
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
          <Card title="Gym &amp; Podiatry">
            <ClinicFieldGrid
              fields={[
                ...getClinicFieldsByCategory("Gym").filter((f) => f.id !== "gym_total"),
                ...getClinicFieldsByCategory("Podiatry"),
              ]}
              values={weekly}
              onChange={onChange}
            />
          </Card>

          <Card title="Ageing Debts">
            <p className="mb-4 text-xs text-muted">
              Off the Aged Debtors report. Typed manually — Nookal exports this combined across
              locations and grouped by payer type, so it can&apos;t reliably split Adjust from
              Podiatry or separate true Private balances from NDIS clients invoiced as Private.
            </p>
            <p className="mb-2 text-xs font-medium text-foreground">Adjust Physiotherapy</p>
            <ClinicFieldGrid
              fields={getClinicFieldsByCategory("AgeingDebt").filter((f) => !f.id.startsWith("ad_pod_"))}
              values={weekly}
              onChange={onChange}
            />
            <p className="mb-2 mt-4 text-xs font-medium text-foreground">Podiatry</p>
            <ClinicFieldGrid
              fields={getClinicFieldsByCategory("AgeingDebt").filter((f) => f.id.startsWith("ad_pod_"))}
              values={weekly}
              onChange={onChange}
            />
          </Card>

          <Card title="Diary Management">
            <ClinicFieldGrid
              fields={getClinicFieldsByCategory("Diary").filter((f) => f.id !== "diary_mgmt_pct")}
              values={weekly}
              onChange={onChange}
            />
          </Card>

          <Card title="Admin Manual Fields">
            <ClinicFieldGrid fields={getClinicFieldsByCategory("Admin")} values={weekly} onChange={onChange} />
          </Card>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Provider Compliance — every provider</h3>
            {providers.length === 0 && (
              <p className="text-sm text-muted">
                No active providers yet — add them on the Settings page.
              </p>
            )}
            {providers.map((provider) => (
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

          <Card title="Clinic — CVA, JBV &amp; Specialty Consults">
            <p className="mb-4 text-xs text-muted">
              CVA by tier is entered manually (needs the Business Performance Report — not yet auto-filled).
              JBV and Vestibular/Headaches/Paeds Initial/Subsequent auto-fill from the Activity Report by
              counting rows whose service item matches each keyword. Women&apos;s Health has no report source,
              so it stays manual.
            </p>
            <ClinicFieldGrid
              fields={getClinicFieldsByCategory("Clinic").filter(
                (f) => !["jbv_total", "specialty_vestibular_total", "specialty_headaches_total", "specialty_paeds_total"].includes(f.id)
              )}
              values={weekly}
              onChange={onChange}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
