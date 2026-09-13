import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Bypasses this app's own RLS — needed for the one case where a login
 * legitimately needs to read data an ordinary session client can't see
 * under their current grants: their own provider row and weekly metrics,
 * for the self-service "My Dashboard" page (see lib/providerIdentity.ts,
 * lib/providerData.ts's getMyProviderData). A practitioner might have only
 * Adjust Gym/Assessment Tool access with no Meetings grant at all, so
 * can_access_provider_role() would otherwise block them from their own
 * stats. Access here is instead enforced entirely by scoping every query
 * this client is used for to "rows matching this specific logged-in user's
 * own identity" — never a general-purpose read. Never import into a Client
 * Component; the key must stay server-only.
 */
export function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
