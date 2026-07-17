import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderCard } from "@/components/provider/ProviderCard";
import { createClient } from "@/lib/supabase/server";
import { defaultWeekEnding } from "@/lib/week";
import { Provider } from "@/lib/types";

export default async function ProvidersPage({
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
    .in("role", ["physio", "massage", "ep"])
    .eq("active", true)
    .order("sort_order");

  const providers = (data ?? []) as Provider[];

  return (
    <>
      <PageHeader title="Providers" subtitle="Choose a provider to view their weekly meeting." />
      <div className="p-8">
        {providers.length === 0 ? (
          <p className="text-sm text-muted">No active providers yet — add them on the Settings page.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} href={`/providers/${provider.id}?week=${week}`} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
