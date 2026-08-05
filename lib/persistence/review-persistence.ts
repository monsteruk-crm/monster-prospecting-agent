import { z } from "zod";

import { getPrismaClient } from "@/lib/db/client";
import { Prisma, type PrismaClient } from "@/prisma/generated/client";
import { ReviewStatusSchema } from "@/lib/sales/review-schema";
import { FirstMoveBriefSchema, type FirstMoveBrief } from "@/lib/sales/contact-schema";

export const ReviewDecisionActionSchema = z.enum([
  "APPROVE",
  "REJECT",
  "EDIT",
  "DUPLICATE",
  "DO_NOT_CONTACT",
]);

export const ReviewDecisionInputSchema = z.object({
  action: ReviewDecisionActionSchema,
  reviewer: z.string().trim().min(1).max(120).default("Nick"),
  note: z.string().trim().max(2000).default(""),
});

export const ResearchGapInputSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  accountId: z.string().trim().min(1).max(300).optional(),
  reviewer: z.string().trim().min(1).max(120).default("Nick"),
});

export type ResearchGapInput = z.infer<typeof ResearchGapInputSchema>;

export async function persistResearchGap(
  missionRunId: string,
  rawInput: unknown,
  client: PersistenceClient = getPrismaClient(),
) {
  const input = ResearchGapInputSchema.parse(rawInput);
  return persistReviewDecision(missionRunId, {
    action: "EDIT",
    reviewer: input.reviewer,
    note: `RESEARCH_GAP${input.accountId ? ` [${input.accountId}]` : ""}: ${input.question}`,
  }, client);
}

export type ReviewDecisionInput = z.infer<typeof ReviewDecisionInputSchema>;
type PersistenceClient = PrismaClient | Prisma.TransactionClient;

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function statusForAction(action: ReviewDecisionInput["action"]): z.infer<typeof ReviewStatusSchema> {
  if (action === "APPROVE") return "APPROVED";
  if (action === "EDIT") return "CHANGES_REQUESTED";
  return "REJECTED";
}

export function shouldResumeAfterReview(action: ReviewDecisionInput["action"]): boolean {
  return action !== "EDIT";
}

export async function persistReviewDecision(
  missionRunId: string,
  rawInput: unknown,
  client: PersistenceClient = getPrismaClient(),
) {
  const input = ReviewDecisionInputSchema.parse(rawInput);
  const status = statusForAction(input.action);
  const decidedAt = new Date();
  return client.$transaction(async (transaction) => {
    const review = await transaction.missionReview.findUnique({ where: { missionRunId } });
    if (!review) {
      throw new Error("REVIEW_NOT_FOUND");
    }
    const decision = { action: input.action, note: input.note };
    const updated = await transaction.missionReview.update({
      where: { missionRunId },
      data: { status, decision: asJson(decision), reviewer: input.reviewer, decidedAt },
    });
    const idempotencyKey = `${missionRunId}:review:${input.action}:${input.reviewer}:${input.note}`;
    await transaction.missionAuditEvent.upsert({
      where: { idempotencyKey },
      create: {
        id: `audit:${idempotencyKey}`,
        idempotencyKey,
        missionId: review.missionId,
        missionRunId,
        eventType: "REVIEW_DECISION_RECORDED",
        payload: asJson({ ...decision, reviewer: input.reviewer, status }),
      },
      update: { payload: asJson({ ...decision, reviewer: input.reviewer, status }) },
    });
    return { review: updated, action: input.action, status };
  });
}

export async function markMissionRunCompleted(
  missionRunId: string,
  client: PersistenceClient = getPrismaClient(),
) {
  return client.$transaction(async (transaction) => {
    const run = await transaction.salesMissionRun.update({
      where: { id: missionRunId },
      data: { status: "COMPLETED", completedAt: new Date() },
      select: { missionId: true, id: true, status: true, discoveryStage: true },
    });
    await transaction.missionAuditEvent.upsert({
      where: { idempotencyKey: `${missionRunId}:review-resumed` },
      create: {
        id: `audit:${missionRunId}:review-resumed`,
        idempotencyKey: `${missionRunId}:review-resumed`,
        missionId: run.missionId,
        missionRunId,
        eventType: "REVIEW_RESUMED",
        payload: asJson({ status: run.status }),
      },
      update: { payload: asJson({ status: run.status }) },
    });
    return run;
  });
}

export async function getMissionRunDossier(
  missionRunId: string,
  client: PersistenceClient = getPrismaClient(),
) {
  return client.salesMissionRun.findUnique({
    where: { id: missionRunId },
    include: {
      mission: true,
      accounts: { include: { evidence: true, buyingSignals: true } },
      evidence: true,
      buyingSignals: true,
      review: true,
      auditEvents: {
        where: { eventType: { in: ["MISSION_PROGRESS", "MISSION_SEARCH_PROGRESS"] } },
        orderBy: { occurredAt: "asc" },
      },
    },
  });
}

export async function persistFirstMoveDraft(
  accountId: string,
  draft: FirstMoveBrief,
  client: PersistenceClient = getPrismaClient(),
) {
  const parsedDraft = FirstMoveBriefSchema.parse(draft);
  return client.$transaction(async (transaction) => {
    const account = await transaction.prospectAccount.findUnique({
      where: { id: accountId },
      include: { run: { include: { review: true } } },
    });
    if (!account) throw new Error("ACCOUNT_NOT_FOUND");
    if (account.run.review?.status !== "APPROVED") throw new Error("APPROVAL_REQUIRED");
    await transaction.prospectAccount.update({ where: { id: accountId }, data: { firstMoveDraft: asJson(parsedDraft) } });
    const idempotencyKey = `${account.missionRunId}:first-move:${accountId}`;
    await transaction.missionAuditEvent.upsert({
      where: { idempotencyKey },
      create: { id: `audit:${idempotencyKey}`, idempotencyKey, missionId: account.missionId, missionRunId: account.missionRunId, eventType: "FIRST_MOVE_DRAFTED", payload: asJson({ accountId }) },
      update: { payload: asJson({ accountId }) },
    });
    return parsedDraft;
  });
}
