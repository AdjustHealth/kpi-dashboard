import { PROGRAM_TRACKER_COACHES } from "@/lib/programTracker/types";

/**
 * There's no stored mapping from a kpi-dashboard login to a Program Tracker
 * coach name yet — this guesses from the email's local part (e.g.
 * "dean@adjust.com.au" -> "Dean"), same heuristic as the Home hub's
 * greeting. Good enough for "My List"; if it ever guesses wrong for
 * someone, that's a one-line fix here, not a schema change.
 */
export function coachNameForUser(email: string | null | undefined): string | null {
  if (!email) return null;
  const local = email.split("@")[0].split(/[._-]/)[0].toLowerCase();
  return PROGRAM_TRACKER_COACHES.find((c) => c.toLowerCase() === local) ?? null;
}
