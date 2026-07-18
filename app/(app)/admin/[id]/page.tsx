import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderDetailView } from "@/components/provider/ProviderDetailView";
import { getProviderDetailData } from "@/lib/providerData";
import { getClinicHistory, getRoleTargets } from "@/lib/clinicData";
import { defaultWeekEnding, trackingHistoryWeeks } from "@/lib/week";

export default async function AdminDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { id } = await params;
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();
  const historyWeeks = trackingHistoryWeeks(week);

  const [{ provider, history, currentMeetingNotes }, clinicHistory, roleTargets] = await Promise.all([
    getProviderDetailData(id, week, historyWeeks),
    getClinicHistory(week, historyWeeks),
    getRoleTargets(),
  ]);
  if (!provider || provider.role !== "admin") notFound();

  return (
    <>
      <PageHeader title={provider.name} subtitle="Admin" />
      <ProviderDetailView
        provider={provider}
        week={week}
        history={history}
        currentMeetingNotes={currentMeetingNotes}
        clinicHistory={clinicHistory}
        roleTargets={roleTargets}
        variant="admin"
      />
    </>
  );
}
