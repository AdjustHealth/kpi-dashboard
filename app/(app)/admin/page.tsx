import { PageHeader } from "@/components/nav/PageHeader";
import { ProviderCard } from "@/components/provider/ProviderCard";
import { createClient } from "@/lib/supabase/server";
import { defaultWeekEnding } from "@/lib/week";
import { Provider } from "@/lib/types";

export default async function AdminDirectoryPage({
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
    .eq("role", "admin")
    .eq("active", true)
    .order("sort_order");

  const providers = (data ?? []) as Provider[];

  return (
    <>
      <PageHeader title="Admin" subtitle="Weekly meeting and KPIs for each admin staff member." />
      <div className="p-8">
        {providers.length === 0 ? (
          <p className="text-sm text-muted">No active admin staff yet — add them on the Settings page.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} href={`/admin/${provider.id}?week=${week}`} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
