import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderCard } from "@/components/provider/ProviderCard";
import { createClient } from "@/lib/supabase/server";
import { defaultWeekEnding } from "@/lib/week";
import { Provider } from "@/lib/types";

export default async function SeniorPhysioDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();

  const supabase = await createClient();
  const { data } = await supabase
    .from("providers")
    .select("*")
    .eq("role", "senior_physio")
    .eq("active", true)
    .order("sort_order");

  const providers = (data ?? []) as Provider[];

  return (
    <>
      <PageHeader title="Senior Physio" subtitle="Weekly meeting, KPIs, and bonus tracking for each senior physio." />
      <div className="p-8">
        {providers.length === 0 ? (
          <p className="text-sm text-muted">No active senior physios yet — add them on the Settings page.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} href={`/senior/${provider.id}?week=${week}`} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
