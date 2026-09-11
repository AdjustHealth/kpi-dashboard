import { AssessmentToolFrame } from "@/components/assessmentTool/AssessmentToolFrame";

export default async function NewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; tier?: string; clinician?: string }>;
}) {
  const { type, tier, clinician } = await searchParams;
  return <AssessmentToolFrame presetType={type ?? null} presetTier={tier ?? null} presetClinician={clinician ?? null} />;
}
