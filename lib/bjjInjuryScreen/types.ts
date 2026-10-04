/** BJJ Performance Assessment — a quick (5 minute) mobility/strength/power screen for
 * BJJ athletes. Its own simple area sharing the assessment_tool section
 * grant and the same underlying `assessments` table (assess_type =
 * 'bjj_injury_screen'), same pattern as Consultation Templates — never
 * shown in the scored-assessments list (see app/(app)/assessments/page.tsx's
 * exclusion). */

export type Rating = "" | "poor" | "demonstrated" | "good";
export type Sex = "" | "male" | "female";
export type InjuryResult = "" | "pass" | "fail";
export type AgeGroup = "" | "adult" | "youth";

export type BjjScreenFormData = {
  athleteName: string;
  clinician: string;
  assessmentDate: string;
  /** "Youth" = 13-18, matching the Youth 2 tier on Adjust's own Youth Performance Report. Only CMJ has a published youth-specific reference (Lesinski et al. 2020) — every other test still uses the adult benchmark regardless of this, since no youth data exists for them (confirmed against the Youth report's own sourcing notes). */
  ageGroup: AgeGroup;
  /** Needed to normalise the Watt Bike test against bodyweight, same way the elite benchmark is reported — IMTP doesn't need this, see strength.imtp below. */
  sex: Sex;
  /** Only used to normalise the Watt Bike test — the ForceDecks already gives IMTP as a bodyweight-relative figure, so it doesn't need this. */
  bodyweightKg: string;
  /** Same pass/fail regional screen as the Youth/Performance report's Injury Screen — not scored into the 0-10 domains, just a quick clinical pass/fail per region. */
  injuryScreen: {
    neck: InjuryResult;
    back: InjuryResult;
    shoulders: InjuryResult;
    upperLimb: InjuryResult;
    hips: InjuryResult;
    knees: InjuryResult;
    ankles: InjuryResult;
    comments: string;
  };
  mobility: {
    shoulderErIr: Rating;
    hipErIr: Rating;
    lumbarFlexExt: Rating;
    txRotation: Rating;
    cervicalRotation: Rating;
    /** Knee-to-wall test (weight-bearing lunge), cm from wall to big toe with knee touching the wall — measured both sides, same as the Youth/Performance report, so side-to-side asymmetry (LSI) can be flagged. */
    ankleDfKneeToWallCmLeft: string;
    ankleDfKneeToWallCmRight: string;
  };
  strength: {
    /** Peak force relative to bodyweight (e.g. ×BW), read directly off the ForceDecks — already normalised, not a raw kg value. */
    imtp: string;
    /** Athletic Shoulder (ASH) Test, Y position, peak isometric force in Newtons via dynamometer — measured both arms, same LSI treatment as the Ankle DF test. */
    standingShoulderYLeft: string;
    standingShoulderYRight: string;
    maxPullUps: string;
    maxPushUps: string;
    /** Dominant hand, kg — matches the clinic's dynamometer. */
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
    ageGroup: "",
    sex: "",
    bodyweightKg: "",
    injuryScreen: {
      neck: "",
      back: "",
      shoulders: "",
      upperLimb: "",
      hips: "",
      knees: "",
      ankles: "",
      comments: "",
    },
    mobility: {
      shoulderErIr: "",
      hipErIr: "",
      lumbarFlexExt: "",
      txRotation: "",
      cervicalRotation: "",
      ankleDfKneeToWallCmLeft: "",
      ankleDfKneeToWallCmRight: "",
    },
    strength: {
      imtp: "",
      standingShoulderYLeft: "",
      standingShoulderYRight: "",
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
    ageGroup: saved.ageGroup ?? base.ageGroup,
    sex: saved.sex ?? base.sex,
    bodyweightKg: saved.bodyweightKg ?? base.bodyweightKg,
    injuryScreen: { ...base.injuryScreen, ...saved.injuryScreen },
    mobility: { ...base.mobility, ...saved.mobility },
    strength: { ...base.strength, ...saved.strength },
    power: { ...base.power, ...saved.power },
    conditioning: { ...base.conditioning, ...saved.conditioning },
  };
}
