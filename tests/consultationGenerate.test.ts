import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateConsultOutputs } from "@/lib/consultationTemplates/generate";
import { emptyConsultNote } from "@/lib/consultationTemplates/types";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

describe("generateConsultOutputs", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const note = { ...emptyConsultNote(), patientName: "Jane Doe" };

  beforeEach(() => {
    createMock.mockReset();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("returns null (never throws) when no API key is configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await generateConsultOutputs(note);
    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns null if the API call throws", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockRejectedValue(new Error("network error"));
    const result = await generateConsultOutputs(note);
    expect(result).toBeNull();
  });

  it("returns null if the response isn't the expected JSON shape", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({ content: [{ type: "text", text: "not json at all" }] });
    const result = await generateConsultOutputs(note);
    expect(result).toBeNull();
  });

  it("returns null if reportSections is present but empty", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({ content: [{ type: "text", text: '{"reportSections":[],"nookalNotes":"S: ..."}' }] });
    const result = await generateConsultOutputs(note);
    expect(result).toBeNull();
  });

  it("parses a well-formed response into sections + nookal notes", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: 'Sure, here it is:\n{"reportSections":[{"heading":"Welcome","body":"Hi Jane, great to meet you today."}],"nookalNotes":"S: reports lateral knee pain..."}',
        },
      ],
    });
    const result = await generateConsultOutputs(note);
    expect(result).toEqual({
      sections: [{ heading: "Welcome", body: "Hi Jane, great to meet you today." }],
      nookalNotes: "S: reports lateral knee pain...",
    });
  });
});
