import { PageHeader } from "@/components/nav/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { myProvider, getMyProviderHistory } from "@/lib/providerIdentity";
import { getRoleTargets } from "@/lib/clinicData";
import { coachNameForUser } from "@/lib/programTracker/coach";
import { createProgramTrackerAdminClient } from "@/lib/programTracker/supabaseAdmin";
import { calcDueStatus, holdEndOf } from "@/lib/programTracker/date";
import { Member } from "@/lib/programTracker/types";
import { MyStatsCharts } from "@/components/me/MyStatsCharts";
import { MyGoalsCard } from "@/components/me/MyGoalsCard";
import { MyCancellationsSection } from "@/components/me/MyCancellationsSection";
import { NewPatientsCard } from "@/components/provider/NewPatientsCard";
import { ColorKpiTile, KPI_ICON_PATHS } from "@/components/ui/ColorKpiTile";
import { Card } from "@/components/ui/Card";
import { defaultWeekEnding, trackingHistoryWeeks } from "@/lib/week";
import { ROLE_LABELS } from "@/lib/providerSchema";

export default async function MyDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ provider, error: providerLookupError }, coach] = await Promise.all([
    myProvider(user?.email),
    Promise.resolve(coachNameForUser(user?.email)),
  ]);

  if (providerLookupError) {
    return (
      <>
        <PageHeader title="My Dashboard" showWeekSelector={false} />
        <div className="p-8">
          <p className="text-sm text-danger">Could not load your dashboard: {providerLookupError}</p>
        </div>
      </>
    );
  }

  if (!provider && !coach) {
    return (
      <>
        <PageHeader title="My Dashboard" showWeekSelector={false} />
        <div className="p-8">
          <p className="text-sm text-muted">
            Couldn&apos;t match your login to a provider or coach. If this is your dashboard, let Michael know so this can be pointed at the right
            name.
          </p>
        </div>
      </>
    );
  }

  const week = defaultWeekEnding();
  let history: Awaited<ReturnType<typeof getMyProviderHistory>>["history"] = [];
  let statsError: string | null = null;
  let occupancyTarget: number | null = null;
  let newPatientNames: string[] = [];
  if (provider) {
    const [historyResult, roleTargets] = await Promise.all([
      getMyProviderHistory(provider.id, week, trackingHistoryWeeks(week)),
      getRoleTargets(),
    ]);
    history = historyResult.history;
    statsError = historyResult.error;
    const effectiveTargets = { ...(roleTargets[provider.role] ?? {}), ...(provider.targets ?? {}) };
    occupancyTarget = typeof effectiveTargets.occupancy_pct === "number" ? effectiveTargets.occupancy_pct : null;
    const thisWeekNames = history.find((h) => h.week_ending === week)?.metrics.new_patient_names;
    newPatientNames = Array.isArray(thisWeekNames) ? (thisWeekNames as string[]) : [];
  }

  let gymCounts: { active: number; onHold: number; overdue: number; dueThisWeek: number } | null = null;
  let gymError: string | null = null;
  if (coach) {
    const gymSupabase = createProgramTrackerAdminClient();
    const { data, error } = await gymSupabase.from("members").select("*").eq("coach", coach);
    if (error) {
      gymError = error.message;
    } else {
      const members: Member[] = ((data ?? []) as Member[]).map((m) => ({ ...m, due_status: calcDueStatus(m.next_due, m.status, holdEndOf(m)) }));
      gymCounts = {
        active: members.filter((m) => m.status === "Active").length,
        onHold: members.filter((m) => m.status === "Hold").length,
        overdue: members.filter((m) => m.due_status === "OVERDUE" || m.due_status === "Hold overdue").length,
        dueThisWeek: members.filter((m) => m.due_status === "Due this week" || m.due_status === "Hold ending soon").length,
      };
    }
  }

  return (
    <>
      <PageHeader title="My Dashboard" subtitle={provider ? ROLE_LABELS[provider.role] : undefined} showWeekSelector={false} />
      <div className="flex flex-col gap-6 p-8">
        {provider &&
          (statsError ? (
            <p className="text-sm text-danger">Could not load your stats: {statsError}</p>
          ) : (
            <>
              <MyStatsCharts history={history} occupancyTarget={occupancyTarget} />
              <NewPatientsCard names={newPatientNames} />
              <MyGoalsCard goals={provider.goals ?? []} />
            </>
          ))}

        {provider && <MyCancellationsSection />}

        {gymError && <p className="text-sm text-danger">Could not load your coaching load: {gymError}</p>}
        {gymCounts && (
          <Card title="Adjust Gym — Your Coaching Load">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ColorKpiTile label="Active" value={gymCounts.active} color="var(--success)" iconPath={KPI_ICON_PATHS.active} />
              <ColorKpiTile label="On Hold" value={gymCounts.onHold} color="var(--muted)" iconPath={KPI_ICON_PATHS.hold} />
              <ColorKpiTile label="Overdue" value={gymCounts.overdue} color="var(--danger)" iconPath={KPI_ICON_PATHS.overdue} />
              <ColorKpiTile label="Due This Week" value={gymCounts.dueThisWeek} color="var(--warning)" iconPath={KPI_ICON_PATHS.dueWeek} />
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
