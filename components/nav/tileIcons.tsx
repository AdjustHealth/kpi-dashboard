import { ReactNode } from "react";

/**
 * One icon per nav destination, keyed by href, for the /home hub tiles.
 * Deliberately a lookup with a generic fallback (not a required field on every
 * NavItem) — a newly added tool just works with a sensible default icon
 * instead of needing an SVG drawn for it on day one.
 */
const ICONS: Record<string, ReactNode> = {
  "/home": (
    <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  ),
  "/dashboard": <path d="M4 19V9m6 10V4m6 15v-7" />,
  "/inputs": <path d="M12 4v12m0 0-4-4m4 4 4-4M4 19h16" />,
  "/clinic/revenue": <path d="M3 17 9 11l4 4 8-8M21 7h-6v6" />,
  "/clinic/health": <path d="M20.8 8.6c0 4.4-8.8 10.4-8.8 10.4S3.2 13 3.2 8.6a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z" />,
  "/clinic/specialty": <path d="m12 2 2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4L12 2Z" />,
  "/clinic/cancellations": <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
  "/clinic/quarterly": <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4m8-4v4" /></>,
  "/providers": <path d="M17 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 5 18.5V20m14 0v-1.5a3.4 3.4 0 0 0-2.5-3.3M15 3.4a3.5 3.5 0 0 1 0 6.7M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />,
  "/gym": <><path d="M9 11.5 11 13.5 15.5 9" /><rect x="3" y="4" width="18" height="17" rx="2" /></>,
  "/gym/mine": <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3 3-5 7-5s7 2 7 5" /></>,
  "/gym/rules": <><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v3h3M9 11h6M9 15h6" /></>,
  "/senior": <><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="9" /></>,
  "/admin": <><rect x="6" y="3" width="12" height="18" rx="1.5" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  "/reviews": <><path d="M12 3v4m0 10v4M3 12h4m10 0h4" /><circle cx="12" cy="12" r="4" /></>,
  "/targets": <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.5" /></>,
  "/settings": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
};

const EXTERNAL_TOOL_ICON = (
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 4v5" />
  </>
);

const FALLBACK_ICON = <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>;

export function TileIcon({ href, external }: { href: string; external?: boolean }) {
  const path = ICONS[href] ?? (external ? EXTERNAL_TOOL_ICON : FALLBACK_ICON);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {path}
    </svg>
  );
}
