"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { STATUS } from "@/components/charts/palette";
import { NOOKAL_REPORT_TYPES, NOOKAL_REPORT_LABELS, NookalReportType } from "@/lib/schema";

interface UploadRecord {
  id: string;
  report_type: NookalReportType;
  file_name: string;
  uploaded_at: string;
}

interface AutoFillSummary {
  matchedProviders?: string[];
  unmatchedNames?: string[];
  clinicFieldsUpdated?: string[];
  error?: string;
  warning?: string;
}

interface UploadApiResponse {
  data?: UploadRecord;
  autoFilled?: AutoFillSummary | null;
  error?: string;
}

export function NookalUpload({ week }: { week: string }) {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [uploading, setUploading] = useState<NookalReportType | null>(null);
  const [lastResult, setLastResult] = useState<{ type: NookalReportType; summary: AutoFillSummary } | null>(null);

  const refresh = useCallback(() => {
    fetch(`/api/nookal-upload?week=${week}`)
      .then((r) => r.json())
      .then((res) => setUploads(res.data ?? []))
      .catch(() => setUploads([]));
  }, [week]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleFile(reportType: NookalReportType, file: File) {
    setUploading(reportType);
    setLastResult(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("week_ending", week);
    formData.append("report_type", reportType);
    let json: UploadApiResponse;
    try {
      const res = await fetch("/api/nookal-upload", { method: "POST", body: formData });
      json = await res.json();
      if (!res.ok) {
        setLastResult({ type: reportType, summary: { error: json.error ?? `Upload failed (${res.status})` } });
        return;
      }
    } catch {
      setLastResult({ type: reportType, summary: { error: "Upload failed — check your connection and try again." } });
      return;
    } finally {
      setUploading(null);
      refresh();
    }
    if (json.autoFilled) {
      setLastResult({ type: reportType, summary: json.autoFilled });
      router.refresh(); // pull newly auto-filled values into the rest of the page
    }
  }

  return (
    <Card title="Upload Nookal Reports">
      <p className="mb-4 text-xs text-muted">
        All 7 report types auto-fill the fields marked <span className="font-medium text-accent">Auto</span> below —
        still editable afterward.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NOOKAL_REPORT_TYPES.map((type) => {
          const existing = uploads.filter((u) => u.report_type === type);
          const done = existing.length > 0;
          const latest = existing[0];
          return (
            <div
              key={type}
              className={`flex flex-col gap-2 rounded-lg border p-3 ${
                done ? "border-accent-secondary/40 bg-accent-secondary/5" : "border-border bg-surface-raised"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">
                  {NOOKAL_REPORT_LABELS[type]}
                </span>
                {done && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-accent-secondary">
                    <span aria-hidden>✓</span> Uploaded
                  </span>
                )}
              </div>
              <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted hover:border-accent hover:text-accent">
                {uploading === type ? "Uploading…" : done ? "Replace file" : "Choose file"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(type, file);
                    e.target.value = "";
                  }}
                />
              </label>
              {latest && (
                <span className="truncate text-[11px] text-muted" title={latest.file_name}>
                  {latest.file_name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {lastResult && (
        <div className="mt-4 rounded-lg border border-border bg-surface-raised p-3 text-xs">
          <span className="font-medium text-foreground">{NOOKAL_REPORT_LABELS[lastResult.type]} — auto-fill result</span>
          {lastResult.summary.error ? (
            <p className="mt-1 text-danger">{lastResult.summary.error}</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {lastResult.summary.warning && (
                <p style={{ color: STATUS.warning }}>{lastResult.summary.warning}</p>
              )}
              {!!lastResult.summary.clinicFieldsUpdated?.length && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted">Clinic fields updated:</span>
                  {lastResult.summary.clinicFieldsUpdated.map((f) => (
                    <Badge key={f} tone="good">{f}</Badge>
                  ))}
                </div>
              )}
              {!!lastResult.summary.matchedProviders?.length && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted">Providers updated:</span>
                  {lastResult.summary.matchedProviders.map((p) => (
                    <Badge key={p} tone="good">{p}</Badge>
                  ))}
                </div>
              )}
              {!!lastResult.summary.unmatchedNames?.length && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted">
                    Not matched to a provider on file (check spelling on the Settings page):
                  </span>
                  {lastResult.summary.unmatchedNames.map((n) => (
                    <Badge key={n} tone="warning">{n}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
