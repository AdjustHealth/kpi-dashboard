"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeleteConsultButton({ id, patientName }: { id: string; patientName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!confirm(`Delete ${patientName}'s consultation? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/consultation-templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || "Delete failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <button onClick={onClick} disabled={pending} className="text-xs text-danger hover:underline disabled:opacity-50">
        {pending ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
