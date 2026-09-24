import Anthropic from "@anthropic-ai/sdk";
import type {
  CleanedPhase,
  ConsultNote,
  PlanCleanup,
  ReportSection,
  TreatmentPhase,
} from "./types";

const MODEL = "claude-opus-5-5"; // patient-facing writing quality matters more than latency/cost here — this runs once per consult, not in bulk

const STYLE_GUIDE = `Write like Adjust Health's physios talk to their own clients — warm, personal, genuinely excited to help, never clinical or cold. Some patterns to follow:
- Address the client directly as "you" / "your" throughout, never "the patient" or third person.
- Translate clinical findings into plain language a client with no medical background can actually picture — explain what a finding MEANS for them, not just what it is.
- Be encouraging and confident without over-promising a timeline — it's fine to say something typically takes a number of weeks to settle, but don't guarantee outcomes.
- When explaining the treatment plan, frame it as phases you're moving through together, not a list of appointments: an early phase focused on calming things down, a middle phase focused on rebuilding, and a final phase focused on making it stick. Frame it as the typical pathway rather than a fixed promise — it's fine to be specific and confident, but make clear (briefly, in passing, not as a caveat/disclaimer) that the plan gets reviewed and adjusted based on how the client actually responds.
- Close warmly — genuine thanks for choosing to work with Adjust, and an invitation to reach out with questions before the next visit.
- Avoid dense jargon dumps, bullet-list clinical language, or copy-pasting the raw exam findings verbatim — this is a narrative written FOR the client, not a copy of the clinical note.
- Never use em dashes or double hyphens (—, --). Write in plain sentences using periods and commas instead — that stylistic tic is one of the clearest tells that something was written by AI, and this needs to read like a person wrote it.`;

export type GenerateOutcome =
  | {
      ok: true;
      sections: ReportSection[];
      keyFindings: string[];
      nookalNotes: string;
      focusArea: string;
      planCleanup: PlanCleanup | null;
    }
  | { ok: false; reason: string };

/**
 * Turns a filled Initial Consultation note into (a) a warm, plain-language
 * patient-facing report and (b) concise Nookal-ready clinical documentation
 * — one AI call producing both from the same structured note, so a physio
 * who already wrote the note up as they normally do gets both outputs for
 * free. Never throws — on any failure, returns { ok: false, reason } with a
 * message specific enough to act on, shown directly in the UI so this is
 * diagnosable without needing Vercel's logs at all.
 */
export async function generateConsultOutputs(
  note: ConsultNote,
): Promise<GenerateOutcome> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      reason: "ANTHROPIC_API_KEY is not set in this deployment.",
    };
  }

  const client = new Anthropic({ apiKey });

  let text: string;
  let truncated = false;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: buildPrompt(note) }],
    });
    text =
      response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text",
      )?.text ?? "";
    truncated = response.stop_reason === "max_tokens";
  } catch (e) {
    const message =
      e instanceof Anthropic.APIError
        ? `${e.status} ${e.message}`
        : e instanceof Error
          ? e.message
          : String(e);
    return { ok: false, reason: `Anthropic API call failed: ${message}` };
  }

  const result = parseResult(text);
  if (!result) {
    const truncationNote = truncated
      ? " The response was cut off before it finished (hit the token limit) — try again, or shorten the note."
      : "";
    return {
      ok: false,
      reason: `The model's response wasn't in the expected format.${truncationNote} Raw response started with: ${text.slice(0, 200) || "(empty)"}`,
    };
  }
  return { ok: true, ...result };
}

