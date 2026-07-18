import Papa from "papaparse";

/** Parses raw CSV text into rows of string cells, tolerant of quoted fields with embedded commas/newlines (real Nookal exports have both). */
export function parseCsvRows(text: string): string[][] {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: false });
  return result.data as string[][];
}

/**
 * Nookal report exports are one CSV with multiple stacked tables — a title,
 * a "Parameters" block, then one or more sections like "Summary" or
 * "Details", each starting with a single-cell row naming the section,
 * followed by a header row, then data rows, ending at a blank row or a
 * "Total" row.
 *
 * Returns each named section's header row + data rows (Total row excluded).
 */
export function extractSection(
  rows: string[][],
  sectionTitle: string
): { header: string[]; rows: string[][] } | null {
  const startIdx = rows.findIndex(
    (r) => r[0]?.trim().toLowerCase() === sectionTitle.toLowerCase() && r.slice(1).every((c) => !c?.trim())
  );
  if (startIdx === -1) return null;

  const header = rows[startIdx + 1] ?? [];
  const data: string[][] = [];
  for (let i = startIdx + 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c?.trim())) break;
    if (row[0]?.trim().toLowerCase() === "total") break;
    data.push(row);
  }
  return { header, rows: data };
}

/** Like extractSection, but returns the section's "Total" row instead of its data rows. */
export function extractSectionTotalRow(rows: string[][], sectionTitle: string): string[] | null {
  const startIdx = rows.findIndex(
    (r) => r[0]?.trim().toLowerCase() === sectionTitle.toLowerCase() && r.slice(1).every((c) => !c?.trim())
  );
  if (startIdx === -1) return null;

  for (let i = startIdx + 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c?.trim())) return null;
    if (row[0]?.trim().toLowerCase() === "total") return row;
  }
  return null;
}

/** Turns a header + data row into a { columnName: value } record by index. */
export function rowToRecord(header: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  header.forEach((col, i) => {
    // Column headers in Nookal exports sometimes wrap a multi-line tooltip
    // around the label ("\n  Label\n  \n    Label\n    description...\n").
    // The first non-blank line is always the real column name.
    const cleanCol = col
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0);
    if (cleanCol) record[cleanCol] = (row[i] ?? "").trim();
  });
  return record;
}

/** "81.94%" -> 0.8194. Returns null for blank/invalid input. */
export function parsePercent(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace("%", "").trim());
  return Number.isNaN(n) ? null : n / 100;
}

/** "1,234.56" or "1234.56" -> 1234.56. */
export function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/,/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

/**
 * Nookal dates come in two different formats depending on the column, both
 * optionally with a time component: most columns ("Appointment Date",
 * "Modifed Date") are DD/MM/YYYY, but "Last Attendance" and "Next Booking"
 * in the Cancellations Report are exported as YYYY-MM-DD instead — confirmed
 * against a real export. Handles both rather than assuming one.
 */
export function parseNookalDate(value: string | undefined): Date | null {
  if (!value) return null;
  const [datePart] = value.trim().split(" ");
  if (datePart.includes("-")) {
    const [y, m, d] = datePart.split("-").map(Number);
    if (!d || !m || !y) return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const [d, m, y] = datePart.split("/").map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}
