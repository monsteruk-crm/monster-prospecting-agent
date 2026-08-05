import { DatabaseConfigurationError } from "@/lib/db/client";
import { continueContactEnrichment } from "@/lib/graph/contact-continuation";
import { logRouteCompleted, logRouteFailure, logRouteStart, requestLogContext } from "@/lib/observability/runtime-logger";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string; accountId: string }> }) {
  const startedAt = Date.now();
  const params = await context.params;
  const logContext = requestLogContext(request, "/api/runs/[id]/accounts/[accountId]/contact-enrichment");
  logRouteStart({ ...logContext, missionRunId: params.id, accountId: params.accountId });
  let payload: unknown = {};
  try { payload = await request.json(); } catch { payload = {}; }
  try {
    const result = await continueContactEnrichment(params.id, params.accountId, payload);
    logRouteCompleted(logContext, startedAt, { missionRunId: params.id, accountId: params.accountId, pageCount: result.discovered.budget.pagesUsed });
    return Response.json({ missionRunId: result.discovered.missionRunId, accountId: result.accountId, status: result.discovered.status, discoveryStage: result.discovered.discoveryStage, accounts: result.discovered.discoveredAccounts, warnings: result.discovered.warnings, errors: result.discovered.errors }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logRouteFailure({ ...logContext, missionRunId: params.id, accountId: params.accountId }, startedAt, error);
    const code = error instanceof Error && ["RUN_NOT_FOUND", "RUN_ALREADY_RUNNING", "ACCOUNT_NOT_FOUND"].includes(error.message) ? error.message : error instanceof DatabaseConfigurationError ? "MISSION_PERSISTENCE_FAILED" : "CONTACT_ENRICHMENT_FAILED";
    const status = code === "RUN_NOT_FOUND" || code === "ACCOUNT_NOT_FOUND" ? 404 : code === "RUN_ALREADY_RUNNING" ? 409 : 503;
    return Response.json({ error: { code, message: code === "RUN_NOT_FOUND" ? "The mission run was not found." : code === "ACCOUNT_NOT_FOUND" ? "The prospect account was not found." : code === "RUN_ALREADY_RUNNING" ? "This mission is already running." : error instanceof DatabaseConfigurationError ? "A database is required to enrich contacts." : "The bounded contact enrichment could not be completed.", requestId: logContext.requestId } }, { status });
  }
}

