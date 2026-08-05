import { createHash } from "node:crypto";

import {
  KnowledgeChunkSchema,
  KnowledgeManifestSchema,
  type KnowledgeAuthority,
  type KnowledgeChunk,
  type KnowledgeManifest,
} from "./knowledge-schema";

const MAX_CHUNK_CHARACTERS = 2400;

export type KnowledgeSourceInput = {
  sourcePath: string;
  authority: KnowledgeAuthority;
  effectiveDate: string;
  content: string;
  deprecationState?: "ACTIVE" | "DEPRECATED";
};

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeSource(content: string): string {
  return `${content.replace(/\r\n/g, "\n").trimEnd()}\n`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

function splitSection(text: string): string[] {
  const paragraphs = text.trim().split(/\n\s*\n/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > MAX_CHUNK_CHARACTERS) {
      if (current) chunks.push(current.trim());
      current = "";
      for (let start = 0; start < paragraph.length; start += MAX_CHUNK_CHARACTERS) {
        chunks.push(paragraph.slice(start, start + MAX_CHUNK_CHARACTERS).trim());
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > MAX_CHUNK_CHARACTERS) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function ingestKnowledgeSources(inputs: KnowledgeSourceInput[]): {
  chunks: KnowledgeChunk[];
  manifest: KnowledgeManifest;
} {
  const chunks: KnowledgeChunk[] = [];
  const sources = inputs.map((input) => {
    const normalized = normalizeSource(input.content);
    const sourceHash = hash(normalized);
    const lines = normalized.split("\n");
    let currentHeading = "document";
    let currentSection: string[] = [];
    const sections: Array<{ heading: string; text: string }> = [];

    const flush = () => {
      const text = currentSection.join("\n").trim();
      if (text) sections.push({ heading: currentHeading, text });
      currentSection = [];
    };

    for (const line of lines) {
      const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
      if (heading) {
        flush();
        currentHeading = heading[1];
      } else {
        currentSection.push(line);
      }
    }
    flush();

    let sourceChunkCount = 0;
    for (const section of sections) {
      const sectionId = `${input.authority.toLowerCase().replaceAll("_", "-")}:${slugify(section.heading)}`;
      splitSection(section.text).forEach((text, chunkIndex) => {
        chunks.push(
          KnowledgeChunkSchema.parse({
            sourcePath: input.sourcePath,
            authority: input.authority,
            effectiveDate: input.effectiveDate,
            sectionId,
            deprecationState: input.deprecationState ?? "ACTIVE",
            sourceHash,
            contentHash: hash(text),
            chunkIndex,
            text,
          }),
        );
        sourceChunkCount += 1;
      });
    }

    return {
      sourcePath: input.sourcePath,
      authority: input.authority,
      effectiveDate: input.effectiveDate,
      deprecationState: input.deprecationState ?? "ACTIVE",
      sourceHash,
      chunkCount: sourceChunkCount,
    };
  });

  const manifest = KnowledgeManifestSchema.parse({
    schemaVersion: 1,
    chunkingStrategy: "markdown-sections-v1",
    sources,
    chunks: chunks.length,
  });

  return { chunks, manifest };
}
