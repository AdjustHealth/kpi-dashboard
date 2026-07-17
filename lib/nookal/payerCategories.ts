/**
 * Buckets a Nookal "Invoice Type" / payer name into the 6 categories used
 * on the Revenue page (Private / Medicare / DVA / WorkCover / NDIS / Other).
 *
 * Nookal's payer list runs into the hundreds (individual law firms,
 * workers-comp insurers, CTP insurers, NDIS plan managers, etc.), so this
 * is a best-effort keyword match, not an exhaustive lookup table. If the
 * "Other" bucket ends up unexpectedly large on the Revenue page, add more
 * keywords here rather than assuming the revenue total is wrong — the
 * total itself always comes straight from Nookal's own numbers.
 */

export type PayerCategory = "private" | "medicare" | "dva" | "workcover" | "ndis" | "other";

export const PAYER_CATEGORY_LABELS: Record<PayerCategory, string> = {
  private: "Private",
  medicare: "Medicare",
  dva: "DVA",
  workcover: "WorkCover",
  ndis: "NDIS",
  other: "Other",
};

const DVA_PATTERN = /veteran|\bdva\b/i;
const NDIS_PATTERN = /\bndis\b|plan manag|plan partner|disability|support coordinat/i;
const WORKCOVER_PATTERN =
  /work\s*cover|workers?\s*comp|employers?\s*mutual|\bicare\b|\beml\b|\bcgu\b|comcare|self insur/i;

export function categorizePayer(invoiceType: string | null | undefined): PayerCategory {
  const name = (invoiceType ?? "").trim().toLowerCase();
  if (!name) return "other";
  if (name === "private") return "private";
  if (name === "medicare") return "medicare";
  if (DVA_PATTERN.test(name)) return "dva";
  if (NDIS_PATTERN.test(name)) return "ndis";
  if (WORKCOVER_PATTERN.test(name)) return "workcover";
  return "other";
}
