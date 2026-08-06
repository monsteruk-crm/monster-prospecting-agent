import { z } from "zod";

import { DatabaseConfigurationError } from "@/lib/db/client";
import { deleteMissionRuns, listMissionRuns } from "@/lib/persistence/mission-persistence";

export const runtime = "nodejs";

const LimitSchema = z.coerce.number().int().min(1).max(50).default(20);
const DeleteRunsSchema = z.object({ ids: z.array(z.string().trim().min(1).max(200)).min(1).max(50) });

export async function GET(request: Request) {
  const limit = LimitSchema.safeParse(new URL(request.url).searchParams.get("limit") ?? "20");
  if (!limit.success) {
    return Response.json({ error: { code: "INVALID_LIMIT", message: "limit must be an integer between 1 and 50." } }, { status: 400 });
  }

  try {
    const runs = await listMissionRuns(limit.data);
    return Response.json({ runs }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({
      error: {
        code: "RUN_HISTORY_READ_FAILED",
        message: error instanceof DatabaseConfigurationError ? "A database is required to read run history." : "Run history could not be read.",
      },
    }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: { code: "INVALID_JSON", message: "Provide a JSON body with an ids array." } }, { status: 400 });
  }
  const parsed = DeleteRunsSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: { code: "INVALID_RUN_IDS", message: "ids must contain between 1 and 50 run IDs." } }, { status: 400 });
  }
  try {
    const result = await deleteMissionRuns(parsed.data.ids);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: { code: "RUN_DELETE_FAILED", message: error instanceof DatabaseConfigurationError ? "A database is required to delete runs." : "The selected runs could not be deleted." } }, { status: 503 });
  }
}
