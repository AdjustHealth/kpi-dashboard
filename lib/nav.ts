export type NavItem = {
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  href?: string;
  items?: NavItem[];
};

export const NAV: NavGroup[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Weekly Input", href: "/inputs" },
  {
    label: "Clinic",
    items: [
      { label: "Revenue", href: "/clinic/revenue" },
      { label: "Clinic Health", href: "/clinic/health" },
      { label: "Specialty Services", href: "/clinic/specialty" },
    ],
  },
  { label: "Providers", href: "/providers" },
  { label: "Admin", href: "/admin" },
  { label: "Senior Physio", href: "/senior" },
  { label: "Targets", href: "/targets" },
  { label: "Settings", href: "/settings" },
];
