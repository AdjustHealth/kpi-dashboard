/** Ported verbatim from the standalone Program Tracker's "Programming Rules" reference tab. */
export type RuleTableSection = { section: string; cols: string[]; rows: string[][] };
export type RuleChainSection = { section: string; chain: string[]; chainLabel: string; note?: string };
export type RuleSection = RuleTableSection | RuleChainSection;

export function isChainSection(s: RuleSection): s is RuleChainSection {
  return "chain" in s;
}

export const PROGRAMMING_RULES: RuleSection[] = [
  {
    section: "Program Naming",
    cols: ["Rule", "Description", "Example"],
    rows: [
      ["Format", "Name – Program Type – Individualisation", "John – Rehab – Ankle  ·  John Performance – Court"],
      ["Rehab", "Always list the body part", ""],
      ["Performance", "Always pick the sport / goal", ""],
    ],
  },
  {
    section: "Template Naming",
    cols: ["Rule", "Description", "Example", "Notes"],
    rows: [
      ["Format", "Category – Body Part / Goal – Phase or Variant", "Rehab – Ankle – Phase 1  ·  Performance – Court – Accumulation", "No member name — a template is reusable across clients, unlike a Program"],
      ["Category", "Same category as Mesocycle / Block Length above", "Rehab · Performance · Online · Move Strong", "Keeps the template library sorted the same way blocks are categorised"],
      ["Rehab Phase", "Name the phase from the standard progression", "Phase 1 = Symptom Management  ·  Phase 5 = Return to Performance", "See Phase Naming & Structure below"],
      ["Performance Phase", "Pick the sport first — the template IS the sport. Phase/Mesocycle naming is its own section below", "Field Sport – GPP 1 – Aerobic Base", "See Performance Periodisation Models + the worked example below"],
      ["Versioning", "Append v2, v3... when a template is revised, don't overwrite it", "Rehab – ACL – Phase 2 v2", "Keep the old version live until every member on it has rolled onto the new one"],
      ["Move Strong", "Name by block letter, not a date", "Move Strong – Block A", "All Move Strong members run the same cycle — a dated name goes stale the next time it's reused"],
    ],
  },
  {
    section: "Phase Naming & Structure",
    chain: ["Symptom Management", "Strength Introduction", "Strength Accumulation", "Strength Specificity", "Return to Performance"],
    chainLabel: "Rehab block progression",
    note: "Performance: pick the sport first — the phase sequence is purely dependent on this (see Performance Periodisation Models below).",
  },
  {
    section: "Performance Periodisation Models",
    cols: ["Model", "Phases (in order)", "Best For", "Example Template Name"],
    rows: [
      [
        "Linear — Field Sport",
        "Gen Prep → Specific Prep → In-Season → Transition",
        "AFL/rugby/soccer-style sports with one long off-season block and one continuous in-season",
        "Field Sport",
      ],
      [
        "Linear — Court Sport",
        "Pre-Season → Early In-Season → Peak In-Season → Taper/Finals",
        "Basketball/netball-style sports with a long season that needs internal peaking, not one big GPP block",
        "Court Sport",
      ],
      [
        "Block — Strength & Power",
        "Accumulation → Transmutation → Realisation → Deload",
        "Powerlifting/individual strength-power athletes — this cycle repeats every mesocycle, not once a year",
        "Strength & Power",
      ],
    ],
  },
  {
    section: "Performance Periodisation — Field Sport Example",
    chain: ["Gen Prep", "Specific Prep", "In-Season"],
    chainLabel: "Field Sport phase progression (add Transition after In-Season for the off-season, if the sport has one)",
    note: "This is the chain a \"Field Sport\" template's Phase is picked from — see the worked mesocycle example below for what goes inside each phase.",
  },
  {
    section: "Mesocycle Naming — Worked Example (Field Sport)",
    cols: ["Phase", "Mesocycle Name", "Length", "Focus"],
    rows: [
      ["Gen Prep", "GPP 1 – Aerobic Base", "4 wk", "Aerobic capacity, movement quality, tissue tolerance"],
      ["Gen Prep", "GPP 2 – General Strength", "4 wk", "Max strength foundation, hypertrophy"],
      ["Specific Prep", "SPP 1 – Strength-Power", "4 wk", "Force-velocity transfer, Olympic lift variations"],
      ["Specific Prep", "SPP 2 – Speed & COD", "4 wk", "Linear speed, change of direction, reactive strength"],
      ["In-Season", "IS 1 – Maintenance", "6 wk", "Maintain strength/power qualities, manage match-week fatigue"],
      ["In-Season", "IS 2 – Peak/Taper", "2 wk", "Reduce volume, hold intensity, peak for finals"],
    ],
  },
  {
    section: "Mesocycle / Block Length",
    cols: ["Rule", "Description", "Example", "Notes"],
    rows: [
      ["Default", "4 weeks unless clinically indicated otherwise", "1 block = 4 weeks", "Deviations must be noted in the Notes column"],
      ["Rehab", "Block length set by practitioner — document reasoning", "6-week block for post-surgical load progression", "Check with Dean for any block longer than 6 weeks"],
      ["Performance", "Follow the template's periodisation model in sequence", "GPP 1 → GPP 2 → SPP 1 → SPP 2 → IS 1 → IS 2", "See Performance Periodisation Models + the worked example above"],
      ["Online", "Same structure as in-person — note equipment limits", "Home gym — no barbell available", "Use BW/DB/KB alternatives"],
      ["Move Strong", "All Move Strong members run on the same block cycle", "Sync start dates across the cohort", "Check with Lachlan before rolling a new Move Strong block"],
      ["Block Roll", "Tick 'New Block Written?' to archive and auto-advance start date", "Script rolls Block Start → Next Block Due automatically", "Never change the start date manually after ticking"],
    ],
  },
  {
    section: "Status & Holds",
    cols: ["Status", "Description", "Example", "Notes"],
    rows: [
      ["Active", "Member is training, program is current", "", "Default for all new members"],
      ["Hold", "Set Status = Hold — note reason + return date in Notes", "Injury / travel / surgery pending", "Adjust block start date appropriately when they return"],
      ["Cancelled", "Set Status = Cancelled — script moves row to Cancelled tab", "", "Never delete rows manually from Tracker"],
      ["OVERDUE", "Next Due date passed and no new block written", "Shows red in Due Status column", "Immediate action — write new block or contact member"],
      ["Due This Wk", "Block due within the next 7 days", "Shows green in Due Status column", "Plan new block before the due date"],
    ],
  },
  {
    section: "Exercise Naming Conventions",
    cols: ["Rule", "Description", "Example", "Notes"],
    rows: [
      ["Format", "Resistance → Exercise → Position/Variation", "DB Bench Press – Incline", "Always this order. Dash before position."],
      ["Prefix", "Start with equipment abbreviation", "BB · DB · KB · BW · CB · MB · TRX · Band · Sled", "BB=Barbell  DB=Dumbbell  KB=Kettlebell  BW=Bodyweight  CB=Cable"],
      ["Exercise", "Standard anatomical or accepted exercise name", "Squat · Deadlift · Row · Press · Curl · Carry", "No slang or nicknames in written programs"],
      ["Variation", "Add position/variation after dash — only if it changes the pattern", "BB Squat – Pause  /  DB Row – Single Arm", "Omit if it's the standard version of the movement"],
      ["Unilateral", "Use 'Single Arm' or 'Single Leg' — not 'Unilateral'", "DB Press – Single Arm", ""],
    ],
  },
];
