import { resolveMissionBrief } from "@/lib/settings/settings-service";
import { prepareSalesMission } from "@/lib/graph/sales-mission-preparation";
import { DatabaseConfigurationError } from "@/lib/db/client";
import { persistPreparedMission } from "@/lib/persistence/mission-persistence";

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

  let resolved: Awaited<ReturnType<typeof resolveMissionBrief>>;
  try {
    resolved = await resolveMissionBrief(payload);
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "INVALID_SALES_MISSION_BRIEF",
          message: "The sales mission brief failed validation.",
          issues: error instanceof Error ? [{ message: error.message }] : undefined,
        },
      },
      { status: 400 },
    );
  }

  try {
    const state = await prepareSalesMission(resolved.brief);
    if (!state.targetProfile || !state.searchStrategy) {
      return Response.json(
        {
          error: {
            code: "MISSION_PREPARATION_INCOMPLETE",
            message: "The mission preparation graph did not produce persistence inputs.",
          },
        },
        { status: 500 },
      );
    }

    await persistPreparedMission({
      missionId: state.missionId,
      missionRunId: state.missionRunId,
      graphVersion: state.graphVersion,
      brief: state.brief,
      targetProfile: state.targetProfile,
      searchStrategy: state.searchStrategy,
      budget: state.budget,
      warnings: state.warnings,
      errors: state.errors,
      settingsVersion: resolved.settingsVersion,
      settingsSnapshot: resolved.settingsSnapshot,
    });

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
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "MISSION_PERSISTENCE_FAILED",
          message: error instanceof DatabaseConfigurationError
            ? "A database is required to persist the mission."
            : "The mission could not be persisted.",
        },
      },
      { status: 503 },
    );
  }
}
