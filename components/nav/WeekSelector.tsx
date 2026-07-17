"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { defaultWeekEnding, shiftWeek } from "@/lib/week";

export function WeekSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const week = searchParams.get("week") ?? defaultWeekEnding();

  function setWeek(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-1.5 py-1">
      <button
        type="button"
        aria-label="Previous week"
        onClick={() => setWeek(shiftWeek(week, -1))}
        className="rounded-md px-2 py-1 text-muted hover:bg-surface hover:text-foreground"
      >
        ‹
      </button>
      <input
        type="date"
        value={week}
        onChange={(e) => e.target.value && setWeek(e.target.value)}
        className="bg-transparent px-1 py-1 text-sm text-foreground outline-none [color-scheme:dark]"
      />
      <button
        type="button"
        aria-label="Next week"
        onClick={() => setWeek(shiftWeek(week, 1))}
        className="rounded-md px-2 py-1 text-muted hover:bg-surface hover:text-foreground"
      >
        ›
      </button>
    </div>
  );
}
