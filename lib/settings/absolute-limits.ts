export const ABSOLUTE_SCOUT_LIMITS = {
  maxCandidateAccounts: 25,
  maxSearches: 100,
  maxPages: 100,
  maxModelCalls: 200,
  maxCostUsd: 100,
  maxContactSearchesPerAccount: 2,
  maxContactPagesPerAccount: 5,
  maxContactModelCallsPerAccount: 1,
  maxContinuationSearches: 20,
  maxContinuationPages: 50,
  maxContinuationModelCalls: 50,
  maxContinuationCostUsd: 10,
} as const;

export const ABSOLUTE_LIMITS_VERSION = "act-1-safety-v1";

export type AbsoluteScoutLimits = typeof ABSOLUTE_SCOUT_LIMITS;
