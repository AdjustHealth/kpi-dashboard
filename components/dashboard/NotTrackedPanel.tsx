export function NotTrackedPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-5">
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      <p className="mt-1 text-xs text-muted">
        Not tracked yet — add a Weekly Input field for {items.join(", ")} to bring this to life.
      </p>
    </div>
  );
}
