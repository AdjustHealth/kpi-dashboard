/**
 * Reference values for comparing a BJJ athlete's screen against. Every
 * entry says exactly where it came from and how confident it is:
 *
 * - "combat"  — measured in judo/wrestling/combat-sport athletes specifically.
 * - "general" — no combat-sport-specific data exists, so the general
 *   population/athlete standard is used instead — preferring Adjust
 *   Health's own Performance assessment report thresholds (same tests,
 *   same protocols) where one already exists there, otherwise the best
 *   published general figure.
 *
 * Nothing here is BJJ-specific — no published BJJ normative dataset exists
 * for any of these tests as far as this research found. Judo/wrestling data
 * is used as the closest available grappling-sport proxy where it exists.
 */

export type Confidence = "combat" | "general";

export type Benchmark = {
  /** The elite reference value, in the same unit the form field is recorded in. */
  value: number;
  confidence: Confidence;
  source: string;
};

export type SexBenchmark = { male: Benchmark | null; female: Benchmark | null };

/**
 * IMTP: expressed as peak force ÷ bodyweight (both in kg, so the ratio is
 * unitless) — the standard way IMTP results are normalised in the
 * literature, and how force plates usually report it.
 */
export const IMTP_RATIO_BENCHMARK: SexBenchmark = {
  male: {
    value: 3.3,
    confidence: "combat",
    source: "Elite male judo athletes, isometric mid-thigh pull peak force without lifting straps: 3.30 × bodyweight (PMC13541152, judo vs. resistance-trained populations).",
  },
  female: {
    value: 2.5,
    confidence: "general",
    source: "Adjust Health's own Performance assessment report general-population IMTP relative-strength threshold — no combat-sport-specific female IMTP data exists.",
  },
};

/** CMJ jump height in cm. */
export const CMJ_HEIGHT_CM_BENCHMARK: SexBenchmark = {
  male: {
    value: 39.6,
    confidence: "combat",
    source: "National-team combat-sport athletes (men), derived from Haugen et al., \"Countermovement Jump Height in National-Team Athletes of Various Sports\" (strength/power sports 51.9cm, combat sports ~12.3cm lower).",
  },
  female: {
    value: 28.4,
    confidence: "combat",
    source: "National-team combat-sport athletes (women), derived the same way from Haugen et al. (strength/power sports 39.6cm, combat sports ~11.2cm lower).",
  },
};

/**
 * Drop jump Reactive Strength Index Modified (RSI Mod — contact time vs.
 * jump height, unitless). Single threshold for both sexes, matching the
 * exact ">1.50 excellent" standard already used on Adjust's own Performance
 * and Youth assessment reports, for consistency across every assessment
 * type — no combat-sport-specific RSI data exists either way.
 */
export const DROP_JUMP_RSI_BENCHMARK: SexBenchmark = {
  male: {
    value: 1.5,
    confidence: "general",
    source: "Adjust Health's own Performance/Youth assessment report threshold (>1.50 excellent), used here for consistency — no combat-sport-specific RSI data exists.",
  },
  female: {
    value: 1.5,
    confidence: "general",
    source: "Adjust Health's own Performance/Youth assessment report threshold (>1.50 excellent), used here for consistency — no combat-sport-specific RSI data exists.",
  },
};

/** Athletic Shoulder (ASH) Test, Y position — peak isometric force in Newtons, dominant arm, via dynamometer. */
export const ASH_Y_NEWTONS_BENCHMARK: SexBenchmark = {
  male: {
    value: 180,
    confidence: "general",
    source: "Adjust Health's own Performance assessment report general-population threshold for the Shoulder Y Test (N) — no combat-sport-specific ASH-Y data exists.",
  },
  female: {
    value: 130,
    confidence: "general",
    source: "Adjust Health's own Performance assessment report general-population threshold for the Shoulder Y Test (N) — no combat-sport-specific ASH-Y data exists.",
  },
};

/** Max reps. */
export const PULL_UPS_BENCHMARK: SexBenchmark = {
  male: {
    value: 15,
    confidence: "general",
    source: "General elite/tactical-athlete standard (15-20+ reps cited across multiple strength-standard and tactical-fitness sources) — no rigorous BJJ-specific or combat-sport-specific pull-up data was found in the literature.",
  },
  female: null,
};

/** 1-minute push-up test, max reps. */
export const PUSH_UPS_BENCHMARK: SexBenchmark = {
  male: {
    value: 47,
    confidence: "general",
    source: "ACSM/YMCA 1-minute push-up test, \"excellent\" threshold for men aged 20-29 (standard, widely-cited general fitness normative data) — no combat-sport-specific push-up data was found.",
  },
  female: null,
};

/** Knee-to-wall (weight-bearing lunge) test, cm from the wall to the big toe with the knee touching the wall. */
export const KNEE_TO_WALL_CM_BENCHMARK: SexBenchmark = {
  male: {
    value: 15.0,
    confidence: "general",
    source: "\"Excellent\" sex-specific threshold for the weight-bearing lunge test (general clinical/athletic norms) — no combat-sport-specific ankle dorsiflexion data was found.",
  },
  female: {
    value: 14.0,
    confidence: "general",
    source: "\"Excellent\" sex-specific threshold for the weight-bearing lunge test (general clinical/athletic norms) — no combat-sport-specific ankle dorsiflexion data was found.",
  },
};

/** Grip strength, dominant hand, kg. */
export const GRIP_STRENGTH_KG_BENCHMARK: SexBenchmark = {
  male: {
    value: 47.0,
    confidence: "combat",
    source: "Elite male judo athletes, maximal isometric handgrip strength: 460.7N ≈ 47kg (elite vs. non-elite judoka comparison study).",
  },
  female: {
    value: 31.2,
    confidence: "combat",
    source: "Elite female judo athletes (medalists), maximal isometric handgrip strength: 305.6N ≈ 31.2kg (elite female cadet judo medalist vs. non-medalist study).",
  },
};

/**
 * 3-minute all-out Watt Bike test, average power. No combat-sport-specific
 * benchmark exists, so this uses Adjust Health's own Performance assessment
 * report's threshold for the same 3-minute all-out protocol (reported there
 * as peak power — the closest available standard for this test).
 */
export const WATT_BIKE_3MIN_BENCHMARK: SexBenchmark = {
  male: {
    value: 400,
    confidence: "general",
    source: "Adjust Health's own Performance assessment report threshold for the Watt Bike 3-min all-out test (peak power) — no combat-sport-specific data exists for this protocol.",
  },
  female: {
    value: 280,
    confidence: "general",
    source: "Adjust Health's own Performance assessment report threshold for the Watt Bike 3-min all-out test (peak power) — no combat-sport-specific data exists for this protocol.",
  },
};
