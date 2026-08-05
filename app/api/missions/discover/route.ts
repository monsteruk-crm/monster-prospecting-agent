import { resolveMissionBrief } from "@/lib/settings/settings-service";
import { discoverSalesMission } from "@/lib/graph/sales-mission-discovery";
import { prepareSalesMission } from "@/lib/graph/sales-mission-preparation";
import { DatabaseConfigurationError } from "@/lib/db/client";
import {
  persistDiscoveryResult,
  persistPreparedMission,
} from "@/lib/persistence/mission-persistence";
import { logRouteCompleted, logRouteFailure, logRouteStart, requestLogContext } from "@/lib/observability/runtime-logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const logContext = requestLogContext(request, "/api/missions/discover");
  logRouteStart(logContext);
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 },
    );
  }

  let resolved: Awaited<ReturnType<typeof resolveMissionBrief>>;
  try {
    resolved = await resolveMissionBrief(payload);
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "INVALID_SALES_MISSION_BRIEF",
          message: "The sales mission brief failed validation.",
          issues: error instanceof Error ? [{ message: error.message }] : undefined,
        },
      },
      { status: 400 },
    );
  }

  try {
    const prepared = await prepareSalesMission(resolved.brief);
    if (!prepared.targetProfile || !prepared.searchStrategy) {
      return Response.json(
        {
          error: {
            code: "MISSION_PREPARATION_INCOMPLETE",
            message: "The mission preparation graph did not produce discovery inputs.",
          },
        },
        { status: 500 },
      );
    }

    await persistPreparedMission({
      missionId: prepared.missionId,
      missionRunId: prepared.missionRunId,
      graphVersion: prepared.graphVersion,
      brief: prepared.brief,
      targetProfile: prepared.targetProfile,
      searchStrategy: prepared.searchStrategy,
      budget: prepared.budget,
      warnings: prepared.warnings,
      errors: prepared.errors,
      settingsVersion: resolved.settingsVersion,
      settingsSnapshot: resolved.settingsSnapshot,
    });

    const discovered = await discoverSalesMission(
      {
      missionId: prepared.missionId,
      missionRunId: prepared.missionRunId,
      graphVersion: prepared.graphVersion,
      brief: prepared.brief,
        targetProfile: prepared.targetProfile,
        searchStrategy: prepared.searchStrategy,
        budget: prepared.budget,
        warnings: prepared.warnings,
        errors: prepared.errors,
      },
      {},
    );
    const persisted = await persistDiscoveryResult({
      missionId: discovered.missionId,
      missionRunId: discovered.missionRunId,
      graphVersion: discovered.graphVersion,
      brief: discovered.brief,
      targetProfile: discovered.targetProfile,
      searchStrategy: discovered.searchStrategy,
      budget: discovered.budget,
      warnings: discovered.warnings,
      errors: discovered.errors,
      settingsVersion: resolved.settingsVersion,
      settingsSnapshot: resolved.settingsSnapshot,
      status: discovered.status,
      discoveryStage: discovered.discoveryStage,
      searchResults: discovered.searchResults,
      fetchedSources: discovered.fetchedSources,
      accounts: discovered.discoveredAccounts,
      buyingSignals: discovered.buyingSignals,
    });
    logRouteCompleted(logContext, startedAt, { missionRunId: discovered.missionRunId, accountCount: discovered.discoveredAccounts.length, searchCount: discovered.budget.searchesUsed, pageCount: discovered.budget.pagesUsed });

    return Response.json(
      {
        missionId: discovered.missionId,
        missionRunId: discovered.missionRunId,
        graphVersion: discovered.graphVersion,
        status: discovered.status,
        discoveryStage: discovered.discoveryStage,
        targetProfile: discovered.targetProfile,
        searchStrategy: discovered.searchStrategy,
        budget: discovered.budget,
        searchResults: discovered.searchResults,
        fetchedSources: discovered.fetchedSources,
        accountExtractionCandidates: discovered.accountExtractionCandidates,
        accounts: discovered.discoveredAccounts,
        accountIds: discovered.accountIds,
        buyingSignals: discovered.buyingSignals,
        buyingSignalIds: discovered.buyingSignalIds,
        review: persisted.review,
        persistedAt: persisted.persistedAt,
        evidenceIds: discovered.evidenceIds,
        warnings: discovered.warnings,
        errors: discovered.errors,
      },
      {
        status: 201,
        headers: { "cache-control": "no-store" },
      },
    );
  } catch (error) {
    logRouteFailure(logContext, startedAt, error);
    if (error instanceof DatabaseConfigurationError) {
      return Response.json(
        {
          error: {
            code: "MISSION_PERSISTENCE_FAILED",
            message: "A database is required to persist the discovery run.",
          },
        },
        { status: 503 },
      );
    }
    return Response.json(
      {
        error: {
          code: "MISSION_DISCOVERY_OR_PERSISTENCE_FAILED",
            message: "The bounded discovery run could not be completed and persisted.",
            requestId: logContext.requestId,
        },
      },
      { status: 503 },
    );
  }
}
