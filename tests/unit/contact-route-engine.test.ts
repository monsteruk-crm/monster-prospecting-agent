import { describe, expect, test } from "vitest";

import { deriveContactRoutes, isLikelyPublicPhone, requiresPublicEmail, sanitizeContactRoutes } from "@/lib/sales/contact-route-engine";

describe("deriveContactRoutes", () => {
  test("treats an email-only role phrase as an email requirement and never a buyer role", () => {
    expect(requiresPublicEmail({ contactRequirement: "ANY_ROUTE", instructions: "", buyerRoles: ["any email available"] })).toBe(true);
    expect(isLikelyPublicPhone("2025-05-21")).toBe(false);
    expect(isLikelyPublicPhone("20252023-09-01")).toBe(false);
    expect(isLikelyPublicPhone("2025-10-01 07")).toBe(false);
    expect(isLikelyPublicPhone("2006 - 2026")).toBe(false);
    expect(isLikelyPublicPhone("12)-16-22-(33-58")).toBe(false);
    expect(isLikelyPublicPhone("12-16-22--25")).toBe(false);
    expect(isLikelyPublicPhone("+44 20 1234 5678")).toBe(true);
    expect(sanitizeContactRoutes([{ targetRole: "any email available", intendedBuyerRole: "any email available", email: "hello@acme.co", sourceEvidenceIds: ["source:one"], routeType: "PUBLIC_EMAIL", roleConfidence: "LOW", dataFreshness: "CURRENT" }])[0].targetRole).toBe("Commercial Director");
  });

  test("keeps a role-only route when no contact page is evidenced", () => {
    const routes = deriveContactRoutes({
      accountKey: "example.org:example", companyName: "Example", officialDomain: "https://example.org", website: "https://example.org/visit",
      classification: { primaryCategory: "FAMILY_ATTRACTION_OPERATOR" as const, secondaryCategories: ["LEISURE_ENTERTAINMENT_GROUP"], subtypes: [], buyerModel: "OWNER_OPERATOR" as const }, relevanceHypothesis: "An attraction.", discoveredSignals: [], possibleBuyerRoles: ["Head of Programming"], discoveryEvidenceIds: [`source:${"a".repeat(64)}`], unresolvedQuestions: [],
    }, [{ sourceUrl: "https://example.org/visit", finalUrl: "https://example.org/visit", status: 200, mimeType: "text/html", readableExcerpt: "A source", byteCount: 10, contentHash: "a".repeat(64), retrievedAt: "2026-08-05T00:00:00.000Z", redirectCount: 0, searchQuery: "example" }]);
    expect(routes[0]).toMatchObject({ targetRole: "Head of Programming", routeType: "ROLE_ONLY", sourceEvidenceIds: [`source:${"a".repeat(64)}`] });
    expect(routes[0].contactPageUrl).toBeUndefined();
  });

  test("falls back to mission buyer roles when extraction returns none", () => {
    const routes = deriveContactRoutes({
      accountKey: "example.org:example", companyName: "Example", officialDomain: "https://example.org", website: "https://example.org/visit",
      classification: { primaryCategory: "FAMILY_ATTRACTION_OPERATOR" as const, secondaryCategories: [], subtypes: [], buyerModel: "OWNER_OPERATOR" as const }, relevanceHypothesis: "An attraction.", discoveredSignals: [], possibleBuyerRoles: [], discoveryEvidenceIds: [], unresolvedQuestions: [],
    }, [], ["Commercial Director"]);
    expect(routes[0]).toMatchObject({ targetRole: "Commercial Director", routeType: "ROLE_ONLY", dataFreshness: "UNKNOWN" });
  });

  test("keeps a publicly confirmed email on the route and supports email-only filtering", () => {
    const account = {
      accountKey: "example.org:example", companyName: "Example", officialDomain: "https://example.org", website: "https://example.org/contact",
      classification: { primaryCategory: "FAMILY_ATTRACTION_OPERATOR" as const, secondaryCategories: [], subtypes: [], buyerModel: "OWNER_OPERATOR" as const }, relevanceHypothesis: "An attraction.", discoveredSignals: [], possibleBuyerRoles: ["Partnerships Director"], discoveryEvidenceIds: [`source:${"b".repeat(64)}`], unresolvedQuestions: [],
    };
    const sources = [{ sourceUrl: "https://example.org/contact", finalUrl: "https://example.org/contact", status: 200, mimeType: "text/html", readableExcerpt: "Contact partnerships@acme.org for commercial enquiries.", byteCount: 60, contentHash: "b".repeat(64), retrievedAt: "2026-08-05T00:00:00.000Z", redirectCount: 0, searchQuery: "example" }];
    expect(deriveContactRoutes(account, sources)[0]).toMatchObject({ email: "partnerships@acme.org", routeType: "PUBLIC_EMAIL" });
    expect(deriveContactRoutes(account, sources).some((route) => route.routeType === "CONTACT_PAGE" && route.contactPageUrl === "https://example.org/contact")).toBe(true);
    expect(deriveContactRoutes(account, [{ ...sources[0], readableExcerpt: "Contact our team." }], [], { requirePublicEmail: true })).toEqual([]);
  });
});
