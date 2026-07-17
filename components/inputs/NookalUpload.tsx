"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
    const res = await fetch("/api/nookal-upload", { method: "POST", body: formData });
    const json = await res.json();
    setUploading(null);
    refresh();
    if (json.autoFilled) {
      setLastResult({ type: reportType, summary: json.autoFilled });
      router.refresh(); // pull newly auto-filled values into the rest of the page
    }
  }

  return (
    <Card title="Upload Nookal Reports">
      <p className="mb-4 text-xs text-muted">
        Activity, Occupancy, Cancellations, and Clients &amp; Cases reports auto-fill the fields below — still
        editable afterward. Business Performance and Aged Debtors are stored but not auto-parsed yet.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NOOKAL_REPORT_TYPES.map((type) => {
          const existing = uploads.filter((u) => u.report_type === type);
          return (
            <div
              key={type}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-3"
            >
              <span className="text-xs font-medium text-foreground">
                {NOOKAL_REPORT_LABELS[type]}
              </span>
              <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted hover:border-accent hover:text-accent">
                {uploading === type ? "Uploading…" : "Choose file"}
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
              {existing.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {existing.map((u) => (
                    <li key={u.id} className="truncate text-[11px] text-muted" title={u.file_name}>
                      {u.file_name}
                    </li>
                  ))}
                </ul>
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
