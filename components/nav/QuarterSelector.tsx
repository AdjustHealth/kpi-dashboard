"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { quarterLabel } from "@/lib/quarter";

export function QuarterSelector({ quarters, current }: { quarters: string[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setQuarter(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("quarter", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  const idx = quarters.indexOf(current);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < quarters.length - 1;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-1.5 py-1">
      <button
        type="button"
        aria-label="Previous quarter"
        disabled={!hasPrev}
        onClick={() => hasPrev && setQuarter(quarters[idx - 1])}
        className="rounded-md px-2 py-1 text-muted hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
      >
        ‹
      </button>
      <select
        value={current}
        onChange={(e) => setQuarter(e.target.value)}
        className="bg-transparent px-1 py-1 text-sm text-foreground outline-none [color-scheme:dark]"
      >
        {quarters.map((q) => (
          <option key={q} value={q}>
            {quarterLabel(q)}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Next quarter"
        disabled={!hasNext}
        onClick={() => hasNext && setQuarter(quarters[idx + 1])}
        className="rounded-md px-2 py-1 text-muted hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
      >
        ›
      </button>
    </div>
  );
}
