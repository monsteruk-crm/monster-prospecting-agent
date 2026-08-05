import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ingestKnowledgeSources } from "../lib/knowledge/ingest";

const root = process.cwd();
const sourceDefinitions = [
  {
    sourcePath: "knowledge/authoritative/full-checklist.md",
    authority: "AUTHORITATIVE_CHECKLIST" as const,
    effectiveDate: "2026-06-29",
  },
  {
    sourcePath: "knowledge/positioning/product-decks-rag-addendum.md",
    authority: "POSITIONING_ADDENDUM" as const,
    effectiveDate: "2026-06-29",
  },
];

const inputs = await Promise.all(
  sourceDefinitions.map(async (definition) => ({
    ...definition,
    content: await readFile(path.join(root, definition.sourcePath), "utf8"),
  })),
);
const { chunks, manifest } = ingestKnowledgeSources(inputs);
const outputDirectory = path.join(root, "knowledge/ingested");
await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  path.join(outputDirectory, "chunks.jsonl"),
  `${chunks.map((chunk) => JSON.stringify(chunk)).join("\n")}\n`,
);
console.log(`Ingested ${manifest.chunks} chunks from ${manifest.sources.length} governed sources.`);
