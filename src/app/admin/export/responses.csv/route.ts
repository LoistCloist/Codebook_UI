import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { csvResponse } from "@/lib/admin/csv";
import { buildResponsesCsv } from "@/lib/admin/export";

export async function GET(): Promise<Response> {
  await connection(); // always per-request, never cached at build time
  await requireAdmin();
  return csvResponse(await buildResponsesCsv(), "responses.csv");
}
