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
  type DiscoveredAccount,
  type FetchedSourceReference,
  type SalesMissionBrief,
  type SearchResult,
  type SearchStrategy,
  type TargetProfile,
  type VerifiedBuyingSignal,
} from "@/lib/sales/mission-schema";
import {
  SafeFetchResultSchema,
  safeFetchTool,
  type SafeFetchInput,
  type SafeFetchResult,
} from "@/lib/tools/safe-fetch";
import { extractPublicEmail, requiresPublicEmail } from "@/lib/sales/contact-route-engine";
import {
  MissionProgressEventSchema,
  MissionSearchProgressEventSchema,
  type MissionProgressEvent,
  type MissionSearchProgressEvent,
} from "@/lib/sales/mission-progress";
import type { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { getSalesMissionCheckpointer } from "@/lib/graph/checkpointer";

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
  graphVersion: string;
  brief: SalesMissionBrief;
  targetProfile: TargetProfile;
  searchStrategy: SearchStrategy;
  budget: Budget;
  warnings: Array<z.infer<typeof GraphWarningSchema>>;
  errors: Array<z.infer<typeof GraphErrorSchema>>;
};

export type FetchSource = (input: SafeFetchInput) => Promise<SafeFetchResult>;
export type MissionProgressReporter = (event: MissionProgressEvent) => Promise<void> | void;
export type MissionSearchProgressReporter = (event: MissionSearchProgressEvent) => Promise<void> | void;

export type DiscoveryStateSeed = {
  searchResults?: SearchResult[];
  fetchedSources?: FetchedSourceReference[];
  accountExtractionCandidates?: AccountExtractionCandidate[];
  discoveredAccounts?: DiscoveredAccount[];
  accountIds?: string[];
  buyingSignals?: VerifiedBuyingSignal[];
  buyingSignalIds?: string[];
  evidenceIds?: string[];
  budget?: Budget;
  warnings?: Array<z.infer<typeof GraphWarningSchema>>;
  errors?: Array<z.infer<typeof GraphErrorSchema>>;
};

export interface SalesMissionDiscoveryDependencies {
  searchProvider?: SearchProvider;
  fetchSource?: FetchSource;
  extractAccount?: AccountExtractor;
  verifySignals?: BuyingSignalVerifier;
  now?: () => Date;
  checkpointer?: PostgresSaver;
  skipCheckpoint?: boolean;
  onProgress?: MissionProgressReporter;
  onSearchProgress?: MissionSearchProgressReporter;
}

async function reportProgress(
  dependencies: SalesMissionDiscoveryDependencies,
  event: MissionProgressEvent,
): Promise<void> {
  const parsed = MissionProgressEventSchema.parse(event);
  await dependencies.onProgress?.(parsed);
}

