import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderDetailView } from "@/components/provider/ProviderDetailView";
import { getClinicJbvHistory, getProviderDetailData } from "@/lib/providerData";
import { defaultWeekEnding } from "@/lib/week";

export default async function SeniorPhysioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { id } = await params;
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();

  const [{ provider, history, currentKpas, currentMeetingNotes }, jbvHistory] = await Promise.all([
    getProviderDetailData(id, week),
    getClinicJbvHistory(week),
  ]);
  if (!provider || provider.role !== "senior_physio") notFound();

  return (
    <>
      <PageHeader title={provider.name} subtitle="Senior Physio" />
      <ProviderDetailView
        provider={provider}
        week={week}
        history={history}
        currentKpas={currentKpas}
        currentMeetingNotes={currentMeetingNotes}
        clinicJbvHistory={jbvHistory}
        variant="senior"
      />
    </>
  );
}
