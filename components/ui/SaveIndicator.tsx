"use client";

import { STATUS } from "@/components/charts/palette";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map = {
    saving: { color: "#9a9aa3", text: "Saving…" },
    saved: { color: STATUS.good, text: "Saved" },
    error: { color: STATUS.critical, text: "Couldn't save — retrying" },
  } as const;
  const { color, text } = map[status];
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {text}
    </span>
  );
}
