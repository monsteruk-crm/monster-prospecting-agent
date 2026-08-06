import { z } from "zod";

export const ContactRouteTypeSchema = z.enum([
  "PUBLIC_EMAIL",
  "PUBLIC_PHONE",
  "CONTACT_PAGE",
  "CONTACT_FORM",
  "PROFESSIONAL_PROFILE",
  "ROLE_ONLY",
]);
export const ContactConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const ContactFreshnessSchema = z.enum(["CURRENT", "RECENT", "UNKNOWN"]);
export const ContactEvidenceKindSchema = z.enum([
  "VISIBLE_TEXT",
  "MAILTO",
  "TEL",
  "ANCHOR_LINK",
  "JSON_LD",
  "STRUCTURED_EXTRACTION",
]);
export const ContactDomainRelationshipSchema = z.enum([
  "OFFICIAL_DOMAIN",
  "OFFICIAL_SUBDOMAIN",
  "EXTERNAL_OFFICIAL_LINK",
]);

export const ContactRouteSchema = z.object({
  targetRole: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(200).optional(),
  confirmedRole: z.string().trim().min(1).max(200).optional(),
  intendedBuyerRole: z.string().trim().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().min(7).max(80).optional(),
  contactPageUrl: z.string().url().optional(),
  professionalProfileUrl: z.string().url().optional(),
  sourceEvidenceIds: z.array(z.string().min(1)).max(10),
  routeType: ContactRouteTypeSchema,
  roleConfidence: ContactConfidenceSchema,
  dataFreshness: ContactFreshnessSchema,
  evidenceKind: ContactEvidenceKindSchema.optional(),
  evidenceExcerpt: z.string().trim().max(500).optional(),
  domainRelationship: ContactDomainRelationshipSchema.optional(),
  routeScore: z.number().int().min(0).max(100).default(0),
  routeReasons: z.array(z.string().trim().min(1).max(200)).max(10).default(() => []),
  isUsableForSales: z.boolean().default(true),
  unsuitableReason: z.string().trim().max(300).optional(),
});

export const PublicContactCandidateSchema = ContactRouteSchema.extend({
  candidateId: z.string().trim().min(1).max(400),
  accountKey: z.string().trim().min(1).max(300),
  sourceUrl: z.string().url(),
  sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/),
  sourceEvidenceId: z.string().trim().min(1).max(400),
  evidenceKind: ContactEvidenceKindSchema,
  evidenceExcerpt: z.string().trim().max(500),
  domainRelationship: ContactDomainRelationshipSchema,
  confidence: ContactConfidenceSchema,
  freshness: ContactFreshnessSchema,
});

export const PublicContactExtractionSchema = z.object({
  contacts: z.array(z.object({
    email: z.string().email(),
    evidenceExcerpt: z.string().trim().min(1).max(500),
  })).max(10),
});

export type PublicContactExtraction = z.infer<typeof PublicContactExtractionSchema>;

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
export type ContactRouteInput = z.input<typeof ContactRouteSchema>;
export type FirstMoveBrief = z.infer<typeof FirstMoveBriefSchema>;
