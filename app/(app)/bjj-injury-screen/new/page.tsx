import { PageHeader } from "@/components/nav/PageHeader";
import { BjjScreenWorkspace } from "@/components/bjjInjuryScreen/BjjScreenWorkspace";
import { emptyBjjScreen } from "@/lib/bjjInjuryScreen/types";
import { requireSection } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { firstNameFromEmail } from "@/lib/userDisplay";

export default async function NewBjjInjuryScreenPage() {
  await requireSection("assessment_tool");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const clinician = firstNameFromEmail(user?.email) ?? "";

  const data = emptyBjjScreen();
  data.clinician = clinician;
  data.assessmentDate = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="BJJ Performance Assessment" subtitle="Mobility, Strength & Power" showWeekSelector={false} />
      <BjjScreenWorkspace initialData={data} />
    </>
  );
}
