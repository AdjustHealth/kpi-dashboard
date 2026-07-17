import { PageHeader } from "@/components/nav/PageHeader";
import { ClinicTargetsCard } from "@/components/targets/ClinicTargetsCard";
import { ProviderTargetsCard } from "@/components/targets/ProviderTargetsCard";
import { createClient } from "@/lib/supabase/server";
import { Provider } from "@/lib/types";

export default async function TargetsPage() {
  const supabase = await createClient();
  const [clinicTargetsResult, providersResult] = await Promise.all([
    supabase.from("clinic_targets").select("*").eq("id", "clinic").maybeSingle(),
    supabase.from("providers").select("*").eq("active", true).order("sort_order"),
  ]);

  const providers: Provider[] = providersResult.data ?? [];
  const clinicianProviders = providers.filter((p) => p.role !== "admin");
  const adminProviders = providers.filter((p) => p.role === "admin");

  return (
    <>
      <PageHeader title="Targets" subtitle="Rarely change. Everything else compares against this page." showWeekSelector={false} />
      <div className="flex flex-col gap-8 p-8">
        <ClinicTargetsCard initialValues={clinicTargetsResult.data?.values ?? {}} />

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Provider KPI Targets</h2>
          {clinicianProviders.length === 0 && (
            <p className="text-sm text-muted">No active providers yet — add them on the Settings page.</p>
          )}
          {clinicianProviders.map((provider) => (
            <ProviderTargetsCard key={provider.id} provider={provider} />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Admin Targets</h2>
          {adminProviders.length === 0 && (
            <p className="text-sm text-muted">No active admin staff yet — add them on the Settings page.</p>
          )}
          {adminProviders.map((provider) => (
            <ProviderTargetsCard key={provider.id} provider={provider} />
          ))}
        </div>
      </div>
    </>
  );
}
