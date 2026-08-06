import { describe, expect, test, vi } from "vitest";

import {
  discoverSalesMission,
  isLikelyNonFirstPartySource,
  type PreparedSalesMissionForDiscovery,
} from "@/lib/graph/sales-mission-discovery";
import { prepareSalesMission } from "@/lib/graph/sales-mission-preparation";
import type { AccountExtractionProposal } from "@/lib/sales/mission-schema";
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

function extractionResult(): AccountExtractionProposal {
  return {
    companyName: "Acme Events",
    officialDomain: null,
    website: null,
    country: "Germany",
    city: "Berlin",
    classification: {
      primaryCategory: "TICKETED_EVENT_PROMOTER" as const,
      secondaryCategories: ["PUBLIC_EVENT_CONTRACTOR"],
      subtypes: [],
      buyerModel: "PROMOTER" as const,
    },
    relevanceHypothesis: "The organisation appears to operate public ticketed programmes.",
    possibleBuyerRoles: ["Managing Director"],
    buyingSignals: [
      {
        signalType: "NEW_PROGRAMME" as const,
        summary: "A new public programme is described.",
        eventDate: null,
        evidenceExcerpt: "Official programme evidence",
      },
    ],
    unresolvedQuestions: ["Confirm the correct commercial owner."],
  };
}

function extractionDependencies() {
  return {
    extractAccount: vi.fn(async () => extractionResult()),
    extractContacts: vi.fn(async () => ({ contacts: [] })),
    verifySignals: vi.fn(async ({ signals }: { signals: Array<{ candidateId: string; evidenceExcerpt: string }> }) => ({
      signals: signals.map((signal) => ({
        candidateId: signal.candidateId,
        verified: true,
        evidenceState: "COMMERCIAL_SIGNAL" as const,
        confidence: 0.9,
        reason: "The fetched excerpt directly supports the candidate signal.",
        eventDate: null,
        evidenceExcerpt: signal.evidenceExcerpt,
      })),
    })),
  };
}

