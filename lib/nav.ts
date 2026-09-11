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
      label: "Program Tracker",
      href: "https://adjust-programming.netlify.app/",
      description: "Client blocks, due dates and meeting notes",
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
  TOOLS_NAV_GROUP,
];
