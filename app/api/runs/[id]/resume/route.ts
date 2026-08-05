import { z } from "zod";

import { DatabaseConfigurationError } from "@/lib/db/client";
import { getSalesMissionCheckpointer } from "@/lib/graph/checkpointer";
import { resumeSalesMission } from "@/lib/graph/sales-mission-discovery";
import { getMissionRunDossier, markMissionRunCompleted } from "@/lib/persistence/review-persistence";

export const runtime = "nodejs";
const IdSchema = z.string().trim().min(1).max(200);

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return Response.json({ error: { code: "INVALID_RUN_ID", message: "The run ID is invalid." } }, { status: 400 });
  try {
    const dossier = await getMissionRunDossier(parsed.data);
    if (!dossier) return Response.json({ error: { code: "RUN_NOT_FOUND", message: "The mission run was not found." } }, { status: 404 });
    if (!dossier.review || !["APPROVED", "REJECTED"].includes(dossier.review.status)) {
      return Response.json({ error: { code: "REVIEW_REQUIRED", message: "A final review decision is required before resuming this run." } }, { status: 409 });
    }
    const checkpointer = await getSalesMissionCheckpointer();
    await resumeSalesMission(parsed.data, checkpointer);
    const run = await markMissionRunCompleted(parsed.data);
    return Response.json({ runId: run.id, status: run.status, resumed: true });
  } catch (error) {
    return Response.json({ error: { code: "MISSION_RESUME_FAILED", message: error instanceof DatabaseConfigurationError ? "A database is required to resume the mission." : "The mission could not be resumed." } }, { status: 503 });
  }
}
