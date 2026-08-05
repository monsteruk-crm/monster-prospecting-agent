import { describe, expect, test } from "vitest";

import { SalesMissionBriefSchema } from "@/lib/sales/mission-schema";

describe("sales mission brief schema", () => {
  test("applies bounded defaults for a valid Act 1 brief", () => {
    const brief = SalesMissionBriefSchema.parse({
      name: "Benelux family attraction hunt",
      geographies: ["Belgium", "Netherlands"],
      accountCategories: ["FAMILY_ATTRACTION_OPERATOR"],
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
      accountCategories: ["FESTIVAL_PRODUCER"],
      buyerRoles: ["Event Director"],
      limits: { maxCandidateAccounts: 25 },
    });
    expect(brief.limits.maxCandidateAccounts).toBe(25);
    expect(() => SalesMissionBriefSchema.parse({
      name: "Over-sized hunt",
      geographies: ["Germany"],
      accountCategories: ["FESTIVAL_PRODUCER"],
      buyerRoles: ["Event Director"],
      limits: { maxCandidateAccounts: 26 },
    })).toThrow();
  });
});
