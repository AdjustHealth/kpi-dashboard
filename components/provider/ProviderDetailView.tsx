import { MeetingNotesCard } from "@/components/provider/MeetingNotesCard";
import { ActionStepsCard } from "@/components/provider/ActionStepsCard";
import { WeeklyScorecardTable, WeekMetrics } from "@/components/provider/PerformanceTable";
import { KpaScorecardTable } from "@/components/provider/KpaScorecardTable";
import { AdminSharedComplianceTable } from "@/components/provider/AdminSharedComplianceTable";
import { NewPatientsCard } from "@/components/provider/NewPatientsCard";
import { ProviderCharts } from "@/components/provider/ProviderCharts";
import { AdminPerformanceCharts } from "@/components/provider/AdminPerformanceCharts";
import { SpecialtyKpiCard } from "@/components/provider/SpecialtyKpiCard";
import { BonusTierCard } from "@/components/provider/BonusTierCard";
import { ClinicAnalysisCard } from "@/components/provider/ClinicAnalysisCard";
import { SeniorHeroSummary } from "@/components/provider/SeniorHeroSummary";
import { COMPLIANCE_FIELDS, PROVIDER_GOAL_FIELDS, metricFieldsForRole, kpaGroupsForRole, ProviderMeetingNotes } from "@/lib/providerSchema";
import { getEffectiveTargets } from "@/lib/defaultTargets";
import { Provider } from "@/lib/types";
import { ClinicWeekRow } from "@/lib/clinicData";

function SectionLabel({ children }: { children: string }) {
  return <h2 className="text-sm font-semibold text-foreground">{children}</h2>;
}

export function ProviderDetailView({
  provider,
  week,
  history,
  currentMeetingNotes,
  clinicHistory,
  seniorSince,
  roleTargets,
  variant,
}: {
  provider: Provider;
  week: string;
  history: WeekMetrics[];
  currentMeetingNotes: ProviderMeetingNotes;
  clinicHistory?: ClinicWeekRow[];
  /** Only count weeks from this date forward toward bonus-tier cumulative turnover. */
  seniorSince?: string | null;
  /** Role-level target groups (Providers/Senior/Admin) — see lib/targetsSchema.ts. */
  roleTargets?: Record<string, Record<string, unknown>>;
  variant: "standard" | "senior" | "admin";
}) {
  const metricFields = metricFieldsForRole(provider.role);
  const effectiveTargets = getEffectiveTargets(provider, roleTargets);
  const kpaGroups = kpaGroupsForRole(provider.role);
  // Cumulative turnover must only count weeks since this senior physio
  // actually started the role, not the whole fetched history window.
  const bonusHistory = seniorSince ? history.filter((h) => h.week_ending >= seniorSince) : history;
  const bonusClinicHistory = seniorSince
    ? (clinicHistory ?? []).filter((h) => h.week_ending >= seniorSince)
    : (clinicHistory ?? []);
  const currentMetrics = history[history.length - 1]?.metrics ?? {};
  const newPatientNames = currentMetrics.new_patient_names;

  if (variant === "senior") {
    const weeklyTurnover = bonusHistory.map((h) => (typeof h.metrics.turnover === "number" ? h.metrics.turnover : null));
    return (
      <div className="flex flex-col gap-6 p-8">
        <MeetingNotesCard providerId={provider.id} week={week} initialNotes={currentMeetingNotes} />

        <SeniorHeroSummary
          targets={provider.targets}
          weeklyTurnover={weeklyTurnover}
          currentMetrics={currentMetrics}
          effectiveTargets={effectiveTargets}
        />

        <div className="flex flex-col gap-4">
          <SectionLabel>Bonus &amp; Growth</SectionLabel>
          <BonusTierCard
            targets={provider.targets}
            weeklyTurnover={weeklyTurnover}
            weekLabels={bonusHistory.map((h) => h.week_ending)}
            jbvHistory={bonusClinicHistory.map((h) => (typeof h.jbv_total === "number" ? h.jbv_total : null))}
          />
        </div>

        <div className="flex flex-col gap-4">
          <SectionLabel>Specialty &amp; Clinic Context</SectionLabel>
          <SpecialtyKpiCard
            providerId={provider.id}
            week={week}
            specialtyMetrics={provider.specialty_metrics}
            targets={provider.targets}
            initialValues={currentMetrics}
          />
          {clinicHistory && <ClinicAnalysisCard history={clinicHistory} />}
        </div>

        <div className="flex flex-col gap-4">
          <SectionLabel>KPI Scorecard</SectionLabel>
          <WeeklyScorecardTable
            title="KPI Scorecard"
            fields={metricFields}
            targets={effectiveTargets}
            providerId={provider.id}
            currentWeek={week}
            history={history}
            section="metrics"
          />
          {Array.isArray(newPatientNames) && <NewPatientsCard names={newPatientNames as string[]} />}
        </div>

        <div className="flex flex-col gap-4">
          <SectionLabel>Compliance &amp; Culture</SectionLabel>
          <WeeklyScorecardTable
            title="Compliance"
            fields={COMPLIANCE_FIELDS}
            targets={{}}
            providerId={provider.id}
            currentWeek={week}
            history={history}
            section="kpas"
          />
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
        </div>

        <div className="flex flex-col gap-4">
          <SectionLabel>Performance Trends</SectionLabel>
          <ProviderCharts history={history} />
        </div>

        <div className="flex flex-col gap-4">
          <SectionLabel>Action Plan</SectionLabel>
          <ActionStepsCard providerId={provider.id} week={week} initialNotes={currentMeetingNotes} size="large" categorized />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <MeetingNotesCard providerId={provider.id} week={week} initialNotes={currentMeetingNotes} />

      <ActionStepsCard providerId={provider.id} week={week} initialNotes={currentMeetingNotes} showGoals={false} />

      <WeeklyScorecardTable
        title="KPI Scorecard"
        fields={metricFields}
        targets={effectiveTargets}
        providerId={provider.id}
        currentWeek={week}
        history={history}
        section="metrics"
      />

      {variant !== "admin" && Array.isArray(newPatientNames) && <NewPatientsCard names={newPatientNames as string[]} />}

      {variant === "admin" && clinicHistory && <AdminSharedComplianceTable clinicHistory={clinicHistory} />}

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

      <WeeklyScorecardTable
        title="Performance Review Goals"
        fields={PROVIDER_GOAL_FIELDS}
        targets={{}}
        providerId={provider.id}
        currentWeek={week}
        history={history}
        section="kpas"
      />

      {variant === "admin" ? <AdminPerformanceCharts history={history} /> : <ProviderCharts history={history} />}
    </div>
  );
}
