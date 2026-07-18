"use client";

import { useSearchParams } from "next/navigation";
import { defaultWeekEnding } from "@/lib/week";

/** Reads the active `?week=` param, falling back to the most recent Saturday (the practice's week-ending day). */
export function useWeek(): string {
  const searchParams = useSearchParams();
  return searchParams.get("week") ?? defaultWeekEnding();
}
