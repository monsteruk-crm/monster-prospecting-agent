import { describe, expect, test } from "vitest";

import { scoreProspectAccount } from "@/lib/sales/score-engine";
import { ContactRouteSchema } from "@/lib/sales/contact-schema";

const brief = {
  name: "Score test", owner: "Nick", geographies: ["UK"], accountCategories: ["VISITOR_ATTRACTION" as const], productFocus: "THE_MONSTER" as const, contactRequirement: "ANY_ROUTE" as const,
  requiredSignals: [], preferredSignals: [], buyerRoles: ["Head of Programming"], freshnessWindowDays: 365, exclusions: [], instructions: "",
  limits: { maxSearches: 1, maxPages: 1, maxModelCalls: 2, maxCostUsd: 2, maxCandidateAccounts: 1 },
};

const account = {
  accountKey: "example.org:example", companyName: "Example Attraction", officialDomain: "https://example.org", website: "https://example.org/visit",
  country: "UK", city: "London", categories: ["VISITOR_ATTRACTION" as const], relevanceHypothesis: "A large ticketed attraction with public programming and audience operations.",
  discoveredSignals: [], possibleBuyerRoles: ["Head of Programming"], discoveryEvidenceIds: ["source:hash"], unresolvedQuestions: [],
};

describe("scoreProspectAccount", () => {
  test("calculates a deterministic score and caps accounts without contact routes", () => {
    const score = scoreProspectAccount(account, [{
      signalId: "signal:1", accountKey: account.accountKey, companyName: account.companyName, signalType: "NEW_EVENT", summary: "A current event", eventDate: null,
      freshness: "CURRENT", evidenceState: "COMMERCIAL_SIGNAL", verified: true, confidence: 0.9, verificationReason: "Supported", evidenceExcerpt: "A current event", sourceUrl: "https://example.org/visit", sourceContentHash: "hash", evidenceId: "source:hash",
    }], brief, { status: 200, readableExcerpt: "A sufficiently long official source excerpt for scoring." }, [], new Date("2026-08-05T00:00:00.000Z"));
    expect(score.total).toBeLessThanOrEqual(70);
    expect(score.scoreState).toBe("WARM");
    expect(score.caps).toContain("NO_USABLE_PUBLIC_CONTACT_ROUTE");
  });

  test("keeps role-only reachability below a verified public route", () => {
    const route = ContactRouteSchema.parse({ targetRole: "Head of Programming", sourceEvidenceIds: ["source:hash"], routeType: "ROLE_ONLY", roleConfidence: "MEDIUM", dataFreshness: "UNKNOWN" });
    const score = scoreProspectAccount(account, [], brief, { status: 200, readableExcerpt: "A sufficiently long official source excerpt for scoring." }, [route]);
    expect(score.caps).toContain("NO_USABLE_PUBLIC_CONTACT_ROUTE");
    expect(score.reachability).toBe(3);
  });
});
