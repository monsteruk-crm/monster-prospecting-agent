import { z } from "zod";

import { DatabaseConfigurationError } from "@/lib/db/client";
import { continueDiscoveryRun } from "@/lib/graph/discovery-continuation";

export const runtime = "nodejs";

const IdSchema = z.string().trim().min(1).max(200);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsedId = IdSchema.safeParse(id);
  if (!parsedId.success) return Response.json({ error: { code: "INVALID_RUN_ID", message: "The run ID is invalid." } }, { status: 400 });
  let payload: unknown = {};
  try { payload = await request.json(); } catch { payload = {}; }
  try {
    const result = await continueDiscoveryRun(parsedId.data, payload);
    return Response.json({
      missionRunId: result.discovered.missionRunId,
      status: result.discovered.status,
      discoveryStage: result.discovered.discoveryStage,
      searchResults: result.discovered.searchResults,
      accounts: result.discovered.discoveredAccounts,
      buyingSignals: result.discovered.buyingSignals,
      warnings: result.discovered.warnings,
      errors: result.discovered.errors,
    }, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && ["RUN_NOT_FOUND", "RUN_ALREADY_RUNNING"].includes(error.message) ? error.message : error instanceof DatabaseConfigurationError ? "MISSION_PERSISTENCE_FAILED" : "SEARCH_CONTINUATION_FAILED";
    const message = code === "RUN_ALREADY_RUNNING" ? "This mission is already running." : code === "RUN_NOT_FOUND" ? "The mission run was not found." : code === "MISSION_PERSISTENCE_FAILED" ? "A database is required to continue the mission." : "The deeper search could not be completed.";
    return Response.json({ error: { code, message } }, { status: code === "RUN_NOT_FOUND" ? 404 : code === "RUN_ALREADY_RUNNING" ? 409 : 503 });
  }
}
