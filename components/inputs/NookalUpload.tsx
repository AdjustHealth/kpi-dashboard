"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { NOOKAL_REPORT_TYPES, NOOKAL_REPORT_LABELS, NookalReportType } from "@/lib/schema";

interface UploadRecord {
  id: string;
  report_type: NookalReportType;
  file_name: string;
  uploaded_at: string;
}

export function NookalUpload({ week }: { week: string }) {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [uploading, setUploading] = useState<NookalReportType | null>(null);

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
    const formData = new FormData();
    formData.append("file", file);
    formData.append("week_ending", week);
    formData.append("report_type", reportType);
    await fetch("/api/nookal-upload", { method: "POST", body: formData });
    setUploading(null);
    refresh();
  }

  return (
    <Card title="Upload Nookal Reports">
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
    </Card>
  );
}
