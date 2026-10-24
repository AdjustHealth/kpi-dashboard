import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDirector } from "@/lib/auth/access";
import { applyNookalReport, ApplyReportResult } from "@/lib/nookal/applyReport";
import { NookalReportType } from "@/lib/schema";

/**
 * A parsing-logic fix (e.g. a corrected exclusion regex) only changes how
 * the NEXT upload of a report is read — it never touches rows a past
 * upload already wrote into cancellation_events/no_future_booking_events/
 * provider_weekly.metrics/pre_employment_activity_weekly. Re-uploading
 * every affected week by hand is how that's normally fixed, but the
 * director doesn't want to do that by hand — these report types are
 * exactly the ones whose per-week numbers are computed ONCE at upload time
 * (see lib/nookal/applyReport.ts) rather than recomputed live from stored
 * raw rows, so they're the ones a parsing fix leaves stale.
 *
 * Re-runs applyNookalReport against the ORIGINAL uploaded file already
 * sitting in the nookal-reports storage bucket, for one past week at a
 * time — byte-for-byte the same effect as the director re-uploading that
 * exact file through the Weekly Input page, just without needing the file
 * on hand. Idempotent and safe to re-run.
 */
const REPROCESSABLE_TYPES: NookalReportType[] = [
  "cancellations",
  "clients_and_cases",
  "activity",
  "last_attendances",
  "online_bookings",
  // Added so a PVA (excl. pre-employment) formula fix can be re-applied to
  // an already-uploaded 12-month pull without needing the file
  // re-downloaded from Nookal and re-uploaded by hand.
  "providers_and_practice_12mo",
];

interface UploadRow {
  id: string;
  week_ending: string;
  report_type: NookalReportType;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
}

/** Every distinct week that has at least one reprocessable report uploaded, oldest first — PVA's trailing-52-week ledger recompute only lands on the right answer if earlier weeks are fixed before later ones recompute off them. */
export async function GET() {
  await requireDirector();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nookal_uploads")
    .select("week_ending")
    .in("report_type", REPROCESSABLE_TYPES)
    .order("week_ending", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const weeks = Array.from(new Set((data ?? []).map((r) => r.week_ending as string)));
  return NextResponse.json({ weeks });
}

export async function POST(request: NextRequest) {
  await requireDirector();
  const body = await request.json();
  const { week_ending } = body as { week_ending?: string };
  if (!week_ending) return NextResponse.json({ error: "week_ending is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: uploads, error } = await supabase
    .from("nookal_uploads")
    .select("*")
    .eq("week_ending", week_ending)
    .in("report_type", REPROCESSABLE_TYPES)
    .order("uploaded_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only the latest upload per report_type for this week matters — an
  // earlier replaced file would just get overwritten again by the later
  // one, same as it was the first time around.
  const latestByType = new Map<NookalReportType, UploadRow>();
  for (const u of (uploads ?? []) as UploadRow[]) latestByType.set(u.report_type, u);

  const results: { report_type: NookalReportType; file_name: string; ok: boolean; error?: string; summary?: ApplyReportResult }[] = [];

  for (const upload of latestByType.values()) {
    try {
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("nookal-reports")
        .download(upload.storage_path);
      if (downloadError || !fileBlob) throw new Error(downloadError?.message ?? "file not found in storage");
      const csvText = await fileBlob.text();
      const summary = await applyNookalReport(supabase, upload.report_type, week_ending, csvText);
      results.push({ report_type: upload.report_type, file_name: upload.file_name, ok: true, summary });
    } catch (e) {
      results.push({
        report_type: upload.report_type,
        file_name: upload.file_name,
        ok: false,
        error: e instanceof Error ? e.message : "Could not reprocess this file",
      });
    }
  }

  return NextResponse.json({ week_ending, results });
}
