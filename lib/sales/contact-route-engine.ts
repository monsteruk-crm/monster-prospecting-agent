import { ContactRouteSchema, type ContactRoute } from "@/lib/sales/contact-schema";
import type { DiscoveredAccount, FetchedSourceReference } from "@/lib/sales/mission-schema";

export function deriveContactRoutes(
  account: DiscoveredAccount,
  sources: FetchedSourceReference[],
): ContactRoute[] {
  const source = sources.find((candidate) => account.discoveryEvidenceIds.includes(`source:${candidate.contentHash}`));
  const pathLooksLikeContactRoute = source && /\/(contact|partnership|commercial|team|about)(\/|$)/i.test(new URL(source.finalUrl).pathname);

  return account.possibleBuyerRoles.slice(0, 10).map((targetRole) => ContactRouteSchema.parse({
    targetRole,
    ...(pathLooksLikeContactRoute ? { contactPageUrl: source.finalUrl } : {}),
    sourceEvidenceIds: source ? [`source:${source.contentHash}`] : [],
    routeType: pathLooksLikeContactRoute ? "CONTACT_PAGE" : "ROLE_ONLY",
    roleConfidence: "MEDIUM",
    dataFreshness: source ? "CURRENT" : "UNKNOWN",
  }));
}
