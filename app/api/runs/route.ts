import { z } from "zod";

import { DatabaseConfigurationError } from "@/lib/db/client";
import { listMissionRuns } from "@/lib/persistence/mission-persistence";

export const runtime = "nodejs";

const LimitSchema = z.coerce.number().int().min(1).max(50).default(20);

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
