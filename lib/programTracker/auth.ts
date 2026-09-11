import "server-only";

/**
 * The Program Tracker's own Supabase project has no per-role restriction
 * (every logged-in Program Tracker user has always had full member access),
 * so the bar here is just "logged into kpi-dashboard" — same shared check
 * used by every other bridged tool's routes. See lib/requireLogin.ts.
 */
export { requireLogin } from "@/lib/requireLogin";
