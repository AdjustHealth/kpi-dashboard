import { PageHeader } from "@/components/nav/PageHeader";
import { SettingsManager } from "@/components/settings/SettingsManager";
import { createClient } from "@/lib/supabase/server";
import { Provider } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("providers").select("*").order("sort_order");
  const providers = (data ?? []) as Provider[];

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage providers and their specialty KPIs."
        showWeekSelector={false}
      />
      <div className="p-8">
        <SettingsManager initialProviders={providers} />
      </div>
    </>
  );
}
