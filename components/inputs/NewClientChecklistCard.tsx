"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatValue } from "@/lib/format";

interface ClientTask {
  id: string;
  provider_id: string;
  provider_name: string;
  client_name: string;
  online_booking: boolean | null;
  onboarding_video_sent: boolean | null;
  followup_call_made: boolean | null;
  obv_sent: boolean | null;
}

type TaskKey = "online_booking" | "onboarding_video_sent" | "followup_call_made" | "obv_sent";

const TASK_COLUMNS: { key: TaskKey; label: string }[] = [
  { key: "online_booking", label: "Online Booking" },
  { key: "onboarding_video_sent", label: "Onboarding Video Sent" },
  { key: "followup_call_made", label: "Follow Up Call" },
  { key: "obv_sent", label: "OBV Sent" },
];

/**
 * Replaces Dayle's manual new-client spreadsheet — one row per new client
 * this week (auto-populated from each clinician's new patient list, already
 * excluding Pre-Employment), tick Online Booking / Onboarding Video Sent /
 * Follow Up Call / OBV Sent per client instead of hand-counting and typing
 * a %. The % is calculated automatically and written straight into
 * weekly_kpis (Online Bookings, Follow-up Calls, Onboarding Videos Sent,
 * OBV Sent), so those fields on this page are now read-only "Auto" — see
 * app/api/admin-client-tasks/route.ts.
 */
export function NewClientChecklistCard({ week }: { week: string }) {
  const [tasks, setTasks] = useState<ClientTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setTasks(null);
    setError(null);
    fetch(`/api/admin-client-tasks?week=${week}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Failed to load");
          return;
        }
        setTasks(json.data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [week]);

  async function toggle(task: ClientTask, key: TaskKey) {
    const nextValue = task[key] === true ? false : true;
    setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, [key]: nextValue } : t)) ?? prev);
    setSavingIds((prev) => new Set(prev).add(task.id));
    try {
      const res = await fetch("/api/admin-client-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, patch: { [key]: nextValue } }),
      });
      if (!res.ok) {
        // Revert the optimistic flip so the checkbox doesn't lie about what's saved.
        setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, [key]: task[key] } : t)) ?? prev);
      }
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  const total = tasks?.length ?? 0;
  const pct = (key: TaskKey) => (total > 0 ? (tasks!.filter((t) => t[key] === true).length / total) : null);

  return (
    <Card title="New Client Checklist">
      <p className="mb-4 text-xs text-muted">
        Auto-populated from this week&apos;s new clients (Pre-Employment already excluded). Tick each box as it&apos;s
        done — Online Bookings %, Onboarding Videos Sent %, Follow-up Calls %, and OBV Sent % below are calculated
        from this and feed straight into the admin meeting sheets.
      </p>

      {error ? (
        <p className="text-sm text-red-500">
          Couldn&apos;t load the checklist ({error}). If this is new, the admin_new_client_tasks migration may not
          have been run yet.
        </p>
      ) : tasks === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted">No new clients recorded for this week yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-medium">Client</th>
                  <th className="py-2 px-3 font-medium">Provider</th>
                  {TASK_COLUMNS.map((col) => (
                    <th key={col.key} className="py-2 px-3 text-center font-medium">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks
                  .slice()
                  .sort((a, b) => a.provider_name.localeCompare(b.provider_name) || a.client_name.localeCompare(b.client_name))
                  .map((task) => (
                    <tr key={task.id} className={`border-b border-border/60 last:border-0 ${savingIds.has(task.id) ? "opacity-60" : ""}`}>
                      <td className="py-2 pr-3 text-foreground whitespace-nowrap">{task.client_name}</td>
                      <td className="py-2 px-3 text-muted whitespace-nowrap">{task.provider_name}</td>
                      {TASK_COLUMNS.map((col) => (
                        <td key={col.key} className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={task[col.key] === true}
                            onChange={() => toggle(task, col.key)}
                            className="h-4 w-4 accent-accent"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
            {TASK_COLUMNS.map((col) => (
              <div key={col.key} className="rounded-lg border border-border bg-surface-raised px-3 py-2">
                <div className="text-xs text-muted">{col.label}</div>
                <div className="text-sm font-medium text-foreground">{formatValue(pct(col.key), "percent")}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
