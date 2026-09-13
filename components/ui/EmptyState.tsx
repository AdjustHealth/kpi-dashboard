/** A quiet "nothing here yet" placeholder — an icon and a line of text, used in
 * place of a bare paragraph wherever a table or list can legitimately be empty. */
export function EmptyState({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised text-muted">
        {icon ?? <DefaultIcon />}
      </div>
      <p className="max-w-xs text-sm text-muted">{message}</p>
    </div>
  );
}

function DefaultIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M3 7h18M3 7l1.5 12a1.5 1.5 0 0 0 1.5 1.4h12a1.5 1.5 0 0 0 1.5-1.4L21 7M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
