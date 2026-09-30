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

  // Kept current via a ref rather than in the cleanup effect's own
  // dependency array — `save` (and so `flush`) is typically a fresh inline
  // closure every render in the calling component, and depending on it
  // directly would re-run this effect (tearing down and re-running the
  // cleanup) on every render instead of only at actual unmount.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      // A field edited right before navigating away (e.g. clicking to
      // another provider mid-meeting) would otherwise sit unsaved for the
      // rest of the debounce window and then just get abandoned — save it
      // immediately instead of waiting it out.
      if (Object.keys(pending.current).length > 0) flushRef.current();
    },
    []
  );

  return { status, set, flush };
}
