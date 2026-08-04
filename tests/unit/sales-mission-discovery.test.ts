import { describe, expect, test, vi } from "vitest";

import {
  discoverSalesMission,
  type PreparedSalesMissionForDiscovery,
} from "@/lib/graph/sales-mission-discovery";
import { prepareSalesMission } from "@/lib/graph/sales-mission-preparation";
import { SafeFetchError, safeFetchTool, type SafeFetchResult } from "@/lib/tools/safe-fetch";

const contentHash = "a".repeat(64);

function fetchedSource(url: string, text = "Official programme evidence"): SafeFetchResult {
  return {
    requestedUrl: url,
    finalUrl: url,
    status: 200,
    mimeType: "text/html",
    title: "Official source",
    readableText: text,
    byteCount: text.length,
    contentHash,
    retrievedAt: "2026-08-04T12:00:00.000Z",
    redirectCount: 0,
  };
}

async function preparedMission(
  limits?: Partial<{
    maxSearches: number;
    maxPages: number;
  }>,
): Promise<PreparedSalesMissionForDiscovery> {
  const prepared = await prepareSalesMission({
    name: "Discovery graph test",
    geographies: ["Germany"],
    accountCategories: ["TICKETED_EVENT_PROMOTER"],
    buyerRoles: ["Managing Director"],
    limits: {
      maxSearches: limits?.maxSearches ?? 2,
      maxPages: limits?.maxPages ?? 2,
    },
  });

  if (!prepared.targetProfile || !prepared.searchStrategy) {
    throw new Error("The preparation graph did not produce discovery inputs.");
  }

  return {
    ...prepared,
    targetProfile: prepared.targetProfile,
    searchStrategy: prepared.searchStrategy,
  };
}

describe("sales mission discovery graph", () => {
  test("runs the search provider before safe source fetching", async () => {
    const prepared = await preparedMission();
    const events: string[] = [];
    const searchProvider = {
      search: vi.fn(async (request) => {
        events.push(`search:${request.query}`);
        return [
          {
            title: "Acme programme",
            url: "https://acme.org/programme#section",
            snippet: "A current official programme.",
            providerRank: 1,
            query: request.query,
            discoveryTime: "2026-08-04T12:00:00.000Z",
          },
          {
            title: "Acme duplicate",
            url: "https://acme.org/programme",
            snippet: "Duplicate URL.",
            providerRank: 2,
            query: request.query,
            discoveryTime: "2026-08-04T12:00:00.000Z",
          },
        ];
      }),
    };
    const fetchSource = vi.fn(async ({ url }: { url: string }) => {
      events.push(`fetch:${url}`);
      return fetchedSource(url);
    });

    const state = await discoverSalesMission(prepared, { searchProvider, fetchSource });

    expect(events.filter((event) => event.startsWith("search:")).length).toBe(2);
    expect(events.findIndex((event) => event.startsWith("fetch:"))).toBe(2);
    expect(events.at(-1)).toBe("fetch:https://acme.org/programme");
    expect(state.searchResults).toHaveLength(1);
    expect(state.fetchedSources).toHaveLength(1);
    expect(state.fetchedSources[0].readableExcerpt).toBe("Official programme evidence");
    expect(state.discoveryStage).toBe("READY_FOR_INVESTIGATION");
    expect(state.budget.searchesUsed).toBe(2);
    expect(state.budget.pagesUsed).toBe(1);
    expect(state.evidenceIds).toEqual([`source:${contentHash}`]);
  });

  test("keeps a partial result when one official source fetch fails", async () => {
    const prepared = await preparedMission();
    const fetchSource = vi.fn(async ({ url }: { url: string }) => {
      if (url.includes("blocked")) {
        throw new SafeFetchError("PRIVATE_ADDRESS_BLOCKED", "Private destination blocked.", url);
      }
      return fetchedSource(url);
    });
    const searchProvider = {
      search: vi.fn(async (request) => [
        {
          title: "Good source",
          url: "https://acme.org/programme",
          snippet: "Good.",
          providerRank: 1,
          query: request.query,
          discoveryTime: "2026-08-04T12:00:00.000Z",
        },
        {
          title: "Blocked source",
          url: "https://blocked.org/programme",
          snippet: "Blocked.",
          providerRank: 2,
          query: request.query,
          discoveryTime: "2026-08-04T12:00:00.000Z",
        },
      ]),
    };

    const state = await discoverSalesMission(prepared, { searchProvider, fetchSource });

    expect(state.fetchedSources).toHaveLength(1);
    expect(state.errors).toContainEqual({
      code: "SOURCE_FETCH_PRIVATE_ADDRESS_BLOCKED",
      message: "Official-source fetch failed for https://blocked.org/programme: Private destination blocked.",
      retryable: false,
    });
    expect(state.discoveryStage).toBe("READY_FOR_INVESTIGATION");
    expect(state.status).toBe("RUNNING");
  });

  test("uses safe_fetchTool as the default source fetcher", async () => {
    const prepared = await preparedMission({ maxSearches: 1, maxPages: 1 });
    const searchProvider = {
      search: vi.fn(async (request) => [
        {
          title: "Official source",
          url: "https://acme.org/programme",
          snippet: "Official.",
          providerRank: 1,
          query: request.query,
          discoveryTime: "2026-08-04T12:00:00.000Z",
        },
      ]),
    };
    const invoke = vi
      .spyOn(safeFetchTool, "invoke")
      .mockResolvedValue(fetchedSource("https://acme.org/programme") as never);

    const state = await discoverSalesMission(prepared, { searchProvider });

    expect(invoke).toHaveBeenCalledWith({ url: "https://acme.org/programme" });
    expect(state.fetchedSources).toHaveLength(1);
  });

  test("enforces search and page budgets", async () => {
    const prepared = await preparedMission({ maxSearches: 1, maxPages: 1 });
    const searchProvider = {
      search: vi.fn(async (request) => [
        {
          title: "Source one",
          url: "https://one.org",
          snippet: "One.",
          providerRank: 1,
          query: request.query,
          discoveryTime: "2026-08-04T12:00:00.000Z",
        },
        {
          title: "Source two",
          url: "https://two.org",
          snippet: "Two.",
          providerRank: 2,
          query: request.query,
          discoveryTime: "2026-08-04T12:00:00.000Z",
        },
      ]),
    };
    const fetchSource = vi.fn(async ({ url }: { url: string }) => fetchedSource(url));

    const state = await discoverSalesMission(prepared, { searchProvider, fetchSource });

    expect(searchProvider.search).toHaveBeenCalledTimes(1);
    expect(fetchSource).toHaveBeenCalledTimes(1);
    expect(state.budget.searchesUsed).toBe(1);
    expect(state.budget.pagesUsed).toBe(1);
    expect(state.errors).toContainEqual({
      code: "SOURCE_PAGE_BUDGET_REACHED",
      message: "Official-source fetching stopped at the mission limit of 1 pages.",
      retryable: false,
    });
  });
});
