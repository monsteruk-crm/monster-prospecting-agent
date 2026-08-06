import { z } from "zod";

import {
  discoverSalesMission,
  type DiscoveryStateSeed,
  type PreparedSalesMissionForDiscovery,
} from "@/lib/graph/sales-mission-discovery";
import { getPrismaClient } from "@/lib/db/client";
import { persistDiscoveryResult, persistMissionProgress, persistMissionSearchProgress } from "@/lib/persistence/mission-persistence";
import { ContactRouteSchema } from "@/lib/sales/contact-schema";
import { ABSOLUTE_SCOUT_LIMITS } from "@/lib/settings/absolute-limits";
import { MissionProgressRecordSchema } from "@/lib/sales/mission-progress";
import {
  AccountExtractionCandidateSchema,
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
  type Budget,
} from "@/lib/sales/mission-schema";
import { coerceProspectAccountClassification } from "@/lib/sales/prospect-taxonomy";

export const ContactContinuationRequestSchema = z.object({
  additionalSearches: z.number().int().min(0).max(1).default(1),
  additionalPages: z.number().int().min(1).max(3).default(3),
  additionalModelCalls: z.number().int().min(0).max(1).default(0),
});

function expandedBudget(previous: Budget, request: z.infer<typeof ContactContinuationRequestSchema>): Budget {
  return BudgetSchema.parse({
    ...previous,
    maxSearches: Math.min(ABSOLUTE_SCOUT_LIMITS.maxSearches, previous.maxSearches + request.additionalSearches),
    maxPages: Math.min(ABSOLUTE_SCOUT_LIMITS.maxPages, previous.maxPages + request.additionalPages),
    maxModelCalls: Math.min(ABSOLUTE_SCOUT_LIMITS.maxModelCalls, previous.maxModelCalls + request.additionalModelCalls),
  });
}

function sourceMetadataFromRoutes(routes: unknown) {
  const parsed = z.array(ContactRouteSchema).safeParse(routes);
  if (!parsed.success) return { links: [], publicEmailHints: [], publicPhoneHints: [] };
  const links = parsed.data.filter((route) => route.contactPageUrl).map((route) => ({ url: route.contactPageUrl!, anchorText: route.targetRole, sameSite: true }));
  const emails = parsed.data.filter((route) => route.email).map((route) => ({ email: route.email!, sourceKind: route.evidenceKind === "MAILTO" ? "MAILTO" as const : "VISIBLE_TEXT" as const, surroundingText: route.evidenceExcerpt }));
  const phones = parsed.data.filter((route) => route.phone).map((route) => ({ phone: route.phone!, sourceKind: route.evidenceKind === "TEL" ? "TEL" as const : "VISIBLE_TEXT" as const, surroundingText: route.evidenceExcerpt }));
  return { links, publicEmailHints: emails, publicPhoneHints: phones };
}

