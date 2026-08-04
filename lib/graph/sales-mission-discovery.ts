import {
  END,
  GraphNode,
  ReducedValue,
  START,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";
import { z } from "zod";

import {
  SearchProviderRequestSchema,
  type SearchProvider,
} from "@/lib/discovery/search-provider";
import { duckDuckGoSearchProvider } from "@/lib/discovery/duckduckgo-search-provider";
import {
  BudgetSchema,
  DiscoveryStageSchema,
  FetchedSourceReferenceSchema,
  GraphErrorSchema,
  GraphWarningSchema,
  SalesMissionBriefSchema,
  SalesMissionRunStatusSchema,
  SearchResultSchema,
  SearchStrategySchema,
  TargetProfileSchema,
  type Budget,
  type FetchedSourceReference,
  type SalesMissionBrief,
  type SearchStrategy,
  type TargetProfile,
} from "@/lib/sales/mission-schema";
import {
  SafeFetchResultSchema,
  safeFetchTool,
  type SafeFetchInput,
  type SafeFetchResult,
} from "@/lib/tools/safe-fetch";

export const SALES_MISSION_DISCOVERY_GRAPH_VERSION = "act-1-discovery-v1";
const MAX_SEARCH_RESULTS_PER_QUERY = 100;
const MAX_EXCERPT_LENGTH = 600;

const appendOnly = <T extends z.ZodType>(schema: T) =>
  new ReducedValue(z.array(schema).default(() => []), {
    reducer: (current, update) => current.concat(update),
  });

export const SalesMissionDiscoveryGraphState = new StateSchema({
  missionId: z.string().min(1),
  missionRunId: z.string().min(1),
  graphVersion: z.string().min(1),
  brief: SalesMissionBriefSchema,
  targetProfile: TargetProfileSchema,
  searchStrategy: SearchStrategySchema,
  searchResults: appendOnly(SearchResultSchema),
  fetchedSources: appendOnly(FetchedSourceReferenceSchema),
  evidenceIds: appendOnly(z.string().min(1)),
  budget: BudgetSchema,
  warnings: appendOnly(GraphWarningSchema),
  errors: appendOnly(GraphErrorSchema),
  status: SalesMissionRunStatusSchema,
  discoveryStage: DiscoveryStageSchema,
});

export type SalesMissionDiscoveryGraphStateType = typeof SalesMissionDiscoveryGraphState;

export type PreparedSalesMissionForDiscovery = {
  missionId: string;
  missionRunId: string;
  brief: SalesMissionBrief;
  targetProfile: TargetProfile;
  searchStrategy: SearchStrategy;
  budget: Budget;
  warnings: Array<z.infer<typeof GraphWarningSchema>>;
  errors: Array<z.infer<typeof GraphErrorSchema>>;
};

export type FetchSource = (input: SafeFetchInput) => Promise<SafeFetchResult>;

export interface SalesMissionDiscoveryDependencies {
  searchProvider?: SearchProvider;
  fetchSource?: FetchSource;
}

function canonicaliseUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) {
      return code;
    }
  }
  return "UNKNOWN_ERROR";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The operation failed with an unknown error.";
}

function isRetryableFetchError(code: string): boolean {
  return ["TIMEOUT", "FETCH_FAILED", "DNS_LOOKUP_FAILED"].includes(code);
}

function uniqueSearchResults(results: readonly z.infer<typeof SearchResultSchema>[]): z.infer<typeof SearchResultSchema>[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const canonicalUrl = canonicaliseUrl(result.url);
    if (!canonicalUrl || seen.has(canonicalUrl)) {
      return false;
    }
    seen.add(canonicalUrl);
    return true;
  });
}

