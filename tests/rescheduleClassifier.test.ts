import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { classifyRescheduleNotes } from "@/lib/nookal/rescheduleClassifier";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMock };
  },
}));

describe("classifyRescheduleNotes", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    createMock.mockReset();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("returns null (never throws) when no API key is configured — caller falls back to regex", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await classifyRescheduleNotes([{ id: "1", note: "rsx to Thurs" }]);
    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns null if the model's response isn't valid JSON for every note (partial response treated as failure)", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({ content: [{ type: "text", text: 'not json at all' }] });
    const result = await classifyRescheduleNotes([{ id: "1", note: "rsx to Thurs" }]);
    expect(result).toBeNull();
  });

  it("returns null if the API call throws", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockRejectedValue(new Error("network error"));
    const result = await classifyRescheduleNotes([{ id: "1", note: "rsx to Thurs" }]);
    expect(result).toBeNull();
  });

  it("parses a well-formed verdict array keyed by id", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({
      content: [
        {
          type: "text",
          text: 'Here you go:\n[{"id": "1", "rescheduled": true}, {"id": "2", "rescheduled": false}]',
        },
      ],
    });
    const result = await classifyRescheduleNotes([
      { id: "1", note: "rsx to Thurs 3.30pm" },
      { id: "2", note: "offered rsx but declined" },
    ]);
    expect(result).toEqual({ "1": true, "2": false });
  });
});
