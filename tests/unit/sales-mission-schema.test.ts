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
    expect(brief.limits.maxCandidateAccounts).toBe(3);
    expect(brief.freshnessWindowDays).toBe(365);
  });

  test("never permits more than three candidate accounts in Act 1", () => {
    expect(() =>
      SalesMissionBriefSchema.parse({
        name: "Over-sized hunt",
        geographies: ["Germany"],
        accountCategories: ["FESTIVAL_PRODUCER"],
        buyerRoles: ["Event Director"],
        limits: { maxCandidateAccounts: 4 },
      }),
    ).toThrow();
  });
});
