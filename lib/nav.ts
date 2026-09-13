import { AccessContext, Section } from "@/lib/auth/access";

export type NavItem = {
  label: string;
  href: string;
  /** One line shown as the tile's subtitle on the /home hub page — sidebar ignores this. */
  description?: string;
  /** Opens in a new tab instead of client-side routing — for any external link
   * (none currently; both other Adjust Health tools are now fully migrated in). */
  external?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  /** Which business area this group's colour comes from (see SECTION_COLORS) — omitted for Overview and Configuration, which stay neutral. */
  colorKey?: Section;
};

/** One accent colour per grantable business area, so a director looking at
 * the full nav (or the Home hub, which shows every group at once) can tell
 * areas apart at a glance. Each is a stop along Adjust's own brand gradient
 * (lime --accent to mint --accent-secondary, the same one the marketing
 * site's "Get Better. Get Moving. Get Strong." headline uses) rather than
 * an arbitrary rainbow — every colour here is recognisably "an Adjust
 * colour". Overview and Configuration deliberately have none: Overview is
 * just "you, home", and Configuration is a system area, not a business one. */
export const SECTION_COLORS: Record<Section, string> = {
  data_entry: "#a6e22e",
  clinic_reports: "#8fdf43",
  meetings: "#78dc59",
  team: "#62d96e",
  adjust_gym: "#4bd684",
  assessment_tool: "#34d399",
};

const ADJUST_GYM_GROUP: NavGroup = {
  label: "Adjust Gym",
  colorKey: "adjust_gym",
  items: [
    { label: "Dashboard", href: "/gym/dashboard", description: "Headline counts and workload by coach" },
    { label: "My List", href: "/gym/mine", description: "Your own clients, sortable" },
    { label: "All Members", href: "/gym", description: "Every client block and due date" },
    { label: "Meeting Notes", href: "/gym/meetings", description: "Weekly agenda and notes" },
    { label: "Archive", href: "/gym/archive", description: "Completed blocks history" },
    { label: "Cancelled", href: "/gym/cancelled", description: "Members removed from the tracker" },
    { label: "Rules", href: "/gym/rules", description: "Programming standards reference" },
  ],
};

const ASSESSMENT_TOOL_GROUP: NavGroup = {
  label: "Assessment Tool",
  colorKey: "assessment_tool",
  items: [{ label: "Assessments", href: "/assessments", description: "Start a new assessment or open a saved one" }],
};

const DATA_ENTRY_GROUP: NavGroup = {
  label: "Data Entry",
  colorKey: "data_entry",
  items: [{ label: "Weekly Input", href: "/inputs", description: "Upload this week's Nookal reports" }],
};

const CLINIC_REPORTS_GROUP: NavGroup = {
  label: "Clinic Reports",
  colorKey: "clinic_reports",
  items: [
    { label: "Dashboard", href: "/dashboard", description: "Clinic-wide KPIs at a glance" },
    { label: "Revenue", href: "/clinic/revenue", description: "Trend, target and payer mix" },
    { label: "Clinic Health", href: "/clinic/health", description: "Activity, occupancy, retention" },
    { label: "Specialty Services", href: "/clinic/specialty", description: "Specialty consults and JBV growth" },
    { label: "Cancellations", href: "/clinic/cancellations", description: "Every cancellation and DNA" },
    { label: "Quarterly Review", href: "/clinic/quarterly", description: "This quarter vs. last" },
  ],
};

const TEAM_GROUP: NavGroup = {
  label: "Team",
  colorKey: "team",
  items: [{ label: "Performance Reviews", href: "/reviews", description: "Scheduled reviews and history" }],
};

const CONFIGURATION_GROUP: NavGroup = {
  label: "Configuration",
  items: [
    { label: "Targets", href: "/targets", description: "Clinic and role-level targets" },
    { label: "Settings", href: "/settings", description: "Clinic-wide setup" },
  ],
};

/** Meetings' three sub-pages are each gated by their own provider role
 * (Providers covers physio/massage/ep together, since that's always been
 * one page listing all three) rather than by the "meetings" section alone —
 * a login can have Marcio-style partial access (physio/massage/ep, not
 * senior_physio/admin) without full Meetings section access at all. */
function meetingsGroup(access: AccessContext): NavGroup | null {
  // Checked directly rather than trusting allowedProviderRoles to already be
  // pre-widened by getAccessContext() when "meetings" is granted — buildNav()
  // should give the right answer for any AccessContext it's handed, not just
  // ones that went through that one call path.
  const fullAccess = access.isDirector || access.allowedSections.includes("meetings");
  const roles = access.allowedProviderRoles;
  const items: NavItem[] = [];
  if (fullAccess || ["physio", "massage", "ep"].some((r) => roles.includes(r))) {
    items.push({ label: "Providers", href: "/providers", description: "Weekly meetings by provider" });
  }
  if (fullAccess || roles.includes("senior_physio")) {
    items.push({ label: "Senior Physio", href: "/senior", description: "Sam & Marcio — KPIs and bonus tracking" });
  }
  if (fullAccess || roles.includes("admin")) {
    items.push({ label: "Admin", href: "/admin", description: "Weekly meetings by admin staff" });
  }
  return items.length > 0 ? { label: "Meetings", colorKey: "meetings", items } : null;
}

function hasSection(access: AccessContext, section: Section): boolean {
  return access.isDirector || access.allowedSections.includes(section);
}

/** The nav this login actually sees — one source of truth for both the
 * Sidebar and the /home hub tiles. Every group beyond Overview is gated by
 * its own grantable business area (see migration 0039_section_level_access.sql)
 * instead of a single director/restricted split, so two restricted logins
 * can see entirely different sets of groups. Configuration never appears
 * for a non-director login — there's no grant that can unlock it. */
export function buildNav(access: AccessContext): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { label: "Home", href: "/home", description: "Your Adjust Hub" },
        // Unconditional — this is identity-scoped (it resolves the login's
        // own provider/coach record), not gated by a grantable section, so
        // it shows for absolutely everyone the same way Home does.
        { label: "My Dashboard", href: "/me", description: "Your own stats, goals, and coaching load" },
      ],
    },
  ];

  if (hasSection(access, "data_entry")) groups.push(DATA_ENTRY_GROUP);
  if (hasSection(access, "clinic_reports")) groups.push(CLINIC_REPORTS_GROUP);

  const meetings = meetingsGroup(access);
  if (meetings) groups.push(meetings);

  if (hasSection(access, "team")) groups.push(TEAM_GROUP);
  if (hasSection(access, "adjust_gym")) groups.push(ADJUST_GYM_GROUP);
  if (hasSection(access, "assessment_tool")) groups.push(ASSESSMENT_TOOL_GROUP);
  if (access.isDirector) groups.push(CONFIGURATION_GROUP);

  return groups;
}
