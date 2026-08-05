import { describe, expect, test } from "vitest";

import { deriveContactRoutes } from "@/lib/sales/contact-route-engine";

describe("deriveContactRoutes", () => {
  test("keeps a role-only route when no contact page is evidenced", () => {
    const routes = deriveContactRoutes({
      accountKey: "example.org:example", companyName: "Example", officialDomain: "https://example.org", website: "https://example.org/visit",
      categories: ["VISITOR_ATTRACTION"], relevanceHypothesis: "An attraction.", discoveredSignals: [], possibleBuyerRoles: ["Head of Programming"], discoveryEvidenceIds: [`source:${"a".repeat(64)}`], unresolvedQuestions: [],
    }, [{ sourceUrl: "https://example.org/visit", finalUrl: "https://example.org/visit", status: 200, mimeType: "text/html", readableExcerpt: "A source", byteCount: 10, contentHash: "a".repeat(64), retrievedAt: "2026-08-05T00:00:00.000Z", redirectCount: 0, searchQuery: "example" }]);
    expect(routes[0]).toMatchObject({ targetRole: "Head of Programming", routeType: "ROLE_ONLY", sourceEvidenceIds: [`source:${"a".repeat(64)}`] });
    expect(routes[0].contactPageUrl).toBeUndefined();
  });
});
