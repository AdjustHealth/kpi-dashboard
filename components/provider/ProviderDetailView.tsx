import { MeetingNotesCard } from "@/components/provider/MeetingNotesCard";
import { WeeklyScorecardTable, WeekMetrics } from "@/components/provider/PerformanceTable";
import { ProviderCharts } from "@/components/provider/ProviderCharts";
import { SpecialtyKpiCard } from "@/components/provider/SpecialtyKpiCard";
import { BonusTierCard } from "@/components/provider/BonusTierCard";
import { COMPLIANCE_FIELDS, SYSTEMS_KPA_FIELDS, metricFieldsForRole, ProviderMeetingNotes } from "@/lib/providerSchema";
import { Provider } from "@/lib/types";

export function ProviderDetailView({
  provider,
  week,
  history,
  currentMeetingNotes,
  clinicJbvHistory,
  variant,
}: {
  provider: Provider;
  week: string;
  history: WeekMetrics[];
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

      <WeeklyScorecardTable
        title="KPI Scorecard"
        fields={metricFields}
        targets={provider.targets}
        providerId={provider.id}
        currentWeek={week}
        history={history}
        section="metrics"
      />

      {variant === "senior" && (
        <BonusTierCard
          targets={provider.targets}
          weeklyTurnover={history.map((h) => (typeof h.metrics.turnover === "number" ? h.metrics.turnover : null))}
          weekLabels={history.map((h) => h.week_ending)}
          jbvHistory={clinicJbvHistory ?? []}
        />
      )}

      <WeeklyScorecardTable
        title="Compliance"
        fields={COMPLIANCE_FIELDS}
        targets={{}}
        providerId={provider.id}
        currentWeek={week}
        history={history}
        section="kpas"
      />

      {variant !== "admin" && (
        <WeeklyScorecardTable
          title="KPA Scorecard"
          fields={SYSTEMS_KPA_FIELDS}
          targets={{}}
          providerId={provider.id}
          currentWeek={week}
          history={history}
          section="kpas"
        />
      )}

      <ProviderCharts history={history} />
    </div>
  );
}
