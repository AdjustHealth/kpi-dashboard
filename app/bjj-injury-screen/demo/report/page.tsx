import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSection } from "@/lib/auth/access";
import { BjjReportDocument } from "@/components/bjjInjuryScreen/BjjReportDocument";
import { mergeBjjScreen } from "@/lib/bjjInjuryScreen/types";

/**
 * A fixed, made-up athlete so the report's design can be checked without
 * re-entering a full screen every time — no DB read. A static route (this
 * folder) takes priority over app/bjj-injury-screen/[id]/report, so
 * /bjj-injury-screen/demo/report never collides with a real assessment id.
 */
const DEMO_DATA = mergeBjjScreen({
  athleteName: "Jordan Alves",
  clinician: "Sam Carter",
  assessmentDate: "2026-09-28",
  sex: "male",
  bodyweightKg: "82",
  injuryScreen: {
    neck: "pass",
    back: "pass",
    shoulders: "pass",
    upperLimb: "pass",
    hips: "pass",
    knees: "fail",
    ankles: "pass",
    comments: "Right knee — history of patellar tendinopathy. Cleared for full testing with load monitoring.",
  },
  mobility: {
    shoulderErIr: "good",
    hipErIr: "demonstrated",
    lumbarFlexExt: "good",
    txRotation: "poor",
    cervicalRotation: "demonstrated",
    ankleDfKneeToWallCmLeft: "13",
    ankleDfKneeToWallCmRight: "11",
  },
  strength: {
    imtp: "3.17",
    standingShoulderYLeft: "118",
    standingShoulderYRight: "108",
    maxPullUps: "12",
    maxPushUps: "40",
    gripStrengthN: "430",
  },
  power: {
    cmjHeight: "34",
    dropJumpRsi: "1.35",
  },
  conditioning: {
    wattBike3MinAvgWatts: "245",
  },
});

export default async function BjjScreenDemoReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await requireSection("assessment_tool");

  return <BjjReportDocument data={DEMO_DATA} athleteName={DEMO_DATA.athleteName} />;
}
