import { z } from "zod";

import { DatabaseConfigurationError } from "@/lib/db/client";
import { executeDiscoveryRun } from "@/lib/graph/discovery-runner";
import { getMissionRunDossier } from "@/lib/persistence/review-persistence";
import { SalesMissionBriefSchema } from "@/lib/sales/mission-schema";

export const runtime = "nodejs";

const IdSchema = z.string().trim().min(1).max(200);

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    return Response.json({ error: { code: "INVALID_RUN_ID", message: "The run ID is invalid." } }, { status: 400 });
  }

  try {
    const dossier = await getMissionRunDossier(parsed.data);
    if (!dossier) {
      return Response.json({ error: { code: "RUN_NOT_FOUND", message: "The mission run was not found." } }, { status: 404 });
    }
    if (dossier.status === "RUNNING") {
      return Response.json({ error: { code: "RUN_ALREADY_RUNNING", message: "This mission is already running." } }, { status: 409 });
    }

    const brief = SalesMissionBriefSchema.parse(dossier.mission.brief);
    const result = await executeDiscoveryRun(brief, {}, { missionId: dossier.missionId });
    return Response.json({
      missionId: result.discovered.missionId,
      missionRunId: result.discovered.missionRunId,
      status: result.discovered.status,
      discoveryStage: result.discovered.discoveryStage,
    }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && ["RUN_NOT_FOUND", "RUN_ALREADY_RUNNING"].includes(error.message)
      ? error.message
      : error instanceof DatabaseConfigurationError ? "MISSION_PERSISTENCE_FAILED" : "MISSION_RERUN_FAILED";
    const message = code === "MISSION_PERSISTENCE_FAILED"
      ? "A database is required to re-execute the mission."
      : code === "RUN_ALREADY_RUNNING" ? "This mission is already running."
        : code === "RUN_NOT_FOUND" ? "The mission run was not found."
          : "The mission could not be re-executed.";
    return Response.json({ error: { code, message } }, { status: code === "RUN_NOT_FOUND" ? 404 : code === "RUN_ALREADY_RUNNING" ? 409 : 503 });
  }
}
