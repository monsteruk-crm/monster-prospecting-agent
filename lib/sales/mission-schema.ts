import { z } from "zod";

import {
  PublicEmailHintSchema,
  PublicPageLinkSchema,
  PublicPhoneHintSchema,
} from "@/lib/tools/safe-fetch";
import { ABSOLUTE_SCOUT_LIMITS } from "@/lib/settings/absolute-limits";
import {
  ProspectAccountCategorySchema,
  ProspectAccountClassificationSchema,
  ProspectBuyerModelSchema,
  ProspectCategorySelectionSchema,
  type ProspectAccountCategory,
  type ProspectAccountClassification,
  type ProspectBuyerModel,
} from "@/lib/sales/prospect-taxonomy";

const nonEmptyText = z.string().trim().min(1);
const boundedList = z.array(nonEmptyText).max(20);
export const ProspectCategorySchema = ProspectAccountCategorySchema;

export const ProductFocusSchema = z.enum([
  "THE_MONSTER",
  "MEGA_BOUNCE_HOUSE",
  "UNDECIDED",
]);

export const ContactRequirementSchema = z.enum(["ANY_ROUTE", "PUBLIC_EMAIL"]);

export const MissionLimitsSchema = z.object({
  maxSearches: z.number().int().min(1).max(ABSOLUTE_SCOUT_LIMITS.maxSearches).default(12),
  maxPages: z.number().int().min(1).max(ABSOLUTE_SCOUT_LIMITS.maxPages).default(20),
  maxModelCalls: z.number().int().min(1).max(ABSOLUTE_SCOUT_LIMITS.maxModelCalls).default(20),
  maxCostUsd: z.number().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxCostUsd).default(2),
  maxCandidateAccounts: z.number().int().min(1).max(ABSOLUTE_SCOUT_LIMITS.maxCandidateAccounts).default(5),
});

export const SalesMissionBriefSchema = z.object({
  name: nonEmptyText.max(120),
  owner: nonEmptyText.max(120).default("unassigned"),
  geographies: z.array(nonEmptyText).min(1).max(20),
  accountCategories: ProspectCategorySelectionSchema,
  productFocus: ProductFocusSchema.default("THE_MONSTER"),
  contactRequirement: ContactRequirementSchema.default("ANY_ROUTE"),
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
  accountCategories: ProspectCategorySelectionSchema,
  excludedCategories: z.array(nonEmptyText),
  productFocus: ProductFocusSchema,
  requiredSignals: z.array(nonEmptyText),
  preferredSignals: z.array(nonEmptyText),
  targetBuyerRoles: z.array(nonEmptyText).min(1),
  commercialScaleIndicators: z.array(nonEmptyText).min(1),
  freshnessWindowDays: z.number().int().positive(),
  maximumProspects: z.number().int().min(1).max(ABSOLUTE_SCOUT_LIMITS.maxCandidateAccounts),
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
  canonicalUrl: z.string().url().optional(),
  links: z.array(PublicPageLinkSchema).max(100).optional(),
  publicEmailHints: z.array(PublicEmailHintSchema).max(20).optional(),
  publicPhoneHints: z.array(PublicPhoneHintSchema).max(20).optional(),
});

export const EvidenceStateSchema = z.enum([
  "FACT",
  "COMMERCIAL_SIGNAL",
  "INFERENCE",
  "MISSING_INFORMATION",
  "CONFLICT",
  "MONSTER_KNOWLEDGE",
  "SALES_RULE",
]);

export const SignalFreshnessSchema = z.enum([
  "CURRENT",
  "RECENT",
  "OLD",
  "UNKNOWN",
]);

export const BuyingSignalTypeSchema = z.enum([
  "NEW_PROGRAMME",
  "EXPANSION",
  "NEW_MARKET",
  "NEW_EVENT",
  "PARTNERSHIP",
  "HIRING",
  "SEASONAL_PROGRAMME",
  "COMPARABLE_ATTRACTION",
  "FUNDING_OR_CONTRACT",
  "OTHER",
]);

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const AccountBuyingSignalExtractionSchema = z.object({
  signalType: BuyingSignalTypeSchema,
  summary: z.string().trim().min(1).max(600),
  eventDate: IsoDateSchema.nullable(),
  evidenceExcerpt: z.string().trim().max(500),
});

export const AccountExtractionProposalSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  // These are model-generated hints. The graph never trusts them for provenance;
  // source URLs are validated separately and derived from the fetched reference.
  officialDomain: z.string().trim().max(2048).nullable(),
  website: z.string().trim().max(2048).nullable(),
  country: z.string().trim().min(2).max(100).nullable(),
  city: z.string().trim().min(1).max(100).nullable(),
  classification: ProspectAccountClassificationSchema,
  relevanceHypothesis: z.string().trim().min(1).max(1000),
  possibleBuyerRoles: z.array(z.string().trim().min(1).max(200)).max(20),
  buyingSignals: z.array(AccountBuyingSignalExtractionSchema).max(10),
  unresolvedQuestions: z.array(z.string().trim().min(1).max(500)).max(20),
});

