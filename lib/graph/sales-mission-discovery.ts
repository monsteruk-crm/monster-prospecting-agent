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
  extractAccountFromSource,
  verifyBuyingSignals,
  type AccountExtractor,
  type BuyingSignalVerifier,
} from "@/lib/chains/account-extraction";
import {
  SearchProviderRequestSchema,
  type SearchProvider,
} from "@/lib/discovery/search-provider";
import { duckDuckGoSearchProvider } from "@/lib/discovery/duckduckgo-search-provider";
import {
  BudgetSchema,
  AccountExtractionCandidateSchema,
  AccountExtractionProposalSchema,
  BuyingSignalCandidateSchema,
  BuyingSignalVerificationBatchSchema,
  DiscoveryStageSchema,
  DiscoveredAccountSchema,
  FetchedSourceReferenceSchema,
  GraphErrorSchema,
  GraphWarningSchema,
  SalesMissionBriefSchema,
  SalesMissionRunStatusSchema,
  SearchResultSchema,
  SearchStrategySchema,
  TargetProfileSchema,
  VerifiedBuyingSignalSchema,
  type Budget,
  type AccountExtractionCandidate,
  type BuyingSignalCandidate,
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
  accountExtractionCandidates: appendOnly(AccountExtractionCandidateSchema),
  discoveredAccounts: appendOnly(DiscoveredAccountSchema),
  accountIds: appendOnly(z.string().min(1)),
  buyingSignals: appendOnly(VerifiedBuyingSignalSchema),
  buyingSignalIds: appendOnly(z.string().min(1)),
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
  extractAccount?: AccountExtractor;
  verifySignals?: BuyingSignalVerifier;
  now?: () => Date;
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

function canonicalAccountKey(companyName: string, sourceUrl: string): string {
  const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  const normalizedName = companyName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${hostname}:${normalizedName}`;
}

function accountId(accountKey: string): string {
  return `account:${accountKey}`;
}

function signalId(candidateId: string): string {
  return `signal:${candidateId}`;
}

function sourceSupportsExcerpt(sourceExcerpt: string, evidenceExcerpt: string): boolean {
  const source = sourceExcerpt.toLowerCase().replace(/\s+/g, " ").trim();
  const evidence = evidenceExcerpt.toLowerCase().replace(/\s+/g, " ").trim();
  return evidence.length > 0 && source.includes(evidence);
}

function sourceSupportsDate(sourceExcerpt: string, eventDate: string | null): boolean {
  return eventDate !== null && sourceExcerpt.includes(eventDate);
}

function deriveFreshness(
  eventDate: string | null,
  now: Date,
  freshnessWindowDays: number,
): "CURRENT" | "RECENT" | "OLD" | "UNKNOWN" {
  if (!eventDate) {
    return "UNKNOWN";
  }

  const eventTime = Date.parse(`${eventDate}T00:00:00.000Z`);
  const nowTime = now.getTime();
  if (!Number.isFinite(eventTime) || !Number.isFinite(nowTime)) {
    return "UNKNOWN";
  }

  const ageDays = Math.floor((nowTime - eventTime) / 86_400_000);
  if (ageDays < -1) {
    return "UNKNOWN";
  }
  if (ageDays <= 30) {
    return "CURRENT";
  }
  if (ageDays <= freshnessWindowDays) {
    return "RECENT";
  }
  return "OLD";
}

function toDiscoveredAccount(candidate: AccountExtractionCandidate) {
  const sourceOrigin = new URL(candidate.finalUrl).origin;
  return DiscoveredAccountSchema.parse({
    accountKey: candidate.accountKey,
    companyName: candidate.account.companyName,
    officialDomain: sourceOrigin,
    website: candidate.finalUrl,
    ...(candidate.account.country ? { country: candidate.account.country } : {}),
    ...(candidate.account.city ? { city: candidate.account.city } : {}),
    categories: candidate.account.categories,
    relevanceHypothesis: candidate.account.relevanceHypothesis,
    discoveredSignals: [],
    possibleBuyerRoles: candidate.account.possibleBuyerRoles,
    discoveryEvidenceIds: [`source:${candidate.sourceContentHash}`],
    unresolvedQuestions: candidate.account.unresolvedQuestions,
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
      discoveryStage: "ACCOUNT_EXTRACTION" as const,
    };
  };
}

function createExtractAccountsNode(
  dependencies: SalesMissionDiscoveryDependencies,
): GraphNode<SalesMissionDiscoveryGraphStateType> {
  const extractAccount = dependencies.extractAccount ?? extractAccountFromSource;

  return async (state) => {
    const modelCallsRemaining = Math.max(0, state.budget.maxModelCalls - state.budget.modelCallsUsed);
    const extractionCallLimit = Math.min(
      state.brief.limits.maxCandidateAccounts,
      state.fetchedSources.length,
      Math.floor(modelCallsRemaining / 2),
    );
    const alreadyExtractedHashes = new Set(
      state.accountExtractionCandidates.map((candidate) => candidate.sourceContentHash),
    );
    const sources = state.fetchedSources.filter((source) => !alreadyExtractedHashes.has(source.contentHash));
    const candidates = sources.slice(0, extractionCallLimit);
    const accountExtractionCandidates: AccountExtractionCandidate[] = [];
    const discoveredAccounts: Array<z.infer<typeof DiscoveredAccountSchema>> = [];
    const accountIds: string[] = [];
    const warnings: Array<z.infer<typeof GraphWarningSchema>> = [];
    const errors: Array<z.infer<typeof GraphErrorSchema>> = [];
    const existingAccountKeys = new Set(state.discoveredAccounts.map((account) => account.accountKey));
    let modelCallsUsed = 0;

    if (sources.length > extractionCallLimit) {
      warnings.push({
        code: "ACCOUNT_EXTRACTION_MODEL_BUDGET_REACHED",
        message: `Account extraction is bounded to ${extractionCallLimit} model calls so signal verification retains budget.`,
      });
    }

    for (const source of candidates) {
      modelCallsUsed += 1;
      try {
        const account = AccountExtractionProposalSchema.parse(
          await extractAccount({
            missionRunId: state.missionRunId,
            brief: state.brief,
            targetProfile: state.targetProfile,
            source,
          }),
        );
        const candidate = AccountExtractionCandidateSchema.parse({
          accountKey: canonicalAccountKey(account.companyName, source.finalUrl),
          sourceUrl: source.sourceUrl,
          finalUrl: source.finalUrl,
          sourceContentHash: source.contentHash,
          sourceExcerpt: source.readableExcerpt,
          account,
        });
        accountExtractionCandidates.push(candidate);

        if (!existingAccountKeys.has(candidate.accountKey)) {
          discoveredAccounts.push(toDiscoveredAccount(candidate));
          accountIds.push(accountId(candidate.accountKey));
          existingAccountKeys.add(candidate.accountKey);
        }
      } catch (error) {
        errors.push({
          code: `ACCOUNT_EXTRACTION_${errorCode(error)}`,
          message: `Account extraction failed for ${source.finalUrl}: ${errorMessage(error)}`,
          retryable: true,
        });
      }
    }

    if (state.budget.maxModelCalls - state.budget.modelCallsUsed < 2 && sources.length > 0) {
      warnings.push({
        code: "MODEL_CALL_BUDGET_TOO_LOW",
        message: "At least two model calls per source are required for account extraction and buying-signal verification.",
      });
    }

    return {
      accountExtractionCandidates,
      discoveredAccounts,
      accountIds,
      budget: {
        ...state.budget,
        modelCallsUsed: state.budget.modelCallsUsed + modelCallsUsed,
      },
      warnings,
      errors,
      status: "RUNNING" as const,
      discoveryStage: "BUYING_SIGNAL_VERIFICATION" as const,
    };
  };
}

function buildVerifiedBuyingSignal(
  candidate: BuyingSignalCandidate,
  verification: z.infer<typeof BuyingSignalVerificationBatchSchema>["signals"][number] | undefined,
  now: Date,
  freshnessWindowDays: number,
  fallbackReason?: string,
) {
  const candidateQuoteSupported = sourceSupportsExcerpt(candidate.sourceExcerpt, candidate.evidenceExcerpt);
  const verificationQuoteSupported = verification
    ? sourceSupportsExcerpt(candidate.sourceExcerpt, verification.evidenceExcerpt)
    : false;
  const evidenceExcerpt = verification && verificationQuoteSupported
    ? verification.evidenceExcerpt
    : candidateQuoteSupported
      ? candidate.evidenceExcerpt
      : "";
  const proposedDate = verification?.eventDate ?? candidate.eventDate;
  const eventDate = sourceSupportsDate(candidate.sourceExcerpt, proposedDate) ? proposedDate : null;
  const evidenceState = !verification
    ? "MISSING_INFORMATION"
    : evidenceExcerpt.length === 0
      ? "MISSING_INFORMATION"
      : verification.evidenceState;
  const evidenceIsVerifiable = evidenceState === "FACT" || evidenceState === "COMMERCIAL_SIGNAL";
  const verified = Boolean(
    verification?.verified &&
      evidenceExcerpt.length > 0 &&
      evidenceIsVerifiable,
  );

  return VerifiedBuyingSignalSchema.parse({
    signalId: signalId(candidate.candidateId),
    accountKey: candidate.accountKey,
    companyName: candidate.companyName,
    signalType: candidate.signalType,
    summary: candidate.summary,
    eventDate,
    freshness: deriveFreshness(eventDate, now, freshnessWindowDays),
    evidenceState,
    verified,
    confidence: verified ? verification?.confidence ?? 0 : 0,
    verificationReason: fallbackReason ?? verification?.reason ?? "The signal was not verified.",
    evidenceExcerpt,
    sourceUrl: candidate.sourceUrl,
    sourceContentHash: candidate.sourceContentHash,
    evidenceId: `source:${candidate.sourceContentHash}`,
  });
}

function createVerifyBuyingSignalsNode(
  dependencies: SalesMissionDiscoveryDependencies,
): GraphNode<SalesMissionDiscoveryGraphStateType> {
  const verifySignals = dependencies.verifySignals ?? verifyBuyingSignals;
  const now = dependencies.now ?? (() => new Date());

  return async (state) => {
    const candidatesByAccount = state.accountExtractionCandidates.filter(
      (candidate) => candidate.account.buyingSignals.length > 0,
    );
    const modelCallsRemaining = Math.max(0, state.budget.maxModelCalls - state.budget.modelCallsUsed);
    const accountsToVerify = candidatesByAccount.slice(0, modelCallsRemaining);
    const buyingSignals: Array<z.infer<typeof VerifiedBuyingSignalSchema>> = [];
    const buyingSignalIds: string[] = [];
    const warnings: Array<z.infer<typeof GraphWarningSchema>> = [];
    const errors: Array<z.infer<typeof GraphErrorSchema>> = [];
    const existingSignalIds = new Set(state.buyingSignalIds);
    let modelCallsUsed = 0;

    if (candidatesByAccount.length > accountsToVerify.length) {
      warnings.push({
        code: "BUYING_SIGNAL_VERIFICATION_MODEL_BUDGET_REACHED",
        message: `Buying-signal verification stopped at the mission model-call limit of ${state.budget.maxModelCalls}.`,
      });
    }

    for (const accountCandidate of state.accountExtractionCandidates) {
      const signals = accountCandidate.account.buyingSignals.map((signal, index) =>
        BuyingSignalCandidateSchema.parse({
          candidateId: `${accountCandidate.sourceContentHash}:${index}`,
          accountKey: accountCandidate.accountKey,
          companyName: accountCandidate.account.companyName,
          signalType: signal.signalType,
          summary: signal.summary,
          eventDate: signal.eventDate,
          evidenceExcerpt: signal.evidenceExcerpt,
          sourceUrl: accountCandidate.sourceUrl,
          sourceContentHash: accountCandidate.sourceContentHash,
          sourceExcerpt: accountCandidate.sourceExcerpt,
        }),
      );
      if (signals.length === 0) {
        continue;
      }

      const shouldCallModel = accountsToVerify.some(
        (candidate) => candidate.sourceContentHash === accountCandidate.sourceContentHash,
      );
      let verificationById = new Map<string, z.infer<typeof BuyingSignalVerificationBatchSchema>["signals"][number]>();

      if (shouldCallModel) {
        modelCallsUsed += 1;
        try {
          const verification = BuyingSignalVerificationBatchSchema.parse(
            await verifySignals({
              missionRunId: state.missionRunId,
              brief: state.brief,
              targetProfile: state.targetProfile,
              accountCandidate,
              signals,
            }),
          );
          verificationById = new Map(verification.signals.map((signal) => [signal.candidateId, signal]));
        } catch (error) {
          errors.push({
            code: `BUYING_SIGNAL_VERIFICATION_${errorCode(error)}`,
            message: `Buying-signal verification failed for ${accountCandidate.finalUrl}: ${errorMessage(error)}`,
            retryable: true,
          });
        }
      }

      for (const candidate of signals) {
        const verifiedSignal = buildVerifiedBuyingSignal(
          candidate,
          verificationById.get(candidate.candidateId),
          now(),
          state.brief.freshnessWindowDays,
          shouldCallModel ? undefined : "Verification was not run because the model-call budget was exhausted.",
        );
        if (existingSignalIds.has(verifiedSignal.signalId)) {
          continue;
        }
        buyingSignals.push(verifiedSignal);
        buyingSignalIds.push(verifiedSignal.signalId);
        existingSignalIds.add(verifiedSignal.signalId);
      }
    }

    return {
      buyingSignals,
      buyingSignalIds,
      budget: {
        ...state.budget,
        modelCallsUsed: state.budget.modelCallsUsed + modelCallsUsed,
      },
      warnings,
      errors,
      status: "RUNNING" as const,
      discoveryStage: "READY_FOR_REVIEW" as const,
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
    accountExtractionCandidates: [],
    discoveredAccounts: [],
    accountIds: [],
    buyingSignals: [],
    buyingSignalIds: [],
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
    .addNode("extract_accounts", createExtractAccountsNode(dependencies))
    .addNode("verify_buying_signals", createVerifyBuyingSignalsNode(dependencies))
    .addEdge(START, "search_provider")
    .addEdge("search_provider", "fetch_official_sources")
    .addEdge("fetch_official_sources", "extract_accounts")
    .addEdge("extract_accounts", "verify_buying_signals")
    .addEdge("verify_buying_signals", END)
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
