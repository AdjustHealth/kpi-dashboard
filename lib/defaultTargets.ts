import { cvaTierBucket } from "@/lib/cvaTier";
import { Provider } from "@/lib/types";

/**
 * Standard KPI Scorecard targets — apply to every provider unless they have
 * their own explicit override in `provider.targets` (Settings page). These
 * are the director's own stated numbers, not guessed defaults:
 * DNAs 0 (anything above is a miss), Cancellations under 20, Not Rebooked
 * under 30%, Reschedule Rate above 30%, NCVA 20, Completed Consults 40.
 * CVA (key: ucva) varies by tier — New Grad 4, 2-5yr Physio 6, Senior 7 —
 * massage/EP have no stated CVA target, so none is set for them.
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
 * Merges the standard defaults under whatever the provider has explicitly
 * set — an explicit target always wins over the default, never the other
 * way around.
 */
export function getEffectiveTargets(provider: Pick<Provider, "role" | "targets">): Record<string, unknown> {
  const defaults: Record<string, unknown> = { ...FLAT_DEFAULTS };
  const tier = cvaTierBucket(provider);
  if (tier && CVA_TARGET_BY_TIER[tier] !== undefined) defaults.ucva = CVA_TARGET_BY_TIER[tier];
  return { ...defaults, ...provider.targets };
}
