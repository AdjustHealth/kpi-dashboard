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
    section: "Phase Naming & Structure",
    chain: ["Symptom Management", "Strength Introduction", "Strength Accumulation", "Strength Specificity", "Return to Performance"],
    chainLabel: "Rehab block progression",
    note: "Performance: pick the sport first — the phase sequence is purely dependent on this.",
  },
  {
    section: "Mesocycle / Block Length",
    cols: ["Rule", "Description", "Example", "Notes"],
    rows: [
      ["Default", "4 weeks unless clinically indicated otherwise", "1 block = 4 weeks", "Deviations must be noted in the Notes column"],
      ["Rehab", "Block length set by practitioner — document reasoning", "6-week block for post-surgical load progression", "Check with Dean for any block longer than 6 weeks"],
      ["Performance", "Follow periodisation phases in sequence", "Accumulation → Realisation → Peaking", "Document current phase in the Notes column"],
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
