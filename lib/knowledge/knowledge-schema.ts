import { z } from "zod";

export const KnowledgeAuthoritySchema = z.enum([
  "AUTHORITATIVE_CHECKLIST",
  "POSITIONING_ADDENDUM",
]);
export type KnowledgeAuthority = z.infer<typeof KnowledgeAuthoritySchema>;

export const KnowledgeDeprecationStateSchema = z.enum(["ACTIVE", "DEPRECATED"]);

export const KnowledgeChunkSchema = z.object({
  sourcePath: z.string().min(1),
  authority: KnowledgeAuthoritySchema,
  effectiveDate: z.string().date(),
  sectionId: z.string().min(1),
  deprecationState: KnowledgeDeprecationStateSchema,
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  chunkIndex: z.number().int().nonnegative(),
  text: z.string().min(1),
});

export type KnowledgeChunk = z.infer<typeof KnowledgeChunkSchema>;

export const KnowledgeSourceManifestEntrySchema = z.object({
  sourcePath: z.string().min(1),
  authority: KnowledgeAuthoritySchema,
  effectiveDate: z.string().date(),
  deprecationState: KnowledgeDeprecationStateSchema,
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  chunkCount: z.number().int().positive(),
});

export const KnowledgeManifestSchema = z.object({
  schemaVersion: z.literal(1),
  chunkingStrategy: z.literal("markdown-sections-v1"),
  sources: z.array(KnowledgeSourceManifestEntrySchema).min(1),
  chunks: z.number().int().positive(),
});

export type KnowledgeManifest = z.infer<typeof KnowledgeManifestSchema>;
