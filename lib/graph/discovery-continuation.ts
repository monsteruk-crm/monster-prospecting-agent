import { getPrismaClient } from "@/lib/db/client";
import {
  discoverSalesMission,
  type DiscoveryStateSeed,
  type PreparedSalesMissionForDiscovery,
} from "@/lib/graph/sales-mission-discovery";
import {
  persistDiscoveryResult,
  persistMissionProgress,
  persistMissionSearchProgress,
} from "@/lib/persistence/mission-persistence";
import { MissionProgressRecordSchema } from "@/lib/sales/mission-progress";
import {
  BudgetSchema,
  DiscoveredAccountSchema,
  FetchedSourceReferenceSchema,
  GraphErrorSchema,
  GraphWarningSchema,
  SalesMissionBriefSchema,
  SearchResultSchema,
  SearchStrategySchema,
  TargetProfileSchema,
  VerifiedBuyingSignalSchema,
  AccountExtractionCandidateSchema,
  type Budget,
} from "@/lib/sales/mission-schema";
import { coerceProspectAccountClassification } from "@/lib/sales/prospect-taxonomy";
import { z } from "zod";
import { ABSOLUTE_SCOUT_LIMITS } from "@/lib/settings/absolute-limits";

export const SearchContinuationRequestSchema = z.object({
  additionalSearches: z.number().int().min(1).max(20).default(7),
  additionalPages: z.number().int().min(1).max(50).default(20),
  additionalModelCalls: z.number().int().min(2).max(50).default(12),
  additionalCostUsd: z.number().min(0).max(10).default(2),
});

export type SearchContinuationRequest = z.infer<typeof SearchContinuationRequestSchema>;

function boundedBudget(previous: Budget, request: SearchContinuationRequest): Budget {
  return BudgetSchema.parse({
    ...previous,
    maxSearches: Math.min(ABSOLUTE_SCOUT_LIMITS.maxSearches, previous.maxSearches + request.additionalSearches),
    maxPages: Math.min(ABSOLUTE_SCOUT_LIMITS.maxPages, previous.maxPages + request.additionalPages),
    maxModelCalls: Math.min(ABSOLUTE_SCOUT_LIMITS.maxModelCalls, previous.maxModelCalls + request.additionalModelCalls),
    maxCostUsd: Math.min(ABSOLUTE_SCOUT_LIMITS.maxCostUsd, previous.maxCostUsd + request.additionalCostUsd),
  });
}