function formatPhase(phase: TreatmentPhase): string {
  const cadence = [phase.frequency, phase.duration].filter(Boolean).join(", ");
  const parts = [
    cadence,
    phase.focus,
    phase.interventions
      ? `Key interventions: ${phase.interventions.replace(/\n/g, "; ")}`
      : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : "—";
}

function buildPrompt(note: ConsultNote): string {
  return `You're helping a physiotherapist at Adjust Health turn their initial consultation notes into two documents, from the structured note below (a Client-Centred Consult).

CLIENT: ${note.patientName || "the client"}
CLINICIAN: ${note.clinician || "the treating physiotherapist"}

SUBJECTIVE
HPC / body chart (includes PNN, aggravating/easing factors, 24hr pattern, clicking/catching/locking where noted): ${note.subjective.hpcBodyChart || "—"}
Past history: ${note.subjective.pastHistory || "—"}
Imaging / red flags: ${note.subjective.imagingRedFlags || "—"}
PMHx / surgery / medications: ${note.subjective.pmhxSurgeryMeds || "—"}
Occupation / social: ${note.subjective.occupationSocial || "—"}

OBJECTIVE
Observation: ${note.objective.obs || "—"}
Functional testing: ${note.objective.functionalTesting || "—"}
Range of motion: ${note.objective.rom || "—"}
Isokinetic testing (VALD): ${note.objective.isokineticTesting || "—"}
Functional findings (VALD): ${note.objective.functionalFindingsVald || "—"}
Special tests: ${note.objective.specialTests || "—"}
Neurodynamic tests: ${note.objective.ndts || "—"}
Joint mobility: ${note.objective.jointMobility || "—"}
Palpation: ${note.objective.palpation || "—"}

CLINICAL REASONING
Clinical impression: ${note.clinicalReasoning.impression || "—"}
Diagnosis: ${note.clinicalReasoning.diagnosis || "—"}
Prognosis: ${note.clinicalReasoning.prognosis || "—"}

TREATMENT PLAN
Estimated overall recovery timeframe: ${note.treatmentPlan.estimatedTimeframe.trim() || "not specified"}
Phase 1 — Symptom Reduction: ${formatPhase(note.treatmentPlan.symptomReduction)}
Phase 2 — Restorative: ${formatPhase(note.treatmentPlan.restorative)}
Phase 3 — Consolidation: ${formatPhase(note.treatmentPlan.consolidation)}
Return to function criteria (do NOT re-list these, they're shown separately in full): ${note.treatmentPlan.returnToFunctionCriteria.trim() || "not specified"}
Next appointment: ${note.nextAppointment || "—"}

Produce FIVE things:

1. "focusArea" — a short 3-6 word label for what this consult was actually about, for a badge/chip at the top of the report (e.g. "Right Knee · Patellofemoral Pain", "Lower Back · Disc-Related Stiffness"). Plain language, not a full diagnosis sentence.

2. "keyFindings" — 3 to 5 short, scannable phrases (NOT full sentences, no trailing period, 3-8 words each) pulled from the objective findings, e.g. "Weakness through the outer hip", "Full, pain-free range of motion", "No signs of structural damage". These get laid out as a quick-scan list on the report, separate from the prose below, so a client can take in the headline findings in a few seconds before reading the fuller explanation.

3. "reportSections" — a client-facing report as an array of {"heading","body"} objects, designed to be laid out as a polished, modern PDF the client receives after their visit. The report's opening (personalised headline) and the key findings list are both handled separately from these, so do NOT write a "welcome/overview" section and do NOT re-list the findings — start straight in. Write exactly 2 sections: (1) what was found AND what it means for them, woven together as one explanation (don't separate "findings" from "diagnosis" into two beats, that's redundant with the key findings list above) — name the actual diagnosis in plain language as part of this; (2) what to expect between now and their next visit. Do NOT write a separate section introducing the treatment plan — the Treatment Plan card that follows already has its own heading and framing, so a third section here would just repeat it. Each "body" is 1-2 short paragraphs of plain text (no markdown, no bullet characters) — keep it tight, this is a report a client will actually read in full, not skim past.
${STYLE_GUIDE}

4. "nookalNotes" — concise, professional clinical documentation ready to paste directly into Nookal, structured as: Subjective, Objective, Clinical Impression, Diagnosis & Prognosis, Treatment Plan — using normal clinical shorthand and terminology (this one IS for clinical staff, not the client). Plain text with line breaks between headings, no markdown formatting.

5. "planCleanup" — the treatment plan's Focus and Key Interventions text for each phase, and the Return to Function Criteria list, LIGHTLY copy-edited: fix spelling typos, capitalize the start of each sentence/bullet, fix obvious grammar slips. Do NOT paraphrase, reword, shorten, reorder, or change the clinical meaning — this is proofreading, not rewriting. Keep legitimate gym/clinical shorthand and abbreviations exactly as written (e.g. "BB", "LSI", "ROM", "toes to bar", "VALD") — only fix genuine typos like "tehcnique" -> "technique". Split each phase's interventions into an array, one string per line from the input (same order, same count of meaningful lines). If a field was empty or "not specified" in the input, return "" for a text field or [] for a list. Shape: {"symptomReduction":{"focus":"...","interventions":["...","..."]},"restorative":{...},"consolidation":{...},"returnToFunctionCriteria":["...","..."]}

Respond with ONLY a JSON object and nothing else, in this exact shape:
{"focusArea":"...","keyFindings":["...","..."],"reportSections":[{"heading":"...","body":"..."}],"nookalNotes":"...","planCleanup":{"symptomReduction":{"focus":"...","interventions":["..."]},"restorative":{"focus":"...","interventions":["..."]},"consolidation":{"focus":"...","interventions":["..."]},"returnToFunctionCriteria":["..."]}}`;
}

function parseCleanedPhase(raw: unknown): CleanedPhase {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const focus = typeof obj.focus === "string" ? obj.focus : "";
  const interventions = Array.isArray(obj.interventions)
    ? obj.interventions.filter((i): i is string => typeof i === "string")
    : [];
  return { focus, interventions };
}

/** Best-effort — a malformed or missing planCleanup falls back to null
 * rather than failing the whole generation, since it's an enhancement on
 * top of an already-complete report (the raw note text still renders fine
 * on its own). */
function parsePlanCleanup(raw: unknown): PlanCleanup | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return {
    symptomReduction: parseCleanedPhase(obj.symptomReduction),
    restorative: parseCleanedPhase(obj.restorative),
    consolidation: parseCleanedPhase(obj.consolidation),
    returnToFunctionCriteria: Array.isArray(obj.returnToFunctionCriteria)
      ? obj.returnToFunctionCriteria.filter(
          (i): i is string => typeof i === "string",
        )
      : [],
  };
}

function parseResult(text: string): {
  sections: ReportSection[];
  keyFindings: string[];
  nookalNotes: string;
  focusArea: string;
  planCleanup: PlanCleanup | null;
} | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const { reportSections, keyFindings, nookalNotes, focusArea, planCleanup } =
    parsed as Record<string, unknown>;
  if (!Array.isArray(reportSections) || typeof nookalNotes !== "string")
    return null;

  const sections: ReportSection[] = [];
  for (const s of reportSections) {
    if (
      s &&
      typeof s === "object" &&
      typeof (s as Record<string, unknown>).heading === "string" &&
      typeof (s as Record<string, unknown>).body === "string"
    ) {
      sections.push({
        heading: (s as Record<string, unknown>).heading as string,
        body: (s as Record<string, unknown>).body as string,
      });
    }
  }
  if (sections.length === 0) return null;
  return {
    sections,
    keyFindings: Array.isArray(keyFindings)
      ? keyFindings.filter((f): f is string => typeof f === "string")
      : [],
    planCleanup: parsePlanCleanup(planCleanup),
    nookalNotes,
    focusArea: typeof focusArea === "string" ? focusArea : "",
  };
}
