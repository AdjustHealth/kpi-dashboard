export type NavItem = {
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** A restricted (non-director) login only sees the Providers meeting pages it's scoped to — see lib/auth/access.ts. */
export const RESTRICTED_NAV: NavGroup[] = [
  {
    label: "Meetings",
    items: [{ label: "Providers", href: "/providers" }],
  },
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
];
