import { MeetingNotesCard } from "@/components/provider/MeetingNotesCard";
import { ActionStepsCard } from "@/components/provider/ActionStepsCard";
import { WeeklyScorecardTable, WeekMetrics } from "@/components/provider/PerformanceTable";
import { KpaScorecardTable } from "@/components/provider/KpaScorecardTable";
import { AdminSharedComplianceTable } from "@/components/provider/AdminSharedComplianceTable";
import { CancellationsTable, CancellationEventRow } from "@/components/clinic/CancellationsTable";
import { Card } from "@/components/ui/Card";
import { NewPatientsCard } from "@/components/provider/NewPatientsCard";
import { ProviderCharts } from "@/components/provider/ProviderCharts";
import { AdminPerformanceCharts } from "@/components/provider/AdminPerformanceCharts";
import { SpecialtyKpiCard } from "@/components/provider/SpecialtyKpiCard";
import { ProgrammingPrepCard } from "@/components/provider/ProgrammingPrepCard";
import { BonusTierCard } from "@/components/provider/BonusTierCard";
import { ClinicAnalysisCard } from "@/components/provider/ClinicAnalysisCard";
import { SeniorHeroSummary } from "@/components/provider/SeniorHeroSummary";
import { GoalsCard } from "@/components/provider/GoalsCard";
import { COMPLIANCE_FIELDS, metricFieldsForRole, kpaGroupsForRole, ProviderMeetingNotes } from "@/lib/providerSchema";
import { normalizeActionItems } from "@/lib/actionItems";
import { getEffectiveTargets } from "@/lib/defaultTargets";
import { computeSpecialtyCalcMetrics } from "@/lib/providerCalc";
import { Provider } from "@/lib/types";
import { ClinicWeekRow } from "@/lib/clinicData";

function SectionLabel({ children }: { children: string }) {
  return <h2 className="text-sm font-semibold text-foreground">{children}</h2>;
}

/**
 * Formats last week's still-open Action Steps as text to carry into this
 * week's "Review from Last Week / Action Steps" discussion field —
 * standard/admin providers only. This is separate from ActionStepsCard's
 * own per-item Carry Over button (which actually re-creates the item on
 * next week's checklist) — this is just a narrative summary for the
 * "review last week" conversation, so it still includes items regardless
 * of whether they were also explicitly carried over.
 */
function formatCarriedOverActions(notes: ProviderMeetingNotes): string {
  return normalizeActionItems(notes.action_steps)
    .filter((i) => i.status === "open")
    .map((i) => `- ${i.text}`)
    .join("\n");
}