function createSearchProviderNode(
  dependencies: SalesMissionDiscoveryDependencies,
): GraphNode<SalesMissionDiscoveryGraphStateType> {
  const searchProvider = dependencies.searchProvider ?? duckDuckGoSearchProvider;

  return async (state) => {
    const queries = state.searchStrategy.queryFamilies.flatMap((family) => family.queries);
    const searchBudgetRemaining = Math.max(0, state.budget.maxSearches - state.budget.searchesUsed);
    const pageBudgetRemaining = Math.max(0, state.budget.maxPages - state.budget.pagesUsed);
    const resultLimit = Math.min(
      MAX_SEARCH_RESULTS_PER_QUERY,
      Math.max(1, pageBudgetRemaining),
    );
    const searchResults: Array<z.infer<typeof SearchResultSchema>> = [];
    const warnings: Array<z.infer<typeof GraphWarningSchema>> = [];
    const errors: Array<z.infer<typeof GraphErrorSchema>> = [];
    let searchesUsed = 0;

    if (pageBudgetRemaining === 0) {
      return {
        searchResults: [],
        budget: state.budget,
        warnings: [
          {
            code: "PAGE_BUDGET_REACHED",
            message: `Source fetching is unavailable because the mission page limit of ${state.budget.maxPages} is already used.`,
          },
        ],
        errors: [],
        status: "RUNNING" as const,
        discoveryStage: "OFFICIAL_SOURCE_FETCH" as const,
      };
    }

    for (const query of queries.slice(0, searchBudgetRemaining)) {
      searchesUsed += 1;
      const request = SearchProviderRequestSchema.parse({
        query,
        countryOrLocale: state.brief.geographies.join(", "),
        freshnessWindowDays: state.brief.freshnessWindowDays,
        resultLimit,
        missionRunId: state.missionRunId,
      });

      try {
        const rawResults = await searchProvider.search(request);
        const parsedResults = z.array(SearchResultSchema).max(MAX_SEARCH_RESULTS_PER_QUERY).safeParse(rawResults);
        if (!parsedResults.success) {
          errors.push({
            code: "SEARCH_PROVIDER_INVALID_RESULTS",
            message: `The search provider returned invalid results for query: ${query}`,
            retryable: false,
          });
          continue;
        }
        searchResults.push(...parsedResults.data);
      } catch (error) {
        errors.push({
          code: "SEARCH_PROVIDER_ERROR",
          message: `Search provider failed for query "${query}": ${errorMessage(error)}`,
          retryable: true,
        });
      }
    }

    if (queries.length > searchBudgetRemaining) {
      warnings.push({
        code: "SEARCH_BUDGET_REACHED",
        message: `Search discovery stopped at the mission limit of ${state.budget.maxSearches} searches.`,
      });
    }
    if (pageBudgetRemaining === 0) {
      warnings.push({
        code: "PAGE_BUDGET_REACHED",
        message: `Source fetching is unavailable because the mission page limit of ${state.budget.maxPages} is already used.`,
      });
    }

    return {
      searchResults: uniqueSearchResults(searchResults),
      budget: {
        ...state.budget,
        searchesUsed: state.budget.searchesUsed + searchesUsed,
      },
      warnings,
      errors,
      status: "RUNNING" as const,
      discoveryStage: "OFFICIAL_SOURCE_FETCH" as const,
    };
  };
}