export async function continueDiscoveryRun(
  missionRunId: string,
  rawRequest: unknown,
) {
  const request = SearchContinuationRequestSchema.parse(rawRequest);
  const db = getPrismaClient();
  const run = await db.salesMissionRun.findUnique({
    where: { id: missionRunId },
    include: {
      mission: true,
      evidence: true,
      accounts: true,
      buyingSignals: true,
      auditEvents: { where: { eventType: "MISSION_PROGRESS" }, select: { payload: true } },
    },
  });
  if (!run) throw new Error("RUN_NOT_FOUND");
  if (run.status === "RUNNING") throw new Error("RUN_ALREADY_RUNNING");

  const brief = SalesMissionBriefSchema.parse(run.mission.brief);
  const previousBudget = BudgetSchema.parse(run.budget);
  const prepared: PreparedSalesMissionForDiscovery = {
    missionId: run.missionId,
    missionRunId: run.id,
    graphVersion: run.graphVersion,
    brief,
    targetProfile: TargetProfileSchema.parse(run.targetProfile),
    searchStrategy: SearchStrategySchema.parse(run.searchStrategy),
    budget: boundedBudget(previousBudget, request),
    warnings: GraphWarningSchema.array().parse(run.warnings),
    errors: GraphErrorSchema.array().parse(run.errors),
    settingsVersion: run.settingsVersion ?? undefined,
    settingsSnapshot: run.settingsSnapshot ?? undefined,
  };

  const sources = run.evidence.map((source) => FetchedSourceReferenceSchema.parse({
    sourceUrl: source.sourceUrl,
    finalUrl: source.finalUrl,
    status: source.status,
    mimeType: source.mimeType,
    title: source.title ?? undefined,
    readableExcerpt: source.readableExcerpt,
    byteCount: source.byteCount,
    contentHash: source.contentHash,
    retrievedAt: source.retrievedAt.toISOString(),
    redirectCount: source.redirectCount,
    searchQuery: source.searchQuery,
  }));
  const accounts = run.accounts.map((account) => DiscoveredAccountSchema.parse({
    accountKey: account.accountKey,
    companyName: account.companyName,
    officialDomain: account.officialDomain ?? undefined,
    website: account.website ?? undefined,
    country: account.country ?? undefined,
    city: account.city ?? undefined,
    classification: coerceProspectAccountClassification(account.categories),
    relevanceHypothesis: account.relevanceHypothesis,
    discoveredSignals: account.discoveredSignals,
    possibleBuyerRoles: account.possibleBuyerRoles,
    discoveryEvidenceIds: account.discoveryEvidenceIds,
    unresolvedQuestions: account.unresolvedQuestions,
  }));
  const sourceByHash = new Map(sources.map((source) => [source.contentHash, source]));
  const extractionCandidates = run.accounts.flatMap((account) => {
    const evidenceId = z.array(z.string()).parse(account.discoveryEvidenceIds).find((id) => id.startsWith("source:"));
    const source = evidenceId ? sourceByHash.get(evidenceId.slice("source:".length)) : undefined;
    if (!source) return [];
    return [AccountExtractionCandidateSchema.parse({
      accountKey: account.accountKey,
      sourceUrl: source.sourceUrl,
      finalUrl: source.finalUrl,
      sourceContentHash: source.contentHash,
      sourceExcerpt: source.readableExcerpt,
      account: {
        companyName: account.companyName,
        officialDomain: account.officialDomain,
        website: account.website,
        country: account.country ?? null,
        city: account.city ?? null,
        classification: coerceProspectAccountClassification(account.categories),
        relevanceHypothesis: account.relevanceHypothesis,
        possibleBuyerRoles: account.possibleBuyerRoles,
        buyingSignals: [],
        unresolvedQuestions: account.unresolvedQuestions,
      },
    })];
  });
  const signals = run.buyingSignals.flatMap((signal) => {
    const source = sourceByHash.get(signal.sourceContentHash);
    const account = run.accounts.find((candidate) => candidate.id === signal.accountId);
    if (!source || !account) return [];
    return [VerifiedBuyingSignalSchema.parse({
      signalId: signal.signalKey,
      accountKey: account.accountKey,
      companyName: account.companyName,
      signalType: signal.signalType,
      summary: signal.summary,
      eventDate: signal.eventDate?.toISOString().slice(0, 10) ?? null,
      freshness: signal.freshness,
      evidenceState: signal.evidenceState,
      verified: signal.verified,
      confidence: signal.confidence,
      verificationReason: signal.verificationReason,
      evidenceExcerpt: signal.evidenceExcerpt,
      sourceUrl: source.sourceUrl,
      sourceContentHash: signal.sourceContentHash,
      evidenceId: signal.evidenceId,
    })];
  });
  const previousProgressSequences = run.auditEvents.map((event) => {
    const parsed = MissionProgressRecordSchema.safeParse(event.payload);
    return parsed.success ? parsed.data.sequence : 0;
  });
  let sequence = Math.max(0, ...previousProgressSequences);
  const seed: DiscoveryStateSeed = {
    searchResults: SearchResultSchema.array().parse(run.searchResults),
    fetchedSources: sources,
    accountExtractionCandidates: extractionCandidates,
    discoveredAccounts: accounts,
    accountIds: accounts.map((account) => `account:${run.missionId}:${account.accountKey}`),
    buyingSignals: signals,
    buyingSignalIds: signals.map((signal) => `signal:${run.id}:${signal.signalId}`),
    evidenceIds: sources.map((source) => `evidence:${run.id}:${source.contentHash}`),
    budget: prepared.budget,
    warnings: prepared.warnings,
    errors: prepared.errors,
  };

  const discovered = await discoverSalesMission(prepared, {
    skipCheckpoint: true,
    onProgress: async (event) => {
      sequence += 1;
      const record = MissionProgressRecordSchema.parse({ ...event, sequence, occurredAt: new Date().toISOString() });
      await persistMissionProgress({ missionId: run.missionId, missionRunId: run.id, sequence, event: record });
    },
    onSearchProgress: async (event) => {
      await persistMissionSearchProgress({ missionId: run.missionId, missionRunId: run.id, event });
    },
  }, seed);
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
    settingsVersion: run.settingsVersion ?? undefined,
    settingsSnapshot: run.settingsSnapshot ?? undefined,
  });
  return { discovered, persisted, request };
}
