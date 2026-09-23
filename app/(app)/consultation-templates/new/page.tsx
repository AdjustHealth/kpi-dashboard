import { PageHeader } from "@/components/nav/PageHeader";
import { ConsultWorkspace } from "@/components/consultationTemplates/ConsultWorkspace";
import { emptyConsultNote } from "@/lib/consultationTemplates/types";
import { requireSection } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { firstNameFromEmail } from "@/lib/userDisplay";

export default async function NewConsultationPage() {
  await requireSection("assessment_tool");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const clinician = firstNameFromEmail(user?.email) ?? "";

  const note = emptyConsultNote();
  note.clinician = clinician;
  note.consultDate = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Initial Consultation" subtitle="Client-Centred Consult" showWeekSelector={false} />
      <ConsultWorkspace initialNote={note} />
    </>
  );
}
