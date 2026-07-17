"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus } from "@/components/ui/SaveIndicator";

/**
 * Collects field changes into a single pending patch and flushes them as one
 * request after `delay` ms of inactivity, so typing across many fields in a
 * form (Weekly Input, provider pages) doesn't fire a request per keystroke.
 */
export function useBatchedAutosave(
  save: (patch: Record<string, unknown>) => Promise<void>,
  delay = 800
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const pending = useRef<Record<string, unknown>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const patch = pending.current;
    if (Object.keys(patch).length === 0) return;
    pending.current = {};
    setStatus("saving");
    try {
      await save(patch);
      setStatus("saved");
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => setStatus("idle"), 2000);
    } catch {
      pending.current = { ...patch, ...pending.current };
      setStatus("error");
    }
  }, [save]);

  const set = useCallback(
    (key: string, value: unknown) => {
      pending.current[key] = value;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, delay);
    },
    [flush, delay]
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    },
    []
  );

  return { status, set, flush };
}
