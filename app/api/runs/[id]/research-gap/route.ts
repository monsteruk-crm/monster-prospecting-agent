import { z } from "zod";

import { DatabaseConfigurationError } from "@/lib/db/client";
import { persistResearchGap } from "@/lib/persistence/review-persistence";

export const runtime = "nodejs";
const IdSchema = z.string().trim().min(1).max(200);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsedId = IdSchema.safeParse(id);
  if (!parsedId.success) return Response.json({ error: { code: "INVALID_RUN_ID", message: "The run ID is invalid." } }, { status: 400 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, { status: 400 }); }
  try {
    const decision = await persistResearchGap(parsedId.data, payload);
    return Response.json({ runId: parsedId.data, status: decision.status, action: "RESEARCH_GAP_RECORDED", resumed: false });
  } catch (error) {
    const message = error instanceof Error && error.message === "REVIEW_NOT_FOUND" ? "The review was not found." : error instanceof DatabaseConfigurationError ? "A database is required to record a research gap." : "The research gap could not be recorded.";
    return Response.json({ error: { code: message === "The review was not found." ? "REVIEW_NOT_FOUND" : "RESEARCH_GAP_FAILED", message } }, { status: message === "The review was not found." ? 404 : 503 });
  }
}
