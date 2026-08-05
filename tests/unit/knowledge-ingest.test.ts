import { describe, expect, it } from "vitest";

import { ingestKnowledgeSources } from "@/lib/knowledge/ingest";

describe("knowledge ingestion", () => {
  it("preserves authority metadata and creates deterministic section chunks", () => {
    const result = ingestKnowledgeSources([
      {
        sourcePath: "knowledge/authoritative/example.md",
        authority: "AUTHORITATIVE_CHECKLIST",
        effectiveDate: "2026-06-29",
        content: "# Rules\n\nKeep this rule.\n\n## Contacts\n\nUse public sources only.\n",
      },
    ]);

    expect(result.manifest).toMatchObject({
      schemaVersion: 1,
      chunkingStrategy: "markdown-sections-v1",
      chunks: 2,
    });
    expect(result.chunks.map((chunk) => chunk.sectionId)).toEqual([
      "authoritative-checklist:rules",
      "authoritative-checklist:contacts",
    ]);
    expect(result.chunks.every((chunk) => chunk.deprecationState === "ACTIVE")).toBe(true);
  });

  it("normalizes line endings before hashing source content", () => {
    const unix = ingestKnowledgeSources([
      {
        sourcePath: "example.md",
        authority: "POSITIONING_ADDENDUM",
        effectiveDate: "2026-06-29",
        content: "# Story\n\nA claim.\n",
      },
    ]);
    const windows = ingestKnowledgeSources([
      {
        sourcePath: "example.md",
        authority: "POSITIONING_ADDENDUM",
        effectiveDate: "2026-06-29",
        content: "# Story\r\n\r\nA claim.\r\n\r\n",
      },
    ]);

    expect(windows.manifest.sources[0].sourceHash).toBe(unix.manifest.sources[0].sourceHash);
    expect(windows.chunks[0].contentHash).toBe(unix.chunks[0].contentHash);
  });
});
