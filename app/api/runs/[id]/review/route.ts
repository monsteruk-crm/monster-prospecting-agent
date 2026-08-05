import { z } from "zod";

import { DatabaseConfigurationError } from "@/lib/db/client";
import { getSalesMissionCheckpointer } from "@/lib/graph/checkpointer";
import { resumeSalesMission } from "@/lib/graph/sales-mission-discovery";
import { markMissionRunCompleted, persistReviewDecision, shouldResumeAfterReview } from "@/lib/persistence/review-persistence";

export const runtime = "nodejs";
const IdSchema = z.string().trim().min(1).max(200);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const parsedId = IdSchema.safeParse(id);
  if (!parsedId.success) return Response.json({ error: { code: "INVALID_RUN_ID", message: "The run ID is invalid." } }, { status: 400 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } }, { status: 400 }); }
  try {
    const decision = await persistReviewDecision(parsedId.data, payload);
    if (shouldResumeAfterReview(decision.action)) {
      const checkpointer = await getSalesMissionCheckpointer();
      await resumeSalesMission(parsedId.data, checkpointer);
      await markMissionRunCompleted(parsedId.data);
    }
    return Response.json({ runId: parsedId.data, status: decision.status, resumed: shouldResumeAfterReview(decision.action) });
  } catch (error) {
    const message = error instanceof Error && error.message === "REVIEW_NOT_FOUND" ? "The review was not found." : error instanceof DatabaseConfigurationError ? "A database is required to record review decisions." : "The review decision could not be recorded.";
    const code = message === "The review was not found." ? "REVIEW_NOT_FOUND" : "REVIEW_DECISION_FAILED";
    return Response.json({ error: { code, message } }, { status: code === "REVIEW_NOT_FOUND" ? 404 : 503 });
  }
}
