export type NavItem = {
  label: string;
  href: string;
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
    { label: "Program Tracker", href: "https://adjust-programming.netlify.app/", external: true },
    { label: "Assessment Tool", href: "https://adjust-health-performance-report.vercel.app/", external: true },
  ],
};

/** A restricted (non-director) login only sees the Providers meeting pages it's scoped to — see lib/auth/access.ts. */
export const RESTRICTED_NAV: NavGroup[] = [
  {
    label: "Meetings",
    items: [{ label: "Providers", href: "/providers" }],
  },
  TOOLS_NAV_GROUP,
];

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    label: "Data Entry",
    items: [{ label: "Weekly Input", href: "/inputs" }],
  },
  {
    label: "Clinic Reports",
    items: [
      { label: "Revenue", href: "/clinic/revenue" },
      { label: "Clinic Health", href: "/clinic/health" },
      { label: "Specialty Services", href: "/clinic/specialty" },
      { label: "Cancellations", href: "/clinic/cancellations" },
      { label: "Quarterly Review", href: "/clinic/quarterly" },
    ],
  },
  {
    label: "Meetings",
    items: [
      { label: "Providers", href: "/providers" },
      { label: "Senior Physio", href: "/senior" },
      { label: "Admin", href: "/admin" },
    ],
  },
  {
    label: "Team",
    items: [{ label: "Performance Reviews", href: "/reviews" }],
  },
  {
    label: "Configuration",
    items: [
      { label: "Targets", href: "/targets" },
      { label: "Settings", href: "/settings" },
    ],
  },
  TOOLS_NAV_GROUP,
];
