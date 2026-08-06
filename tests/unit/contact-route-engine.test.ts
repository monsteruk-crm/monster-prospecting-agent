import { describe, expect, test } from "vitest";

import { deriveContactRoutes } from "@/lib/sales/contact-route-engine";

describe("deriveContactRoutes", () => {
  test("keeps a role-only route when no contact page is evidenced", () => {
    const routes = deriveContactRoutes({
      accountKey: "example.org:example", companyName: "Example", officialDomain: "https://example.org", website: "https://example.org/visit",
      classification: { primaryCategory: "FAMILY_ATTRACTION_OPERATOR", secondaryCategories: ["LEISURE_ENTERTAINMENT_GROUP"], buyerModel: "OWNER_OPERATOR" }, relevanceHypothesis: "An attraction.", discoveredSignals: [], possibleBuyerRoles: ["Head of Programming"], discoveryEvidenceIds: [`source:${"a".repeat(64)}`], unresolvedQuestions: [],
    }, [{ sourceUrl: "https://example.org/visit", finalUrl: "https://example.org/visit", status: 200, mimeType: "text/html", readableExcerpt: "A source", byteCount: 10, contentHash: "a".repeat(64), retrievedAt: "2026-08-05T00:00:00.000Z", redirectCount: 0, searchQuery: "example" }]);
    expect(routes[0]).toMatchObject({ targetRole: "Head of Programming", routeType: "ROLE_ONLY", sourceEvidenceIds: [`source:${"a".repeat(64)}`] });
    expect(routes[0].contactPageUrl).toBeUndefined();
  });

  test("falls back to mission buyer roles when extraction returns none", () => {
    const routes = deriveContactRoutes({
      accountKey: "example.org:example", companyName: "Example", officialDomain: "https://example.org", website: "https://example.org/visit",
      classification: { primaryCategory: "FAMILY_ATTRACTION_OPERATOR", secondaryCategories: [], buyerModel: "OWNER_OPERATOR" }, relevanceHypothesis: "An attraction.", discoveredSignals: [], possibleBuyerRoles: [], discoveryEvidenceIds: [], unresolvedQuestions: [],
    }, [], ["Commercial Director"]);
    expect(routes[0]).toMatchObject({ targetRole: "Commercial Director", routeType: "ROLE_ONLY", dataFreshness: "UNKNOWN" });
  });

  test("keeps a publicly confirmed email on the route and supports email-only filtering", () => {
    const account = {
      accountKey: "example.org:example", companyName: "Example", officialDomain: "https://example.org", website: "https://example.org/contact",
      classification: { primaryCategory: "FAMILY_ATTRACTION_OPERATOR", secondaryCategories: [], buyerModel: "OWNER_OPERATOR" as const }, relevanceHypothesis: "An attraction.", discoveredSignals: [], possibleBuyerRoles: ["Partnerships Director"], discoveryEvidenceIds: [`source:${"b".repeat(64)}`], unresolvedQuestions: [],
    };
    const sources = [{ sourceUrl: "https://example.org/contact", finalUrl: "https://example.org/contact", status: 200, mimeType: "text/html", readableExcerpt: "Contact partnerships@acme.org for commercial enquiries.", byteCount: 60, contentHash: "b".repeat(64), retrievedAt: "2026-08-05T00:00:00.000Z", redirectCount: 0, searchQuery: "example" }];
    expect(deriveContactRoutes(account, sources)[0]).toMatchObject({ email: "partnerships@acme.org", routeType: "PUBLIC_EMAIL" });
    expect(deriveContactRoutes(account, sources).some((route) => route.routeType === "CONTACT_PAGE" && route.contactPageUrl === "https://example.org/contact")).toBe(true);
    expect(deriveContactRoutes(account, [{ ...sources[0], readableExcerpt: "Contact our team." }], [], { requirePublicEmail: true })).toEqual([]);
  });
});
