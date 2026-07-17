"use client";

import { useSearchParams } from "next/navigation";
import { defaultWeekEnding } from "@/lib/week";

/** Reads the active `?week=` param, falling back to the most recent Sunday. */
export function useWeek(): string {
  const searchParams = useSearchParams();
  return searchParams.get("week") ?? defaultWeekEnding();
}
