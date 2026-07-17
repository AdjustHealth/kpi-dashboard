import { PageHeader } from "@/components/nav/PageHeader";
import { WeeklyInputForm } from "@/components/inputs/WeeklyInputForm";
import { createClient } from "@/lib/supabase/server";
import { defaultWeekEnding } from "@/lib/week";
import { Provider, ProviderWeekly, WeeklyKpis } from "@/lib/types";

export default async function InputsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const week = weekParam ?? defaultWeekEnding();

  const supabase = await createClient();
  const [weeklyResult, providersResult, providerWeeklyResult] = await Promise.all([
    supabase.from("weekly_kpis").select("*").eq("week_ending", week).maybeSingle(),
    supabase.from("providers").select("*").eq("active", true).order("sort_order"),
    supabase.from("provider_weekly").select("*").eq("week_ending", week),
  ]);

  const initialWeekly: WeeklyKpis = weeklyResult.data ?? { week_ending: week };
  const providers: Provider[] = providersResult.data ?? [];
  const initialProviderWeekly: ProviderWeekly[] = providerWeeklyResult.data ?? [];

  return (
    <>
      <PageHeader
        title="Weekly Input"
        subtitle="Everything entered here populates every dashboard and provider meeting automatically."
      />
      <WeeklyInputForm
        week={week}
        initialWeekly={initialWeekly}
        providers={providers}
        initialProviderWeekly={initialProviderWeekly}
      />
    </>
  );
}
