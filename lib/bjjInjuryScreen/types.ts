/** BJJ Performance Assessment — a quick (5 minute) mobility/strength/power screen for
 * BJJ athletes. Its own simple area sharing the assessment_tool section
 * grant and the same underlying `assessments` table (assess_type =
 * 'bjj_injury_screen'), same pattern as Consultation Templates — never
 * shown in the scored-assessments list (see app/(app)/assessments/page.tsx's
 * exclusion). */

export type Rating = "" | "poor" | "demonstrated" | "good";
export type Sex = "" | "male" | "female";

export type BjjScreenFormData = {
  athleteName: string;
  clinician: string;
  assessmentDate: string;
  /** Needed to normalise IMTP and the Watt Bike test against bodyweight, same way the elite benchmarks are reported. */
  sex: Sex;
  bodyweightKg: string;
  mobility: {
    shoulderErIr: Rating;
    hipErIr: Rating;
    lumbarFlexExt: Rating;
    txRotation: Rating;
    cervicalRotation: Rating;
    /** Knee-to-wall test (weight-bearing lunge), cm from wall to big toe with knee touching the wall. */
    ankleDfKneeToWallCm: string;
  };
  strength: {
    /** Peak force in kg (what most force plates display) — compared against bodyweight for the elite ratio. */
    imtp: string;
    /** Athletic Shoulder (ASH) Test, Y position, peak isometric force in Newtons via dynamometer. */
    standingShoulderY: string;
    maxPullUps: string;
    maxPushUps: string;
    /** Dominant hand, kg. */
    gripStrengthKg: string;
  };
  power: {
    cmjHeight: string;
    dropJumpRsi: string;
  };
  conditioning: {
    /** 3-minute all-out Watt Bike test, average power over the 3 minutes (watts). */
    wattBike3MinAvgWatts: string;
  };
};

export function emptyBjjScreen(): BjjScreenFormData {
  return {
    athleteName: "",
    clinician: "",
    assessmentDate: "",
    sex: "",
    bodyweightKg: "",
    mobility: {
      shoulderErIr: "",
      hipErIr: "",
      lumbarFlexExt: "",
      txRotation: "",
      cervicalRotation: "",
      ankleDfKneeToWallCm: "",
    },
    strength: {
      imtp: "",
      standingShoulderY: "",
      maxPullUps: "",
      maxPushUps: "",
      gripStrengthKg: "",
    },
    power: {
      cmjHeight: "",
      dropJumpRsi: "",
    },
    conditioning: {
      wattBike3MinAvgWatts: "",
    },
  };
}

/** Old saved screens can be missing fields the shape has grown since they
 * were created — every place that loads a saved screen runs it through
 * this first, same reasoning as mergeConsultNote. */
export function mergeBjjScreen(saved: Partial<BjjScreenFormData> | null | undefined): BjjScreenFormData {
  const base = emptyBjjScreen();
  if (!saved) return base;
  return {
    athleteName: saved.athleteName ?? base.athleteName,
    clinician: saved.clinician ?? base.clinician,
    assessmentDate: saved.assessmentDate ?? base.assessmentDate,
    sex: saved.sex ?? base.sex,
    bodyweightKg: saved.bodyweightKg ?? base.bodyweightKg,
    mobility: { ...base.mobility, ...saved.mobility },
    strength: { ...base.strength, ...saved.strength },
    power: { ...base.power, ...saved.power },
    conditioning: { ...base.conditioning, ...saved.conditioning },
  };
}