export async function continueContactEnrichment(missionRunId: string, accountId: string, rawRequest: unknown) {
  const request = ContactContinuationRequestSchema.parse(rawRequest);
  const db = getPrismaClient();
  const run = await db.salesMissionRun.findUnique({ where: { id: missionRunId }, include: { mission: true, evidence: true, accounts: true, buyingSignals: true, auditEvents: { where: { eventType: "MISSION_PROGRESS" }, select: { payload: true } } } });
  if (!run) throw new Error("RUN_NOT_FOUND");
  if (run.status === "RUNNING") throw new Error("RUN_ALREADY_RUNNING");
  const selected = run.accounts.find((account) => account.id === accountId || account.accountKey === accountId);
  if (!selected) throw new Error("ACCOUNT_NOT_FOUND");

  const brief = SalesMissionBriefSchema.parse(run.mission.brief);
  const previousBudget = BudgetSchema.parse(run.budget);
  const prepared: PreparedSalesMissionForDiscovery = {
    missionId: run.missionId,
    missionRunId: run.id,
    graphVersion: run.graphVersion,
    brief,
    targetProfile: TargetProfileSchema.parse(run.targetProfile),
    searchStrategy: SearchStrategySchema.parse(run.searchStrategy),
    budget: expandedBudget(previousBudget, request),
    warnings: GraphWarningSchema.array().parse(run.warnings),
    errors: GraphErrorSchema.array().parse(run.errors),
    settingsVersion: run.settingsVersion ?? undefined,
    settingsSnapshot: run.settingsSnapshot ?? undefined,
  };
  const sources = run.evidence.map((source) => {
    const account = run.accounts.find((candidate) => candidate.id === source.accountId);
    return FetchedSourceReferenceSchema.parse({ sourceUrl: source.sourceUrl, finalUrl: source.finalUrl, status: source.status, mimeType: source.mimeType, title: source.title ?? undefined, readableExcerpt: source.readableExcerpt, byteCount: source.byteCount, contentHash: source.contentHash, retrievedAt: source.retrievedAt.toISOString(), redirectCount: source.redirectCount, searchQuery: source.searchQuery, ...sourceMetadataFromRoutes(account?.contactRoutes) });
  });
  const accounts = run.accounts.map((account) => DiscoveredAccountSchema.parse({ accountKey: account.accountKey, companyName: account.companyName, officialDomain: account.officialDomain ?? undefined, website: account.website ?? undefined, country: account.country ?? undefined, city: account.city ?? undefined, classification: coerceProspectAccountClassification(account.categories), relevanceHypothesis: account.relevanceHypothesis, discoveredSignals: account.discoveredSignals, possibleBuyerRoles: account.possibleBuyerRoles, discoveryEvidenceIds: account.discoveryEvidenceIds, unresolvedQuestions: account.unresolvedQuestions }));
  const sourceByHash = new Map(sources.map((source) => [source.contentHash, source]));
  const extractionCandidates = run.accounts.flatMap((account) => {
    const evidenceId = z.array(z.string()).parse(account.discoveryEvidenceIds).find((id) => id.startsWith("source:"));
    const source = evidenceId ? sourceByHash.get(evidenceId.slice(7)) : undefined;
    return source ? [AccountExtractionCandidateSchema.parse({ accountKey: account.accountKey, sourceUrl: source.sourceUrl, finalUrl: source.finalUrl, sourceContentHash: source.contentHash, sourceExcerpt: source.readableExcerpt, account: { companyName: account.companyName, officialDomain: account.officialDomain, website: account.website, country: account.country ?? null, city: account.city ?? null, classification: coerceProspectAccountClassification(account.categories), relevanceHypothesis: account.relevanceHypothesis, possibleBuyerRoles: account.possibleBuyerRoles, buyingSignals: [], unresolvedQuestions: account.unresolvedQuestions } })] : [];
  });
  const signals = run.buyingSignals.flatMap((signal) => {
    const source = sourceByHash.get(signal.sourceContentHash);
    const account = run.accounts.find((candidate) => candidate.id === signal.accountId);
    return source && account ? [VerifiedBuyingSignalSchema.parse({ signalId: signal.signalKey, accountKey: account.accountKey, companyName: account.companyName, signalType: signal.signalType, summary: signal.summary, eventDate: signal.eventDate?.toISOString().slice(0, 10) ?? null, freshness: signal.freshness, evidenceState: signal.evidenceState, verified: signal.verified, confidence: signal.confidence, verificationReason: signal.verificationReason, evidenceExcerpt: signal.evidenceExcerpt, sourceUrl: source.sourceUrl, sourceContentHash: signal.sourceContentHash, evidenceId: signal.evidenceId })] : [];
  });
  let sequence = Math.max(0, ...run.auditEvents.map((event) => { const parsed = MissionProgressRecordSchema.safeParse(event.payload); return parsed.success ? parsed.data.sequence : 0; }));
  const seed: DiscoveryStateSeed = { searchResults: SearchResultSchema.array().parse(run.searchResults), fetchedSources: sources, accountExtractionCandidates: extractionCandidates, discoveredAccounts: accounts, accountIds: accounts.map((account) => `account:${run.missionId}:${account.accountKey}`), buyingSignals: signals, buyingSignalIds: signals.map((signal) => `signal:${run.id}:${signal.signalId}`), evidenceIds: sources.map((source) => `evidence:${run.id}:${source.contentHash}`), budget: prepared.budget, warnings: prepared.warnings, errors: prepared.errors };
  const discovered = await discoverSalesMission(prepared, {
    skipCheckpoint: true,
    skipMarketSearch: true,
    contactAccountKeys: [selected.accountKey],
    onProgress: async (event) => { sequence += 1; const record = MissionProgressRecordSchema.parse({ ...event, sequence, occurredAt: new Date().toISOString() }); await persistMissionProgress({ missionId: run.missionId, missionRunId: run.id, sequence, event: record }); },
    onSearchProgress: async (event) => { await persistMissionSearchProgress({ missionId: run.missionId, missionRunId: run.id, event }); },
  }, seed);
  const persisted = await persistDiscoveryResult({ missionId: discovered.missionId, missionRunId: discovered.missionRunId, graphVersion: discovered.graphVersion, brief: discovered.brief, targetProfile: discovered.targetProfile, searchStrategy: discovered.searchStrategy, budget: discovered.budget, warnings: discovered.warnings, errors: discovered.errors, status: discovered.status, discoveryStage: discovered.discoveryStage, searchResults: discovered.searchResults, fetchedSources: discovered.fetchedSources, accounts: discovered.discoveredAccounts, buyingSignals: discovered.buyingSignals, settingsVersion: run.settingsVersion ?? undefined, settingsSnapshot: run.settingsSnapshot ?? undefined });
  return { discovered, persisted, request, accountId: selected.id };
}
