import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderDetailView } from "@/components/provider/ProviderDetailView";
import { getProviderDetailData } from "@/lib/providerData";
import { getRoleTargets, getNotRebookedClients } from "@/lib/clinicData";
import { defaultWeekEnding, trackingHistoryWeeks } from "@/lib/week";
import { ROLE_LABELS } from "@/lib/providerSchema";

export default async function ProviderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { id } = await params;
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();

  const [{ provider, history, currentMeetingNotes, previousMeetingNotes, sixWeekReviewNames, sixWeekReviewWeek }, roleTargets] =
    await Promise.all([getProviderDetailData(id, week, trackingHistoryWeeks(week)), getRoleTargets()]);
  if (!provider) notFound();
  const notRebookedClients = await getNotRebookedClients(provider.name);

  return (
    <>
      <PageHeader title={provider.name} subtitle={ROLE_LABELS[provider.role]} backTo="history" />
      <ProviderDetailView
        provider={provider}
        week={week}
        history={history}
        currentMeetingNotes={currentMeetingNotes}
        previousMeetingNotes={previousMeetingNotes}
        sixWeekReviewNames={sixWeekReviewNames}
        sixWeekReviewWeek={sixWeekReviewWeek}
        notRebookedClients={notRebookedClients}
        roleTargets={roleTargets}
        variant="standard"
      />
    </>
  );
}
