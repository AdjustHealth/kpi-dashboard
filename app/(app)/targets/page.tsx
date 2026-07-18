import { PageHeader } from "@/components/nav/PageHeader";
import { ClinicTargetsCard } from "@/components/targets/ClinicTargetsCard";
import { RoleTargetsCard } from "@/components/targets/RoleTargetsCard";
import { ProviderTargetsCard, providerHasIndividualTargets } from "@/components/targets/ProviderTargetsCard";
import { ROLE_TARGET_GROUPS } from "@/lib/targetsSchema";
import { createClient } from "@/lib/supabase/server";
import { Provider } from "@/lib/types";

export default async function TargetsPage() {
  const supabase = await createClient();
  const [clinicTargetsResult, roleTargetsResult, providersResult] = await Promise.all([
    supabase.from("clinic_targets").select("*").eq("id", "clinic").maybeSingle(),
    supabase.from("role_targets").select("*"),
    supabase.from("providers").select("*").eq("active", true).order("sort_order"),
  ]);

  const providers: Provider[] = providersResult.data ?? [];
  const roleTargetsById = new Map((roleTargetsResult.data ?? []).map((r) => [r.id as string, r.values ?? {}]));
  const individualProviders = providers.filter(providerHasIndividualTargets);

  return (
    <>
      <PageHeader title="Targets" subtitle="Rarely change. Everything else compares against this page." showWeekSelector={false} />
      <div className="flex flex-col gap-8 p-8">
        <ClinicTargetsCard initialValues={clinicTargetsResult.data?.values ?? {}} />

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-foreground">Role Targets</h2>
          <p className="text-xs text-muted">
            One shared target set per group — change it once here and it applies to everyone in that group, instead of
            editing every individual provider.
          </p>
          {ROLE_TARGET_GROUPS.map((group) => (
            <RoleTargetsCard key={group.id} group={group} initialValues={roleTargetsById.get(group.id) ?? {}} />
          ))}
        </div>

        {individualProviders.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-foreground">Individual Targets</h2>
            <p className="text-xs text-muted">
              Only things that genuinely differ person to person — bonus tier thresholds, specialty targets, annual
              turnover, working weeks.
            </p>
            {individualProviders.map((provider) => (
              <ProviderTargetsCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
