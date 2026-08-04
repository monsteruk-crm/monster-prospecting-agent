import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const boundedList = z.array(nonEmptyText).max(20);

export const ProspectCategorySchema = z.enum([
  "TICKETED_EVENT_PROMOTER",
  "FAMILY_ATTRACTION_OPERATOR",
  "FESTIVAL_PRODUCER",
  "TOURING_EVENT_OPERATOR",
  "EXPERIENTIAL_EVENT_AGENCY",
  "VENUE_PROGRAMMING_COMPANY",
  "EXHIBITION_OPERATOR",
  "LEISURE_DESTINATION_GROUP",
  "HOLIDAY_RESORT",
  "VISITOR_ATTRACTION",
  "MIXED_USE_DESTINATION",
  "CITY_EVENT_CONTRACTOR",
  "SPORTS_ENTERTAINMENT_OPERATOR",
  "REGIONAL_OPERATING_PARTNER",
  "COMPARABLE_ATTRACTION_OPERATOR",
]);

export const ProductFocusSchema = z.enum([
  "THE_MONSTER",
  "MEGA_BOUNCE_HOUSE",
  "UNDECIDED",
]);

const MissionLimitsSchema = z.object({
  maxSearches: z.number().int().min(1).max(100).default(12),
  maxPages: z.number().int().min(1).max(100).default(20),
  maxModelCalls: z.number().int().min(1).max(100).default(12),
  maxCostUsd: z.number().min(0).max(100).default(2),
  maxCandidateAccounts: z.number().int().min(1).max(3).default(3),
});

export const SalesMissionBriefSchema = z.object({
  name: nonEmptyText.max(120),
  owner: nonEmptyText.max(120).default("unassigned"),
  geographies: z.array(nonEmptyText).min(1).max(20),
  accountCategories: z.array(ProspectCategorySchema).min(1).max(8),
  productFocus: ProductFocusSchema.default("THE_MONSTER"),
  requiredSignals: boundedList.default(() => []),
  preferredSignals: boundedList.default(() => []),
  buyerRoles: boundedList.min(1).max(20),
  freshnessWindowDays: z.number().int().min(1).max(3650).default(365),
  exclusions: boundedList.default(() => []),
  instructions: z.string().trim().max(2000).default(""),
  limits: MissionLimitsSchema.default(() => MissionLimitsSchema.parse({})),
});

export const TargetProfileSchema = z.object({
  geographies: z.array(nonEmptyText).min(1),
  accountCategories: z.array(ProspectCategorySchema).min(1),
  excludedCategories: z.array(nonEmptyText),
  productFocus: ProductFocusSchema,
  requiredSignals: z.array(nonEmptyText),
  preferredSignals: z.array(nonEmptyText),
  targetBuyerRoles: z.array(nonEmptyText).min(1),
  commercialScaleIndicators: z.array(nonEmptyText).min(1),
  freshnessWindowDays: z.number().int().positive(),
  maximumProspects: z.number().int().min(1).max(3),
});

export const QueryFamilyKindSchema = z.enum([
  "CATEGORY_DISCOVERY",
  "GEOGRAPHY_DISCOVERY",
  "EVENT_PORTFOLIO_DISCOVERY",
  "SIGNAL_DISCOVERY",
  "BUYER_ROLE_DISCOVERY",
  "CONTACT_ROUTE_DISCOVERY",
  "COMPARABLE_ATTRACTION_DISCOVERY",
]);

export const QueryFamilySchema = z.object({
  kind: QueryFamilyKindSchema,
  queries: z.array(nonEmptyText).min(1).max(20),
  maxQueries: z.number().int().min(1).max(20),
});

export const SearchStrategySchema = z.object({
  queryFamilies: z.array(QueryFamilySchema).min(1).max(7),
  totalMaxQueries: z.number().int().min(1).max(100),
});

export const SearchResultSchema = z.object({
  title: nonEmptyText.max(300),
  url: z.string().url().max(2048),
  snippet: z.string().trim().max(1000).default(""),
  providerRank: z.number().int().positive(),
  query: nonEmptyText.max(500),
  discoveryTime: z.string().datetime(),
});

export const FetchedSourceReferenceSchema = z.object({
  sourceUrl: z.string().url(),
  finalUrl: z.string().url(),
  status: z.number().int().min(200).max(599),
  mimeType: nonEmptyText.max(200),
  title: z.string().trim().max(300).optional(),
  readableExcerpt: z.string().trim().max(600),
  byteCount: z.number().int().nonnegative(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  retrievedAt: z.string().datetime(),
  redirectCount: z.number().int().nonnegative().max(3),
  searchQuery: nonEmptyText.max(500),
});

export const DiscoveryStageSchema = z.enum([
  "SEARCH_PROVIDER",
  "OFFICIAL_SOURCE_FETCH",
  "READY_FOR_INVESTIGATION",
]);

export const BudgetSchema = z.object({
  maxSearches: z.number().int().positive(),
  maxPages: z.number().int().positive(),
  maxModelCalls: z.number().int().positive(),
  maxCostUsd: z.number().nonnegative(),
  searchesUsed: z.number().int().nonnegative(),
  pagesUsed: z.number().int().nonnegative(),
  modelCallsUsed: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
});

export const DiscoveredAccountSchema = z.object({
  companyName: nonEmptyText.max(200),
  officialDomain: z.string().url().optional(),
  website: z.string().url().optional(),
  country: z.string().trim().min(2).max(100).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  categories: z.array(ProspectCategorySchema).min(1),
  relevanceHypothesis: nonEmptyText.max(1000),
  discoveredSignals: z.array(nonEmptyText),
  possibleBuyerRoles: z.array(nonEmptyText),
  discoveryEvidenceIds: z.array(nonEmptyText),
  unresolvedQuestions: z.array(nonEmptyText),
});

export const GraphWarningSchema = z.object({
  code: nonEmptyText,
  message: nonEmptyText,
});

export const GraphErrorSchema = z.object({
  code: nonEmptyText,
  message: nonEmptyText,
  retryable: z.boolean(),
});

export const SalesMissionRunStatusSchema = z.enum([
  "PREPARING",
  "READY_FOR_DISCOVERY",
  "RUNNING",
  "PAUSED_FOR_REVIEW",
  "COMPLETED",
  "FAILED",
]);

export type SalesMissionBrief = z.infer<typeof SalesMissionBriefSchema>;
export type SalesMissionBriefInput = z.input<typeof SalesMissionBriefSchema>;
export type TargetProfile = z.infer<typeof TargetProfileSchema>;
export type SearchStrategy = z.infer<typeof SearchStrategySchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type FetchedSourceReference = z.infer<typeof FetchedSourceReferenceSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export type DiscoveredAccount = z.infer<typeof DiscoveredAccountSchema>;
