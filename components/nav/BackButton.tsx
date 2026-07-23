"use client";

import { useRouter } from "next/navigation";

/** Returns to whatever page the user actually came from (browser history), instead of always jumping to a fixed page. */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      title="Back"
      className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-border text-muted hover:border-accent hover:text-accent"
    >
      <span aria-hidden>←</span>
      <span className="sr-only">Back</span>
    </button>
  );
}
