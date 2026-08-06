import { describe, expect, test, vi } from "vitest";

import type { PrismaClient } from "@/prisma/generated/client";
import { persistDiscoveryResult } from "@/lib/persistence/mission-persistence";

function fakeClient() {
  const makeModel = () => ({
    upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => create),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => data),
  });
  const missionReview = {
    upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({
      ...create,
      decision: null,
    })),
  };
  const transaction = {
    salesMission: makeModel(),
    salesMissionRun: makeModel(),
    prospectAccount: makeModel(),
    missionEvidence: makeModel(),
    buyingSignal: makeModel(),
    missionReview,
    missionAuditEvent: makeModel(),
  };
  const client = {
    ...transaction,
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
  } as unknown as PrismaClient;
  return { client, transaction };
}

const prepared = {
  missionId: "mission-persist-test",
  missionRunId: "run-persist-test",
  graphVersion: "act-1-discovery-v1",
  brief: {
    name: "Persistence test",
    owner: "Nick",
    geographies: ["Germany"],
    accountCategories: ["FAMILY_ATTRACTION_OPERATOR" as const, "LEISURE_ENTERTAINMENT_GROUP" as const],
    productFocus: "THE_MONSTER" as const,
    contactRequirement: "ANY_ROUTE" as const,
    requiredSignals: [],
    preferredSignals: [],
    buyerRoles: ["Managing Director"],
    freshnessWindowDays: 365,
    exclusions: [],
    instructions: "",
    limits: { maxSearches: 1, maxPages: 1, maxModelCalls: 2, maxCostUsd: 2, maxCandidateAccounts: 1 },
  },
  targetProfile: {
    geographies: ["Germany"],
    accountCategories: ["FAMILY_ATTRACTION_OPERATOR" as const, "LEISURE_ENTERTAINMENT_GROUP" as const],
    excludedCategories: [],
    productFocus: "THE_MONSTER" as const,
    requiredSignals: [],
    preferredSignals: [],
    targetBuyerRoles: ["Managing Director"],
    commercialScaleIndicators: ["ticketed audiences"],
    freshnessWindowDays: 365,
    maximumProspects: 1,
  },
  searchStrategy: {
    queryFamilies: [{ kind: "CATEGORY_DISCOVERY" as const, queries: ["visitor attractions Germany"], maxQueries: 1 }],
    totalMaxQueries: 1,
  },
  budget: { maxSearches: 1, maxPages: 1, maxModelCalls: 2, maxCostUsd: 2, searchesUsed: 1, pagesUsed: 1, modelCallsUsed: 2, estimatedCostUsd: 0 },
  warnings: [],
  errors: [],
};

describe("mission persistence", () => {
  test("upserts business entities and creates a pending review snapshot idempotently", async () => {
    const { client, transaction } = fakeClient();
    const source = {
      sourceUrl: "https://acme.org/programme",
      finalUrl: "https://acme.org/programme",
      status: 200,
      mimeType: "text/html",
      title: "Acme programme",
      readableExcerpt: "Acme programme 2026",
      byteCount: 22,
      contentHash: "b".repeat(64),
      retrievedAt: "2026-08-05T00:00:00.000Z",
      redirectCount: 0,
      searchQuery: "visitor attractions Germany",
    };
    const account = {
      accountKey: "acme.org:acme events",
      companyName: "Acme Events",
      officialDomain: "https://acme.org",
      website: "https://acme.org/programme",
      classification: { primaryCategory: "FAMILY_ATTRACTION_OPERATOR" as const, secondaryCategories: ["LEISURE_ENTERTAINMENT_GROUP"] as ["LEISURE_ENTERTAINMENT_GROUP"], subtypes: [], buyerModel: "OWNER_OPERATOR" as const },
      relevanceHypothesis: "The organisation operates a public attraction.",
      discoveredSignals: [],
      possibleBuyerRoles: ["Managing Director"],
      discoveryEvidenceIds: [`source:${source.contentHash}`],
      unresolvedQuestions: [],
    };
    const signal = {
      signalId: "signal:one",
      accountKey: account.accountKey,
      companyName: account.companyName,
      signalType: "NEW_PROGRAMME" as const,
      summary: "A new programme is described.",
      eventDate: null,
      freshness: "UNKNOWN" as const,
      evidenceState: "MISSING_INFORMATION" as const,
      verified: false,
      confidence: 0,
      verificationReason: "The source did not support the claim.",
      evidenceExcerpt: "",
      sourceUrl: source.sourceUrl,
      sourceContentHash: source.contentHash,
      evidenceId: `source:${source.contentHash}`,
    };
    const input = {
      ...prepared,
      status: "RUNNING",
      discoveryStage: "READY_FOR_REVIEW",
      searchResults: [],
      fetchedSources: [source],
      accounts: [account],
      buyingSignals: [signal],
    };

    const first = await persistDiscoveryResult(input, client);
    const second = await persistDiscoveryResult(input, client);

    expect(first.review).toMatchObject({ id: "review:run-persist-test", status: "PENDING" });
    expect(first.accountIds).toEqual(["account:mission-persist-test:acme.org:acme events"]);
    expect(first.evidenceIds).toEqual([`evidence:run-persist-test:${source.contentHash}`]);
    expect(first.buyingSignalIds).toEqual(["signal:run-persist-test:signal:one"]);
    expect(second.review.id).toBe(first.review.id);
    expect(transaction.salesMissionRun.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PAUSED_FOR_REVIEW" }),
    }));
    expect(transaction.prospectAccount.upsert).toHaveBeenCalledTimes(2);
    expect(transaction.missionEvidence.upsert).toHaveBeenCalledTimes(2);
    expect(transaction.buyingSignal.upsert).toHaveBeenCalledTimes(2);
  });
});
