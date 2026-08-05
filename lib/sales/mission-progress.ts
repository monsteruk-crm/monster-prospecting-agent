import { z } from "zod";

import {
  DiscoveryStageSchema,
  SalesMissionRunStatusSchema,
  SearchResultSchema,
} from "@/lib/sales/mission-schema";

export const MissionProgressCountsSchema = z.object({
  searches: z.number().int().nonnegative().optional(),
  pages: z.number().int().nonnegative().optional(),
  sources: z.number().int().nonnegative().optional(),
  accounts: z.number().int().nonnegative().optional(),
  signals: z.number().int().nonnegative().optional(),
});

export const MissionProgressEventSchema = z.object({
  stage: DiscoveryStageSchema,
  status: SalesMissionRunStatusSchema,
  message: z.string().trim().min(1).max(500),
  detail: z.string().trim().max(1000).optional(),
  counts: MissionProgressCountsSchema.optional(),
});

export const MissionProgressRecordSchema = MissionProgressEventSchema.extend({
  sequence: z.number().int().positive(),
  occurredAt: z.string().datetime(),
});

export type MissionProgressEvent = z.infer<typeof MissionProgressEventSchema>;
export type MissionProgressRecord = z.infer<typeof MissionProgressRecordSchema>;

export const MissionSearchProgressEventSchema = z.object({
  query: z.string().trim().min(1).max(500),
  queryIndex: z.number().int().positive(),
  status: z.enum(["COMPLETED", "FAILED"]),
  resultCount: z.number().int().nonnegative(),
  searchesUsed: z.number().int().nonnegative(),
  searchResults: z.array(SearchResultSchema).max(1000),
  detail: z.string().trim().max(1000).optional(),
});

export type MissionSearchProgressEvent = z.infer<typeof MissionSearchProgressEventSchema>;
