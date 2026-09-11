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
      // Deliberately NOT labelled "Program Tracker" — that name now belongs to
      // the migrated Adjust Gym pages below, and two same-named sidebar links
      // (one internal, one an external new-tab link) is exactly the kind of
      // mix-up that sent someone to the wrong one. Name this by what's
      // actually still only here now that Dashboard and Meeting Notes have
      // moved into Adjust Gym: just Archive/Cancelled history.
      label: "Program Tracker (Archive)",
      href: "https://adjust-programming.netlify.app/",
      description: "Archive and Cancelled history — not yet in the hub",
      external: true,
    },
    {
      label: "Assessment Tool",
      href: "https://adjust-health-performance-report.vercel.app/",
      description: "Performance, Youth and MoveStrong assessments",
      external: true,
    },
  ],
};

/** The Program Tracker migrated into this app, under its member-facing name
 * "Adjust Gym" — reads/writes the same live Program Tracker Supabase project
 * (see lib/programTracker), no data migration. Meeting Notes is next — see
 * TOOLS_NAV_GROUP's Program Tracker (Meeting Notes) link for that until it
 * lands here too. */
const ADJUST_GYM_GROUP: NavGroup = {
  label: "Adjust Gym",
  items: [
    { label: "Dashboard", href: "/gym/dashboard", description: "Headline counts and workload by coach" },
    { label: "My List", href: "/gym/mine", description: "Your own clients, sortable" },
    { label: "All Members", href: "/gym", description: "Every client block and due date" },
    { label: "Meeting Notes", href: "/gym/meetings", description: "Weekly agenda and notes" },
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
  TOOLS_NAV_GROUP,
];
