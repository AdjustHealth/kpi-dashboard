"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { Badge } from "@/components/ui/Badge";
import { Textarea, Input } from "@/components/ui/Field";
import { useBatchedAutosave } from "@/lib/useBatchedAutosave";
import { useRealtimeMeetingNotes } from "@/lib/useRealtimeMeetingNotes";
import { ProviderMeetingNotes, ACTION_PLAN_CATEGORIES } from "@/lib/providerSchema";
import { ActionItem, normalizeActionItems, newActionItem, formatActionItemsForCopy } from "@/lib/actionItems";

/**
 * One action item row: editable text, a Complete button (done — moves to
 * the collapsed history below) and a Carry Over button (also moves to
 * history here, and appends a fresh open copy onto NEXT week's list — see
 * app/api/action-steps).
 */
function ActionItemRow({
  item,
  large,
  onChangeText,
  onComplete,
  onCarryOver,
}: {
  item: ActionItem;
  large?: boolean;
  onChangeText: (text: string) => void;
  onComplete: () => void;
  onCarryOver: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={item.text}
        onChange={(e) => onChangeText(e.target.value)}
        className={large ? "py-3 text-base" : undefined}
      />
      <button
        type="button"
        title="Mark completed"
        onClick={onComplete}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted hover:border-green-500 hover:text-green-500"
      >
        ✓
      </button>
      <button
        type="button"
        title="Carry over to next week"
        onClick={onCarryOver}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border text-muted hover:border-accent hover:text-accent"
      >
        →
      </button>
    </div>
  );
}

function AddItemInput({ large, onAdd }: { large?: boolean; onAdd: (text: string) => void }) {
  const [value, setValue] = useState("");
  function submit() {
    const text = value.trim();
    if (!text) return;
    onAdd(text);
    setValue("");
  }
  return (
    <Input
      value={value}
      placeholder="+ Add action step / agreement"
      className={large ? "py-3 text-base" : undefined}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      }}
      onBlur={submit}
    />
  );
}

