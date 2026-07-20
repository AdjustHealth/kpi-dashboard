import { ReactNode } from "react";

export function Field({
  label,
  hint,
  tag,
  children,
}: {
  label: string;
  hint?: string;
  tag?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {label}
        {tag}
      </span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

const baseInput =
  "w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent transition-colors";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

/**
 * Continues a "- " dot-point list onto the next line on Enter, and clears
 * the bullet (ending the list) when Enter is pressed on an already-empty
 * bullet line — so meeting notes typed as a list stay a list without
 * re-typing "- " every line.
 */
function handleBulletContinuation(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;

  const el = e.currentTarget;
  const { value, selectionStart, selectionEnd } = el;
  if (selectionStart == null || selectionStart !== selectionEnd) return;

  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const line = value.slice(lineStart, selectionStart);
  const match = line.match(/^(\s*)-\s(.*)$/);
  if (!match) return;

  e.preventDefault();
  const [, indent, rest] = match;
  const emptyBullet = rest.trim() === "";
  const from = emptyBullet ? lineStart : selectionStart;
  const insertion = emptyBullet ? "" : `\n${indent}- `;
  const newValue = value.slice(0, from) + insertion + value.slice(selectionEnd);
  const cursor = from + insertion.length;

  // This is a controlled textarea, so use the native setter + a real
  // "input" event to route the change through React's onChange like any
  // other keystroke would, keeping the parent's state in sync.
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, newValue);
  el.selectionStart = el.selectionEnd = cursor;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      onKeyDown={(e) => {
        props.onKeyDown?.(e);
        if (!e.defaultPrevented) handleBulletContinuation(e);
      }}
      className={`${baseInput} min-h-24 ${props.className ?? ""}`}
    />
  );
}
