import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prepareSalesMission: vi.fn(),
  persistPreparedMission: vi.fn(),
}));

vi.mock("@/lib/graph/sales-mission-preparation", () => mocks);
vi.mock("@/lib/persistence/mission-persistence", () => mocks);

import { POST } from "@/app/api/missions/route";

const brief = {
  name: "Preparation persistence test",
  geographies: ["Germany"],
  accountCategories: ["MUNICIPAL_CITY_EVENTS_ORGANISATION", "DESTINATION_TOURISM_ORGANISATION"],
  buyerRoles: ["Managing Director"],
};

const prepared = {
  missionId: "mission-prepared-route",
  missionRunId: "run-prepared-route",
  graphVersion: "act-1-preparation-v1",
  brief: {
    ...brief,
    owner: "unassigned",
    productFocus: "THE_MONSTER",
    requiredSignals: [],
    preferredSignals: [],
    freshnessWindowDays: 365,
    exclusions: [],
    instructions: "",
    limits: { maxSearches: 1, maxPages: 1, maxModelCalls: 2, maxCostUsd: 2, maxCandidateAccounts: 1 },
  },
  targetProfile: {
    geographies: ["Germany"],
    accountCategories: ["MUNICIPAL_CITY_EVENTS_ORGANISATION", "DESTINATION_TOURISM_ORGANISATION"],
    excludedCategories: [],
    productFocus: "THE_MONSTER",
    requiredSignals: [],
    preferredSignals: [],
    targetBuyerRoles: ["Managing Director"],
    commercialScaleIndicators: ["ticketed audiences"],
    freshnessWindowDays: 365,
    maximumProspects: 1,
  },
  searchStrategy: {
    queryFamilies: [{ kind: "CATEGORY_DISCOVERY", queries: ["visitor attractions Germany"], maxQueries: 1 }],
    totalMaxQueries: 1,
  },
  budget: { maxSearches: 1, maxPages: 1, maxModelCalls: 2, maxCostUsd: 2, searchesUsed: 0, pagesUsed: 0, modelCallsUsed: 0, estimatedCostUsd: 0 },
  warnings: [],
  errors: [],
  status: "READY_FOR_DISCOVERY",
};

function request(body: unknown) {
  return new Request("http://localhost/api/missions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/missions persistence", () => {
  beforeEach(() => {
    mocks.prepareSalesMission.mockReset().mockResolvedValue(prepared);
    mocks.persistPreparedMission.mockReset().mockResolvedValue(undefined);
  });

  test("persists the prepared mission before returning it", async () => {
    const response = await POST(request(brief));

    expect(response.status).toBe(201);
    expect(mocks.persistPreparedMission).toHaveBeenCalledWith(
      expect.objectContaining({ missionId: "mission-prepared-route", missionRunId: "run-prepared-route" }),
    );
  });

  test("returns a typed persistence error when the database write fails", async () => {
    mocks.persistPreparedMission.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request(brief));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MISSION_PERSISTENCE_FAILED" },
    });
  });
});