async function preparedMission(
  limits?: Partial<{
    maxSearches: number;
    maxPages: number;
    maxModelCalls: number;
    maxCandidateAccounts: number;
  }>,
  options: Partial<{ contactRequirement: "ANY_ROUTE" | "PUBLIC_EMAIL"; instructions: string }> = {},
): Promise<PreparedSalesMissionForDiscovery> {
  const prepared = await prepareSalesMission({
    name: "Discovery graph test",
    geographies: ["Germany"],
    accountCategories: ["TICKETED_EVENT_PROMOTER"],
    buyerRoles: ["Managing Director"],
    contactRequirement: options.contactRequirement,
    instructions: options.instructions,
    limits: {
      maxSearches: limits?.maxSearches ?? 2,
      maxPages: limits?.maxPages ?? 2,
      maxModelCalls: limits?.maxModelCalls ?? 20,
      maxCandidateAccounts: limits?.maxCandidateAccounts ?? 5,
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
  test("filters known non-first-party search results before safe fetching", () => {
    expect(isLikelyNonFirstPartySource("https://uk.trustpilot.com/categories/event_ticket_seller")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://uk.indeed.com/q-ticket-promoter-jobs.html")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://www.myfetetickets.com/")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://www.f6s.com/companies/tickets/united-kingdom/co")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://www.todaytix.com/london/category/all-experiences")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://secure.businesswire.com/news/home/20260225943147/en/example")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://www.britannica.com/topic/family-kinship")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://www.merriam-webster.com/dictionary/family")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://www.anydesk.com/en/downloads/windows")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://anydesk.en.softonic.com/")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://www.youtube.com/watch?v=1UFou72pWWc")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://www.wikihow.com/Types-of-Family")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://example.org/downloads/guide")).toBe(true);
    expect(isLikelyNonFirstPartySource("https://example.org/events/programme")).toBe(false);
  });

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
    const extraction = extractionDependencies();

    const state = await discoverSalesMission(prepared, { searchProvider, fetchSource, ...extraction });

    expect(events.filter((event) => event.startsWith("search:")).length).toBe(2);
    expect(events.findIndex((event) => event.startsWith("fetch:"))).toBe(2);
    expect(events.at(-1)).toBe("fetch:https://acme.org/contact");
    expect(state.searchResults).toHaveLength(1);
    expect(state.fetchedSources).toHaveLength(2);
    expect(state.fetchedSources[0].readableExcerpt).toBe("Official programme evidence");
    expect(state.discoveryStage).toBe("READY_FOR_REVIEW");
    expect(state.budget.searchesUsed).toBe(2);
    expect(state.budget.pagesUsed).toBe(2);
    expect(state.evidenceIds).toHaveLength(2);
    expect(state.discoveredAccounts[0].companyName).toBe("Acme Events");
    expect(state.buyingSignals[0]).toMatchObject({
      signalType: "NEW_PROGRAMME",
      verified: true,
      evidenceState: "COMMERCIAL_SIGNAL",
      freshness: "UNKNOWN",
    });
  });

  test("reports each executed query with cumulative bounded results", async () => {
    const prepared = await preparedMission({ maxSearches: 1, maxPages: 1 });
    const searchProgress = vi.fn();
    const searchProvider = {
      search: vi.fn(async (request) => [{
        title: "Acme programme",
        url: "https://acme.org/programme",
        snippet: "A current official programme.",
        providerRank: 1,
        query: request.query,
        discoveryTime: "2026-08-04T12:00:00.000Z",
      }]),
    };
    await discoverSalesMission(prepared, {
      searchProvider,
      fetchSource: vi.fn(async ({ url }: { url: string }) => fetchedSource(url)),
      ...extractionDependencies(),
      onSearchProgress: searchProgress,
    });

    expect(searchProgress).toHaveBeenCalledWith(expect.objectContaining({
      query: expect.any(String),
      status: "COMPLETED",
      resultCount: 1,
      searchesUsed: 1,
      searchResults: [expect.objectContaining({ url: "https://acme.org/programme" })],
    }));
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
    const extraction = extractionDependencies();

    const state = await discoverSalesMission(prepared, { searchProvider, fetchSource, ...extraction });

    expect(state.fetchedSources).toHaveLength(1);
    expect(state.errors).toContainEqual({
      code: "SOURCE_FETCH_PRIVATE_ADDRESS_BLOCKED",
      message: "Official-source fetch failed for https://blocked.org/programme: Private destination blocked.",
      retryable: false,
    });
    expect(state.discoveryStage).toBe("READY_FOR_REVIEW");
    expect(state.status).toBe("RUNNING");
  });

  test("filters extracted accounts when the brief requires a public email", async () => {
    const prepared = await preparedMission({ maxSearches: 1, maxPages: 1 }, { instructions: "Return only contacts with an email" });
    const searchProvider = {
      search: vi.fn(async (request) => [{
        title: "Official source",
        url: "https://acme.org/contact",
        snippet: "Contact details.",
        providerRank: 1,
        query: request.query,
        discoveryTime: "2026-08-04T12:00:00.000Z",
      }]),
    };
    const state = await discoverSalesMission(prepared, {
      searchProvider,
      fetchSource: vi.fn(async ({ url }: { url: string }) => fetchedSource(url, "Official programme evidence")),
      ...extractionDependencies(),
    });

    expect(state.discoveredAccounts).toHaveLength(1);
    expect(state.accountExtractionCandidates).toHaveLength(1);
    expect(state.warnings).toContainEqual({
      code: "CONTACT_REQUIREMENT_NOT_MET",
      message: "Acme Events remains visible for audit, but does not satisfy the public-email requirement.",
    });
  });

  test("keeps a bounded email window when the public address is below the excerpt prefix", async () => {
    const prepared = await preparedMission({ maxSearches: 1, maxPages: 1 }, { contactRequirement: "PUBLIC_EMAIL" });
    const searchProvider = {
      search: vi.fn(async (request) => [{
        title: "Official contact page",
        url: "https://acme.org/contact",
        snippet: "Contact details.",
        providerRank: 1,
        query: request.query,
        discoveryTime: "2026-08-04T12:00:00.000Z",
      }]),
    };
    const state = await discoverSalesMission(prepared, {
      searchProvider,
      fetchSource: vi.fn(async ({ url }: { url: string }) => fetchedSource(url, `${"x".repeat(700)} Contact partnerships@acme.org for enquiries.`)),
      ...extractionDependencies(),
    });

    expect(state.discoveredAccounts).toHaveLength(1);
    expect(state.accountExtractionCandidates[0].sourceExcerpt).toContain("partnerships@acme.org");
  });

  test("derives freshness only from a source-supported event date", async () => {
    const prepared = await preparedMission({ maxSearches: 1, maxPages: 1 });
    const extraction = extractionDependencies();
    extraction.extractAccount.mockResolvedValue({
      ...extractionResult(),
      buyingSignals: [
        {
          signalType: "NEW_PROGRAMME",
          summary: "A dated public programme is described.",
          eventDate: "2026-07-15",
          evidenceExcerpt: "Official programme evidence 2026-07-15",
        },
      ],
    });
    const searchProvider = {
      search: vi.fn(async (request) => [
        {
          title: "Dated source",
          url: "https://acme.org/programme",
          snippet: "Dated.",
          providerRank: 1,
          query: request.query,
          discoveryTime: "2026-08-04T12:00:00.000Z",
        },
      ]),
    };
    const fetchSource = vi.fn(async ({ url }: { url: string }) =>
      fetchedSource(url, "Official programme evidence 2026-07-15"),
    );

    const state = await discoverSalesMission(prepared, {
      searchProvider,
      fetchSource,
      ...extraction,
      now: () => new Date("2026-08-04T12:00:00.000Z"),
    });

    expect(state.buyingSignals[0]).toMatchObject({
      eventDate: "2026-07-15",
      freshness: "CURRENT",
      verified: true,
    });
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
    const extraction = extractionDependencies();

    const state = await discoverSalesMission(prepared, { searchProvider, ...extraction });

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
    const extraction = extractionDependencies();

    const state = await discoverSalesMission(prepared, { searchProvider, fetchSource, ...extraction });

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
