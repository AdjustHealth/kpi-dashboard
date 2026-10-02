import type { BjjScreenFormData, Rating, Sex } from "./types";
import {
  Benchmark,
  CHIN_UPS_BENCHMARK,
  CMJ_HEIGHT_CM_BENCHMARK,
  DROP_JUMP_RSI_BENCHMARK,
  GRIP_STRENGTH_KG_BENCHMARK,
  IMTP_RATIO_BENCHMARK,
  KNEE_TO_WALL_CM_BENCHMARK,
  PULL_UPS_BENCHMARK,
  SexBenchmark,
  SHOULDER_Y_CM_BENCHMARK,
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

const RATING_SCORE: Record<Exclude<Rating, "">, number> = { poor: 2, demonstrated: 6, good: 10 };

export type BjjScreenScore = {
  imtp: MetricResult | null;
  cmjHeight: MetricResult | null;
  dropJumpRsi: MetricResult | null;
  standingShoulderY: MetricResult | null;
  maxPullUps: MetricResult | null;
  maxChinUps: MetricResult | null;
  ankleDfKneeToWallCm: MetricResult | null;
  gripStrengthKg: MetricResult | null;
  /** Raw value only — no published benchmark exists for this test, see benchmarks.ts. */
  wattBike3MinAvgWatts: number | null;
  mobilityScore: number | null;
  /** 0-10, averaged across every available scored metric (each numeric test weighted equally, mobility counted once as a group so it doesn't outweigh the numeric tests 4-to-1). Null if nothing was scoreable yet (e.g. sex not set, or nothing entered). */
  overall: number | null;
};

export function scoreBjjScreen(data: BjjScreenFormData): BjjScreenScore {
  const sex = data.sex;

  // IMTP is normalised against bodyweight first (peak force in kg ÷
  // bodyweight in kg), so compare the resulting ratio against the
  // already-normalised elite benchmark, rather than scoring a raw kg value.
  const bodyweight = parseNum(data.bodyweightKg);
  const imtpRaw = parseNum(data.strength.imtp);
  let imtp: MetricResult | null = null;
  if (imtpRaw !== null && bodyweight && bodyweight > 0) {
    const ratio = imtpRaw / bodyweight;
    const b = benchmarkFor(sex, IMTP_RATIO_BENCHMARK);
    imtp = b
      ? { value: ratio, percentOfElite: Math.round((ratio / b.value) * 1000) / 10, score: scoreFromRatio(ratio / b.value), benchmark: b }
      : { value: ratio, percentOfElite: null, score: null, benchmark: null };
  }

  const cmjHeight = scoreMetric(data.power.cmjHeight, sex, CMJ_HEIGHT_CM_BENCHMARK);
  const dropJumpRsi = scoreMetric(data.power.dropJumpRsi, sex, DROP_JUMP_RSI_BENCHMARK);
  const standingShoulderY = scoreMetric(data.strength.standingShoulderY, sex, SHOULDER_Y_CM_BENCHMARK);
  const maxPullUps = scoreMetric(data.strength.maxPullUps, sex, PULL_UPS_BENCHMARK);
  const maxChinUps = scoreMetric(data.strength.maxChinUps, sex, CHIN_UPS_BENCHMARK);
  const ankleDfKneeToWallCm = scoreMetric(data.mobility.ankleDfKneeToWallCm, sex, KNEE_TO_WALL_CM_BENCHMARK);
  const gripStrengthKg = scoreMetric(data.strength.gripStrengthKg, sex, GRIP_STRENGTH_KG_BENCHMARK);
  const wattBike3MinAvgWatts = parseNum(data.conditioning.wattBike3MinAvgWatts);

  // Only the four Poor/Demonstrated/Good ratings go into the qualitative
  // mobility score — ankleDfKneeToWallCm is a real measurement, scored (and
  // folded into the overall average) as its own numeric metric above instead.
  const ratingKeys: Exclude<keyof BjjScreenFormData["mobility"], "ankleDfKneeToWallCm">[] = [
    "shoulderErIr",
    "hipErIr",
    "lumbarFlexExt",
    "txRotation",
  ];
  const ratings = ratingKeys.map((k) => data.mobility[k]).filter((r): r is Exclude<Rating, ""> => r !== "");
  const mobilityScore = ratings.length > 0 ? Math.round((ratings.reduce((sum, r) => sum + RATING_SCORE[r], 0) / ratings.length) * 10) / 10 : null;

  const scoredNumeric = [imtp, cmjHeight, dropJumpRsi, standingShoulderY, maxPullUps, maxChinUps, ankleDfKneeToWallCm, gripStrengthKg]
    .map((m) => m?.score)
    .filter((s): s is number => s !== null && s !== undefined);
  const overallParts = mobilityScore !== null ? [...scoredNumeric, mobilityScore] : scoredNumeric;
  const overall = overallParts.length > 0 ? Math.round((overallParts.reduce((a, b) => a + b, 0) / overallParts.length) * 10) / 10 : null;

  return {
    imtp,
    cmjHeight,
    dropJumpRsi,
    standingShoulderY,
    maxPullUps,
    maxChinUps,
    ankleDfKneeToWallCm,
    gripStrengthKg,
    wattBike3MinAvgWatts,
    mobilityScore,
    overall,
  };
}
