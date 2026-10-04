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
 * Drop jump Reactive Strength Index Modified (RSI Mod — jump height ÷
 * ground contact time, unitless by convention, entered directly off the
 * device same as every other force-plate/jump-mat output). Matches Adjust's
 * own Performance/Youth assessment report's actual sex-specific thresholds
 * (POWD_M/POWD_F in tool.html — the summary label there says a flat ">1.50
 * excellent", but the real scoring table underneath is sex-split) — no
 * combat-sport-specific RSI data exists either way.
 */
export const DROP_JUMP_RSI_BENCHMARK: SexBenchmark = {
  male: {
    value: 1.5,
    confidence: "general",
    source: "Adjust Health's own Performance/Youth assessment report threshold for men (POWD_M.rsi.good = 1.5) — no combat-sport-specific RSI data exists.",
  },
  female: {
    value: 1.2,
    confidence: "general",
    source: "Adjust Health's own Performance/Youth assessment report threshold for women (POWD_F.rsi.good = 1.2) — no combat-sport-specific RSI data exists.",
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
  female: {
    value: 32,
    confidence: "general",
    source: "ACSM/YMCA 1-minute push-up test, \"excellent\" threshold for women aged 20-29 (>32 reps, standard full push-ups from the feet, same table as the men's figure) — no combat-sport-specific push-up data was found.",
  },
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

/** Grip strength, dominant hand, kg — matches the clinic's dynamometer. */
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
 * 3-minute all-out Watt Bike test — the real, standardised "3 Minute
 * Aerobic Test" (developed by British Cycling, adopted by Wattbike) that
 * estimates Maximum Minute Power; Wattbike's own guidance is that average
 * power across the 3-minute all-out effort approximates MMP. Expressed as
 * W ÷ bodyweight (W/kg), same as every other strength/power test here,
 * rather than a flat watt number that would unfairly favour heavier
 * athletes.
 *
 * Wattbike only publishes three power-to-weight tiers for this test
 * (confirmed directly from support.wattbike.com): Professional 7.1 W/kg,
 * Amateur 3.7 W/kg, Beginner 2.6 W/kg — no combat-sport-specific data
 * exists. Every other benchmark in this file anchors "Strong" (≥75% of
 * the value here) to a genuinely elite performer, so anchoring it to
 * "Amateur" cyclist undersold it in practice: a real competing BJJ
 * athlete (62kg, 199W = 3.19 W/kg) cleared it at 86%, landing "Strong"
 * for an output the clinic's own read was "pretty average". "Professional"
 * (7.1) swings the other way — an unrealistic bar built from dedicated
 * cyclists' numbers, not grapplers whose main training isn't cycling
 * endurance. With no official tier in between and no combat-sport data to
 * fall back on, this uses the midpoint of Wattbike's own two tiers (5.4
 * W/kg) as the clinic's working "Strong" target — a plain interpolation,
 * not a sourced figure, and one to revisit if a better combat-sport
 * aerobic-power dataset turns up.
 */
export const WATT_BIKE_WATTS_PER_KG_BENCHMARK: SexBenchmark = {
  male: {
    value: 5.4,
    confidence: "general",
    source: "Midpoint of Wattbike's own published Amateur (3.7 W/kg) and Professional (7.1 W/kg) 3-Minute Test tiers — no official intermediate tier or combat-sport-specific data exists; Amateur alone proved too easy to clear in practice.",
  },
  female: {
    value: 5.4,
    confidence: "general",
    source: "Midpoint of Wattbike's own published Amateur (3.7 W/kg) and Professional (7.1 W/kg) 3-Minute Test tiers — no official intermediate tier, sex split, or combat-sport-specific data exists; Amateur alone proved too easy to clear in practice.",
  },
};
