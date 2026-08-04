import { SalesMissionBriefSchema } from "@/lib/sales/mission-schema";
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

  const state = await prepareSalesMission(parsed.data);

  return Response.json(
    {
      missionId: state.missionId,
      missionRunId: state.missionRunId,
      graphVersion: state.graphVersion,
      status: state.status,
      targetProfile: state.targetProfile,
      searchStrategy: state.searchStrategy,
      budget: state.budget,
      warnings: state.warnings,
    },
    { status: 201 },
  );
}
