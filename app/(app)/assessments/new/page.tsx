import { AssessmentToolFrame } from "@/components/assessmentTool/AssessmentToolFrame";
import { requireSection } from "@/lib/auth/access";

export default async function NewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; tier?: string; clinician?: string }>;
}) {
  await requireSection("assessment_tool");
  const { type, tier, clinician } = await searchParams;
  return <AssessmentToolFrame presetType={type ?? null} presetTier={tier ?? null} presetClinician={clinician ?? null} />;
}
