import { notFound } from "next/navigation";
import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderDetailView } from "@/components/provider/ProviderDetailView";
import { getProviderDetailData } from "@/lib/providerData";
import { getClinicHistory } from "@/lib/clinicData";
import { createClient } from "@/lib/supabase/server";
import { defaultWeekEnding, weeksBetween } from "@/lib/week";

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

  // Bonus-tier cumulative turnover must only count weeks since this senior
  // physio actually started the role — peek at that date first so the
  // history window is wide enough to cover it (a fixed trailing 12 weeks
  // would silently include pre-promotion weeks, or miss early weeks once
  // more than 12 weeks have passed since senior_since).
  const supabase = await createClient();
  const { data: providerRow } = await supabase.from("providers").select("targets").eq("id", id).maybeSingle();
  const seniorSince =
    typeof providerRow?.targets?.senior_since === "string" ? (providerRow.targets.senior_since as string) : null;
  const historyWeeks = seniorSince ? Math.max(12, weeksBetween(seniorSince, week) + 1) : 12;

  const [{ provider, history, currentMeetingNotes }, clinicHistory] = await Promise.all([
    getProviderDetailData(id, week, historyWeeks),
    getClinicHistory(week, historyWeeks),
  ]);
  if (!provider || provider.role !== "senior_physio") notFound();

  return (
    <>
      <PageHeader title={provider.name} subtitle="Senior Physio" />
      <ProviderDetailView
        provider={provider}
        week={week}
        history={history}
        currentMeetingNotes={currentMeetingNotes}
        clinicHistory={clinicHistory}
        seniorSince={seniorSince}
        variant="senior"
      />
    </>
  );
}
