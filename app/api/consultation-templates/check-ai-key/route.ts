import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireLogin } from "@/lib/requireLogin";
import { getAccessContext } from "@/lib/auth/access";

/**
 * One-time diagnostic, visited directly in the browser by a director — no
 * log-reading required. Confirms, in one shot: whether ANTHROPIC_API_KEY is
 * actually loaded in THIS deployment (rules out a redeploy that didn't pick
 * up an env var change), what it looks like (rules out a corrupted/partial
 * paste), and whether a real call to Anthropic succeeds. Safe to delete
 * once the real cause is confirmed.
 */
export async function GET() {
  const unauthorized = await requireLogin();
  if (unauthorized) return unauthorized;
  const { isDirector } = await getAccessContext();
  if (!isDirector) {
    return NextResponse.json({ error: "Directors only" }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ configured: false, message: "ANTHROPIC_API_KEY is not set in this deployment at all — the env var change may not have redeployed yet." });
  }

  const keyPreview = `${apiKey.slice(0, 14)}...${apiKey.slice(-6)} (${apiKey.length} characters total)`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: "Reply with just: OK" }],
    });
    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
    return NextResponse.json({ configured: true, keyPreview, working: true, sampleResponse: text });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      keyPreview,
      working: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
