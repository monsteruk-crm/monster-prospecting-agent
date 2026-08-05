import { ABSOLUTE_SCOUT_LIMITS } from "@/lib/settings/absolute-limits";

export type BudgetPlanInput = {
  maxCandidateAccounts: number;
  maxModelCalls: number;
  contactModelCallsPerAccount: number;
};

export type BudgetPlan = {
  requestedAccounts: number;
  extractionCalls: number;
  verificationCalls: number;
  reservedContactCalls: number;
  maximumRequirement: number;
  investigableAccounts: number;
  warnings: string[];
};

export function planMissionBudget(input: BudgetPlanInput): BudgetPlan {
  const requestedAccounts = Math.min(input.maxCandidateAccounts, ABSOLUTE_SCOUT_LIMITS.maxCandidateAccounts);
  const reservedContactCalls = requestedAccounts * Math.max(0, input.contactModelCallsPerAccount);
  const callsAvailableForDiscovery = Math.max(0, input.maxModelCalls - reservedContactCalls);
  const investigableAccounts = Math.min(requestedAccounts, Math.floor(callsAvailableForDiscovery / 2));
  const extractionCalls = investigableAccounts;
  const verificationCalls = investigableAccounts;
  const maximumRequirement = extractionCalls + verificationCalls + reservedContactCalls;
  const warnings: string[] = [];
  if (investigableAccounts < requestedAccounts) {
    warnings.push(`You requested ${requestedAccounts} accounts but the model-call budget supports at most ${investigableAccounts} when extraction and verification both require a call.`);
  }
  if (input.maxModelCalls > ABSOLUTE_SCOUT_LIMITS.maxModelCalls) {
    warnings.push(`The model-call budget is capped at the absolute ceiling of ${ABSOLUTE_SCOUT_LIMITS.maxModelCalls}.`);
  }
  return { requestedAccounts, extractionCalls, verificationCalls, reservedContactCalls, maximumRequirement, investigableAccounts, warnings };
}
