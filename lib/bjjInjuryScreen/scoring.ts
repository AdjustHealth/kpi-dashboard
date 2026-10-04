import type { BjjScreenFormData, Rating, Sex } from "./types";
import {
  ASH_Y_NEWTONS_BENCHMARK,
  Benchmark,
  CMJ_HEIGHT_CM_BENCHMARK,
  DROP_JUMP_RSI_BENCHMARK,
  GRIP_STRENGTH_KG_BENCHMARK,
  IMTP_RATIO_BENCHMARK,
  KNEE_TO_WALL_CM_BENCHMARK,
  PULL_UPS_BENCHMARK,
  PUSH_UPS_BENCHMARK,
  SexBenchmark,
  WATT_BIKE_WATTS_PER_KG_BENCHMARK,
} from "./benchmarks";

function parseNum(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : null;
}

function benchmarkFor(sex: Sex, b: SexBenchmark): Benchmark | null {
  return sex === "male" ? b.male : sex === "female" ? b.female : null;
}

/** 0-10, capped at 10 for a result that beats the elite reference. */
function scoreFromRatio(ratio: number): number {
  return Math.min(10, Math.round(ratio * 10 * 10) / 10);
}

export type MetricResult = {
  value: number;
  /** null when there's no benchmark for this metric/sex — recorded but not scored. */
  percentOfElite: number | null;
  score: number | null;
  benchmark: Benchmark | null;
};

function scoreMetric(raw: string | undefined, sex: Sex, benchmark: SexBenchmark): MetricResult | null {
  const value = parseNum(raw);
  if (value === null) return null;
  const b = benchmarkFor(sex, benchmark);
  if (!b) return { value, percentOfElite: null, score: null, benchmark: null };
  const ratio = value / b.value;
  return { value, percentOfElite: Math.round(ratio * 1000) / 10, score: scoreFromRatio(ratio), benchmark: b };
}

/** Same bodyweight-ratio pattern as IMTP: raw ÷ bodyweight compared against an already-normalised (per-kg) benchmark, so the test is fair across weight classes instead of favouring heavier athletes. */
function scoreRatioMetric(raw: string | undefined, bodyweight: number | null, sex: Sex, benchmark: SexBenchmark): MetricResult | null {
  const rawValue = parseNum(raw);
  if (rawValue === null || !bodyweight || bodyweight <= 0) return null;
  const ratio = rawValue / bodyweight;
  const b = benchmarkFor(sex, benchmark);
  if (!b) return { value: ratio, percentOfElite: null, score: null, benchmark: null };
  return { value: ratio, percentOfElite: Math.round((ratio / b.value) * 1000) / 10, score: scoreFromRatio(ratio / b.value), benchmark: b };
}

const RATING_SCORE: Record<Exclude<Rating, "">, number> = { poor: 2, demonstrated: 6, good: 10 };

export type BjjScreenScore = {
  /** Peak force relative to bodyweight, read directly off the ForceDecks — not computed from a separate raw-kg entry. */
  imtp: MetricResult | null;
  cmjHeight: MetricResult | null;
  dropJumpRsi: MetricResult | null;
  standingShoulderYLeft: MetricResult | null;
  standingShoulderYRight: MetricResult | null;
  /** Limb Symmetry Index for the ASH-Y test. Null unless both arms were measured. */
  standingShoulderYLsi: number | null;
  maxPullUps: MetricResult | null;
  maxPushUps: MetricResult | null;
  ankleDfLeft: MetricResult | null;
  ankleDfRight: MetricResult | null;
  /** Limb Symmetry Index — min/max side × 100, same convention as the Youth/Performance report. Null unless both sides were measured. */
  ankleDfLsi: number | null;
  gripStrengthKg: MetricResult | null;
  /** W ÷ bodyweight — the only test here that still needs the Bodyweight field, since Wattbike doesn't output a relative figure the way ForceDecks does. */
  wattBike3MinAvgWatts: MetricResult | null;
  mobilityScore: number | null;
  /** 0-10 per domain, averaged from that domain's scored tests — what the report's domain bars/radar profile are built from. */
  categoryScores: { mobility: number | null; strength: number | null; power: number | null; conditioning: number | null };
  /** 0-10, the average of the domain scores above (not a flat average across every raw test, so a domain with more tests doesn't outweigh one with fewer). Null if nothing was scoreable yet (e.g. sex not set, or nothing entered). */
  overall: number | null;
};

