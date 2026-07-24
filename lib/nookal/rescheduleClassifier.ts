import Anthropic from "@anthropic-ai/sdk";

export interface ClassifyInput {
  id: string;
  note: string;
}

const MODEL = "claude-haiku-4-5-20251001";
const BATCH_SIZE = 80; // keep each request small/fast rather than one giant call for a busy week

/**
 * Classifies cancellation notes as a confirmed reschedule or not, using an
 * LLM read of the actual sentence instead of a regex — handles phrasing the
 * regex can't anticipate (a new way of saying "declined", "just discussed
 * but not booked", etc.). Returns null (never throws) if no API key is
 * configured or the call fails for any reason — applyReport.ts falls back
 * to the regex heuristic in that case, so a missing/expired key or an
 * Anthropic outage never breaks a live CSV upload.
 */
export async function classifyRescheduleNotes(inputs: ClassifyInput[]): Promise<Record<string, boolean> | null> {
  if (inputs.length === 0) return {};
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const result: Record<string, boolean> = {};

  try {
    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const batch = inputs.slice(i, i + BATCH_SIZE);
      const verdicts = await classifyBatch(client, batch);
      if (!verdicts) return null; // one bad batch — bail out entirely rather than return a half-classified result
      Object.assign(result, verdicts);
    }
    return result;
  } catch {
    return null;
  }
}

async function classifyBatch(
  client: Anthropic,
  batch: ClassifyInput[]
): Promise<Record<string, boolean> | null> {
  const list = batch.map((b) => `${b.id}: ${b.note.replace(/\s+/g, " ").trim()}`).join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You're reviewing cancellation notes from a physiotherapy clinic's booking system. Staff write "rsx" or "rx" as shorthand for "reschedule". Your job: decide whether each note describes a CONFIRMED reschedule (staff actually locked in a new booking time for the client) versus something that was only offered, discussed, planned for later, or declined — NOT yet actually done.

CONFIRMED reschedule examples: "rsx to Thurs 3.30pm", "rx. moved to 24/07", a bare "rsx" with nothing else (staff shorthand meaning "done").
NOT confirmed examples: "offered rsx but declined", "will call back tomorrow to rsx" (a to-do, not done), "not able to rsx any time", "doesn't want to rsx", "lm to rsx to Tuesday" (still a to-do — the word "to" right before "rsx" signals a plan, not a completed action).

For each numbered line below, decide true (confirmed reschedule) or false (not confirmed).

${list}

Respond with ONLY a JSON array and nothing else, one entry per line above, in this exact shape:
[{"id": "<id>", "rescheduled": true}, {"id": "<id>", "rescheduled": false}]`,
      },
    ],
  });

  const text = response.content.find((block): block is Anthropic.TextBlock => block.type === "text")?.text ?? "";
  return parseVerdicts(text, batch);
}

function parseVerdicts(text: string, batch: ClassifyInput[]): Record<string, boolean> | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const result: Record<string, boolean> = {};
  for (const entry of parsed) {
    if (entry && typeof entry === "object" && "id" in entry && "rescheduled" in entry) {
      const { id, rescheduled } = entry as { id: unknown; rescheduled: unknown };
      if (typeof id === "string" && typeof rescheduled === "boolean") result[id] = rescheduled;
    }
  }
  // Every note in the batch must have gotten a verdict — a partial/malformed
  // response is treated as a failure rather than silently dropping some notes.
  if (batch.some((b) => !(b.id in result))) return null;
  return result;
}
