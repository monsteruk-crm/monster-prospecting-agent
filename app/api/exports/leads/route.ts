import { DatabaseConfigurationError } from "@/lib/db/client";
import { buildApprovedLeadExport } from "@/lib/export/lead-export";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, { status: 400 }); }
  try {
    const result = await buildApprovedLeadExport(payload);
    return new Response(result.csv, { status: 200, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="monster-scout-${result.rows[0]?.company_name ?? "leads"}.csv"`, "x-export-mode": result.mode, "x-export-row-count": String(result.rowCount), "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error && error.message === "RUN_NOT_FOUND" ? "The mission run was not found." : error instanceof Error && error.message === "APPROVAL_REQUIRED" ? "An approved review is required before export." : error instanceof DatabaseConfigurationError ? "A database is required for export." : "The lead export could not be generated.";
    const code = message.startsWith("The mission") ? "RUN_NOT_FOUND" : message.startsWith("An approved") ? "APPROVAL_REQUIRED" : "LEAD_EXPORT_FAILED";
    return Response.json({ error: { code, message } }, { status: code === "RUN_NOT_FOUND" ? 404 : code === "APPROVAL_REQUIRED" ? 409 : 503 });
  }
}