async function reportSearchProgress(
  dependencies: SalesMissionDiscoveryDependencies,
  event: MissionSearchProgressEvent,
): Promise<void> {
  const parsed = MissionSearchProgressEventSchema.parse(event);
  await dependencies.onSearchProgress?.(parsed);
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

const NON_FIRST_PARTY_HOST_MARKERS = [
  "trustpilot.",
  "indeed.",
  "glassdoor.",
  "myfetetickets.",
  "attractiontix.",
  "f6s.",
  "todaytix.",
  "businesswire.",
  "prnewswire.",
  "tripadvisor.",
  "yelp.",
  "eventbrite.",
  "ticketmaster.",
  "getyourguide.",
  "facebook.",
  "instagram.",
  "linkedin.",
];

const NON_FIRST_PARTY_PATH_PATTERNS = [
  /^\/(?:categories?|reviews?|jobs?|search)(?:\/|$)/,
  /^\/q[-/]/,
  /(?:^|\/)jobs?[-/]/,
];

export function isLikelyNonFirstPartySource(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return true;
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    return NON_FIRST_PARTY_HOST_MARKERS.some((marker) => hostname.includes(marker)) || NON_FIRST_PARTY_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
  } catch {
    return true;
  }
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

function boundedSourceExcerpt(readableText: string): string {
  const normalized = readableText.trim();
  if (normalized.length <= MAX_EXCERPT_LENGTH) {
    return normalized;
  }

  const email = extractPublicEmail(normalized);
  if (!email) {
    return normalized.slice(0, MAX_EXCERPT_LENGTH);
  }

  const emailIndex = normalized.toLowerCase().indexOf(email);
  if (emailIndex >= 0 && emailIndex + email.length <= MAX_EXCERPT_LENGTH) {
    return normalized.slice(0, MAX_EXCERPT_LENGTH);
  }

  const contactWindow = normalized.slice(Math.max(0, emailIndex - 100), Math.min(normalized.length, emailIndex + email.length + 100));
  const prefixLength = Math.max(0, MAX_EXCERPT_LENGTH - contactWindow.length - 5);
  return `${normalized.slice(0, prefixLength)} … ${contactWindow}`.slice(0, MAX_EXCERPT_LENGTH);
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
      Math.max(1, pageBudgetRemaining + state.searchResults.length),
    );
    const searchResults: Array<z.infer<typeof SearchResultSchema>> = [];
    const warnings: Array<z.infer<typeof GraphWarningSchema>> = [];
    const errors: Array<z.infer<typeof GraphErrorSchema>> = [];
    let searchesUsed = 0;

    await reportProgress(dependencies, {
      stage: "SEARCH_PROVIDER",
      status: "RUNNING",
      message: `Starting bounded search across ${queries.length} prepared queries.`,
      detail: `Search budget: ${state.budget.maxSearches}; page budget: ${state.budget.maxPages}.`,
      counts: { searches: 0, pages: state.budget.pagesUsed },
    });

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

    const queriesToRun = queries.slice(0, searchBudgetRemaining);
    const knownUrls = new Set(state.searchResults.map((result) => canonicaliseUrl(result.url)).filter((url): url is string => Boolean(url)));
    let accumulatedResults = [...state.searchResults];
    for (const [queryIndex, query] of queriesToRun.entries()) {
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
        const newResults = uniqueSearchResults(parsedResults.data).filter((result) => {
          const url = canonicaliseUrl(result.url);
          if (!url || knownUrls.has(url)) return false;
          knownUrls.add(url);
          return true;
        });
        searchResults.push(...newResults);
        accumulatedResults = [...accumulatedResults, ...newResults];
        await reportSearchProgress(dependencies, {
          query,
          queryIndex: queryIndex + 1,
          status: "COMPLETED",
          resultCount: newResults.length,
          searchesUsed,
          searchResults: accumulatedResults,
        });
        await reportProgress(dependencies, {
          stage: "SEARCH_PROVIDER",
          status: "RUNNING",
          message: `Search completed for query ${searchesUsed} of ${Math.min(queries.length, searchBudgetRemaining)}.`,
          detail: query,
          counts: { searches: searchesUsed, pages: state.budget.pagesUsed, sources: searchResults.length },
        });
      } catch (error) {
        errors.push({
          code: "SEARCH_PROVIDER_ERROR",
          message: `Search provider failed for query "${query}": ${errorMessage(error)}`,
          retryable: true,
        });
        await reportSearchProgress(dependencies, {
          query,
          queryIndex: queryIndex + 1,
          status: "FAILED",
          resultCount: 0,
          searchesUsed,
          searchResults: accumulatedResults,
          detail: errorMessage(error),
        });
        await reportProgress(dependencies, {
          stage: "SEARCH_PROVIDER",
          status: "RUNNING",
          message: `Search query ${searchesUsed} failed; continuing with partial results.`,
          detail: query,
          counts: { searches: searchesUsed, pages: state.budget.pagesUsed, sources: searchResults.length },
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
    const sourceCandidates = state.searchResults
      .filter((candidate) => {
        const sourceUrl = canonicaliseUrl(candidate.url);
        return sourceUrl !== undefined && !alreadyFetchedUrls.has(sourceUrl);
      });
    const filteredCandidates = sourceCandidates.filter((candidate) => isLikelyNonFirstPartySource(candidate.url));
    const candidates = sourceCandidates
      .filter((candidate) => !isLikelyNonFirstPartySource(candidate.url))
      .slice(0, pageBudgetRemaining);
    let pagesUsed = 0;

    await reportProgress(dependencies, {
      stage: "OFFICIAL_SOURCE_FETCH",
      status: "RUNNING",
      message: `Fetching up to ${Math.min(sourceCandidates.length, pageBudgetRemaining)} first-party sources.`,
      detail: "Non-first-party results are filtered before safe fetching.",
      counts: { searches: state.budget.searchesUsed, pages: 0, sources: 0 },
    });

    if (filteredCandidates.length > 0) {
      errors.push({
        code: "SOURCE_CANDIDATE_FILTERED_NON_FIRST_PARTY",
        message: `Skipped ${filteredCandidates.length} review, directory, job-board, ticket-reseller or non-first-party search result(s) before official-source fetching.`,
        retryable: false,
      });
    }

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
          readableExcerpt: boundedSourceExcerpt(parsedResult.readableText),
          byteCount: parsedResult.byteCount,
          contentHash: parsedResult.contentHash,
          retrievedAt: parsedResult.retrievedAt,
          redirectCount: parsedResult.redirectCount,
          searchQuery: candidate.query,
        });
        fetchedSources.push(sourceReference);
        evidenceIds.push(`source:${parsedResult.contentHash}`);
        await reportProgress(dependencies, {
          stage: "OFFICIAL_SOURCE_FETCH",
          status: "RUNNING",
          message: `Fetched official source ${pagesUsed} of ${candidates.length}.`,
          detail: sourceReference.finalUrl,
          counts: { searches: state.budget.searchesUsed, pages: pagesUsed, sources: fetchedSources.length },
        });
      } catch (error) {
        const code = errorCode(error);
        errors.push({
          code: `SOURCE_FETCH_${code}`,
          message: `Official-source fetch failed for ${sourceUrl}: ${errorMessage(error)}`,
          retryable: isRetryableFetchError(code),
        });
        await reportProgress(dependencies, {
          stage: "OFFICIAL_SOURCE_FETCH",
          status: "RUNNING",
          message: `Official source ${pagesUsed} failed; continuing with partial results.`,
          detail: sourceUrl,
          counts: { searches: state.budget.searchesUsed, pages: pagesUsed, sources: fetchedSources.length },
        });
      }
    }

    if (sourceCandidates.filter((candidate) => !isLikelyNonFirstPartySource(candidate.url)).length > pageBudgetRemaining) {
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
    const emailRequired = requiresPublicEmail(state.brief);
    let filteredNoPublicEmail = 0;
    let modelCallsUsed = 0;

    await reportProgress(dependencies, {
      stage: "ACCOUNT_EXTRACTION",
      status: "RUNNING",
      message: `Extracting accounts from ${candidates.length} fetched source(s).`,
      detail: "Extraction output is schema-validated before persistence.",
      counts: { searches: state.budget.searchesUsed, pages: state.budget.pagesUsed, sources: state.fetchedSources.length, accounts: 0 },
    });

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

        if (emailRequired && !extractPublicEmail(source.readableExcerpt)) {
          filteredNoPublicEmail += 1;
          continue;
        }

        accountExtractionCandidates.push(candidate);

        if (!existingAccountKeys.has(candidate.accountKey)) {
          discoveredAccounts.push(toDiscoveredAccount(candidate));
          accountIds.push(accountId(candidate.accountKey));
          existingAccountKeys.add(candidate.accountKey);
        }
        await reportProgress(dependencies, {
          stage: "ACCOUNT_EXTRACTION",
          status: "RUNNING",
          message: `Account extraction processed ${accountExtractionCandidates.length} qualifying source(s).`,
          detail: candidate.account.companyName,
          counts: { searches: state.budget.searchesUsed, pages: state.budget.pagesUsed, sources: state.fetchedSources.length, accounts: discoveredAccounts.length },
        });
      } catch (error) {
        errors.push({
          code: `ACCOUNT_EXTRACTION_${errorCode(error)}`,
          message: `Account extraction failed for ${source.finalUrl}: ${errorMessage(error)}`,
          retryable: true,
        });
        await reportProgress(dependencies, {
          stage: "ACCOUNT_EXTRACTION",
          status: "RUNNING",
          message: "Account extraction failed for one source; continuing with partial results.",
          detail: source.finalUrl,
          counts: { searches: state.budget.searchesUsed, pages: state.budget.pagesUsed, sources: state.fetchedSources.length, accounts: discoveredAccounts.length },
        });
      }
    }

    if (filteredNoPublicEmail > 0) {
      warnings.push({
        code: "ACCOUNT_FILTERED_NO_PUBLIC_EMAIL",
        message: `Filtered ${filteredNoPublicEmail} extracted account(s) because the brief requires a publicly confirmed email address.`,
      });
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

    await reportProgress(dependencies, {
      stage: "BUYING_SIGNAL_VERIFICATION",
      status: "RUNNING",
      message: `Verifying buying signals for ${accountsToVerify.length} account(s).`,
      detail: "Unsupported claims remain explicitly unverified.",
      counts: { searches: state.budget.searchesUsed, pages: state.budget.pagesUsed, sources: state.fetchedSources.length, accounts: state.discoveredAccounts.length, signals: 0 },
    });

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

      await reportProgress(dependencies, {
        stage: "BUYING_SIGNAL_VERIFICATION",
        status: "RUNNING",
        message: `Verified signals for ${accountCandidate.account.companyName}.`,
        detail: `${signals.length} signal candidate(s) evaluated.`,
        counts: { searches: state.budget.searchesUsed, pages: state.budget.pagesUsed, sources: state.fetchedSources.length, accounts: state.discoveredAccounts.length, signals: buyingSignals.length },
      });
    }

    await reportProgress(dependencies, {
      stage: "READY_FOR_REVIEW",
      status: "PAUSED_FOR_REVIEW",
      message: `Discovery complete: ${state.discoveredAccounts.length} account(s) ready for review.`,
      counts: { searches: state.budget.searchesUsed, pages: state.budget.pagesUsed, sources: state.fetchedSources.length, accounts: state.discoveredAccounts.length, signals: buyingSignals.length },
    });

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
  seed: DiscoveryStateSeed = {},
) {
  return {
    missionId: prepared.missionId,
    missionRunId: prepared.missionRunId,
    graphVersion: SALES_MISSION_DISCOVERY_GRAPH_VERSION,
    brief: SalesMissionBriefSchema.parse(prepared.brief),
    targetProfile: TargetProfileSchema.parse(prepared.targetProfile),
    searchStrategy: SearchStrategySchema.parse(prepared.searchStrategy),
    searchResults: SearchResultSchema.array().parse(seed.searchResults ?? []),
    fetchedSources: FetchedSourceReferenceSchema.array().parse(seed.fetchedSources ?? []),
    accountExtractionCandidates: AccountExtractionCandidateSchema.array().parse(seed.accountExtractionCandidates ?? []),
    discoveredAccounts: DiscoveredAccountSchema.array().parse(seed.discoveredAccounts ?? []),
    accountIds: z.array(z.string().min(1)).parse(seed.accountIds ?? []),
    buyingSignals: VerifiedBuyingSignalSchema.array().parse(seed.buyingSignals ?? []),
    buyingSignalIds: z.array(z.string().min(1)).parse(seed.buyingSignalIds ?? []),
    evidenceIds: z.array(z.string().min(1)).parse(seed.evidenceIds ?? []),
    budget: BudgetSchema.parse(seed.budget ?? prepared.budget),
    warnings: GraphWarningSchema.array().parse(seed.warnings ?? prepared.warnings),
    errors: GraphErrorSchema.array().parse(seed.errors ?? prepared.errors),
    status: "RUNNING" as const,
    discoveryStage: "SEARCH_PROVIDER" as const,
  };
}