export function ProviderDetailView({
  provider,
  week,
  history,
  currentMeetingNotes,
  previousMeetingNotes,
  sixWeekReviewNames,
  sixWeekReviewWeek,
  notRebookedClients,
  clinicHistory,
  seniorSince,
  roleTargets,
  adminCancellations,
  variant,
}: {
  provider: Provider;
  week: string;
  history: WeekMetrics[];
  currentMeetingNotes: ProviderMeetingNotes;
  /** Last week's meeting_notes — carried into this week's "Review from Last Week / Action Steps" field. */
  previousMeetingNotes?: ProviderMeetingNotes;
  /** New patient names from exactly 6 weeks ago — due for a 6 week progress check-in. */
  sixWeekReviewNames?: string[];
  sixWeekReviewWeek?: string;
  /** This provider's own cancelled clients with no future booking at all — not scoped to this week. */
  notRebookedClients?: CancellationEventRow[];
  clinicHistory?: ClinicWeekRow[];
  /** Only count weeks from this date forward toward bonus-tier cumulative turnover. */
  seniorSince?: string | null;
  /** Role-level target groups (Providers/Senior/Admin) — see lib/targetsSchema.ts. */
  roleTargets?: Record<string, Record<string, unknown>>;
  /** This admin's own cancellation/DNA rows for the week — variant "admin" only. */
  adminCancellations?: CancellationEventRow[];
  variant: "standard" | "senior" | "admin";
}) {
  const metricFields = metricFieldsForRole(provider.role);
  const effectiveTargets = getEffectiveTargets(provider, roleTargets);
  const kpaGroups = kpaGroupsForRole(provider.role);
  const carriedOverActionText = formatCarriedOverActions(previousMeetingNotes ?? {});
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
    const bonusMetricKey = typeof provider.targets.bonus_metric_key === "string" ? provider.targets.bonus_metric_key : null;
    // A calc-source specialty metric (e.g. Marcio's Headache Total = Init + Sub)
    // is never itself written to provider_weekly.metrics — only its manual
    // inputs are. Reading it straight off stored metrics would silently come
    // back null for every week, so recompute it per week the same way
    // SpecialtyKpiCard does for the current week.
    const bonusMetricIsCalc = provider.specialty_metrics?.some((m) => m.key === bonusMetricKey && m.source === "calc") ?? false;
    const bonusMetricHistory = bonusMetricKey
      ? bonusHistory.map((h) => {
          if (bonusMetricIsCalc) {
            const calc = computeSpecialtyCalcMetrics(provider.specialty_metrics ?? [], h.metrics);
            return typeof calc[bonusMetricKey] === "number" ? calc[bonusMetricKey] : null;
          }
          return typeof h.metrics[bonusMetricKey] === "number" ? (h.metrics[bonusMetricKey] as number) : null;
        })
      : undefined;
    return (
      <div className="flex flex-col gap-6 p-8">
        <MeetingNotesCard
          providerId={provider.id}
          week={week}
          initialNotes={currentMeetingNotes}
          previousMultiDisc={previousMeetingNotes?.multi_disc_utilisation}
        />

        {provider.targets.show_programming_prep === true && (
          <ProgrammingPrepCard providerId={provider.id} week={week} initialNotes={currentMeetingNotes} />
        )}

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
            bonusMetricHistory={bonusMetricHistory}
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
            history={history}
          />
          {clinicHistory && <ClinicAnalysisCard history={clinicHistory} roleTargets={roleTargets} />}
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
          <NewPatientsCard
            names={Array.isArray(newPatientNames) ? (newPatientNames as string[]) : []}
            sixWeekReviewNames={sixWeekReviewNames}
            sixWeekReviewWeek={sixWeekReviewWeek}
          />
          <Card
            title={`Not Rebooked — No Future Booking${notRebookedClients && notRebookedClients.length > 0 ? ` (${notRebookedClients.length})` : ""}`}
          >
            {notRebookedClients && notRebookedClients.length > 0 ? (
              <CancellationsTable rows={notRebookedClients} hideProvider showResolveAction />
            ) : (
              <p className="text-xs text-muted">No clients currently sitting without a future booking.</p>
            )}
          </Card>
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
          <ProviderCharts history={history} showTpr targets={effectiveTargets} />
        </div>

        <div className="flex flex-col gap-4">
          <SectionLabel>Action Plan</SectionLabel>
          <ActionStepsCard
            providerId={provider.id}
            week={week}
            initialNotes={currentMeetingNotes}
            size="large"
            categorized
            showGoals={false}
          />
        </div>

        <GoalsCard providerId={provider.id} initialGoals={provider.goals} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <MeetingNotesCard
        providerId={provider.id}
        week={week}
        initialNotes={currentMeetingNotes}
        showMultiDisc={variant !== "admin"}
        adminMode={variant === "admin"}
        carriedOverActionText={carriedOverActionText}
        previousMultiDisc={previousMeetingNotes?.multi_disc_utilisation}
      />

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

      {variant !== "admin" && (
        <NewPatientsCard
          names={Array.isArray(newPatientNames) ? (newPatientNames as string[]) : []}
          sixWeekReviewNames={sixWeekReviewNames}
          sixWeekReviewWeek={sixWeekReviewWeek}
        />
      )}

      {variant !== "admin" && (
        <Card
          title={`Not Rebooked — No Future Booking${notRebookedClients && notRebookedClients.length > 0 ? ` (${notRebookedClients.length})` : ""}`}
        >
          {notRebookedClients && notRebookedClients.length > 0 ? (
            <CancellationsTable rows={notRebookedClients} hideProvider showResolveAction />
          ) : (
            <p className="text-xs text-muted">No clients currently sitting without a future booking.</p>
          )}
        </Card>
      )}

      {variant === "admin" && clinicHistory && (
        <AdminSharedComplianceTable
          providerId={provider.id}
          currentWeek={week}
          clinicHistory={clinicHistory}
          history={history}
          targets={effectiveTargets}
        />
      )}

      {variant === "admin" && (
        <Card title="This Week's Cancellations Handled">
          {adminCancellations && adminCancellations.length > 0 ? (
            <CancellationsTable rows={adminCancellations} hideHandledBy />
          ) : (
            <p className="text-xs text-muted">No cancellations or DNAs handled by {provider.name} this week.</p>
          )}
        </Card>
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
          showNotes={variant === "admin"}
        />
      ))}

      <GoalsCard providerId={provider.id} initialGoals={provider.goals} />

      {variant === "admin" ? (
        <AdminPerformanceCharts history={history} targets={effectiveTargets} />
      ) : (
        <ProviderCharts history={history} targets={effectiveTargets} />
      )}
    </div>
  );
}
