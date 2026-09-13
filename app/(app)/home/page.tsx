import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/auth/access";
import { NAV, RESTRICTED_NAV } from "@/lib/nav";
import { TileIcon } from "@/components/nav/tileIcons";
import { firstNameFromEmail } from "@/lib/userDisplay";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { isDirector } = await getAccessContext();
  const name = firstNameFromEmail(user?.email);

  // Same data the sidebar renders from, minus the Home link itself (you're on it) —
  // one source of truth, so a tool added to lib/nav.ts shows up here automatically.
  const groups = (isDirector ? NAV : RESTRICTED_NAV)
    .map((group) => ({ ...group, items: group.items.filter((item) => item.href !== "/home") }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-10 p-8 pb-16">
      <div>
        <p className="text-sm font-medium text-accent-secondary">{greeting()}{name ? `, ${name}` : ""}</p>
        <h1 className="font-display mt-1 text-4xl font-bold uppercase tracking-wide">
          <span className="brand-gradient-text">Adjust Hub</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Everything you use day to day, in one place. Pick up where you left off, or jump into any tool below.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <div key={group.label}>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => {
                const content = (
                  <>
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <TileIcon href={item.href} external={item.external} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        {item.label}
                        {item.external && <span className="text-xs text-muted">↗</span>}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 truncate text-xs text-muted">{item.description}</p>
                      )}
                    </div>
                  </>
                );
                const className =
                  "group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-raised";
                return item.external ? (
                  <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {content}
                  </a>
                ) : (
                  <Link key={item.href} href={item.href} className={className}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
