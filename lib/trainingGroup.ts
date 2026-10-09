import { Provider } from "@/lib/types";

/**
 * Clinical Training's groups — one clinical curriculum each, named exactly
 * as the director chose rather than reusing CvaTier's "senior"/"new_grad"
 * labels, since Associate Physio here deliberately merges what the
 * director's own sheet tracked as two separate tiers ("Tier 2 — Developing"
 * and "Tier 3 — Advanced") into one group.
 */
export type TrainingGroupId = "new_grad" | "associate" | "senior_physio" | "ep" | "massage";

export const TRAINING_GROUPS: { id: TrainingGroupId; label: string }[] = [
  { id: "new_grad", label: "New Graduates" },
  { id: "associate", label: "Associate Physio" },
  { id: "senior_physio", label: "Senior Physio" },
  { id: "ep", label: "Exercise Physiology" },
  { id: "massage", label: "Massage Therapy" },
];

export function trainingGroupLabel(id: TrainingGroupId): string {
  return TRAINING_GROUPS.find((g) => g.id === id)?.label ?? id;
}

/**
 * Which Clinical Training group a provider belongs to right now — mirrors
 * cvaTierBucket()'s role + targets.experience_tier logic (lib/cvaTier.ts),
 * but collapses "2_5yr" and "senior"-tier physios (who aren't on the Senior
 * Physio tab) into the one merged Associate Physio group. Returns null for
 * a physio with no experience_tier set yet, or for role "admin" — neither
 * has a training group.
 */
export function trainingGroupForProvider(p: { role: string; targets?: Record<string, unknown> | null }): TrainingGroupId | null {
  if (p.role === "senior_physio") return "senior_physio";
  if (p.role === "massage") return "massage";
  if (p.role === "ep") return "ep";
  if (p.role === "physio") {
    const tier = p.targets?.experience_tier;
    if (tier === "new_grad") return "new_grad";
    if (tier === "2_5yr" || tier === "senior") return "associate";
  }
  return null;
}

export function providersInTrainingGroup(providers: Provider[], group: TrainingGroupId): Provider[] {
  return providers.filter((p) => trainingGroupForProvider(p) === group);
}

/** "Sam Johnson" -> "SJ", "Dean" -> "DE" — the status-dot label in a group's topic grid. */
export function initialsForProvider(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
