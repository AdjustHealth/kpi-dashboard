import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NOOKAL_REPORT_TYPES, NookalReportType } from "@/lib/schema";
import { applyNookalReport } from "@/lib/nookal/applyReport";

const PARSEABLE_REPORT_TYPES: readonly NookalReportType[] = [
  "activity",
  "occupancy",
  "cancellations",
  "clients_and_cases",
  "providers_and_practice",
  "business_performance",
  "aged_debtors",
];

export async function GET(request: NextRequest) {
  const week = request.nextUrl.searchParams.get("week");
  if (!week) return NextResponse.json({ error: "week is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nookal_uploads")
    .select("*")
    .eq("week_ending", week)
    .order("uploaded_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  const weekEnding = formData.get("week_ending");
  const reportType = formData.get("report_type");

  if (!(file instanceof File) || typeof weekEnding !== "string" || typeof reportType !== "string") {
    return NextResponse.json({ error: "file, week_ending, and report_type are required" }, { status: 400 });
  }
  if (!(NOOKAL_REPORT_TYPES as readonly string[]).includes(reportType)) {
    return NextResponse.json({ error: "invalid report_type" }, { status: 400 });
  }

  const supabase = await createClient();

  // nookal_uploads.week_ending has a foreign key to weekly_kpis(week_ending),
  // but a week's weekly_kpis row isn't created until a manual field is
  // edited on Weekly Input — so uploading a report before typing anything
  // else on a brand-new week fails with a foreign key violation. Ensure the
  // row exists first; this is a no-op if it's already there.
  const { error: weekError } = await supabase
    .from("weekly_kpis")
    .upsert({ week_ending: weekEnding }, { onConflict: "week_ending", ignoreDuplicates: true });
  if (weekError) return NextResponse.json({ error: weekError.message }, { status: 500 });

  const storagePath = `${weekEnding}/${reportType}-${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("nookal-reports")
    .upload(storagePath, file, { contentType: file.type || "application/octet-stream" });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error } = await supabase
    .from("nookal_uploads")
    .insert({
      week_ending: weekEnding,
      report_type: reportType,
      file_name: file.name,
      storage_path: storagePath,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let autoFilled = null;
  if (PARSEABLE_REPORT_TYPES.includes(reportType as NookalReportType)) {
    try {
      const csvText = await file.text();
      autoFilled = await applyNookalReport(supabase, reportType as NookalReportType, weekEnding, csvText);
    } catch (e) {
      // Upload itself succeeded — surface the parse failure without failing the request,
      // so the file is still safely stored even if auto-populate couldn't run.
      autoFilled = { error: e instanceof Error ? e.message : "Could not parse this file" };
    }
  }

  return NextResponse.json({ data, autoFilled });
}
