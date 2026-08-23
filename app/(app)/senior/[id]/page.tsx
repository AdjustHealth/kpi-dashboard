import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderDetailView } from "@/components/provider/ProviderDetailView";
import { getProviderDetailData } from "@/lib/providerData";
import { getClinicHistory, getRoleTargets, getNotRebookedClients, getDropOutRateHistory } from "@/lib/clinicData";
import { createClient } from "@/lib/supabase/server";
import { defaultWeekEnding, weeksBetween, TRACKING_START_WEEK_ENDING } from "@/lib/week";
import { requireDirector } from "@/lib/auth/access";

export default async function SeniorPhysioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  await requireDirector();
  const { id } = await params;
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();

  // Senior physio pages show every tracked week, uncapped — unlike the
  // fixed trailing window everywhere else, directors want to see a senior's
  // whole trend, not just a recent slice (bonus-tier cumulative turnover
  // still only counts weeks since this senior physio actually started the
  // role — ProviderDetailView filters that down separately).
  const supabase = await createClient();
  const { data: providerRow } = await supabase.from("providers").select("targets").eq("id", id).maybeSingle();
  const seniorSince =
    typeof providerRow?.targets?.senior_since === "string" ? (providerRow.targets.senior_since as string) : null;
  const historyWeeks = weeksBetween(TRACKING_START_WEEK_ENDING, week) + 1;

  const [
    { provider, history, currentMeetingNotes, previousMeetingNotes, sixWeekReviewNames, sixWeekReviewWeek },
    clinicHistory,
    roleTargets,
  ] = await Promise.all([
    getProviderDetailData(id, week, historyWeeks),
    getClinicHistory(week, historyWeeks),
    getRoleTargets(),
  ]);
  if (!provider || provider.role !== "senior_physio") notFound();
  const [notRebookedClients, dropOutRateHistory] = await Promise.all([
    getNotRebookedClients(provider.name),
    getDropOutRateHistory(provider.name, history.map((h) => h.week_ending)),
  ]);

  return (
    <>
      <PageHeader title={provider.name} subtitle="Senior Physio" backTo="history" />
      <ProviderDetailView
        provider={provider}
        week={week}
        history={history}
        currentMeetingNotes={currentMeetingNotes}
        previousMeetingNotes={previousMeetingNotes}
        sixWeekReviewNames={sixWeekReviewNames}
        sixWeekReviewWeek={sixWeekReviewWeek}
        notRebookedClients={notRebookedClients}
        dropOutRateHistory={dropOutRateHistory}
        clinicHistory={clinicHistory}
        seniorSince={seniorSince}
        roleTargets={roleTargets}
        variant="senior"
      />
    </>
  );
}
