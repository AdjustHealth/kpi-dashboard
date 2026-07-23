export type NavItem = {
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

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
    label: "Configuration",
    items: [
      { label: "Targets", href: "/targets" },
      { label: "Settings", href: "/settings" },
    ],
  },
];
