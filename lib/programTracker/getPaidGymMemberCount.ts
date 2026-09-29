import { createProgramTrackerAdminClient } from "./supabaseAdmin";
import { Member, PROGRAM_TRACKER_PAID_TYPES, normType } from "./types";

/**
 * Live count of paid gym members, read straight from the Program Tracker
 * (same admin client the Adjust Gym pages use) rather than any stored
 * weekly_kpis figure, so it's always current. Same "Total paid" definition
 * as the Adjust Gym Dashboard's own tile — active members whose type
 * actually bills (excludes Online/Sponsored). Shared by the Revenue page's
 * "Paid Gym Members" tile and the Senior Physio page's auto-synced
 * Memberships specialty metric, so both read the exact same number.
 * Returns null if the Program Tracker can't be reached.
 */
export async function getPaidGymMemberCount(): Promise<number | null> {
  try {
    const trackerSupabase = createProgramTrackerAdminClient();
    const { data, error } = await trackerSupabase.from("members").select("status, type");
    if (error) return null;
    const members = (data ?? []) as Pick<Member, "status" | "type">[];
    return members.filter((m) => m.status === "Active" && PROGRAM_TRACKER_PAID_TYPES.includes(normType(m.type))).length;
  } catch {
    return null;
  }
}
