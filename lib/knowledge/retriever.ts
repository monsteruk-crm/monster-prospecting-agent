import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import { KnowledgeAuthoritySchema, KnowledgeChunkSchema, type KnowledgeChunk } from "./knowledge-schema";

const RetrievalInputSchema = z.object({
  query: z.string().trim().min(1).max(500),
  maxResults: z.number().int().min(1).max(8).default(4),
  maxCharacters: z.number().int().min(500).max(12000).default(6000),
  authorities: z.array(KnowledgeAuthoritySchema).optional(),
});

export type KnowledgeRetrievalInput = z.input<typeof RetrievalInputSchema>;

export type KnowledgeRetrievalResult = {
  chunk: KnowledgeChunk;
  score: number;
};

export type MonsterKnowledgeRetriever = {
  retrieve(input: KnowledgeRetrievalInput): Promise<KnowledgeRetrievalResult[]>;
};

const STOP_WORDS = new Set([
  "about", "after", "and", "are", "for", "from", "into", "that", "the", "their", "this", "with",
]);

function terms(value: string): string[] {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]{2,}/g)?.filter((term) => !STOP_WORDS.has(term)) ?? [])];
}

function scoreChunk(chunk: KnowledgeChunk, queryTerms: string[]): number {
  const searchable = `${chunk.sectionId} ${chunk.text}`.toLowerCase();
  const matchedTerms = queryTerms.filter((term) => searchable.includes(term));
  if (matchedTerms.length === 0) return 0;
  const authorityBonus = chunk.authority === "AUTHORITATIVE_CHECKLIST" ? 0.001 : 0;
  return Number((matchedTerms.length / queryTerms.length + authorityBonus).toFixed(6));
}

export function retrieveKnowledgeChunks(
  chunks: KnowledgeChunk[],
  input: KnowledgeRetrievalInput,
): KnowledgeRetrievalResult[] {
  const parsed = RetrievalInputSchema.parse(input);
  const queryTerms = terms(parsed.query);
  if (queryTerms.length === 0) return [];

  const allowedAuthorities = parsed.authorities ? new Set(parsed.authorities) : undefined;
  const ranked = chunks
    .filter((chunk) => chunk.deprecationState === "ACTIVE")
    .filter((chunk) => !allowedAuthorities || allowedAuthorities.has(chunk.authority))
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryTerms) }))
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.chunk.sourcePath.localeCompare(right.chunk.sourcePath) || left.chunk.sectionId.localeCompare(right.chunk.sectionId) || left.chunk.chunkIndex - right.chunk.chunkIndex);

  const results: KnowledgeRetrievalResult[] = [];
  let characters = 0;
  for (const result of ranked) {
    if (results.length >= parsed.maxResults) break;
    if (characters > 0 && characters + result.chunk.text.length > parsed.maxCharacters) break;
    results.push(result);
    characters += result.chunk.text.length;
  }
  return results;
}

export function loadIngestedKnowledgeChunks(
  filePath = path.join(process.cwd(), "knowledge/ingested/chunks.jsonl"),
): KnowledgeChunk[] {
  return readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => KnowledgeChunkSchema.parse(JSON.parse(line)));
}

export function retrieveIngestedKnowledge(input: KnowledgeRetrievalInput): KnowledgeRetrievalResult[] {
  return retrieveKnowledgeChunks(loadIngestedKnowledgeChunks(), input);
}

export class LocalLexicalMonsterKnowledgeRetriever implements MonsterKnowledgeRetriever {
  constructor(private readonly filePath?: string) {}

  async retrieve(input: KnowledgeRetrievalInput): Promise<KnowledgeRetrievalResult[]> {
    return retrieveKnowledgeChunks(loadIngestedKnowledgeChunks(this.filePath), input);
  }
}

export const localLexicalMonsterKnowledgeRetriever = new LocalLexicalMonsterKnowledgeRetriever();
