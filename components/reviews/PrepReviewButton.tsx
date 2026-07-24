"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PrepReviewButton({ providerId, label = "Prep Review" }: { providerId: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await fetch("/api/performance-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider_id: providerId }),
    });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const { data } = await res.json();
    router.push(`/reviews/${data.id}`);
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={loading}
      className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/15 disabled:opacity-50"
    >
      {loading ? "Preparing…" : label}
    </button>
  );
}
