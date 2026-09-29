// Pure CSV helpers (no server-only deps, so they are unit-testable).

export type CsvCell = string | number | boolean | null | undefined;

// OWASP CSV-injection guard: spreadsheet apps treat these leading characters as formulas.
const FORMULA_START = /^[=+\-@\t\r]/;

/** Escapes one cell per RFC 4180 and guards against formula injection. */
export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && !Number.isFinite(value)) return "";
  let s = String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Builds a CSV document (CRLF line endings, trailing CRLF) from a header and rows. */
export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",") + "\r\n").join("");
}

/** HTTP response for a CSV download. Never cached (it contains study data). */
export function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
