import { z } from "zod";

import { DatabaseConfigurationError } from "@/lib/db/client";
import { draftFirstMove } from "@/lib/chains/first-move";
import { getPrismaClient } from "@/lib/db/client";
import { persistFirstMoveDraft } from "@/lib/persistence/review-persistence";
import { sanitizeContactRoutes } from "@/lib/sales/contact-route-engine";

export const runtime = "nodejs";
const IdSchema = z.string().trim().min(1).max(300);

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsedId = IdSchema.safeParse(id);
  if (!parsedId.success) return Response.json({ error: { code: "INVALID_ACCOUNT_ID", message: "The account ID is invalid." } }, { status: 400 });
  try {
    const db = getPrismaClient();
    const account = await db.prospectAccount.findUnique({ where: { id: parsedId.data }, include: { run: { include: { mission: true, review: true } }, evidence: true, buyingSignals: true } });
    if (!account) return Response.json({ error: { code: "ACCOUNT_NOT_FOUND", message: "The prospect account was not found." } }, { status: 404 });
    if (account.run.review?.status !== "APPROVED") return Response.json({ error: { code: "APPROVAL_REQUIRED", message: "A human approval is required before drafting a first move." } }, { status: 409 });
    const contactRoutes = sanitizeContactRoutes(account.contactRoutes);
    const draft = await draftFirstMove({
      missionRunId: account.missionRunId,
      accountId: account.id,
      companyName: account.companyName,
      productFocus: account.run.mission.productFocus,
      relevanceHypothesis: account.relevanceHypothesis,
      contactRoutes,
      signals: account.buyingSignals.map((signal) => ({ summary: signal.summary, verified: signal.verified, freshness: signal.freshness, evidenceExcerpt: signal.evidenceExcerpt, evidenceId: signal.evidenceId })),
      evidence: account.evidence.map((source) => ({ id: source.id, finalUrl: source.finalUrl, readableExcerpt: source.readableExcerpt })),
    });
    const persisted = await persistFirstMoveDraft(account.id, draft);
    return Response.json({ accountId: account.id, draft: persisted });
  } catch (error) {
    const message = error instanceof Error && error.message === "APPROVAL_REQUIRED" ? "A human approval is required before drafting a first move." : error instanceof DatabaseConfigurationError ? "A database is required to draft a first move." : "The first-move draft could not be generated.";
    return Response.json({ error: { code: message.startsWith("A human") ? "APPROVAL_REQUIRED" : "FIRST_MOVE_DRAFT_FAILED", message } }, { status: message.startsWith("A human") ? 409 : 503 });
  }
}
