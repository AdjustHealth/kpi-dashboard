"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AssessmentSummary } from "@/lib/assessmentTool/types";

type SaveMessage = { type: "save"; formData: Record<string, unknown>; summary: AssessmentSummary };
type ReadyMessage = { type: "embedded-ready" };

function isToolMessage(data: unknown): data is SaveMessage | ReadyMessage {
  return !!data && typeof data === "object" && "type" in data;
}

/**
 * Wraps the Assessment Tool's own clinical form (public/tool.html — copied
 * verbatim from the standalone app) in an iframe so its ~2700 lines of
 * scoring/report logic keep working unmodified; only this chrome around it
 * is restyled to match the rest of the hub. Same postMessage handshake the
 * standalone app used: child announces "embedded-ready", parent replies with
 * either a "hydrate" (editing an existing assessment) or "preset" (starting
 * a new one) message, child later posts "save" with the finished form.
 */
export function AssessmentToolFrame({
  assessmentId = null,
  initialFormData = null,
  presetType = null,
  presetTier = null,
  presetClinician = null,
}: {
  assessmentId?: string | null;
  initialFormData?: Record<string, unknown> | null;
  presetType?: string | null;
  presetTier?: string | null;
  presetClinician?: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  const [id, setId] = useState<string | null>(assessmentId);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sentInitRef = useRef(false);

  useEffect(() => {
    function sendInitialData() {
      if (sentInitRef.current) return;
      sentInitRef.current = true;
      if (initialFormData) {
        iframeRef.current?.contentWindow?.postMessage({ type: "hydrate", formData: initialFormData }, "*");
      } else if (presetType) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "preset", assessType: presetType, youthTier: presetTier, clinician: presetClinician },
          "*"
        );
      }
    }

    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (!isToolMessage(e.data)) return;

      // Fallback in case onLoad fires before this listener is attached
      // (e.g. a cached iframe) — sendInitialData() is idempotent.
      if (e.data.type === "embedded-ready") sendInitialData();
      if (e.data.type === "save") void handleSave(e.data.formData, e.data.summary);
    }

    async function handleSave(formData: Record<string, unknown>, summary: AssessmentSummary) {
      setStatus("saving");
      setErrorMsg(null);
      let result: { id: string } | { ok: true } | { error: string };
      try {
        const res = id
          ? await fetch(`/api/assessments/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ formData, summary }),
            })
          : await fetch("/api/assessments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ formData, summary }),
            });
        result = await res.json();
      } catch {
        setStatus("error");
        setErrorMsg("Couldn't reach the server.");
        return;
      }

      if ("error" in result && result.error) {
        setStatus("error");
        setErrorMsg(result.error);
        return;
      }
      if ("id" in result) {
        setId(result.id);
        router.replace(`/assessments/${result.id}`);
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    }

    const iframeEl = iframeRef.current;
    // The child announces "embedded-ready" via postMessage once its script
    // runs, but that has no queue — if it fires before this listener is
    // attached (always true on a real user click, since the iframe's
    // document + script can finish before React re-renders), the message
    // is lost forever. The iframe's own onLoad DOM event only fires after
    // the child document (and its synchronous listener setup) is fully
    // loaded, so sending from there can't race.
    iframeEl?.addEventListener("load", sendInitialData);
    window.addEventListener("message", onMessage);
    return () => {
      iframeEl?.removeEventListener("load", sendInitialData);
      window.removeEventListener("message", onMessage);
    };
  }, [id, initialFormData, presetType, presetTier, presetClinician, router]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 81px)" }}>
      <div className="flex h-12 flex-none items-center justify-between border-b border-border bg-surface-raised px-4">
        <Link href="/assessments" className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-accent">
          <span aria-hidden>←</span> All Assessments
        </Link>
        <div className="text-xs">
          {status === "saving" && <span className="text-muted">Saving…</span>}
          {status === "saved" && <span className="text-accent-secondary">Saved ✓</span>}
          {status === "error" && <span className="text-danger">Save failed: {errorMsg}</span>}
        </div>
      </div>
      <iframe ref={iframeRef} src="/tool.html" title="Performance Report Tool" className="w-full flex-1 border-0" />
    </div>
  );
}
