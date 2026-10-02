/**
 * Elite reference values for comparing a BJJ athlete's screen against —
 * researched directly for this feature (September 2026), not invented.
 * Every entry says exactly where it came from and how confident it is:
 *
 * - "combat"  — measured in judo/wrestling/combat-sport athletes specifically.
 * - "general" — the best published figure available, but from a general
 *   athletic/overhead-athlete population, not combat-sport-specific. Still
 *   useful context, just not a BJJ-trained benchmark.
 * - null      — no credible published elite reference could be found at
 *   all (the 3-minute Watt Bike test). The raw value is recorded and shown,
 *   but never scored against a made-up number.
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
  female: null,
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

/** Drop jump Reactive Strength Index (unitless: contact time vs. jump height). */
export const DROP_JUMP_RSI_BENCHMARK: SexBenchmark = {
  male: {
    value: 2.5,
    confidence: "general",
    source: "General elite athletic population threshold for excellent reactive strength (commonly cited S&C benchmark, e.g. ScienceForSport) — no combat-sport-specific RSI data was found.",
  },
  female: {
    value: 2.0,
    confidence: "general",
    source: "General elite athletic population threshold for excellent reactive strength — no combat-sport-specific RSI data was found.",
  },
};

/** Standing Shoulder Y reach, in cm — a simplified single-direction stand-in for the full 3-direction Y Balance Upper Quarter composite. */
export const SHOULDER_Y_CM_BENCHMARK: SexBenchmark = {
  male: {
    value: 101.4,
    confidence: "general",
    source: "Y Balance Upper Quarter composite reach, overhead athletes (soccer/track/volleyball) — no combat-sport-specific norm found. One systematic review notes closed-kinetic-chain sports like wrestling tend to reach further than this, so treat this as a floor, not a ceiling.",
  },
  female: {
    value: 91.7,
    confidence: "general",
    source: "Y Balance Upper Quarter composite reach, overhead athletes (soccer/track/volleyball) — no combat-sport-specific norm found.",
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

export const CHIN_UPS_BENCHMARK: SexBenchmark = PULL_UPS_BENCHMARK;

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
 * No published combat-sport or BJJ-specific benchmark exists for a
 * 3-minute all-out Watt Bike test. Wingate (30-second) anaerobic power data
 * exists for wrestlers/judokas, but that's a different protocol measuring a
 * different thing (5-second peak power vs. a 3-minute end-test/critical
 * power) — using it here would be comparing two different tests, not a real
 * benchmark. Recorded and tracked over time, not scored against elite.
 */
export const WATT_BIKE_3MIN_BENCHMARK: SexBenchmark = { male: null, female: null };
