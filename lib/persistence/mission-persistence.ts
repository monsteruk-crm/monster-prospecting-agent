import { getPrismaClient } from "@/lib/db/client";
import {
  Prisma,
  type PrismaClient,
} from "@/prisma/generated/client";
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
  type Budget,
  type DiscoveredAccount,
  type FetchedSourceReference,
  type SalesMissionBrief,
  type SearchResult,
  type SearchStrategy,
  type TargetProfile,
  type VerifiedBuyingSignal,
} from "@/lib/sales/mission-schema";
import { scoreProspectAccount } from "@/lib/sales/score-engine";
import { deriveContactRoutes, requiresPublicEmail } from "@/lib/sales/contact-route-engine";
import {
  PersistedReviewSchema,
  type PersistedReview,
} from "@/lib/sales/review-schema";
import { z } from "zod";
import {
  MissionProgressRecordSchema,
  MissionSearchProgressEventSchema,
  type MissionSearchProgressEvent,
  type MissionProgressRecord,
} from "@/lib/sales/mission-progress";

type GraphWarning = z.infer<typeof GraphWarningSchema>;
type GraphError = z.infer<typeof GraphErrorSchema>;

export type PreparedMissionPersistenceInput = {
  missionId: string;
  missionRunId: string;
  graphVersion: string;
  brief: SalesMissionBrief;
  targetProfile: TargetProfile;
  searchStrategy: SearchStrategy;
  budget: Budget;
  warnings: GraphWarning[];
  errors: GraphError[];
};

export type DiscoveryPersistenceInput = PreparedMissionPersistenceInput & {
  status: string;
  discoveryStage: string;
  searchResults: SearchResult[];
  fetchedSources: FetchedSourceReference[];
  accounts: DiscoveredAccount[];
  buyingSignals: VerifiedBuyingSignal[];
};

export type PersistedDiscovery = {
  missionId: string;
  missionRunId: string;
  review: PersistedReview;
  persistedAt: string;
  accountIds: string[];
  evidenceIds: string[];
  buyingSignalIds: string[];
};

export type PersistMissionProgressInput = {
  missionId: string;
  missionRunId: string;
  sequence: number;
  event: MissionProgressRecord;
};

export type PersistMissionSearchProgressInput = {
  missionId: string;
  missionRunId: string;
  event: MissionSearchProgressEvent;
};

type PersistenceClient = PrismaClient | Prisma.TransactionClient;

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function accountEntityId(missionId: string, accountKey: string): string {
  return `account:${missionId}:${accountKey}`;
}

function evidenceEntityId(missionRunId: string, contentHash: string): string {
  return `evidence:${missionRunId}:${contentHash}`;
}

function signalEntityId(missionRunId: string, signalId: string): string {
  return `signal:${missionRunId}:${signalId}`;
}

function reviewEntityId(missionRunId: string): string {
  return `review:${missionRunId}`;
}

function auditEntityId(idempotencyKey: string): string {
  return `audit:${idempotencyKey}`;
}

function eventDateValue(eventDate: string | null): Date | null {
  return eventDate ? new Date(`${eventDate}T00:00:00.000Z`) : null;
}

function parsePreparedInput(input: PreparedMissionPersistenceInput): PreparedMissionPersistenceInput {
  return {
    ...input,
    brief: SalesMissionBriefSchema.parse(input.brief),
    targetProfile: TargetProfileSchema.parse(input.targetProfile),
    searchStrategy: SearchStrategySchema.parse(input.searchStrategy),
    budget: BudgetSchema.parse(input.budget),
    warnings: GraphWarningSchema.array().parse(input.warnings),
    errors: GraphErrorSchema.array().parse(input.errors),
  };
}