export const AccountExtractionCandidateSchema = z.object({
  accountKey: nonEmptyText.max(300),
  sourceUrl: z.string().url(),
  finalUrl: z.string().url(),
  sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/),
  sourceExcerpt: z.string().trim().max(600),
  account: AccountExtractionProposalSchema,
});

export const BuyingSignalCandidateSchema = z.object({
  candidateId: nonEmptyText.max(400),
  accountKey: nonEmptyText.max(300),
  companyName: nonEmptyText.max(200),
  signalType: BuyingSignalTypeSchema,
  summary: nonEmptyText.max(600),
  eventDate: IsoDateSchema.nullable(),
  evidenceExcerpt: z.string().trim().max(500),
  sourceUrl: z.string().url(),
  sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/),
  sourceExcerpt: z.string().trim().max(600),
});

export const BuyingSignalVerificationProposalSchema = z.object({
  candidateId: z.string().trim().min(1).max(400),
  verified: z.boolean(),
  evidenceState: EvidenceStateSchema,
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1).max(600),
  eventDate: IsoDateSchema.nullable(),
  evidenceExcerpt: z.string().trim().max(500),
});

export const BuyingSignalVerificationBatchSchema = z.object({
  signals: z.array(BuyingSignalVerificationProposalSchema).max(20),
});

export const DiscoveryStageSchema = z.enum([
  "SEARCH_PROVIDER",
  "OFFICIAL_SOURCE_FETCH",
  "ACCOUNT_EXTRACTION",
  "BUYING_SIGNAL_VERIFICATION",
  "CONTACT_PLAN",
  "CONTACT_SOURCE_DISCOVERY",
  "CONTACT_SOURCE_FETCH",
  "CONTACT_EXTRACTION",
  "CONTACT_VERIFICATION",
  "SCORE_RECALCULATION",
  "READY_FOR_REVIEW",
]);

export const BudgetSchema = z.object({
  maxSearches: z.number().int().positive().max(ABSOLUTE_SCOUT_LIMITS.maxSearches),
  maxPages: z.number().int().positive().max(ABSOLUTE_SCOUT_LIMITS.maxPages),
  maxModelCalls: z.number().int().positive().max(ABSOLUTE_SCOUT_LIMITS.maxModelCalls),
  maxCostUsd: z.number().nonnegative().max(ABSOLUTE_SCOUT_LIMITS.maxCostUsd),
  searchesUsed: z.number().int().nonnegative(),
  pagesUsed: z.number().int().nonnegative(),
  modelCallsUsed: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
  contactSearchesUsed: z.number().int().nonnegative().optional(),
  contactPagesUsed: z.number().int().nonnegative().optional(),
  contactModelCallsUsed: z.number().int().nonnegative().optional(),
});

export const DiscoveredAccountSchema = z.object({
  accountKey: nonEmptyText.max(300),
  companyName: nonEmptyText.max(200),
  officialDomain: z.string().url().optional(),
  website: z.string().url().optional(),
  country: z.string().trim().min(2).max(100).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  classification: ProspectAccountClassificationSchema,
  relevanceHypothesis: nonEmptyText.max(1000),
  discoveredSignals: z.array(nonEmptyText),
  possibleBuyerRoles: z.array(nonEmptyText),
  discoveryEvidenceIds: z.array(nonEmptyText),
  unresolvedQuestions: z.array(nonEmptyText),
  contactRequirementStatus: z.enum(["NOT_EVALUATED", "MET", "NOT_MET"]).optional(),
  contactSearchSummary: z.string().trim().max(500).optional(),
});

export const VerifiedBuyingSignalSchema = z.object({
  signalId: nonEmptyText.max(400),
  accountKey: nonEmptyText.max(300),
  companyName: nonEmptyText.max(200),
  signalType: BuyingSignalTypeSchema,
  summary: nonEmptyText.max(600),
  eventDate: IsoDateSchema.nullable(),
  freshness: SignalFreshnessSchema,
  evidenceState: EvidenceStateSchema,
  verified: z.boolean(),
  confidence: z.number().min(0).max(1),
  verificationReason: nonEmptyText.max(600),
  evidenceExcerpt: z.string().trim().max(500),
  sourceUrl: z.string().url(),
  sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/),
  evidenceId: nonEmptyText.max(200),
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
export type AccountExtractionProposal = z.infer<typeof AccountExtractionProposalSchema>;
export type AccountExtractionCandidate = z.infer<typeof AccountExtractionCandidateSchema>;
export type BuyingSignalCandidate = z.infer<typeof BuyingSignalCandidateSchema>;
export type BuyingSignalVerificationBatch = z.infer<typeof BuyingSignalVerificationBatchSchema>;
export type VerifiedBuyingSignal = z.infer<typeof VerifiedBuyingSignalSchema>;
export type { ProspectAccountCategory, ProspectAccountClassification, ProspectBuyerModel };
