import { MeetingNotesCard } from "@/components/provider/MeetingNotesCard";
import { PerformanceTable, WeekMetrics } from "@/components/provider/PerformanceTable";
import { ProviderCharts } from "@/components/provider/ProviderCharts";
import { ChecklistCard } from "@/components/provider/ChecklistCard";
import { SpecialtyKpiCard } from "@/components/provider/SpecialtyKpiCard";
import { BonusTierCard } from "@/components/provider/BonusTierCard";
import { COMPLIANCE_FIELDS, SYSTEMS_KPA_FIELDS, metricFieldsForRole, ProviderMeetingNotes } from "@/lib/providerSchema";
import { Provider } from "@/lib/types";

export function ProviderDetailView({
  provider,
  week,
  history,
  currentKpas,
  currentMeetingNotes,
  clinicJbvHistory,
  variant,
}: {
  provider: Provider;
  week: string;
  history: WeekMetrics[];
  currentKpas: Record<string, unknown>;
  currentMeetingNotes: ProviderMeetingNotes;
  clinicJbvHistory?: (number | null)[];
  variant: "standard" | "senior" | "admin";
}) {
  const metricFields = metricFieldsForRole(provider.role);

  return (
    <div className="flex flex-col gap-6 p-8">
      <MeetingNotesCard providerId={provider.id} week={week} initialNotes={currentMeetingNotes} />

      {variant === "senior" && (
        <SpecialtyKpiCard
          providerId={provider.id}
          week={week}
          specialtyMetrics={provider.specialty_metrics}
          targets={provider.targets}
          initialValues={history[history.length - 1]?.metrics ?? {}}
        />
      )}

      <PerformanceTable
        title="Performance"
        fields={metricFields}
        targets={provider.targets}
        providerId={provider.id}
        currentWeek={week}
        history={history}
      />

      {variant === "senior" && (
        <BonusTierCard
          targets={provider.targets}
          weeklyTurnover={history.map((h) => (typeof h.metrics.turnover === "number" ? h.metrics.turnover : null))}
          weekLabels={history.map((h) => h.week_ending)}
          jbvHistory={clinicJbvHistory ?? []}
        />
      )}

      <ChecklistCard
        title="Compliance Checklist"
        fields={COMPLIANCE_FIELDS}
        providerId={provider.id}
        week={week}
        initialValues={currentKpas}
      />

      {variant !== "admin" && (
        <ChecklistCard
          title="Systems + KPAs"
          fields={SYSTEMS_KPA_FIELDS}
          providerId={provider.id}
          week={week}
          initialValues={currentKpas}
        />
      )}

      <ProviderCharts history={history} />
    </div>
  );
}
