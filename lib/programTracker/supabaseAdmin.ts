import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The Program Tracker (adjust-programming.netlify.app) is a separate app on
 * its own Supabase project — not yet migrated into this one. This client
 * uses that project's service_role key so these pages can read/write its
 * live members/meetings/archive tables directly, with zero data migration
 * and zero risk to the Program Tracker staff already use daily: it keeps
 * running completely unchanged, pointed at the same rows.
 *
 * Access control is enforced in the API routes that use this client (via
 * this app's own login — see lib/auth/access.ts), NOT via the Program
 * Tracker project's RLS — service_role bypasses RLS by design. Never import
 * this into a Client Component; the key must stay server-only.
 */
export function createProgramTrackerAdminClient() {
  return createSupabaseClient(
    process.env.PROGRAM_TRACKER_SUPABASE_URL!,
    process.env.PROGRAM_TRACKER_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
