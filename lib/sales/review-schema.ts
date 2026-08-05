import { z } from "zod";

import {
  BudgetSchema,
  GraphErrorSchema,
  GraphWarningSchema,
} from "@/lib/sales/mission-schema";

export const ReviewStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
]);

export const ReviewSnapshotSchema = z.object({
  missionId: z.string().min(1),
  missionRunId: z.string().min(1),
  graphVersion: z.string().min(1),
  discoveryStage: z.string().min(1),
  accountIds: z.array(z.string().min(1)),
  evidenceIds: z.array(z.string().min(1)),
  buyingSignalIds: z.array(z.string().min(1)),
  budget: BudgetSchema,
  warnings: z.array(GraphWarningSchema),
  errors: z.array(GraphErrorSchema),
});

export const PersistedReviewSchema = z.object({
  id: z.string().min(1),
  status: ReviewStatusSchema,
  snapshot: ReviewSnapshotSchema,
  decision: z.unknown().nullable(),
});

export type PersistedReview = z.infer<typeof PersistedReviewSchema>;
