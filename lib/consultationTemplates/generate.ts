import Anthropic from "@anthropic-ai/sdk";
import type { ConsultNote, ReportSection } from "./types";

const MODEL = "claude-opus-5-5"; // patient-facing writing quality matters more than latency/cost here — this runs once per consult, not in bulk

const STYLE_GUIDE = `Write like Adjust Health's physios talk to their own clients — warm, personal, genuinely excited to help, never clinical or cold. Some patterns to follow:
- Address the client directly as "you" / "your" throughout, never "the patient" or third person.
- Translate clinical findings into plain language a client with no medical background can actually picture — explain what a finding MEANS for them, not just what it is.
- Be encouraging and confident without over-promising a timeline — it's fine to say something typically takes a number of weeks to settle, but don't guarantee outcomes.
- When explaining the treatment plan, frame it as phases you're moving through together, not a list of appointments: an early phase focused on calming things down, a middle phase focused on rebuilding, and a final phase focused on making it stick.
- Weave in what the client themselves said they wanted from today and long-term where it's given — this is a client-centred consult, so the report should read like it's answering THEIR stated goals, not just reciting exam findings.
- Close warmly — genuine thanks for choosing to work with Adjust, and an invitation to reach out with questions before the next visit.
- Avoid dense jargon dumps, bullet-list clinical language, or copy-pasting the raw exam findings verbatim — this is a narrative written FOR the client, not a copy of the clinical note.`;

export type GenerateResult = { sections: ReportSection[]; nookalNotes: string } | null;

/**
 * Turns a filled Initial Consultation note into (a) a warm, plain-language
 * patient-facing report and (b) concise Nookal-ready clinical documentation
 * — one AI call producing both from the same structured note, so a physio
 * who already wrote the note up as they normally do gets both outputs for
 * free. Returns null (never throws) on any failure — same "degrade
 * gracefully, caller decides what to show" contract as
 * classifyRescheduleNotes(), since this is a genuinely optional step on top
 * of a note that's already saved either way.
 */
export async function generateConsultOutputs(note: ConsultNote): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: buildPrompt(note) }],
    });
    const text = response.content.find((block): block is Anthropic.TextBlock => block.type === "text")?.text ?? "";
    return parseResult(text);
  } catch {
    return null;
  }
}

function buildPrompt(note: ConsultNote): string {
  return `You're helping a physiotherapist at Adjust Health turn their initial consultation notes into two documents, from the structured note below (a Client-Centred Consult).

CLIENT: ${note.patientName || "the client"}
CLINICIAN: ${note.clinician || "the treating physiotherapist"}

WHAT THE CLIENT WANTS FROM THIS
Why they've come in now / why Adjust: ${note.goals.whyNow || "—"}
What they want out of today's session: ${note.goals.todayGoal || "—"}
Long-term goal for physiotherapy, and why it matters to them: ${note.goals.longTermGoal || "—"}
What they think is stopping them getting better: ${note.goals.roadblockPerceived || "—"}

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
Working clinical model (causal chain): ${note.clinicalReasoning.workingClinicalModel || "—"}
Diagnosis: ${note.clinicalReasoning.diagnosis || "—"}
Prognosis: ${note.clinicalReasoning.prognosis || "—"}

TREATMENT PLAN
Phase 1 — Symptom Reduction: ${note.treatmentPlan.symptomReduction || "—"}
Phase 2 — Restorative: ${note.treatmentPlan.restorative || "—"}
Phase 3 — Consolidation: ${note.treatmentPlan.consolidation || "—"}
Next appointment: ${note.nextAppointment || "—"}

Produce TWO things:

1. "reportSections" — a client-facing report as an array of {"heading","body"} objects, designed to be laid out as a polished, modern PDF the client receives after their visit. Use around 5-6 sections covering: a warm opening/overview, what was found (in plain language), their diagnosis explained simply, the treatment plan as phases, what to expect between now and next visit, and a warm closing with next appointment details if given. Each "body" is 1-3 short paragraphs of plain text (no markdown, no bullet characters).
${STYLE_GUIDE}

2. "nookalNotes" — concise, professional clinical documentation ready to paste directly into Nookal, structured as: Subjective, Objective, Clinical Impression, Diagnosis & Prognosis, Treatment Plan — using normal clinical shorthand and terminology (this one IS for clinical staff, not the client). Plain text with line breaks between headings, no markdown formatting.

Respond with ONLY a JSON object and nothing else, in this exact shape:
{"reportSections":[{"heading":"...","body":"..."}],"nookalNotes":"..."}`;
}

function parseResult(text: string): GenerateResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const { reportSections, nookalNotes } = parsed as Record<string, unknown>;
  if (!Array.isArray(reportSections) || typeof nookalNotes !== "string") return null;

  const sections: ReportSection[] = [];
  for (const s of reportSections) {
    if (s && typeof s === "object" && typeof (s as Record<string, unknown>).heading === "string" && typeof (s as Record<string, unknown>).body === "string") {
      sections.push({ heading: (s as Record<string, unknown>).heading as string, body: (s as Record<string, unknown>).body as string });
    }
  }
  if (sections.length === 0) return null;
  return { sections, nookalNotes };
}
