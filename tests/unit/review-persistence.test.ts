import { describe, expect, test, vi } from "vitest";

import type { PrismaClient } from "@/prisma/generated/client";
import { persistReviewDecision } from "@/lib/persistence/review-persistence";

describe("review persistence", () => {
  test("records a review decision with an idempotent audit event", async () => {
    const transaction = {
      missionReview: {
        findUnique: vi.fn(async () => ({ missionId: "mission-1", missionRunId: "run-1" })),
        update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "review-1", ...data })),
      },
      missionAuditEvent: { upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => create) },
    };
    const client = { $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)) } as unknown as PrismaClient;
    const result = await persistReviewDecision("run-1", { action: "APPROVE", reviewer: "Nick" }, client);
    expect(result.status).toBe("APPROVED");
    expect(transaction.missionAuditEvent.upsert).toHaveBeenCalledOnce();
  });
});
