import { SalesMissionBriefSchema } from "@/lib/sales/mission-schema";
import { discoverSalesMission } from "@/lib/graph/sales-mission-discovery";
import { prepareSalesMission } from "@/lib/graph/sales-mission-preparation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 },
    );
  }

  const parsed = SalesMissionBriefSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "INVALID_SALES_MISSION_BRIEF",
          message: "The sales mission brief failed validation.",
          issues: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  try {
    const prepared = await prepareSalesMission(parsed.data);
    if (!prepared.targetProfile || !prepared.searchStrategy) {
      return Response.json(
        {
          error: {
            code: "MISSION_PREPARATION_INCOMPLETE",
            message: "The mission preparation graph did not produce discovery inputs.",
          },
        },
        { status: 500 },
      );
    }

    const discovered = await discoverSalesMission(
      {
        missionId: prepared.missionId,
        missionRunId: prepared.missionRunId,
        brief: prepared.brief,
        targetProfile: prepared.targetProfile,
        searchStrategy: prepared.searchStrategy,
        budget: prepared.budget,
        warnings: prepared.warnings,
        errors: prepared.errors,
      },
      {},
    );

    return Response.json(
      {
        missionId: discovered.missionId,
        missionRunId: discovered.missionRunId,
        graphVersion: discovered.graphVersion,
        status: discovered.status,
        discoveryStage: discovered.discoveryStage,
        targetProfile: discovered.targetProfile,
        searchStrategy: discovered.searchStrategy,
        budget: discovered.budget,
        searchResults: discovered.searchResults,
        fetchedSources: discovered.fetchedSources,
        accountExtractionCandidates: discovered.accountExtractionCandidates,
        accounts: discovered.discoveredAccounts,
        accountIds: discovered.accountIds,
        buyingSignals: discovered.buyingSignals,
        buyingSignalIds: discovered.buyingSignalIds,
        evidenceIds: discovered.evidenceIds,
        warnings: discovered.warnings,
        errors: discovered.errors,
      },
      {
        status: 201,
        headers: { "cache-control": "no-store" },
      },
    );
  } catch {
    return Response.json(
      {
        error: {
          code: "MISSION_DISCOVERY_FAILED",
          message: "The bounded discovery run could not be completed.",
        },
      },
      { status: 502 },
    );
  }
}
