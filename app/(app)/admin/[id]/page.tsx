import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderDetailView } from "@/components/provider/ProviderDetailView";
import { getProviderDetailData } from "@/lib/providerData";
import { getClinicHistory, getRoleTargets } from "@/lib/clinicData";
import { createClient } from "@/lib/supabase/server";
import { defaultWeekEnding, trackingHistoryWeeks } from "@/lib/week";
import { CancellationEventRow } from "@/components/clinic/CancellationsTable";

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

  const supabase = await createClient();
  const { data: cxData } = await supabase
    .from("cancellation_events")
    .select("*")
    .eq("week_ending", week)
    .eq("modified_user", provider.name)
    .order("appointment_date", { ascending: true })
    .order("client", { ascending: true });
  const adminCancellations = (cxData ?? []) as CancellationEventRow[];

  return (
    <>
      <PageHeader title={provider.name} subtitle="Admin" backTo="history" />
      <ProviderDetailView
        provider={provider}
        week={week}
        history={history}
        currentMeetingNotes={currentMeetingNotes}
        clinicHistory={clinicHistory}
        roleTargets={roleTargets}
        adminCancellations={adminCancellations}
        variant="admin"
      />
    </>
  );
}
