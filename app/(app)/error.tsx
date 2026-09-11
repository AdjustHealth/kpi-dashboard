"use client";

import { useEffect } from "react";

/**
 * Catches any render-time crash within the hub (any (app) page) and shows a
 * legible message with a retry — without this, an uncaught exception (as
 * opposed to a caught Postgrest `error` result, which pages already render
 * inline) fell through to Next.js's bare default error page, which looks
 * like a blank page.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-medium text-foreground">Something went wrong loading this page.</p>
      <p className="max-w-md text-sm text-muted">{error.message || "An unexpected error occurred."}</p>
      <button onClick={reset} className="mt-2 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent">
        Try again
      </button>
    </div>
  );
}
