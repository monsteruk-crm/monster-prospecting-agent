import { beforeEach, describe, expect, test, vi } from "vitest";

const graphMocks = vi.hoisted(() => ({
  prepareSalesMission: vi.fn(),
  discoverSalesMission: vi.fn(),
  persistPreparedMission: vi.fn(),
  persistDiscoveryResult: vi.fn(),
}));

vi.mock("@/lib/graph/sales-mission-preparation", () => graphMocks);
vi.mock("@/lib/graph/sales-mission-discovery", () => graphMocks);
vi.mock("@/lib/persistence/mission-persistence", () => graphMocks);

import { POST } from "@/app/api/missions/discover/route";

const brief = {
  name: "Route discovery test",
  geographies: ["Germany"],
  accountCategories: ["TICKETED_EVENT_PROMOTER", "FESTIVAL_PRODUCER"],
  buyerRoles: ["Managing Director"],
};

const prepared = {
  missionId: "mission-route",
  missionRunId: "run-route",
  brief: { ...brief, owner: "unassigned", productFocus: "THE_MONSTER", requiredSignals: [], preferredSignals: [], freshnessWindowDays: 365, exclusions: [], instructions: "", limits: { maxSearches: 1, maxPages: 1, maxModelCalls: 12, maxCostUsd: 2, maxCandidateAccounts: 3 } },
  targetProfile: {
    geographies: ["Germany"],
    accountCategories: ["TICKETED_EVENT_PROMOTER", "FESTIVAL_PRODUCER"],
    excludedCategories: [],
    productFocus: "THE_MONSTER",
    requiredSignals: [],
    preferredSignals: [],
    targetBuyerRoles: ["Managing Director"],
    commercialScaleIndicators: ["ticketed audiences"],
    freshnessWindowDays: 365,
    maximumProspects: 3,
  },
  searchStrategy: {
    queryFamilies: [{ kind: "CATEGORY_DISCOVERY", queries: ["ticketed event promoters Germany"], maxQueries: 1 }],
    totalMaxQueries: 1,
  },
  budget: { maxSearches: 1, maxPages: 1, maxModelCalls: 12, maxCostUsd: 2, searchesUsed: 0, pagesUsed: 0, modelCallsUsed: 0, estimatedCostUsd: 0 },
  warnings: [],
  errors: [],
};

const discovered = {
  ...prepared,
  graphVersion: "act-1-discovery-v1",
  status: "RUNNING",
  discoveryStage: "READY_FOR_REVIEW",
  searchResults: [],
  fetchedSources: [],
  accountExtractionCandidates: [],
  discoveredAccounts: [],
  accountIds: [],
  buyingSignals: [],
  buyingSignalIds: [],
  evidenceIds: [],
};

const persisted = {
  missionId: "mission-route",
  missionRunId: "run-route",
  persistedAt: "2026-08-05T00:00:00.000Z",
  accountIds: [],
  evidenceIds: [],
  buyingSignalIds: [],
  review: {
    id: "review:run-route",
    status: "PENDING",
    snapshot: {},
    decision: null,
  },
};

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/missions/discover", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/missions/discover", () => {
  beforeEach(() => {
    graphMocks.prepareSalesMission.mockReset().mockResolvedValue(prepared);
    graphMocks.discoverSalesMission.mockReset().mockResolvedValue(discovered);
    graphMocks.persistPreparedMission.mockReset().mockResolvedValue(undefined);
    graphMocks.persistDiscoveryResult.mockReset().mockResolvedValue(persisted);
  });

  test("validates the brief and invokes preparation followed by discovery", async () => {
    const response = await POST(jsonRequest(brief));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(graphMocks.prepareSalesMission).toHaveBeenCalledTimes(1);
    expect(graphMocks.discoverSalesMission).toHaveBeenCalledWith(
      expect.objectContaining({ missionId: "mission-route", missionRunId: "run-route" }),
      {},
    );
    expect(graphMocks.persistPreparedMission).toHaveBeenCalledTimes(1);
    expect(graphMocks.persistDiscoveryResult).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      missionId: "mission-route",
      discoveryStage: "READY_FOR_REVIEW",
      fetchedSources: [],
      accounts: [],
      buyingSignals: [],
      review: { id: "review:run-route", status: "PENDING" },
    });
  });

  test("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/missions/discover", {
      method: "POST",
      body: "not-json",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INVALID_JSON" } });
  });

  test("rejects an invalid sales brief before running discovery", async () => {
    const response = await POST(jsonRequest({ name: "missing required fields" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INVALID_SALES_MISSION_BRIEF" } });
    expect(graphMocks.prepareSalesMission).not.toHaveBeenCalled();
    expect(graphMocks.discoverSalesMission).not.toHaveBeenCalled();
  });
});
