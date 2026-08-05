import { ContactRouteSchema, type ContactRoute } from "@/lib/sales/contact-schema";
import type { DiscoveredAccount, FetchedSourceReference, SalesMissionBrief } from "@/lib/sales/mission-schema";

const PUBLIC_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const EMAIL_ONLY_INSTRUCTION_PATTERN = /(?:\bonly\b[\s\S]{0,80}\b(?:e-?mail)\b|\b(?:e-?mail)\b[\s\S]{0,80}\bonly\b|\b(?:must|required|require)\b[\s\S]{0,80}\b(?:e-?mail)\b)/i;

export function extractPublicEmail(sourceExcerpt: string): string | undefined {
  const match = sourceExcerpt.match(PUBLIC_EMAIL_PATTERN)?.[0];
  return match?.replace(/[),.;:]+$/, "").toLowerCase();
}

export function requiresPublicEmail(
  brief: Pick<SalesMissionBrief, "contactRequirement" | "instructions">,
): boolean {
  return brief.contactRequirement === "PUBLIC_EMAIL" || EMAIL_ONLY_INSTRUCTION_PATTERN.test(brief.instructions);
}

export function deriveContactRoutes(
  account: DiscoveredAccount,
  sources: FetchedSourceReference[],
  fallbackRoles: string[] = [],
  options: { requirePublicEmail?: boolean } = {},
): ContactRoute[] {
  const source = sources.find((candidate) => account.discoveryEvidenceIds.includes(`source:${candidate.contentHash}`));
  const pathLooksLikeContactRoute = source && /\/(contact|partnership|commercial|team|about)(\/|$)/i.test(new URL(source.finalUrl).pathname);
  const targetRoles = account.possibleBuyerRoles.length > 0 ? account.possibleBuyerRoles : fallbackRoles;
  const email = source ? extractPublicEmail(source.readableExcerpt) : undefined;

  if (options.requirePublicEmail && !email) {
    return [];
  }

  return targetRoles.slice(0, 10).map((targetRole) => ContactRouteSchema.parse({
    targetRole,
    ...(email ? { email } : {}),
    ...(pathLooksLikeContactRoute ? { contactPageUrl: source.finalUrl } : {}),
    sourceEvidenceIds: source ? [`source:${source.contentHash}`] : [],
    routeType: pathLooksLikeContactRoute ? "CONTACT_PAGE" : "ROLE_ONLY",
    roleConfidence: "MEDIUM",
    dataFreshness: source ? "CURRENT" : "UNKNOWN",
  }));
}
