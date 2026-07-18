import { cvaTierBucket } from "@/lib/cvaTier";
import { roleTargetGroupId } from "@/lib/targetsSchema";
import { Provider } from "@/lib/types";

/**
 * Hardcoded last-resort defaults — only used for a field/tier that neither
 * the provider's own targets nor its role_targets group has set yet (e.g.
 * a brand new install before the Targets page has been touched). These are
 * the director's own stated numbers: DNAs 0 (anything above is a miss),
 * Cancellations under 20, Not Rebooked under 30%, Reschedule Rate above
 * 30%, NCVA 20, Completed Consults 40. CVA (key: ucva) varies by tier —
 * New Grad 4, 2-5yr Physio 6, Senior 7 — massage/EP have no stated CVA
 * target, so none is set for them.
 */
const FLAT_DEFAULTS: Record<string, number> = {
  dnas: 0,
  cancellations: 20,
  not_rebooked_pct: 0.3,
  reschedule_rate_pct: 0.3,
  ncva: 20,
  completed_consults: 40,
};

const CVA_TARGET_BY_TIER: Partial<Record<ReturnType<typeof cvaTierBucket> & string, number>> = {
  new_grad: 4,
  "2_5yr": 6,
  senior: 7,
};

/**
 * Merges, lowest to highest precedence: hardcoded fallback defaults, then
 * the provider's role_targets group (Providers/Senior/Admin — one shared
 * set edited once on the Targets page instead of per-person), then any
 * explicit override still sitting on the provider itself. CVA is looked up
 * by experience tier (lib/cvaTier.ts) across whichever group owns that
 * tier's target, independent of which group the provider's flat fields
 * come from — a physio tagged tier "senior" still gets the Senior group's
 * CVA target even though their FBA/DNAs/etc. come from "Providers".
 */
export function getEffectiveTargets(
  provider: Pick<Provider, "role" | "targets">,
  roleTargets: Record<string, Record<string, unknown>> = {}
): Record<string, unknown> {
  const groupId = roleTargetGroupId(provider.role);
  const group = roleTargets[groupId] ?? {};
  const groupFlat = Object.fromEntries(Object.entries(group).filter(([k]) => !k.startsWith("cva_target_")));

  const defaults: Record<string, unknown> = { ...FLAT_DEFAULTS, ...groupFlat };

  const tier = cvaTierBucket(provider);
  if (tier) {
    const tierCva =
      (roleTargets.providers?.[`cva_target_${tier}`] as number | undefined) ??
      (roleTargets.senior?.[`cva_target_${tier}`] as number | undefined) ??
      CVA_TARGET_BY_TIER[tier];
    if (tierCva !== undefined) defaults.ucva = tierCva;
  }

  return { ...defaults, ...provider.targets };
}
