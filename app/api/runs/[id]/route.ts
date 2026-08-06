import { z } from "zod";

import { DatabaseConfigurationError } from "@/lib/db/client";
import { getMissionRunDossier } from "@/lib/persistence/review-persistence";
import { deleteMissionRuns } from "@/lib/persistence/mission-persistence";

export const runtime = "nodejs";

const IdSchema = z.string().trim().min(1).max(200);

export async function GET(
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
    return Response.json(dossier, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: { code: "DOSSIER_READ_FAILED", message: error instanceof DatabaseConfigurationError ? "A database is required to read dossiers." : "The dossier could not be read." } }, { status: 503 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return Response.json({ error: { code: "INVALID_RUN_ID", message: "The run ID is invalid." } }, { status: 400 });
  try {
    const result = await deleteMissionRuns([parsed.data]);
    if (result.deletedIds.length === 0) return Response.json({ error: { code: "RUN_NOT_FOUND", message: "The mission run was not found." } }, { status: 404 });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: { code: "RUN_DELETE_FAILED", message: error instanceof DatabaseConfigurationError ? "A database is required to delete runs." : "The mission run could not be deleted." } }, { status: 503 });
  }
}
