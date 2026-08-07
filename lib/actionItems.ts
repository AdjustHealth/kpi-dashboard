/**
 * Action Steps/Action Plan items — a growing, per-item checklist instead of
 * fixed text slots. Each item can be marked Completed (done, kept as
 * collapsed history) or Carried Over (done reviewing it this week, and it
 * reappears as a fresh open item on next week's page automatically).
 */
export interface ActionItem {
  id: string;
  text: string;
  status: "open" | "completed" | "carried";
}

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newActionItem(text: string): ActionItem {
  return { id: randomId(), text, status: "open" };
}

/**
 * Reads whatever shape is stored — the field used to be `string[]` (up to 3
 * fixed slots) or, for senior physios' Action Plan, one plain string per
 * category. Older weeks' data is left exactly as saved (no migration), so
 * this normalizes either shape into the current ActionItem[] shape purely
 * for display; only re-saved once the item is actually edited.
 */
export function normalizeActionItems(raw: unknown): ActionItem[] {
  if (!Array.isArray(raw)) {
    if (typeof raw === "string" && raw.trim()) return [newActionItem(raw.trim())];
    return [];
  }
  const items: ActionItem[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      if (entry.trim()) items.push(newActionItem(entry.trim()));
    } else if (entry && typeof entry === "object" && typeof (entry as ActionItem).text === "string") {
      const e = entry as Partial<ActionItem>;
      if (!e.text?.trim()) continue;
      items.push({
        id: e.id ?? randomId(),
        text: e.text,
        status: e.status === "completed" || e.status === "carried" ? e.status : "open",
      });
    }
  }
  return items;
}

export function formatActionItemsForCopy(items: ActionItem[], title: string): string {
  const open = items.filter((i) => i.status === "open");
  if (open.length === 0) return `${title}\n\n(no open action steps)`;
  return `${title}\n\n${open.map((i) => `- ${i.text}`).join("\n")}`;
}
