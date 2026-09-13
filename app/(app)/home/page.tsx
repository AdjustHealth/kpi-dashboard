import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessContext } from "@/lib/auth/access";
import { buildNav, SECTION_COLORS } from "@/lib/nav";
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
  const access = await getAccessContext();
  const name = firstNameFromEmail(user?.email);

  // Same data the sidebar renders from, minus the Home link itself (you're on it) —
  // one source of truth, so a tool added to lib/nav.ts shows up here automatically,
  // and a login only ever sees the exact areas it's been granted.
  const groups = buildNav(access)
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
        {groups.map((group) => {
          const color = group.colorKey ? SECTION_COLORS[group.colorKey] : undefined;
          return (
            <div key={group.label}>
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                {color && <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ backgroundColor: color }} aria-hidden />}
                {group.label}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => {
                  const content = (
                    <>
                      <div
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-lg"
                        style={{ color: color ?? "var(--accent)", backgroundColor: `${color ?? "#a6e22e"}26` }}
                      >
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
                  const className = "hub-tile group flex items-center gap-4 rounded-xl border bg-surface p-4 transition-colors hover:bg-surface-raised";
                  const style = { "--tile-accent": color ? `${color}80` : undefined } as React.CSSProperties;
                  return item.external ? (
                    <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
                      {content}
                    </a>
                  ) : (
                    <Link key={item.href} href={item.href} className={className} style={style}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