export function scoreBjjScreen(data: BjjScreenFormData): BjjScreenScore {
  const sex = data.sex;

  // IMTP is read directly off the ForceDecks as peak force ÷ bodyweight
  // already — no raw-kg/bodyweight division needed here, unlike the Watt
  // Bike test below (Wattbike has no equivalent relative-output reading).
  const bodyweight = parseNum(data.bodyweightKg);
  const imtp = scoreMetric(data.strength.imtp, sex, IMTP_RATIO_BENCHMARK);
  const wattBike3MinAvgWatts = scoreRatioMetric(data.conditioning.wattBike3MinAvgWatts, bodyweight, sex, WATT_BIKE_WATTS_PER_KG_BENCHMARK);

  const cmjHeight = scoreMetric(data.power.cmjHeight, sex, CMJ_HEIGHT_CM_BENCHMARK);
  const dropJumpRsi = scoreMetric(data.power.dropJumpRsi, sex, DROP_JUMP_RSI_BENCHMARK);
  const standingShoulderYLeft = scoreMetric(data.strength.standingShoulderYLeft, sex, ASH_Y_NEWTONS_BENCHMARK);
  const standingShoulderYRight = scoreMetric(data.strength.standingShoulderYRight, sex, ASH_Y_NEWTONS_BENCHMARK);
  const standingShoulderYLsi =
    standingShoulderYLeft && standingShoulderYRight
      ? Math.round((Math.min(standingShoulderYLeft.value, standingShoulderYRight.value) / Math.max(standingShoulderYLeft.value, standingShoulderYRight.value)) * 100)
      : null;
  const maxPullUps = scoreMetric(data.strength.maxPullUps, sex, PULL_UPS_BENCHMARK);
  const maxPushUps = scoreMetric(data.strength.maxPushUps, sex, PUSH_UPS_BENCHMARK);
  const ankleDfLeft = scoreMetric(data.mobility.ankleDfKneeToWallCmLeft, sex, KNEE_TO_WALL_CM_BENCHMARK);
  const ankleDfRight = scoreMetric(data.mobility.ankleDfKneeToWallCmRight, sex, KNEE_TO_WALL_CM_BENCHMARK);
  const ankleDfLsi =
    ankleDfLeft && ankleDfRight ? Math.round((Math.min(ankleDfLeft.value, ankleDfRight.value) / Math.max(ankleDfLeft.value, ankleDfRight.value)) * 100) : null;
  const gripStrengthKg = scoreMetric(data.strength.gripStrengthKg, sex, GRIP_STRENGTH_KG_BENCHMARK);

  // Only the Poor/Demonstrated/Good ratings go into the qualitative
  // mobility score — ankle DF is a real measurement, scored (and folded
  // into the overall average) as its own numeric metric above instead.
  const ratingKeys: Exclude<keyof BjjScreenFormData["mobility"], "ankleDfKneeToWallCmLeft" | "ankleDfKneeToWallCmRight">[] = [
    "shoulderErIr",
    "hipErIr",
    "lumbarFlexExt",
    "txRotation",
    "cervicalRotation",
  ];
  const ratings = ratingKeys.map((k) => data.mobility[k]).filter((r): r is Exclude<Rating, ""> => r !== "");
  const mobilityScore = ratings.length > 0 ? Math.round((ratings.reduce((sum, r) => sum + RATING_SCORE[r], 0) / ratings.length) * 10) / 10 : null;

  const average = (scores: (number | null | undefined)[]): number | null => {
    const vals = scores.filter((s): s is number => s !== null && s !== undefined);
    return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };

  // Domain scores — what the report's radar/domain bars are built from.
  const categoryScores = {
    mobility: average([mobilityScore, ankleDfLeft?.score, ankleDfRight?.score]),
    strength: average([imtp?.score, standingShoulderYLeft?.score, standingShoulderYRight?.score, maxPullUps?.score, maxPushUps?.score, gripStrengthKg?.score]),
    power: average([cmjHeight?.score, dropJumpRsi?.score]),
    conditioning: average([wattBike3MinAvgWatts?.score]),
  };

  // Overall is the average of the domain scores (so Strength's 5 tests
  // don't outweigh Power's 2) rather than a flat average across every raw
  // test — the same domain-first logic the radar profile itself is built
  // on.
  const overall = average([categoryScores.mobility, categoryScores.strength, categoryScores.power, categoryScores.conditioning]);

  return {
    imtp,
    cmjHeight,
    dropJumpRsi,
    standingShoulderYLeft,
    standingShoulderYRight,
    standingShoulderYLsi,
    maxPullUps,
    maxPushUps,
    ankleDfLeft,
    ankleDfRight,
    ankleDfLsi,
    gripStrengthKg,
    wattBike3MinAvgWatts,
    mobilityScore,
    categoryScores,
    overall,
  };
}
