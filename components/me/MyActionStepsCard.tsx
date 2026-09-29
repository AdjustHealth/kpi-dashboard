import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionItem, normalizeActionItems } from "@/lib/actionItems";
import { ACTION_PLAN_CATEGORIES, ProviderMeetingNotes } from "@/lib/providerSchema";

/** Same "this week's own entry if set, else last week's still-open items" rule ActionStepsCard applies on the director's page — see lib/providerIdentity.ts getMyMeetingNotes. */
function resolveItems(ownRaw: unknown, previousRaw: unknown, ownSet: boolean): { items: ActionItem[]; carriedOver: boolean } {
  const own = normalizeActionItems(ownRaw);
  if (own.length > 0 || ownSet) return { items: own, carriedOver: false };
  const carried = normalizeActionItems(previousRaw).filter((i) => i.status === "open");
  return { items: carried, carriedOver: carried.length > 0 };
}

function ItemRow({ item, number }: { item: ActionItem; number: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-5 flex-shrink-0 text-right text-muted">{number}.</span>
      <span className={item.status !== "open" ? "text-muted line-through" : "text-foreground"}>{item.text}</span>
    </div>
  );
}

function ItemList({ items }: { items: ActionItem[] }) {
  const open = items.filter((i) => i.status === "open");
  if (open.length === 0) return <p className="text-sm text-muted">Nothing open right now.</p>;
  return (
    <div className="flex flex-col gap-2">
      {open.map((item, i) => (
        <ItemRow key={item.id} item={item} number={i + 1} />
      ))}
    </div>
  );
}

/**
 * Read-only — Action Steps/Action Plan are set by a director during the
 * weekly meeting (see components/provider/ActionStepsCard.tsx, the editable
 * version); this just shows a practitioner their own current list, so it
 * reaches them automatically instead of being copied and sent separately.
 */
export function MyActionStepsCard({
  thisWeek,
  lastWeek,
  categorized,
}: {
  thisWeek: ProviderMeetingNotes;
  lastWeek: ProviderMeetingNotes;
  /** Senior physios use one checklist per ACTION_PLAN_CATEGORIES (action_plan); everyone else gets one flat list (action_steps). */
  categorized: boolean;
}) {
  if (categorized) {
    return (
      <Card title="Your Action Plan for This Week">
        <div className="flex flex-col gap-4">
          {ACTION_PLAN_CATEGORIES.map((category) => {
            const { items, carriedOver } = resolveItems(
              thisWeek.action_plan?.[category.key],
              lastWeek.action_plan?.[category.key],
              thisWeek.action_plan?.[category.key] !== undefined
            );
            return (
              <div key={category.key} className="rounded-lg border-2 border-accent/40 bg-accent/[0.06] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
                  {category.label}
                  {carriedOver && <Badge>Carried over</Badge>}
                </div>
                <ItemList items={items} />
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  const { items, carriedOver } = resolveItems(thisWeek.action_steps, lastWeek.action_steps, thisWeek.action_steps !== undefined);
  return (
    <Card title="Your Action Steps for This Week">
      {carriedOver && (
        <div className="mb-2">
          <Badge>Carried over from last week</Badge>
        </div>
      )}
      <ItemList items={items} />
    </Card>
  );
}
