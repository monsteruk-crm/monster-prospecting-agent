import { z } from "zod";

import {
  ContactRequirementSchema,
  ProductFocusSchema,
  ProspectCategorySchema,
} from "@/lib/sales/mission-schema";
import { ABSOLUTE_SCOUT_LIMITS, ABSOLUTE_LIMITS_VERSION } from "@/lib/settings/absolute-limits";

const boundedText = z.string().trim().min(1).max(200);
const boundedModel = z.string().trim().min(1).max(200).regex(/^[a-zA-Z0-9._:/-]+$/);

export const ScoutSettingsSchema = z.object({
  schemaVersion: z.number().int().positive(),
  missionDefaults: z.object({
    owner: boundedText,
    geographies: z.array(boundedText).min(1).max(20),
    accountCategories: z.array(ProspectCategorySchema).min(1).max(8),
    productFocus: ProductFocusSchema,
    contactRequirement: ContactRequirementSchema,
    buyerRoles: z.array(boundedText).min(1).max(20),
    requiredSignals: z.array(boundedText).max(20),
    preferredSignals: z.array(boundedText).max(20),
    freshnessWindowDays: z.number().int().min(1).max(3650),
    exclusions: z.array(boundedText).max(20),
    instructions: z.string().max(2000),
  }),
  missionBudgets: z.object({
    maxCandidateAccounts: z.number().int().min(1).max(ABSOLUTE_SCOUT_LIMITS.maxCandidateAccounts),
    maxSearches: z.number().int().min(1).max(ABSOLUTE_SCOUT_LIMITS.maxSearches),
    maxPages: z.number().int().min(1).max(ABSOLUTE_SCOUT_LIMITS.maxPages),
    maxModelCalls: z.number().int().min(1).max(ABSOLUTE_SCOUT_LIMITS.maxModelCalls),
    maxCostUsd: z.number().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxCostUsd),
  }),
  continuationBudgets: z.object({
    additionalSearches: z.number().int().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxContinuationSearches),
    additionalPages: z.number().int().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxContinuationPages),
    additionalModelCalls: z.number().int().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxContinuationModelCalls),
    additionalCostUsd: z.number().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxContinuationCostUsd),
  }),
  contactEnrichment: z.object({
    enabledByDefault: z.boolean(),
    searchesPerAccount: z.number().int().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxContactSearchesPerAccount),
    pagesPerAccount: z.number().int().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxContactPagesPerAccount),
    modelCallsPerAccount: z.number().int().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxContactModelCallsPerAccount),
    deterministicFallbackPages: z.number().int().min(0).max(ABSOLUTE_SCOUT_LIMITS.maxContactPagesPerAccount),
  }),
  modelRouting: z.object({
    planningModel: boundedModel.optional(),
    extractionModel: boundedModel.optional(),
    interpretationModel: boundedModel.optional(),
    verificationModel: boundedModel.optional(),
    planningTemperature: z.number().min(0).max(2),
    extractionTemperature: z.number().min(0).max(2),
    interpretationTemperature: z.number().min(0).max(2),
    verificationTemperature: z.number().min(0).max(2),
    requestTimeoutMs: z.number().int().min(1000).max(120000),
    maximumRetries: z.number().int().min(0).max(5),
  }),
  costPolicy: z.object({
    currency: z.literal("USD"),
    warningPercent: z.number().min(1).max(100),
    hardStopEnabled: z.boolean(),
    allowUnknownCostModels: z.boolean(),
  }),
  interface: z.object({
    defaultMissionPreset: z.enum(["CONSERVATIVE", "STANDARD", "DEEP", "CUSTOM"]),
    showAdvancedMissionSettings: z.boolean(),
  }),
  absoluteLimitsVersion: z.literal(ABSOLUTE_LIMITS_VERSION),
});

export type ScoutSettings = z.infer<typeof ScoutSettingsSchema>;
export type ScoutSettingsInput = z.input<typeof ScoutSettingsSchema>;

export const ScoutSettingsPatchSchema = ScoutSettingsSchema.partial().extend({
  version: z.number().int().positive().optional(),
});

export const ScoutSettingsPreset = {
  CONSERVATIVE: { maxCandidateAccounts: 5, maxSearches: 12, maxPages: 20, maxModelCalls: 20, maxCostUsd: 2 },
  STANDARD: { maxCandidateAccounts: 10, maxSearches: 24, maxPages: 40, maxModelCalls: 40, maxCostUsd: 5 },
  DEEP: { maxCandidateAccounts: 20, maxSearches: 50, maxPages: 80, maxModelCalls: 100, maxCostUsd: 15 },
} as const;

export function defaultScoutSettings(env: Record<string, string | undefined> = process.env): ScoutSettings {
  return ScoutSettingsSchema.parse({
    schemaVersion: 1,
    missionDefaults: {
      owner: "Nick",
      geographies: ["United Kingdom"],
      accountCategories: ["TICKETED_EVENT_PROMOTER"],
      productFocus: "THE_MONSTER",
      contactRequirement: "ANY_ROUTE",
      buyerRoles: ["Managing Director"],
      requiredSignals: [],
      preferredSignals: ["new programme", "expansion", "partnership"],
      freshnessWindowDays: 365,
      exclusions: [],
      instructions: "",
    },
    missionBudgets: ScoutSettingsPreset.CONSERVATIVE,
    continuationBudgets: { additionalSearches: 7, additionalPages: 20, additionalModelCalls: 12, additionalCostUsd: 2 },
    contactEnrichment: { enabledByDefault: true, searchesPerAccount: 1, pagesPerAccount: 3, modelCallsPerAccount: 0, deterministicFallbackPages: 2 },
    modelRouting: {
      planningModel: env.PLANNING_MODEL,
      extractionModel: env.EXTRACTION_MODEL,
      interpretationModel: env.INTERPRETATION_MODEL,
      verificationModel: env.VERIFICATION_MODEL,
      planningTemperature: 0,
      extractionTemperature: 0,
      interpretationTemperature: 0,
      verificationTemperature: 0,
      requestTimeoutMs: 30000,
      maximumRetries: 1,
    },
    costPolicy: { currency: "USD", warningPercent: 80, hardStopEnabled: true, allowUnknownCostModels: true },
    interface: { defaultMissionPreset: "CONSERVATIVE", showAdvancedMissionSettings: false },
    absoluteLimitsVersion: ABSOLUTE_LIMITS_VERSION,
  });
}
