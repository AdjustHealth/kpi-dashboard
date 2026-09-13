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
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { defaultWeekEnding, trackingHistoryWeeks } from "@/lib/week";
import { ROLE_LABELS } from "@/lib/providerSchema";

export default async function MyDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [provider, coach] = await Promise.all([myProvider(user?.email), Promise.resolve(coachNameForUser(user?.email))]);

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
  let history: Awaited<ReturnType<typeof getMyProviderHistory>> = [];
  let occupancyTarget: number | null = null;
  if (provider) {
    const [providerHistory, roleTargets] = await Promise.all([getMyProviderHistory(provider.id, week, trackingHistoryWeeks(week)), getRoleTargets()]);
    history = providerHistory;
    const effectiveTargets = { ...(roleTargets[provider.role] ?? {}), ...(provider.targets ?? {}) };
    occupancyTarget = typeof effectiveTargets.occupancy_pct === "number" ? effectiveTargets.occupancy_pct : null;
  }

  let gymCounts: { active: number; onHold: number; overdue: number; dueThisWeek: number } | null = null;
  if (coach) {
    const gymSupabase = createProgramTrackerAdminClient();
    const { data } = await gymSupabase.from("members").select("*").eq("coach", coach);
    const members: Member[] = ((data ?? []) as Member[]).map((m) => ({ ...m, due_status: calcDueStatus(m.next_due, m.status, holdEndOf(m)) }));
    gymCounts = {
      active: members.filter((m) => m.status === "Active").length,
      onHold: members.filter((m) => m.status === "Hold").length,
      overdue: members.filter((m) => m.due_status === "OVERDUE" || m.due_status === "Hold overdue").length,
      dueThisWeek: members.filter((m) => m.due_status === "Due this week" || m.due_status === "Hold ending soon").length,
    };
  }

  return (
    <>
      <PageHeader title="My Dashboard" subtitle={provider ? ROLE_LABELS[provider.role] : undefined} showWeekSelector={false} />
      <div className="flex flex-col gap-6 p-8">
        {provider && (
          <>
            <MyStatsCharts history={history} occupancyTarget={occupancyTarget} />
            <MyGoalsCard goals={provider.goals ?? []} />
          </>
        )}

        {gymCounts && (
          <Card title="Adjust Gym — Your Coaching Load">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label="Active" value={String(gymCounts.active)} />
              <StatTile label="On Hold" value={String(gymCounts.onHold)} />
              <StatTile label="Overdue" value={String(gymCounts.overdue)} />
              <StatTile label="Due This Week" value={String(gymCounts.dueThisWeek)} />
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
