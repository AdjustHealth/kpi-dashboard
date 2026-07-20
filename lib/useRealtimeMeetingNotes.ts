"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProviderMeetingNotes } from "@/lib/providerSchema";

/**
 * Live-syncs this provider+week's meeting_notes across everyone viewing it,
 * via Supabase Realtime (see migration 0011). Fields the local user has
 * focused (tracked via the returned `markActive`/`markInactive`, wired to
 * onFocus/onBlur) are left out of incoming updates so a remote save can't
 * clobber a field mid-keystroke — it's picked up as soon as focus leaves it.
 */
export function useRealtimeMeetingNotes(
  providerId: string,
  week: string,
  onRemoteChange: (notes: ProviderMeetingNotes) => void
) {
  const activeKeys = useRef<Set<string>>(new Set());
  const onRemoteChangeRef = useRef(onRemoteChange);
  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`provider_weekly_meeting_notes:${providerId}:${week}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "provider_weekly",
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const row = payload.new as { week_ending?: string; meeting_notes?: ProviderMeetingNotes } | null;
          if (!row?.meeting_notes || row.week_ending !== week) return;
          const remote: Record<string, unknown> = { ...row.meeting_notes };
          for (const key of activeKeys.current) delete remote[key];
          onRemoteChangeRef.current(remote);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, week]);

  const markActive = useCallback((key: string) => {
    activeKeys.current.add(key);
  }, []);
  const markInactive = useCallback((key: string) => {
    activeKeys.current.delete(key);
  }, []);

  return { markActive, markInactive };
}
