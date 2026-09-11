export type NavItem = {
  label: string;
  href: string;
  /** One line shown as the tile's subtitle on the /home hub page — sidebar ignores this. */
  description?: string;
  /** Opens in a new tab instead of client-side routing — for the other Adjust Health
   * tools (Program Tracker, Assessment Tool) until they're migrated into this app. */
  external?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** The other Adjust Health tools, still their own separate logins/deployments for
 * now — see everyone regardless of director/restricted access here, since each
 * tool enforces its own access on its own login page. */
const TOOLS_NAV_GROUP: NavGroup = {
  label: "Tools",
  items: [
    {
      // Same reasoning as the Program Tracker entry above — the list view now
      // lives at ASSESSMENT_TOOL_GROUP below, so this is only still needed for
      // actually running a new assessment or editing one already saved.
      label: "Assessment Tool (New/Edit)",
      href: "https://adjust-health-performance-report.vercel.app/",
      description: "Run a new assessment or edit an existing one",
      external: true,
    },
  ],
};

/** Read-only first slice of the Assessment Tool inside the hub — reads the
 * same live Neon database its own app uses (see lib/assessmentTool/db.ts),
 * no data migration. Viewing/editing a specific assessment still opens the
 * standalone site (see TOOLS_NAV_GROUP's Assessment Tool (New/Edit) link);
 * that multi-step form isn't ported here yet. */
const ASSESSMENT_TOOL_GROUP: NavGroup = {
  label: "Assessment Tool",
  items: [{ label: "Assessments", href: "/assessments", description: "Every saved assessment, filterable by type" }],
};

/** The Program Tracker migrated into this app, under its member-facing name
 * "Adjust Gym" — reads/writes the same live Program Tracker Supabase project
 * (see lib/programTracker), no data migration. Every screen the standalone
 * site (adjust-programming.netlify.app) has is now here except CSV export,
 * which is why that site no longer has a Tools nav link at all. */
const ADJUST_GYM_GROUP: NavGroup = {
  label: "Adjust Gym",
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

/** A restricted (non-director) login only sees the Providers meeting pages it's scoped to — see lib/auth/access.ts. */
export const RESTRICTED_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Home", href: "/home", description: "Your Adjust Hub" }],
  },
  {
    label: "Meetings",
    items: [{ label: "Providers", href: "/providers", description: "Your weekly provider meetings" }],
  },
  ADJUST_GYM_GROUP,
  ASSESSMENT_TOOL_GROUP,
  TOOLS_NAV_GROUP,
];

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Home", href: "/home", description: "Your Adjust Hub" },
      { label: "Dashboard", href: "/dashboard", description: "Clinic-wide KPIs at a glance" },
    ],
  },
  {
    label: "Data Entry",
    items: [{ label: "Weekly Input", href: "/inputs", description: "Upload this week's Nookal reports" }],
  },
  {
    label: "Clinic Reports",
    items: [
      { label: "Revenue", href: "/clinic/revenue", description: "Trend, target and payer mix" },
      { label: "Clinic Health", href: "/clinic/health", description: "Activity, occupancy, retention" },
      { label: "Specialty Services", href: "/clinic/specialty", description: "Specialty consults and JBV growth" },
      { label: "Cancellations", href: "/clinic/cancellations", description: "Every cancellation and DNA" },
      { label: "Quarterly Review", href: "/clinic/quarterly", description: "This quarter vs. last" },
    ],
  },
  {
    label: "Meetings",
    items: [
      { label: "Providers", href: "/providers", description: "Weekly meetings by provider" },
      { label: "Senior Physio", href: "/senior", description: "Sam & Marcio — KPIs and bonus tracking" },
      { label: "Admin", href: "/admin", description: "Weekly meetings by admin staff" },
    ],
  },
  {
    label: "Team",
    items: [{ label: "Performance Reviews", href: "/reviews", description: "Scheduled reviews and history" }],
  },
  {
    label: "Configuration",
    items: [
      { label: "Targets", href: "/targets", description: "Clinic and role-level targets" },
      { label: "Settings", href: "/settings", description: "Clinic-wide setup" },
    ],
  },
  ADJUST_GYM_GROUP,
  ASSESSMENT_TOOL_GROUP,
  TOOLS_NAV_GROUP,
];