function ResolvedHistory({ items }: { items: ActionItem[] }) {
  if (items.length === 0) return null;
  return (
    <details className="mt-3">
      <summary className="cursor-pointer select-none text-xs font-medium text-muted">
        Completed &amp; carried over ({items.length})
      </summary>
      <div className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <span className={item.status === "completed" ? "text-muted line-through" : "text-muted"}>
              {item.text}
            </span>
            <Badge tone={item.status === "completed" ? "good" : "neutral"}>
              {item.status === "completed" ? "Completed" : "Carried over"}
            </Badge>
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * Action Steps & Agreements + Performance Review Goals — kept separate
 * from MeetingNotesCard so the Senior Physio page can render this as its
 * own big note section at the bottom of the meeting (per the director's
 * sheet), while standard/admin pages keep just Action Steps up with the
 * rest of the meeting notes — Performance Review Goals is senior-only.
 *
 * Senior physios use `categorized` mode: one checklist per Action Plan
 * category (Turnover / Gym / Junior Team / Marketing / Culture), matching
 * the real Senior Physio Worksheet's Action Plan tab, instead of one flat
 * list.
 *
 * Both modes use the same Complete/Carry Over checklist model (lib/
 * actionItems.ts): items grow instead of a fixed 3 slots, Complete marks
 * an item done (kept as collapsed history), Carry Over does the same and
 * also drops a fresh copy onto next week's list automatically.
 */
export function ActionStepsCard({
  providerId,
  week,
  initialNotes,
  size = "standard",
  showGoals = true,
  categorized = false,
}: {
  providerId: string;
  week: string;
  initialNotes: ProviderMeetingNotes;
  size?: "standard" | "large";
  showGoals?: boolean;
  categorized?: boolean;
}) {
  const [items, setItems] = useState<ActionItem[]>(() => normalizeActionItems(initialNotes.action_steps));
  const [plan, setPlan] = useState<Record<string, ActionItem[]>>(() => {
    const result: Record<string, ActionItem[]> = {};
    for (const category of ACTION_PLAN_CATEGORIES) {
      result[category.key] = normalizeActionItems(initialNotes.action_plan?.[category.key]);
    }
    return result;
  });
  const [goals, setGoals] = useState(initialNotes.performance_review_goals ?? "");
  const [copied, setCopied] = useState(false);

  const { status, set } = useBatchedAutosave(async (patch) => {
    const res = await fetch("/api/provider-weekly", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId, week_ending: week, section: "meeting_notes", patch }),
    });
    if (!res.ok) throw new Error("save failed");
  });

  const { markActive, markInactive } = useRealtimeMeetingNotes(providerId, week, (remote) => {
    if (remote.action_steps !== undefined) setItems(normalizeActionItems(remote.action_steps));
    if (remote.action_plan !== undefined) {
      const remotePlan = remote.action_plan as Record<string, unknown>;
      setPlan((prev) => {
        const next = { ...prev };
        for (const category of ACTION_PLAN_CATEGORIES) {
          if (remotePlan[category.key] !== undefined) next[category.key] = normalizeActionItems(remotePlan[category.key]);
        }
        return next;
      });
    }
    if (typeof remote.performance_review_goals === "string") setGoals(remote.performance_review_goals);
  });
  function fieldFocusHandlers(key: string) {
    return {
      onFocus: () => markActive(key),
      onBlur: () => markInactive(key),
    };
  }

  async function carryOver(text: string, category?: string) {
    await fetch("/api/action-steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_id: providerId,
        week_ending: week,
        field: category ? "action_plan" : "action_steps",
        category,
        text,
      }),
    });
  }

  // Flat (standard/admin) list
  function updateItemText(id: string, text: string) {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, text } : i));
      set("action_steps", next);
      return next;
    });
  }
  function resolveItem(id: string, status: "completed" | "carried") {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      const next = prev.map((i) => (i.id === id ? { ...i, status } : i));
      set("action_steps", next);
      if (status === "carried" && target) carryOver(target.text);
      return next;
    });
  }
  function addItem(text: string) {
    setItems((prev) => {
      const next = [...prev, newActionItem(text)];
      set("action_steps", next);
      return next;
    });
  }

  // Categorized (senior) plan
  function updatePlanItemText(category: string, id: string, text: string) {
    setPlan((prev) => {
      const list = (prev[category] ?? []).map((i) => (i.id === id ? { ...i, text } : i));
      const next = { ...prev, [category]: list };
      set("action_plan", next);
      return next;
    });
  }
  function resolvePlanItem(category: string, id: string, status: "completed" | "carried") {
    setPlan((prev) => {
      const list = prev[category] ?? [];
      const target = list.find((i) => i.id === id);
      const nextList = list.map((i) => (i.id === id ? { ...i, status } : i));
      const next = { ...prev, [category]: nextList };
      set("action_plan", next);
      if (status === "carried" && target) carryOver(target.text, category);
      return next;
    });
  }
  function addPlanItem(category: string, text: string) {
    setPlan((prev) => {
      const next = { ...prev, [category]: [...(prev[category] ?? []), newActionItem(text)] };
      set("action_plan", next);
      return next;
    });
  }

  function updateGoals(value: string) {
    setGoals(value);
    set("performance_review_goals", value);
  }

  async function copyAll() {
    const title = categorized ? "Action Plan for This Week" : "Action Steps & Agreements for This Week";
    const text = categorized
      ? `${title}\n\n${ACTION_PLAN_CATEGORIES.map((c) => {
          const open = (plan[c.key] ?? []).filter((i) => i.status === "open");
          if (open.length === 0) return null;
          return `${c.label}:\n${open.map((i) => `- ${i.text}`).join("\n")}`;
        })
          .filter(Boolean)
          .join("\n\n")}`
      : formatActionItemsForCopy(items, title);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const large = size === "large";

  return (
    <Card
      title={categorized ? "Action Plan for This Week" : "Action Steps & Agreements for This Week"}
      action={
        <div className="flex items-center gap-3">
          <button type="button" onClick={copyAll} className="text-xs font-medium text-accent hover:underline">
            {copied ? "Copied!" : "Copy All"}
          </button>
          <SaveIndicator status={status} />
        </div>
      }
    >
      {categorized ? (
        <div className="flex flex-col gap-4">
          {ACTION_PLAN_CATEGORIES.map((category) => {
            const categoryItems = plan[category.key] ?? [];
            const active = categoryItems.filter((i) => i.status === "open");
            const resolved = categoryItems.filter((i) => i.status !== "open");
            return (
              <div key={category.key} className="rounded-lg border-2 border-accent/40 bg-accent/[0.06] p-3">
                <div className="mb-2 text-xs font-semibold text-accent">{category.label}</div>
                <div className="flex flex-col gap-2" {...fieldFocusHandlers("action_plan")}>
                  {active.map((item) => (
                    <ActionItemRow
                      key={item.id}
                      item={item}
                      large={large}
                      onChangeText={(text) => updatePlanItemText(category.key, item.id, text)}
                      onComplete={() => resolvePlanItem(category.key, item.id, "completed")}
                      onCarryOver={() => resolvePlanItem(category.key, item.id, "carried")}
                    />
                  ))}
                  <AddItemInput large={large} onAdd={(text) => addPlanItem(category.key, text)} />
                </div>
                <ResolvedHistory items={resolved} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`flex flex-col gap-2 ${large ? "text-base" : ""}`}>
          <div className="flex flex-col gap-2" {...fieldFocusHandlers("action_steps")}>
            {items
              .filter((i) => i.status === "open")
              .map((item) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  large={large}
                  onChangeText={(text) => updateItemText(item.id, text)}
                  onComplete={() => resolveItem(item.id, "completed")}
                  onCarryOver={() => resolveItem(item.id, "carried")}
                />
              ))}
            <AddItemInput large={large} onAdd={addItem} />
          </div>
          <ResolvedHistory items={items.filter((i) => i.status !== "open")} />
        </div>
      )}

      {showGoals && (
        <div className="mt-6">
          <div className="mb-1.5 text-xs font-medium text-muted">Performance Review Goals</div>
          <Textarea
            value={goals}
            onChange={(e) => updateGoals(e.target.value)}
            className={large ? "min-h-40 text-base" : undefined}
            {...fieldFocusHandlers("performance_review_goals")}
          />
        </div>
      )}
    </Card>
  );
}