function createFetchOfficialSourcesNode(
  dependencies: SalesMissionDiscoveryDependencies,
): GraphNode<SalesMissionDiscoveryGraphStateType> {
  const fetchSource = dependencies.fetchSource ?? (async (input) => {
    const result = await safeFetchTool.invoke(input);
    return SafeFetchResultSchema.parse(result);
  });

  return async (state) => {
    const pageBudgetRemaining = Math.max(0, state.budget.maxPages - state.budget.pagesUsed);
    const fetchedSources: FetchedSourceReference[] = [];
    const evidenceIds: string[] = [];
    const errors: Array<z.infer<typeof GraphErrorSchema>> = [];
    const alreadyFetchedUrls = new Set(state.fetchedSources.map((source) => source.sourceUrl));
    const candidates = state.searchResults
      .filter((candidate) => {
        const sourceUrl = canonicaliseUrl(candidate.url);
        return sourceUrl !== undefined && !alreadyFetchedUrls.has(sourceUrl);
      })
      .slice(0, pageBudgetRemaining);
    let pagesUsed = 0;

    for (const candidate of candidates) {
      const sourceUrl = canonicaliseUrl(candidate.url);
      if (!sourceUrl) {
        errors.push({
          code: "INVALID_SEARCH_RESULT_URL",
          message: `The search provider returned an invalid source URL: ${candidate.url}`,
          retryable: false,
        });
        continue;
      }

      pagesUsed += 1;
      try {
        const result = await fetchSource({ url: sourceUrl });
        const parsedResult = SafeFetchResultSchema.parse(result);
        const sourceReference = FetchedSourceReferenceSchema.parse({
          sourceUrl,
          finalUrl: parsedResult.finalUrl,
          status: parsedResult.status,
          mimeType: parsedResult.mimeType,
          title: parsedResult.title,
          readableExcerpt: parsedResult.readableText.slice(0, MAX_EXCERPT_LENGTH),
          byteCount: parsedResult.byteCount,
          contentHash: parsedResult.contentHash,
          retrievedAt: parsedResult.retrievedAt,
          redirectCount: parsedResult.redirectCount,
          searchQuery: candidate.query,
        });
        fetchedSources.push(sourceReference);
        evidenceIds.push(`source:${parsedResult.contentHash}`);
      } catch (error) {
        const code = errorCode(error);
        errors.push({
          code: `SOURCE_FETCH_${code}`,
          message: `Official-source fetch failed for ${sourceUrl}: ${errorMessage(error)}`,
          retryable: isRetryableFetchError(code),
        });
      }
    }

    if (state.searchResults.length > pageBudgetRemaining) {
      errors.push({
        code: "SOURCE_PAGE_BUDGET_REACHED",
        message: `Official-source fetching stopped at the mission limit of ${state.budget.maxPages} pages.`,
        retryable: false,
      });
    }

    return {
      fetchedSources,
      evidenceIds,
      budget: {
        ...state.budget,
        pagesUsed: state.budget.pagesUsed + pagesUsed,
      },
      errors,
      status: "RUNNING" as const,
      discoveryStage: "READY_FOR_INVESTIGATION" as const,
    };
  };
}

export function createInitialSalesMissionDiscoveryState(
  prepared: PreparedSalesMissionForDiscovery,
) {
  return {
    missionId: prepared.missionId,
    missionRunId: prepared.missionRunId,
    graphVersion: SALES_MISSION_DISCOVERY_GRAPH_VERSION,
    brief: SalesMissionBriefSchema.parse(prepared.brief),
    targetProfile: TargetProfileSchema.parse(prepared.targetProfile),
    searchStrategy: SearchStrategySchema.parse(prepared.searchStrategy),
    searchResults: [],
    fetchedSources: [],
    evidenceIds: [],
    budget: BudgetSchema.parse(prepared.budget),
    warnings: GraphWarningSchema.array().parse(prepared.warnings),
    errors: GraphErrorSchema.array().parse(prepared.errors),
    status: "RUNNING" as const,
    discoveryStage: "SEARCH_PROVIDER" as const,
  };
}

export function createSalesMissionDiscoveryGraph(
  dependencies: SalesMissionDiscoveryDependencies,
) {
  return new StateGraph(SalesMissionDiscoveryGraphState)
    .addNode("search_provider", createSearchProviderNode(dependencies))
    .addNode("fetch_official_sources", createFetchOfficialSourcesNode(dependencies))
    .addEdge(START, "search_provider")
    .addEdge("search_provider", "fetch_official_sources")
    .addEdge("fetch_official_sources", END)
    .compile();
}

export async function discoverSalesMission(
  prepared: PreparedSalesMissionForDiscovery,
  dependencies: SalesMissionDiscoveryDependencies,
) {
  const initialState = createInitialSalesMissionDiscoveryState(prepared);
  const graph = createSalesMissionDiscoveryGraph(dependencies);
  return graph.invoke(initialState, {
    configurable: { thread_id: initialState.missionRunId },
    runName: "monster-scout-discover-official-sources",
    tags: ["monster-scout", "act-1", "discovery", "safe-fetch"],
    metadata: {
      product: "monster-scout-sales-hunter",
      milestone: "act-1",
      graphVersion: SALES_MISSION_DISCOVERY_GRAPH_VERSION,
    },
  });
}
