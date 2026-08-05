import { describe, expect, it } from "vitest";

import { LocalLexicalMonsterKnowledgeRetriever, retrieveKnowledgeChunks } from "@/lib/knowledge/retriever";
import type { KnowledgeChunk } from "@/lib/knowledge/knowledge-schema";

const chunk = (overrides: Partial<KnowledgeChunk>): KnowledgeChunk => ({
  sourcePath: "knowledge/example.md",
  authority: "POSITIONING_ADDENDUM",
  effectiveDate: "2026-06-29",
  sectionId: "positioning-addendum:story",
  deprecationState: "ACTIVE",
  sourceHash: "a".repeat(64),
  contentHash: "b".repeat(64),
  chunkIndex: 0,
  text: "The Monster offers a memorable event experience.",
  ...overrides,
});

describe("bounded knowledge retrieval", () => {
  it("returns active, relevant chunks with a bounded result count", () => {
    const results = retrieveKnowledgeChunks([
      chunk({ text: "The Monster offers a memorable event experience." }),
      chunk({ deprecationState: "DEPRECATED", text: "The Monster has an old positioning claim." }),
      chunk({ sectionId: "authoritative-checklist:venue-fit", authority: "AUTHORITATIVE_CHECKLIST", text: "Venue fit requires suitable access and space." }),
    ], { query: "Monster event experience", maxResults: 1 });

    expect(results).toHaveLength(1);
    expect(results[0].chunk.deprecationState).toBe("ACTIVE");
    expect(results[0].chunk.contentHash).toBe("b".repeat(64));
  });

  it("supports authority filtering and character bounds", () => {
    const results = retrieveKnowledgeChunks([
      chunk({ authority: "AUTHORITATIVE_CHECKLIST", text: "Checklist rule for product fit." }),
      chunk({ authority: "POSITIONING_ADDENDUM", text: "Positioning context for product fit." }),
    ], { query: "product fit", authorities: ["AUTHORITATIVE_CHECKLIST"], maxCharacters: 500 });

    expect(results).toHaveLength(1);
    expect(results[0].chunk.authority).toBe("AUTHORITATIVE_CHECKLIST");
  });

  it("exposes the local implementation through the consumer retriever contract", async () => {
    const retriever = new LocalLexicalMonsterKnowledgeRetriever("knowledge/ingested/chunks.jsonl");
    const results = await retriever.retrieve({ query: "event experience", maxResults: 1 });

    expect(results).toHaveLength(1);
    expect(results[0].chunk.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
