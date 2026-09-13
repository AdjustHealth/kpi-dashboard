import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Matches providers.role values — used by requireProviderRole() and to widen
 * allowedProviderRoles when a login has full "meetings" section access. */
export const PROVIDER_ROLES = ["physio", "massage", "ep", "senior_physio", "admin"] as const;

/** The business areas that can be granted independently of the coarse
 * director/restricted split — see migration 0039_section_level_access.sql.
 * Configuration is deliberately not one of these: directors only, always. */
export const SECTIONS = ["data_entry", "clinic_reports", "meetings", "team", "adjust_gym", "assessment_tool"] as const;
export type Section = (typeof SECTIONS)[number];

export interface AccessContext {
  isDirector: boolean;
  /** Only meaningful when isDirector is false — which providers.role values this login can see.
   * Widened to every role when allowedSections includes "meetings". */
  allowedProviderRoles: string[];
  /** Only meaningful when isDirector is false — which business areas this login can see. */
  allowedSections: string[];
}

/**
 * What this logged-in user is allowed to see — see migration
 * 0029_scoped_staff_access.sql and 0039_section_level_access.sql. No
 * staff_access row (every director account today) reads back as a full
 * director; get_my_access() always returns exactly one row so this never
 * needs a "no row" fallback branch.
 */
export async function getAccessContext(): Promise<AccessContext> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_access").single();
  const row = data as { is_director?: boolean; allowed_provider_roles?: string[]; allowed_sections?: string[] } | null;
  const isDirector = row?.is_director ?? true;
  const allowedSections = row?.allowed_sections ?? [];
  const allowedProviderRoles = allowedSections.includes("meetings") ? [...PROVIDER_ROLES] : row?.allowed_provider_roles ?? [];
  return { isDirector, allowedProviderRoles, allowedSections };
}

/** Pages that are director-only no matter what sections a login has been granted (Configuration: Targets, Settings) call this first — sends a restricted login back to the one section they do have. */
export async function requireDirector(): Promise<void> {
  const { isDirector } = await getAccessContext();
  if (!isDirector) redirect("/home");
}

/** Pages behind one grantable business area (Data Entry, Clinic Reports, Team, Adjust Gym, Assessment Tool) call this first. */
export async function requireSection(section: Section): Promise<void> {
  const { isDirector, allowedSections } = await getAccessContext();
  if (!isDirector && !allowedSections.includes(section)) redirect("/home");
}

/** Senior Physio and Admin (the two Meetings sub-pages not open to every Meetings-scoped role) call this first. */
export async function requireProviderRole(role: (typeof PROVIDER_ROLES)[number]): Promise<void> {
  const { isDirector, allowedProviderRoles } = await getAccessContext();
  if (!isDirector && !allowedProviderRoles.includes(role)) redirect("/home");
}
