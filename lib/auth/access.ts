import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AccessContext {
  isDirector: boolean;
  /** Only meaningful when isDirector is false — which providers.role values this login can see. */
  allowedProviderRoles: string[];
}

/**
 * What this logged-in user is allowed to see — see migration
 * 0029_scoped_staff_access.sql. No staff_access row (every director
 * account today) reads back as a full director; get_my_access() always
 * returns exactly one row so this never needs a "no row" fallback branch.
 */
export async function getAccessContext(): Promise<AccessContext> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_access").single();
  const row = data as { is_director?: boolean; allowed_provider_roles?: string[] } | null;
  return {
    isDirector: row?.is_director ?? true,
    allowedProviderRoles: row?.allowed_provider_roles ?? [],
  };
}

/** Pages that are director-only (clinic-wide reports, Weekly Input, Targets, Settings, Senior/Admin meetings, Performance Reviews) call this first — sends a restricted login back to the one section they do have. */
export async function requireDirector(): Promise<void> {
  const { isDirector } = await getAccessContext();
  if (!isDirector) redirect("/providers");
}
