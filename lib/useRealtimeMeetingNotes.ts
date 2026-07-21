"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProviderMeetingNotes } from "@/lib/providerSchema";

/**
 * Live-syncs this provider+week's meeting_notes across everyone viewing it,
 * via Supabase Realtime (see migration 0011). Fields the local user has
 * focused (tracked via the returned `markActive`/`markInactive`, wired to
 * onFocus/onBlur) are left out of incoming updates so a remote save can't
 * clobber a field mid-keystroke — it's picked up as soon as focus leaves it.
 *
 * MeetingNotesCard and ActionStepsCard both call this for the same
 * provider+week at once — supabase-js reuses a channel by its exact topic
 * string, so a shared name here means the second caller's `.on()` throws
 * ("cannot add postgres_changes callbacks... after subscribe()") the moment
 * the first caller has already subscribed. useId() keeps each hook instance
 * on its own channel while both still filter on the same row.
 */
export function useRealtimeMeetingNotes(
  providerId: string,
  week: string,
  onRemoteChange: (notes: ProviderMeetingNotes) => void
) {
  const instanceId = useId();
  const activeKeys = useRef<Set<string>>(new Set());
  const onRemoteChangeRef = useRef(onRemoteChange);
  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`provider_weekly_meeting_notes:${providerId}:${week}:${instanceId}`)
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
  }, [providerId, week, instanceId]);

  const markActive = useCallback((key: string) => {
    activeKeys.current.add(key);
  }, []);
  const markInactive = useCallback((key: string) => {
    activeKeys.current.delete(key);
  }, []);

  return { markActive, markInactive };
}
