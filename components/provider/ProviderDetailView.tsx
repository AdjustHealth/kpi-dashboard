import { MeetingNotesCard } from "@/components/provider/MeetingNotesCard";
import { ActionStepsCard } from "@/components/provider/ActionStepsCard";
import { WeeklyScorecardTable, WeekMetrics } from "@/components/provider/PerformanceTable";
import { KpaScorecardTable } from "@/components/provider/KpaScorecardTable";
import { AdminSharedComplianceTable } from "@/components/provider/AdminSharedComplianceTable";
import { ProviderCharts } from "@/components/provider/ProviderCharts";
import { AdminPerformanceCharts } from "@/components/provider/AdminPerformanceCharts";
import { SpecialtyKpiCard } from "@/components/provider/SpecialtyKpiCard";
import { BonusTierCard } from "@/components/provider/BonusTierCard";
import { ClinicAnalysisCard } from "@/components/provider/ClinicAnalysisCard";
import { COMPLIANCE_FIELDS, PROVIDER_GOAL_FIELDS, metricFieldsForRole, kpaGroupsForRole, ProviderMeetingNotes } from "@/lib/providerSchema";
import { getEffectiveTargets } from "@/lib/defaultTargets";
import { Provider } from "@/lib/types";
import { ClinicWeekRow } from "@/lib/clinicData";

export function ProviderDetailView({
  provider,
  week,
  history,
  currentMeetingNotes,
  clinicHistory,
  seniorSince,
  variant,
}: {
  provider: Provider;
  week: string;
  history: WeekMetrics[];
  currentMeetingNotes: ProviderMeetingNotes;
  clinicHistory?: ClinicWeekRow[];
  /** Only count weeks from this date forward toward bonus-tier cumulative turnover. */
  seniorSince?: string | null;
  variant: "standard" | "senior" | "admin";
}) {
  const metricFields = metricFieldsForRole(provider.role);
  const effectiveTargets = getEffectiveTargets(provider);
  const kpaGroups = kpaGroupsForRole(provider.role);
  // Cumulative turnover must only count weeks since this senior physio
  // actually started the role, not the whole fetched history window.
  const bonusHistory = seniorSince ? history.filter((h) => h.week_ending >= seniorSince) : history;
  const bonusClinicHistory = seniorSince
    ? (clinicHistory ?? []).filter((h) => h.week_ending >= seniorSince)
    : (clinicHistory ?? []);

  return (
    <div className="flex flex-col gap-6 p-8">
      <MeetingNotesCard providerId={provider.id} week={week} initialNotes={currentMeetingNotes} />

      {variant !== "senior" && (
        <ActionStepsCard providerId={provider.id} week={week} initialNotes={currentMeetingNotes} showGoals={false} />
      )}

      {variant === "senior" && (
        <SpecialtyKpiCard
          providerId={provider.id}
          week={week}
          specialtyMetrics={provider.specialty_metrics}
          targets={provider.targets}
          initialValues={history[history.length - 1]?.metrics ?? {}}
        />
      )}

      {variant === "senior" && clinicHistory && <ClinicAnalysisCard history={clinicHistory} />}

      <WeeklyScorecardTable
        title="KPI Scorecard"
        fields={metricFields}
        targets={effectiveTargets}
        providerId={provider.id}
        currentWeek={week}
        history={history}
        section="metrics"
      />

      {variant === "admin" && clinicHistory && <AdminSharedComplianceTable clinicHistory={clinicHistory} />}

      {variant === "senior" && (
        <BonusTierCard
          targets={provider.targets}
          weeklyTurnover={bonusHistory.map((h) => (typeof h.metrics.turnover === "number" ? h.metrics.turnover : null))}
          weekLabels={bonusHistory.map((h) => h.week_ending)}
          jbvHistory={bonusClinicHistory.map((h) => (typeof h.jbv_total === "number" ? h.jbv_total : null))}
        />
      )}

      {variant !== "admin" && (
        <WeeklyScorecardTable
          title="Compliance"
          fields={COMPLIANCE_FIELDS}
          targets={{}}
          providerId={provider.id}
          currentWeek={week}
          history={history}
          section="kpas"
        />
      )}

      {kpaGroups.map((group) => (
        <KpaScorecardTable
          key={group.title}
          title={group.title}
          fields={group.fields}
          providerId={provider.id}
          currentWeek={week}
          history={history}
          section="kpas"
        />
      ))}

      {(variant === "standard" || variant === "admin") && (
        <WeeklyScorecardTable
          title="Performance Review Goals"
          fields={PROVIDER_GOAL_FIELDS}
          targets={{}}
          providerId={provider.id}
          currentWeek={week}
          history={history}
          section="kpas"
        />
      )}

      {variant === "admin" ? <AdminPerformanceCharts history={history} /> : <ProviderCharts history={history} />}

      {variant === "senior" && (
        <ActionStepsCard providerId={provider.id} week={week} initialNotes={currentMeetingNotes} size="large" categorized />
      )}
    </div>
  );
}
