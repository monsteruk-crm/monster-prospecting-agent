import { describe, expect, test } from "vitest";

import { AccountExtractionProposalSchema, SalesMissionBriefSchema } from "@/lib/sales/mission-schema";

describe("sales mission brief schema", () => {
  test("applies bounded defaults for a valid Act 1 brief", () => {
    const brief = SalesMissionBriefSchema.parse({
      name: "Benelux family attraction hunt",
      geographies: ["Belgium", "Netherlands"],
      accountCategories: ["FAMILY_ATTRACTION_OPERATOR", "LEISURE_ENTERTAINMENT_GROUP"],
      buyerRoles: ["Commercial Director"],
    });

    expect(brief.productFocus).toBe("THE_MONSTER");
    expect(brief.contactRequirement).toBe("ANY_ROUTE");
    expect(brief.limits.maxCandidateAccounts).toBe(5);
    expect(brief.freshnessWindowDays).toBe(365);
  });

  test("permits the configured target but remains absolutely bounded", () => {
    const brief = SalesMissionBriefSchema.parse({
      name: "Five-account hunt",
      geographies: ["Germany"],
      accountCategories: ["FESTIVAL_PRODUCER", "PUBLIC_EVENT_CONTRACTOR"],
      buyerRoles: ["Event Director"],
      limits: { maxCandidateAccounts: 25 },
    });
    expect(brief.limits.maxCandidateAccounts).toBe(25);
    expect(() => SalesMissionBriefSchema.parse({
      name: "Over-sized hunt",
      geographies: ["Germany"],
      accountCategories: ["FESTIVAL_PRODUCER", "PUBLIC_EVENT_CONTRACTOR"],
      buyerRoles: ["Event Director"],
      limits: { maxCandidateAccounts: 26 },
    })).toThrow();
  });

  test("does not invent signal preferences when the mission explicitly supplies none", () => {
    const brief = SalesMissionBriefSchema.parse({
      name: "Signal-free contact hunt",
      geographies: ["UK"],
      accountCategories: ["FAMILY_ATTRACTION_OPERATOR"],
      buyerRoles: ["any available email"],
      requiredSignals: [],
      preferredSignals: [],
    });
    expect(brief.requiredSignals).toEqual([]);
    expect(brief.preferredSignals).toEqual([]);
  });

  test("normalizes omitted subtypes to a required empty array for strict model output", () => {
    const account = AccountExtractionProposalSchema.parse({
      companyName: "Example Attraction",
      officialDomain: null,
      website: null,
      country: "UK",
      city: "London",
      classification: {
        primaryCategory: "FAMILY_ATTRACTION_OPERATOR",
        secondaryCategories: [],
        buyerModel: "OWNER_OPERATOR",
      },
      relevanceHypothesis: "The source describes an organisation operating a family attraction.",
      possibleBuyerRoles: [],
      buyingSignals: [],
      unresolvedQuestions: [],
    });

    expect(account.classification.subtypes).toEqual([]);
  });
});
