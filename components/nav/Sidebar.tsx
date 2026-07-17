"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-secondary text-sm font-semibold text-accent-foreground">
          A
        </div>
        <span className="text-sm font-semibold text-foreground">
          Adjust Health OS
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col">
          {NAV.map((group, i) => (
            <li key={group.label} className={i > 0 ? "mt-5 border-t border-border pt-5" : ""}>
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-accent-secondary/80">
                {group.label}
              </div>
              {group.items && (
                <ul className="flex flex-col gap-1">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
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
          ))}
        </ul>
      </nav>
    </aside>
  );
}
