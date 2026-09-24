import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateConsultOutputs } from "@/lib/consultationTemplates/generate";
import { emptyConsultNote } from "@/lib/consultationTemplates/types";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: createMock };
  }
  class APIError extends Error {}
  return { default: Object.assign(MockAnthropic, { APIError }) };
});

describe("generateConsultOutputs", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const note = { ...emptyConsultNote(), patientName: "Jane Doe" };

  beforeEach(() => {
    createMock.mockReset();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("reports the reason when no API key is configured (never throws)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await generateConsultOutputs(note);
    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining("ANTHROPIC_API_KEY"),
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("reports the reason if the API call throws", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockRejectedValue(new Error("network error"));
    const result = await generateConsultOutputs(note);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toContain(
      "network error",
    );
  });

  it("reports the reason if the response isn't the expected JSON shape", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "not json at all" }],
      stop_reason: "end_turn",
    });
    const result = await generateConsultOutputs(note);
    expect(result.ok).toBe(false);
  });

  it("flags a truncated response distinctly from a malformed one", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"focusArea":"Right Knee","reportSections":[{"heading":"What',
        },
      ],
      stop_reason: "max_tokens",
    });
    const result = await generateConsultOutputs(note);
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toContain(
      "cut off",
    );
  });

  it("reports the reason if reportSections is present but empty", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({
      content: [
        { type: "text", text: '{"reportSections":[],"nookalNotes":"S: ..."}' },
      ],
      stop_reason: "end_turn",
    });
    const result = await generateConsultOutputs(note);
    expect(result.ok).toBe(false);
  });

  it("parses a well-formed response into focus area + sections + nookal notes", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: 'Sure, here it is:\n{"focusArea":"Right Knee · Patellofemoral Pain","reportSections":[{"heading":"What We Found","body":"Hi Jane, here is what we found today."}],"nookalNotes":"S: reports lateral knee pain..."}',
        },
      ],
      stop_reason: "end_turn",
    });
    const result = await generateConsultOutputs(note);
    expect(result).toEqual({
      ok: true,
      focusArea: "Right Knee · Patellofemoral Pain",
      sections: [
        {
          heading: "What We Found",
          body: "Hi Jane, here is what we found today.",
        },
      ],
      nookalNotes: "S: reports lateral knee pain...",
    });
  });

  it("defaults focusArea to an empty string if the model omits it", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"reportSections":[{"heading":"What We Found","body":"..."}],"nookalNotes":"S: ..."}',
        },
      ],
      stop_reason: "end_turn",
    });
    const result = await generateConsultOutputs(note);
    expect(result.ok).toBe(true);
    expect(result.ok && result.focusArea).toBe("");
  });
});
