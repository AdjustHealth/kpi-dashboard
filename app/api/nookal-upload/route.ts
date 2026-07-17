import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NOOKAL_REPORT_TYPES } from "@/lib/schema";

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
  return NextResponse.json({ data });
}