function persistPreparedMissionRows(
  client: PersistenceClient,
  input: PreparedMissionPersistenceInput,
) {
  return client.salesMission.upsert({
    where: { id: input.missionId },
    create: {
      id: input.missionId,
      name: input.brief.name,
      owner: input.brief.owner,
      productFocus: input.brief.productFocus,
      status: "READY_FOR_DISCOVERY",
      brief: asJson(input.brief),
    },
    update: {
      name: input.brief.name,
      owner: input.brief.owner,
      productFocus: input.brief.productFocus,
      brief: asJson(input.brief),
    },
  }).then(async () => {
    await client.salesMissionRun.upsert({
      where: { id: input.missionRunId },
      create: {
        id: input.missionRunId,
        missionId: input.missionId,
        graphVersion: input.graphVersion,
        status: "READY_FOR_DISCOVERY",
        discoveryStage: "SEARCH_PROVIDER",
        targetProfile: asJson(input.targetProfile),
        searchStrategy: asJson(input.searchStrategy),
        budget: asJson(input.budget),
        searchResults: asJson([]),
        evidenceIds: asJson([]),
        accountIds: asJson([]),
        buyingSignalIds: asJson([]),
        warnings: asJson(input.warnings),
        errors: asJson(input.errors),
      },
      update: {
        graphVersion: input.graphVersion,
        targetProfile: asJson(input.targetProfile),
        searchStrategy: asJson(input.searchStrategy),
        budget: asJson(input.budget),
        warnings: asJson(input.warnings),
        errors: asJson(input.errors),
      },
    });

    await client.missionAuditEvent.upsert({
      where: { idempotencyKey: `${input.missionRunId}:mission-prepared` },
      create: {
        id: auditEntityId(`${input.missionRunId}:mission-prepared`),
        idempotencyKey: `${input.missionRunId}:mission-prepared`,
        missionId: input.missionId,
        missionRunId: input.missionRunId,
        eventType: "MISSION_PREPARED",
        payload: asJson({ graphVersion: input.graphVersion }),
      },
      update: {
        payload: asJson({ graphVersion: input.graphVersion }),
      },
    });
  });
}

export async function persistPreparedMission(
  rawInput: PreparedMissionPersistenceInput,
  client: PersistenceClient = getPrismaClient(),
): Promise<void> {
  const input = parsePreparedInput(rawInput);
  await client.$transaction(async (transaction) => {
    await persistPreparedMissionRows(transaction, input);
  });
}

export async function persistMissionProgress(
  rawInput: PersistMissionProgressInput,
  client: PersistenceClient = getPrismaClient(),
): Promise<void> {
  const event = MissionProgressRecordSchema.parse(rawInput.event);
  const idempotencyKey = `${rawInput.missionRunId}:progress:${rawInput.sequence}`;
  await client.$transaction(async (transaction) => {
    await transaction.salesMissionRun.update({
      where: { id: rawInput.missionRunId },
      data: {
        status: event.status,
        discoveryStage: event.stage,
      },
    });
    await transaction.missionAuditEvent.upsert({
      where: { idempotencyKey },
      create: {
        id: `audit:${idempotencyKey}`,
        idempotencyKey,
        missionId: rawInput.missionId,
        missionRunId: rawInput.missionRunId,
        eventType: "MISSION_PROGRESS",
        payload: asJson(event),
        occurredAt: new Date(event.occurredAt),
      },
      update: { payload: asJson(event), occurredAt: new Date(event.occurredAt) },
    });
  });
}

export async function persistMissionSearchProgress(
  rawInput: PersistMissionSearchProgressInput,
  client: PersistenceClient = getPrismaClient(),
): Promise<void> {
  const event = MissionSearchProgressEventSchema.parse(rawInput.event);
  const idempotencyKey = `${rawInput.missionRunId}:search:${event.queryIndex}:${event.query}:${event.searchesUsed}`;
  await client.$transaction(async (transaction) => {
    const run = await transaction.salesMissionRun.findUnique({
      where: { id: rawInput.missionRunId },
      select: { budget: true },
    });
    const budget = run?.budget && typeof run.budget === "object" && !Array.isArray(run.budget)
      ? { ...(run.budget as Record<string, unknown>), searchesUsed: event.searchesUsed }
      : undefined;
    await transaction.salesMissionRun.update({
      where: { id: rawInput.missionRunId },
      data: {
        status: "RUNNING",
        discoveryStage: "SEARCH_PROVIDER",
        searchResults: asJson(event.searchResults),
        ...(budget ? { budget: asJson(budget) } : {}),
      },
    });
    await transaction.missionAuditEvent.upsert({
      where: { idempotencyKey },
      create: {
        id: `audit:${idempotencyKey}`,
        idempotencyKey,
        missionId: rawInput.missionId,
        missionRunId: rawInput.missionRunId,
        eventType: "MISSION_SEARCH_PROGRESS",
        payload: asJson(event),
      },
      update: { payload: asJson(event) },
    });
  });
}

export async function listMissionRuns(
  limit = 20,
  client: PersistenceClient = getPrismaClient(),
) {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  return client.salesMissionRun.findMany({
    orderBy: { startedAt: "desc" },
    take: boundedLimit,
    select: {
      id: true,
      status: true,
      discoveryStage: true,
      startedAt: true,
      completedAt: true,
      mission: { select: { id: true, name: true, owner: true, productFocus: true } },
      review: { select: { status: true } },
    },
  });
}

