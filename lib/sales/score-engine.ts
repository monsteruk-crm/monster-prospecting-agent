import { z } from "zod";

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

const eligibleCategories = new Set([
  "TICKETED_EVENT_PROMOTER",
  "FAMILY_ATTRACTION_OPERATOR",
  "FESTIVAL_PRODUCER",
  "TOURING_EVENT_OPERATOR",
  "EXPERIENTIAL_EVENT_AGENCY",
  "VENUE_PROGRAMMING_COMPANY",
  "EXHIBITION_OPERATOR",
  "LEISURE_DESTINATION_GROUP",
  "HOLIDAY_RESORT",
  "VISITOR_ATTRACTION",
  "MIXED_USE_DESTINATION",
  "CITY_EVENT_CONTRACTOR",
  "SPORTS_ENTERTAINMENT_OPERATOR",
  "REGIONAL_OPERATING_PARTNER",
  "COMPARABLE_ATTRACTION_OPERATOR",
]);

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
  const monsterRelevance = account.categories.some((category) => eligibleCategories.has(category))
    ? account.relevanceHypothesis.length >= 40 ? 20 : 15
    : 5;
  const hasContactRoute = contactRoutes.length > 0;
  const hasContactPage = contactRoutes.some((route) => route.routeType === "CONTACT_PAGE");
  const reachability = hasContactPage ? 15 : hasContactRoute ? 8 : 0;
  const evidence = source.status >= 200 && source.status < 300 && source.readableExcerpt.length > 40 ? 15 : 8;
  const uncappedTotal = buyerFit + timing + monsterRelevance + reachability + evidence;
  const caps = hasContactRoute ? [] : ["NO_USABLE_PUBLIC_CONTACT_ROUTE"];
  const total = hasContactRoute ? uncappedTotal : Math.min(70, uncappedTotal);
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
