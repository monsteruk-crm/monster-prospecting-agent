import { z } from "zod";

export const ContactRouteTypeSchema = z.enum(["ROLE_ONLY", "CONTACT_PAGE"]);
export const ContactConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const ContactFreshnessSchema = z.enum(["CURRENT", "RECENT", "UNKNOWN"]);

export const ContactRouteSchema = z.object({
  targetRole: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(200).optional(),
  confirmedRole: z.string().trim().min(1).max(200).optional(),
  email: z.string().email().optional(),
  contactPageUrl: z.string().url().optional(),
  professionalProfileUrl: z.string().url().optional(),
  sourceEvidenceIds: z.array(z.string().min(1)).max(10),
  routeType: ContactRouteTypeSchema,
  roleConfidence: ContactConfidenceSchema,
  dataFreshness: ContactFreshnessSchema,
});

export const FirstMoveBriefSchema = z.object({
  subject: z.string().trim().min(1).max(180),
  opening: z.string().trim().min(1).max(1000),
  whyNow: z.string().trim().min(1).max(600),
  ask: z.string().trim().min(1).max(500),
  recommendedChannel: z.enum(["EMAIL", "CONTACT_PAGE", "PHONE", "ROLE_ROUTE"]),
  evidenceIds: z.array(z.string().min(1)).max(10),
  status: z.literal("DRAFT"),
});

export type ContactRoute = z.infer<typeof ContactRouteSchema>;
export type FirstMoveBrief = z.infer<typeof FirstMoveBriefSchema>;