export async function persistDiscoveryResult(
  rawInput: DiscoveryPersistenceInput,
  client: PersistenceClient = getPrismaClient(),
): Promise<PersistedDiscovery> {
  const prepared = parsePreparedInput(rawInput);
  const searchResults = z.array(SearchResultSchema).parse(rawInput.searchResults);
  const fetchedSources = z.array(FetchedSourceReferenceSchema).parse(rawInput.fetchedSources);
  const accounts = z.array(DiscoveredAccountSchema).parse(rawInput.accounts);
    const buyingSignals = z.array(VerifiedBuyingSignalSchema).parse(rawInput.buyingSignals);
    const persistedAt = new Date();

  return client.$transaction(async (transaction) => {
    await persistPreparedMissionRows(transaction, prepared);

    const accountIdsByKey = new Map<string, string>();
    for (const account of accounts) {
      const accountSource = fetchedSources.find((source) =>
        account.discoveryEvidenceIds.includes(`source:${source.contentHash}`),
      );
      const contactRoutes = deriveContactRoutes(account, fetchedSources, prepared.brief.buyerRoles, {
        requirePublicEmail: requiresPublicEmail(prepared.brief),
      });
      if (requiresPublicEmail(prepared.brief) && contactRoutes.length === 0) {
        continue;
      }
      const score = scoreProspectAccount(
        account,
        buyingSignals,
        prepared.brief,
        accountSource ?? { status: 200, readableExcerpt: "" },
        contactRoutes,
      );
      const id = accountEntityId(prepared.missionId, account.accountKey);
      accountIdsByKey.set(account.accountKey, id);
      await transaction.prospectAccount.upsert({
        where: {
          missionId_accountKey: {
            missionId: prepared.missionId,
            accountKey: account.accountKey,
          },
        },
        create: {
          id,
          missionId: prepared.missionId,
          missionRunId: prepared.missionRunId,
          accountKey: account.accountKey,
          companyName: account.companyName,
          officialDomain: account.officialDomain,
          website: account.website,
          country: account.country,
          city: account.city,
          categories: asJson(account.categories),
          relevanceHypothesis: account.relevanceHypothesis,
          discoveredSignals: asJson(account.discoveredSignals),
          possibleBuyerRoles: asJson(account.possibleBuyerRoles),
          discoveryEvidenceIds: asJson(account.discoveryEvidenceIds),
          unresolvedQuestions: asJson(account.unresolvedQuestions),
          score: asJson(score),
          contactRoutes: asJson(contactRoutes),
          firstMoveDraft: Prisma.JsonNull,
        },
        update: {
          missionRunId: prepared.missionRunId,
          companyName: account.companyName,
          officialDomain: account.officialDomain,
          website: account.website,
          country: account.country,
          city: account.city,
          categories: asJson(account.categories),
          relevanceHypothesis: account.relevanceHypothesis,
          discoveredSignals: asJson(account.discoveredSignals),
          possibleBuyerRoles: asJson(account.possibleBuyerRoles),
          discoveryEvidenceIds: asJson(account.discoveryEvidenceIds),
          unresolvedQuestions: asJson(account.unresolvedQuestions),
          score: asJson(score),
          contactRoutes: asJson(contactRoutes),
        },
      });
    }

    const evidenceIds: string[] = [];
    const evidenceIdsByHash = new Map<string, string>();
    for (const source of fetchedSources) {
      const id = evidenceEntityId(prepared.missionRunId, source.contentHash);
      const accountKey = accounts.find((account) =>
        account.discoveryEvidenceIds.includes(`source:${source.contentHash}`),
      )?.accountKey;
      const accountId = accountKey ? accountIdsByKey.get(accountKey) : undefined;
      evidenceIds.push(id);
      evidenceIdsByHash.set(source.contentHash, id);
      await transaction.missionEvidence.upsert({
        where: {
          missionRunId_contentHash: {
            missionRunId: prepared.missionRunId,
            contentHash: source.contentHash,
          },
        },
        create: {
          id,
          missionId: prepared.missionId,
          missionRunId: prepared.missionRunId,
          accountId,
          sourceUrl: source.sourceUrl,
          finalUrl: source.finalUrl,
          status: source.status,
          mimeType: source.mimeType,
          title: source.title,
          readableExcerpt: source.readableExcerpt,
          byteCount: source.byteCount,
          contentHash: source.contentHash,
          retrievedAt: new Date(source.retrievedAt),
          redirectCount: source.redirectCount,
          searchQuery: source.searchQuery,
        },
        update: {
          accountId,
          finalUrl: source.finalUrl,
          status: source.status,
          mimeType: source.mimeType,
          title: source.title,
          readableExcerpt: source.readableExcerpt,
          byteCount: source.byteCount,
          retrievedAt: new Date(source.retrievedAt),
          redirectCount: source.redirectCount,
          searchQuery: source.searchQuery,
        },
      });
    }

    const buyingSignalIds: string[] = [];
    for (const signal of buyingSignals) {
      const accountId = accountIdsByKey.get(signal.accountKey);
      const evidenceId = evidenceIdsByHash.get(signal.sourceContentHash);
      if (!accountId || !evidenceId) {
        continue;
      }
      const id = signalEntityId(prepared.missionRunId, signal.signalId);
      buyingSignalIds.push(id);
      await transaction.buyingSignal.upsert({
        where: {
          missionRunId_signalKey: {
            missionRunId: prepared.missionRunId,
            signalKey: signal.signalId,
          },
        },
        create: {
          id,
          missionId: prepared.missionId,
          missionRunId: prepared.missionRunId,
          accountId,
          evidenceId,
          signalKey: signal.signalId,
          signalType: signal.signalType,
          summary: signal.summary,
          eventDate: eventDateValue(signal.eventDate),
          freshness: signal.freshness,
          evidenceState: signal.evidenceState,
          verified: signal.verified,
          confidence: signal.confidence,
          verificationReason: signal.verificationReason,
          evidenceExcerpt: signal.evidenceExcerpt,
          sourceContentHash: signal.sourceContentHash,
        },
        update: {
          accountId,
          evidenceId,
          signalType: signal.signalType,
          summary: signal.summary,
          eventDate: eventDateValue(signal.eventDate),
          freshness: signal.freshness,
          evidenceState: signal.evidenceState,
          verified: signal.verified,
          confidence: signal.confidence,
          verificationReason: signal.verificationReason,
          evidenceExcerpt: signal.evidenceExcerpt,
          sourceContentHash: signal.sourceContentHash,
        },
      });
    }

    const reviewSnapshotId = reviewEntityId(prepared.missionRunId);
    const snapshot = {
      missionId: prepared.missionId,
      missionRunId: prepared.missionRunId,
      graphVersion: rawInput.graphVersion,
      discoveryStage: rawInput.discoveryStage,
      accountIds: [...accountIdsByKey.values()],
      evidenceIds,
      buyingSignalIds,
      budget: rawInput.budget,
      warnings: rawInput.warnings,
      errors: rawInput.errors,
    };
    const review = await transaction.missionReview.upsert({
      where: { missionRunId: prepared.missionRunId },
      create: {
        id: reviewSnapshotId,
        missionId: prepared.missionId,
        missionRunId: prepared.missionRunId,
        status: "PENDING",
        snapshot: asJson(snapshot),
      },
      update: {
        snapshot: asJson(snapshot),
      },
    });

    await transaction.salesMissionRun.update({
      where: { id: prepared.missionRunId },
      data: {
        graphVersion: rawInput.graphVersion,
        status: "PAUSED_FOR_REVIEW",
        discoveryStage: rawInput.discoveryStage,
        targetProfile: asJson(rawInput.targetProfile),
        searchStrategy: asJson(rawInput.searchStrategy),
        budget: asJson(rawInput.budget),
        searchResults: asJson(searchResults),
        evidenceIds: asJson(evidenceIds),
        accountIds: asJson([...accountIdsByKey.values()]),
        buyingSignalIds: asJson(buyingSignalIds),
        warnings: asJson(rawInput.warnings),
        errors: asJson(rawInput.errors),
        completedAt: persistedAt,
      },
    });

    await transaction.salesMission.update({
      where: { id: prepared.missionId },
      data: { status: "READY_FOR_REVIEW" },
    });

    const idempotencyKey = `${prepared.missionRunId}:discovery-persisted`;
    await transaction.missionAuditEvent.upsert({
      where: { idempotencyKey },
      create: {
        id: auditEntityId(idempotencyKey),
        idempotencyKey,
        missionId: prepared.missionId,
        missionRunId: prepared.missionRunId,
        eventType: "DISCOVERY_PERSISTED",
        payload: asJson({ reviewSnapshotId, accountCount: accounts.length, signalCount: buyingSignals.length }),
      },
      update: {
        payload: asJson({ reviewSnapshotId, accountCount: accounts.length, signalCount: buyingSignals.length }),
      },
    });

    return {
      missionId: prepared.missionId,
      missionRunId: prepared.missionRunId,
      review: PersistedReviewSchema.parse({
        id: review.id,
        status: review.status,
        snapshot: review.snapshot,
        decision: review.decision,
      }),
      persistedAt: persistedAt.toISOString(),
      accountIds: [...accountIdsByKey.values()],
      evidenceIds,
      buyingSignalIds,
    };
  });
}
