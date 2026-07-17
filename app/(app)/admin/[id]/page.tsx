import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderDetailView } from "@/components/provider/ProviderDetailView";
import { getProviderDetailData } from "@/lib/providerData";
import { defaultWeekEnding } from "@/lib/week";

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

  const { provider, history, currentMeetingNotes } = await getProviderDetailData(id, week);
  if (!provider || provider.role !== "admin") notFound();

  return (
    <>
      <PageHeader title={provider.name} subtitle="Admin" />
      <ProviderDetailView
        provider={provider}
        week={week}
        history={history}
        currentMeetingNotes={currentMeetingNotes}
        variant="admin"
      />
    </>
  );
}