export function createSalesMissionDiscoveryGraph(
  dependencies: SalesMissionDiscoveryDependencies,
) {
  const graph = new StateGraph(SalesMissionDiscoveryGraphState)
    .addNode("search_provider", createSearchProviderNode(dependencies))
    .addNode("fetch_official_sources", createFetchOfficialSourcesNode(dependencies))
    .addNode("extract_accounts", createExtractAccountsNode(dependencies))
    .addNode("verify_buying_signals", createVerifyBuyingSignalsNode(dependencies))
    .addEdge(START, "search_provider")
    .addEdge("search_provider", "fetch_official_sources")
    .addEdge("fetch_official_sources", "extract_accounts")
    .addEdge("extract_accounts", "verify_buying_signals")
    .addEdge("verify_buying_signals", END);

  return dependencies.checkpointer
    ? graph.compile({ checkpointer: dependencies.checkpointer, interruptAfter: ["verify_buying_signals"] })
    : graph.compile();
}

export async function discoverSalesMission(
  prepared: PreparedSalesMissionForDiscovery,
  dependencies: SalesMissionDiscoveryDependencies,
  seed: DiscoveryStateSeed = {},
) {
  const initialState = createInitialSalesMissionDiscoveryState(prepared, seed);
  const checkpointer = dependencies.skipCheckpoint ? undefined : dependencies.checkpointer ?? (
    process.env.NODE_ENV === "test" ? undefined : await getSalesMissionCheckpointer()
  );
  const graph = createSalesMissionDiscoveryGraph({ ...dependencies, checkpointer });
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

export async function resumeSalesMission(
  missionRunId: string,
  checkpointer: PostgresSaver,
) {
  const graph = createSalesMissionDiscoveryGraph({ checkpointer });
  return graph.invoke(null as never, {
    configurable: { thread_id: missionRunId },
    runName: "monster-scout-resume-review-run",
    tags: ["monster-scout", "act-1", "resume"],
  });
}
