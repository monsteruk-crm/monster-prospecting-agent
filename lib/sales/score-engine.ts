import { z } from "zod";

import { getProspectCategoryDefinition } from "@/lib/sales/prospect-taxonomy";
import {
  type DiscoveredAccount,
  type SalesMissionBrief,
  type VerifiedBuyingSignal,
} from "@/lib/sales/mission-schema";
import type { ContactRoute } from "@/lib/sales/contact-schema";

export const ProspectScoreSchema = z.object({
  buyerFit: z.number().int().min(0).max(25),
  timing: z.number().int().min(0).max(25),
  monsterRelevance: z.number().int().min(0).max(20),
  reachability: z.number().int().min(0).max(15),
  evidence: z.number().int().min(0).max(15),
  total: z.number().int().min(0).max(100),
  scoreState: z.enum(["HOT", "WARM", "COLD", "UNQUALIFIED"]),
  caps: z.array(z.string().min(1)),
  calculatedAt: z.string().datetime(),
});

export type ProspectScore = z.infer<typeof ProspectScoreSchema>;

function isProductFit(category: DiscoveredAccount["classification"]["primaryCategory"], productFocus: SalesMissionBrief["productFocus"]): boolean {
  const fit = getProspectCategoryDefinition(category).likelyProductFit;
  if (productFocus === "UNDECIDED") {
    return fit !== "UNDECIDED";
  }
  return fit === "BOTH" || fit === productFocus;
}

export function scoreProspectAccount(
  account: DiscoveredAccount,
  signals: VerifiedBuyingSignal[],
  brief: SalesMissionBrief,
  source: { status: number; readableExcerpt: string },
  contactRoutes: ContactRoute[] = [],
  now = new Date(),
): ProspectScore {
  const buyerFit = account.possibleBuyerRoles.some((role) =>
    brief.buyerRoles.some((target) => role.toLowerCase().includes(target.toLowerCase()) || target.toLowerCase().includes(role.toLowerCase())),
  ) ? 25 : account.possibleBuyerRoles.length > 0 ? 12 : 0;
  const accountSignals = signals.filter((signal) => signal.accountKey === account.accountKey);
  const timing = accountSignals.some((signal) => signal.verified && signal.freshness === "CURRENT")
    ? 25
    : accountSignals.some((signal) => signal.verified && signal.freshness === "RECENT")
      ? 20
      : accountSignals.length > 0 ? 8 : 0;
  const accountCategories = [account.classification.primaryCategory, ...account.classification.secondaryCategories];
  const monsterRelevance = accountCategories.some((category) => isProductFit(category, brief.productFocus))
    ? account.relevanceHypothesis.length >= 40 ? 20 : 15
    : 5;
  const usableRoutes = contactRoutes.filter((route) => route.isUsableForSales && route.routeType !== "ROLE_ONLY");
  const hasContactRoute = usableRoutes.length > 0;
  const bestRoute = usableRoutes.sort((left, right) => right.routeScore - left.routeScore)[0];
  const reachability = bestRoute?.routeType === "PUBLIC_EMAIL"
    ? bestRoute.routeScore >= 88 ? 15 : 9
    : bestRoute?.routeType === "CONTACT_PAGE" || bestRoute?.routeType === "CONTACT_FORM" ? 11
      : bestRoute?.routeType === "PUBLIC_PHONE" ? 7
        : bestRoute?.routeType === "PROFESSIONAL_PROFILE" ? 5
          : contactRoutes.some((route) => route.routeType === "ROLE_ONLY") ? 3 : 0;
  const evidence = source.status >= 200 && source.status < 300 && source.readableExcerpt.length > 40 ? 15 : 8;
  const uncappedTotal = buyerFit + timing + monsterRelevance + reachability + evidence;
  const caps = [
    ...(!hasContactRoute ? ["NO_USABLE_PUBLIC_CONTACT_ROUTE"] : []),
    ...(brief.contactRequirement === "PUBLIC_EMAIL" && !contactRoutes.some((route) => route.routeType === "PUBLIC_EMAIL" && route.isUsableForSales) ? ["CONTACT_REQUIREMENT_NOT_MET"] : []),
  ];
  const total = caps.length === 0 ? uncappedTotal : Math.min(70, uncappedTotal);
  const scoreState = total >= 80 ? "HOT" : total >= 55 ? "WARM" : total >= 30 ? "COLD" : "UNQUALIFIED";

  return ProspectScoreSchema.parse({
    buyerFit,
    timing,
    monsterRelevance,
    reachability,
    evidence,
    total,
    scoreState,
    caps,
    calculatedAt: now.toISOString(),
  });
}
