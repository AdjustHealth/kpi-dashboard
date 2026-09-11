"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV, RESTRICTED_NAV, NavGroup } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function groupIsActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => !item.external && isActive(pathname, item.href));
}

/**
 * Groups collapse to just their heading by default — with Adjust Gym's own
 * sub-pages plus everything else, showing every leaf link at once made the
 * sidebar too long to scan. `expanded` only tracks groups a click has opened;
 * whichever group contains the current page is unioned in at render time
 * (not stored), so it's always visibly open without needing an effect to
 * sync it, and stays open once you've clicked it open even after you
 * navigate elsewhere.
 */
export function Sidebar({ restricted = false }: { restricted?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const week = searchParams.get("week");
  const withWeek = (href: string) => (week ? `${href}?week=${week}` : href);
  const nav = restricted ? RESTRICTED_NAV : NAV;

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggleGroup(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-secondary text-sm font-semibold text-accent-foreground">
          A
        </div>
        <span className="text-sm font-semibold text-foreground">Adjust Health OS</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-0.5">
          {nav.map((group) => {
            const isCurrentGroup = groupIsActive(pathname, group);
            const isOpen = isCurrentGroup || expanded.has(group.label);
            return (
              <li key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
                    isCurrentGroup ? "text-accent" : "text-accent-secondary/80 hover:text-accent-secondary"
                  }`}
                >
                  {group.label}
                  <span className={`text-[9px] transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>
                    ▶
                  </span>
                </button>
                {isOpen && (
                  <ul className="mb-1.5 flex flex-col gap-1 pb-1">
                    {group.items.map((item) => {
                      if (item.external) {
                        return (
                          <li key={item.href}>
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-2 rounded-lg border border-transparent bg-surface-raised/60 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-surface-raised"
                            >
                              {item.label}
                              <span className="text-xs text-foreground/50">↗</span>
                            </a>
                          </li>
                        );
                      }
                      const active = isActive(pathname, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={withWeek(item.href)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                              active
                                ? "border-accent/40 bg-accent/15 font-semibold text-accent shadow-sm"
                                : "border-transparent bg-surface-raised/60 font-medium text-foreground hover:border-border hover:bg-surface-raised"
                            }`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
