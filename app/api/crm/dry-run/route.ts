import { DatabaseConfigurationError } from "@/lib/db/client";
import { buildCrmDryRun } from "@/lib/export/crm-dry-run";
import { CrmAuthConfigurationError, CrmAuthorizationError, authorizeCrmDryRun } from "@/lib/security/crm-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, { status: 400 }); }
  try {
    const authorization = authorizeCrmDryRun(request);
    return Response.json(await buildCrmDryRun(payload, undefined, authorization.organizationId), { headers: { "cache-control": "no-store", "x-crm-mode": "DRY_RUN", "x-monster-organization-id": authorization.organizationId } });
  } catch (error) {
    if (error instanceof CrmAuthorizationError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.code === "CRM_UNAUTHENTICATED" ? 401 : 403, headers: { "www-authenticate": "Bearer" } });
    if (error instanceof CrmAuthConfigurationError) return Response.json({ error: { code: error.code, message: "The CRM dry-run service is not configured." } }, { status: 503 });
    const message = error instanceof Error && error.message === "RUN_NOT_FOUND" ? "The mission run was not found." : error instanceof Error && error.message === "APPROVAL_REQUIRED" ? "An approved review is required before the CRM dry-run." : error instanceof DatabaseConfigurationError ? "A database is required for the CRM dry-run." : "The CRM dry-run could not be generated.";
    const code = message.startsWith("The mission") ? "RUN_NOT_FOUND" : message.startsWith("An approved") ? "APPROVAL_REQUIRED" : "CRM_DRY_RUN_FAILED";
    return Response.json({ error: { code, message } }, { status: code === "RUN_NOT_FOUND" ? 404 : code === "APPROVAL_REQUIRED" ? 409 : 503 });
  }
}
