import {
  discoverSalesMission,
  type MissionProgressReporter,
  type PreparedSalesMissionForDiscovery,
} from "@/lib/graph/sales-mission-discovery";
import { prepareSalesMission } from "@/lib/graph/sales-mission-preparation";
import {
  persistDiscoveryResult,
  persistMissionProgress,
  persistMissionSearchProgress,
  persistPreparedMission,
  type PersistedDiscovery,
} from "@/lib/persistence/mission-persistence";
import {
  MissionProgressEventSchema,
  MissionProgressRecordSchema,
  type MissionProgressEvent,
  type MissionProgressRecord,
  type MissionSearchProgressEvent,
} from "@/lib/sales/mission-progress";
import { SalesMissionBriefSchema, type SalesMissionBrief } from "@/lib/sales/mission-schema";
import { logRuntimeWarning } from "@/lib/observability/runtime-logger";

export type DiscoveryRunHooks = {
  onPrepared?: (prepared: PreparedSalesMissionForDiscovery) => Promise<void> | void;
  onProgress?: (event: MissionProgressRecord) => Promise<void> | void;
  onSearchProgress?: (event: MissionSearchProgressEvent) => Promise<void> | void;
};

export type DiscoveryRunResult = {
  prepared: PreparedSalesMissionForDiscovery;
  discovered: Awaited<ReturnType<typeof discoverSalesMission>>;
  persisted: PersistedDiscovery;
};

function progressRecord(sequence: number, event: MissionProgressEvent): MissionProgressRecord {
  return MissionProgressRecordSchema.parse({
    ...MissionProgressEventSchema.parse(event),
    sequence,
    occurredAt: new Date().toISOString(),
  });
}

export async function executeDiscoveryRun(
  rawBrief: SalesMissionBrief,
  hooks: DiscoveryRunHooks = {},
): Promise<DiscoveryRunResult> {
  const brief = SalesMissionBriefSchema.parse(rawBrief);
  const preparedState = await prepareSalesMission(brief);
  if (!preparedState.targetProfile || !preparedState.searchStrategy) {
    throw new Error("MISSION_PREPARATION_INCOMPLETE");
  }

  const prepared: PreparedSalesMissionForDiscovery = {
    ...preparedState,
    graphVersion: preparedState.graphVersion,
    targetProfile: preparedState.targetProfile,
    searchStrategy: preparedState.searchStrategy,
  };
  await persistPreparedMission(prepared);
  await hooks.onPrepared?.(prepared);

  let sequence = 0;
  const reportProgress: MissionProgressReporter = async (event) => {
    sequence += 1;
    const record = progressRecord(sequence, event);
    await persistMissionProgress({
      missionId: prepared.missionId,
      missionRunId: prepared.missionRunId,
      sequence,
      event: record,
    });
    await hooks.onProgress?.(record);
  };
  const reportSearchProgress = async (event: MissionSearchProgressEvent) => {
    await persistMissionSearchProgress({
      missionId: prepared.missionId,
      missionRunId: prepared.missionRunId,
      event,
    });
    await hooks.onSearchProgress?.(event);
  };

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
    { onProgress: reportProgress, onSearchProgress: reportSearchProgress },
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
    status: discovered.status,
    discoveryStage: discovered.discoveryStage,
    searchResults: discovered.searchResults,
    fetchedSources: discovered.fetchedSources,
    accounts: discovered.discoveredAccounts,
    buyingSignals: discovered.buyingSignals,
  });
  if (discovered.errors.length > 0 || discovered.warnings.length > 0) {
    logRuntimeWarning("mission.discovery.partial", {
      missionRunId: discovered.missionRunId,
      errorCodes: discovered.errors.map((error) => error.code).slice(0, 20),
      warningCodes: discovered.warnings.map((warning) => warning.code).slice(0, 20),
      searchesUsed: discovered.budget.searchesUsed,
      pagesUsed: discovered.budget.pagesUsed,
    });
  }

  return { prepared, discovered, persisted };
}
