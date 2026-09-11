import "server-only";
import postgres from "postgres";

// The Assessment Tool (adjust-health-performance-report.vercel.app) is a
// separate app on its own Neon Postgres database — not yet migrated into
// this one. Reading its tables directly (same connection string pattern its
// own lib/db.ts uses) is the same zero-migration bridge already used for
// Adjust Gym: no data copy, no risk to the standalone site, which keeps
// running unchanged. Access control is enforced by the pages/routes that use
// this client (this app's own login), not by the Assessment Tool's database
// — it has no row-level security of its own either (single shared login,
// see its db/migrations/0001_init.sql).
let _sql: ReturnType<typeof postgres> | null = null;

export function assessmentToolSql() {
  if (!_sql) {
    const connectionString = process.env.ASSESSMENT_TOOL_DATABASE_URL;
    if (!connectionString) throw new Error("ASSESSMENT_TOOL_DATABASE_URL is not set.");
    _sql = postgres(connectionString, { ssl: "prefer" });
  }
  return _sql;
}
