import { z } from "zod";

export const SmokeResultSchema = z.object({
  missionTitle: z.string().trim().min(1).max(120),
  status: z.literal("ready"),
});

export type SmokeResult = z.infer<typeof SmokeResultSchema>;
