export type CvaTier = "senior" | "massage" | "ep" | "new_grad" | "2_5yr";

/**
 * CVA-by-tier bucket — grouped by experience, not by ProviderRole.
 * role:"senior_physio" always buckets as "senior"; a role:"physio" provider
 * buckets by providers.targets.experience_tier ("new_grad" | "2_5yr" |
 * "senior") — the latter covers experienced physios who aren't on the
 * Senior Physio tab (e.g. Michael, Nick) but are still in the "Senior
 * (6+yr)" CVA group. Shared by the Business Performance Report's clinic-wide
 * CVA-by-tier rollup (lib/nookal/applyReport.ts) and default CVA targets
 * (lib/defaultTargets.ts) — one definition of "which tier is this provider
 * in" for both.
 */
export function cvaTierBucket(p: { role: string; targets?: Record<string, unknown> | null }): CvaTier | null {
  if (p.role === "senior_physio") return "senior";
  if (p.role === "massage" || p.role === "ep") return p.role;
  if (p.role === "physio") {
    const tier = p.targets?.experience_tier;
    if (tier === "new_grad" || tier === "2_5yr" || tier === "senior") return tier;
  }
  return null;
}
