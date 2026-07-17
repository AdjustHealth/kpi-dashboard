"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { ClinicFieldGrid } from "@/components/inputs/ClinicFieldGrid";
import { NookalUpload } from "@/components/inputs/NookalUpload";
import { ChecklistCard } from "@/components/provider/ChecklistCard";
import { getClinicFieldsByCategory } from "@/lib/schema";
import { COMPLIANCE_FIELDS } from "@/lib/providerSchema";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
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

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/weekly-kpis", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_ending: week, patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  function onChange(id: string, value: number | null) {
    setWeekly((prev) => ({ ...prev, [id]: value }));
    set(id, value);
  }

  const kpasByProvider = new Map(initialProviderWeekly.map((r) => [r.provider_id, r.kpas]));

  return (
    <div className="flex flex-col gap-6 p-8">
      <NookalUpload week={week} />

      <Card
        title="Clinic Activity & Occupancy"
        action={<SaveIndicator status={status} />}
      >
        <p className="mb-4 text-xs text-muted">
          Total Revenue and Occupancy auto-fill from the Activity and
          Occupancy report uploads above — cancellations/DNAs and new
          clients auto-fill too, once those reports are uploaded. Everything
          stays editable.
        </p>
        <ClinicFieldGrid
          fields={[
            ...getClinicFieldsByCategory("Revenue").filter((f) => f.source !== "date" && f.id !== "total_adjust_pod_rev"),
            ...getClinicFieldsByCategory("Occupancy"),
          ]}
          values={weekly}
          onChange={onChange}
        />
      </Card>

      <Card title="Revenue by Payer" action={<span className="text-xs text-muted">Auto-fills from Activity Report</span>}>
        <ClinicFieldGrid fields={getClinicFieldsByCategory("Payer")} values={weekly} onChange={onChange} />
      </Card>

      <Card title="Manual Clinic Fields">
        <ClinicFieldGrid
          fields={[
            ...getClinicFieldsByCategory("Gym").filter((f) => f.id !== "gym_total"),
            ...getClinicFieldsByCategory("Podiatry"),
          ]}
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

      <Card title="Clinic — CVA & JBV" action={<span className="text-xs text-muted">Shared across all provider pages</span>}>
        <ClinicFieldGrid
          fields={getClinicFieldsByCategory("Clinic").filter((f) => f.id !== "jbv_total")}
          values={weekly}
          onChange={onChange}
        />
      </Card>

      <Card title="Cancellations & CX">
        <ClinicFieldGrid fields={getClinicFieldsByCategory("CX")} values={weekly} onChange={onChange} />
      </Card>

      <Card title="Admin Manual Fields">
        <ClinicFieldGrid fields={getClinicFieldsByCategory("Admin")} values={weekly} onChange={onChange} />
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Provider Compliance</h2>
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
  );
}
