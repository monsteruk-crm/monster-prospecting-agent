import { randomUUID } from "node:crypto";

import {
  END,
  GraphNode,
  ReducedValue,
  START,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";
import { z } from "zod";

import {
  BudgetSchema,
  DiscoveredAccountSchema,
  GraphErrorSchema,
  GraphWarningSchema,
  SalesMissionBriefSchema,
  SalesMissionRunStatusSchema,
  SearchStrategySchema,
  TargetProfileSchema,
  type Budget,
  type SalesMissionBrief,
  type SalesMissionBriefInput,
} from "@/lib/sales/mission-schema";

export const SALES_MISSION_GRAPH_VERSION = "act-1-preparation-v1";

const appendOnly = <T extends z.ZodType>(schema: T) =>
  new ReducedValue(z.array(schema).default(() => []), {
    reducer: (current, update) => current.concat(update),
  });

export const SalesMissionGraphState = new StateSchema({
  missionId: z.string().min(1),
  missionRunId: z.string().min(1),
  graphVersion: z.string().min(1),
  brief: SalesMissionBriefSchema,
  targetProfile: TargetProfileSchema.optional(),
  searchStrategy: SearchStrategySchema.optional(),
  discoveredAccounts: appendOnly(DiscoveredAccountSchema),
  accountIds: appendOnly(z.string().min(1)),
  evidenceIds: appendOnly(z.string().min(1)),
  buyingSignalIds: appendOnly(z.string().min(1)),
  decisionMakerRouteIds: appendOnly(z.string().min(1)),
  salesAngleIds: appendOnly(z.string().min(1)),
  scoreIds: appendOnly(z.string().min(1)),
  reviewSnapshotId: z.string().min(1).optional(),
  pendingReview: z.record(z.string(), z.unknown()).optional(),
  reviewDecision: z.record(z.string(), z.unknown()).optional(),
  budget: BudgetSchema,
  warnings: appendOnly(GraphWarningSchema),
  errors: appendOnly(GraphErrorSchema),
  status: SalesMissionRunStatusSchema,
});

export type SalesMissionGraphStateType = typeof SalesMissionGraphState;

const buildTargetProfile: GraphNode<SalesMissionGraphStateType> = (state) => {
  const brief = SalesMissionBriefSchema.parse(state.brief);
  const targetProfile = TargetProfileSchema.parse({
    geographies: brief.geographies,
    accountCategories: brief.accountCategories,
    excludedCategories: brief.exclusions,
    productFocus: brief.productFocus,
    requiredSignals: brief.requiredSignals,
    preferredSignals: brief.preferredSignals,
    targetBuyerRoles: brief.buyerRoles,
    commercialScaleIndicators: [
      "large or repeat ticketed audiences",
      "touring, multi-city or multi-venue operations",
      "new programmes, expansion or partnership activity",
    ],
    freshnessWindowDays: brief.freshnessWindowDays,
    maximumProspects: brief.limits.maxCandidateAccounts,
  });

  return { targetProfile, status: "PREPARING" };
};

const buildSearchStrategy: GraphNode<SalesMissionGraphStateType> = (state) => {
  const brief = SalesMissionBriefSchema.parse(state.brief);
  const geography = brief.geographies.join(" OR ");
  const categories = brief.accountCategories.join(" OR ");
  const signals = [...brief.requiredSignals, ...brief.preferredSignals].join(" OR ") || "new programme expansion partnership";
  const remainingQueries = { value: brief.limits.maxSearches };

  const candidates = [
    {
      kind: "CATEGORY_DISCOVERY" as const,
      queries: [`${categories} ${geography}`],
    },
    {
      kind: "GEOGRAPHY_DISCOVERY" as const,
      queries: [`ticketed events attractions ${geography}`],
    },
    {
      kind: "EVENT_PORTFOLIO_DISCOVERY" as const,
      queries: [`${categories} event programme ${geography}`],
    },
    {
      kind: "SIGNAL_DISCOVERY" as const,
      queries: [`${categories} ${signals} ${geography}`],
    },
    {
      kind: "BUYER_ROLE_DISCOVERY" as const,
      queries: brief.buyerRoles.slice(0, 2).map((role) => `${role} ${categories} ${geography}`),
    },
    {
      kind: "CONTACT_ROUTE_DISCOVERY" as const,
      queries: [`${categories} partnerships contact ${geography}`],
    },
    {
      kind: "COMPARABLE_ATTRACTION_DISCOVERY" as const,
      queries: [`comparable attractions operators ${geography}`],
    },
  ];

  const queryFamilies = candidates.flatMap((candidate) => {
    const allowed = Math.min(candidate.queries.length, remainingQueries.value);
    remainingQueries.value -= allowed;
    return allowed > 0
      ? [{ kind: candidate.kind, queries: candidate.queries.slice(0, allowed), maxQueries: allowed }]
      : [];
  });

  const searchStrategy = SearchStrategySchema.parse({
    queryFamilies,
    totalMaxQueries: brief.limits.maxSearches - remainingQueries.value,
  });

  return { searchStrategy, status: "PREPARING" };
};

const markReadyForDiscovery: GraphNode<SalesMissionGraphStateType> = (state) => ({
  status: "READY_FOR_DISCOVERY",
  warnings: state.brief.instructions
    ? [
        {
          code: "INSTRUCTIONS_REQUIRE_REVIEW",
          message: "Mission instructions are preserved for the discovery step and should be reviewed before live search.",
        },
      ]
    : [],
});

export const salesMissionPreparationGraph = new StateGraph(SalesMissionGraphState)
  .addNode("build_target_profile", buildTargetProfile)
  .addNode("build_search_strategy", buildSearchStrategy)
  .addNode("mark_ready_for_discovery", markReadyForDiscovery)
  .addEdge(START, "build_target_profile")
  .addEdge("build_target_profile", "build_search_strategy")
  .addEdge("build_search_strategy", "mark_ready_for_discovery")
  .addEdge("mark_ready_for_discovery", END)
  .compile();

function createInitialBudget(brief: SalesMissionBrief): Budget {
  return {
    ...brief.limits,
    searchesUsed: 0,
    pagesUsed: 0,
    modelCallsUsed: 0,
    estimatedCostUsd: 0,
  };
}

export function createInitialSalesMissionState(
  brief: SalesMissionBriefInput,
  ids: { missionId?: string; missionRunId?: string } = {},
) {
  const parsedBrief = SalesMissionBriefSchema.parse(brief);

  return {
    missionId: ids.missionId ?? randomUUID(),
    missionRunId: ids.missionRunId ?? randomUUID(),
    graphVersion: SALES_MISSION_GRAPH_VERSION,
    brief: parsedBrief,
    discoveredAccounts: [],
    accountIds: [],
    evidenceIds: [],
    buyingSignalIds: [],
    decisionMakerRouteIds: [],
    salesAngleIds: [],
    scoreIds: [],
    budget: createInitialBudget(parsedBrief),
    warnings: [],
    errors: [],
    status: "PREPARING" as const,
  };
}

export async function prepareSalesMission(
  brief: SalesMissionBriefInput,
  ids: { missionId?: string; missionRunId?: string } = {},
) {
  const initialState = createInitialSalesMissionState(brief, ids);
  return salesMissionPreparationGraph.invoke(initialState, {
    configurable: { thread_id: initialState.missionRunId },
    runName: "monster-scout-prepare-sales-mission",
    tags: ["monster-scout", "act-1", "mission-preparation"],
    metadata: {
      product: "monster-scout-sales-hunter",
      milestone: "act-1",
      graphVersion: SALES_MISSION_GRAPH_VERSION,
    },
  });
}
