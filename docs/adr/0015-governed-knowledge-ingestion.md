# ADR 0015: Governed knowledge ingestion metadata

Status: accepted
Date: 2026-08-05

## Context

The restored checklist and positioning addendum are the first governed product-knowledge sources. The product needs durable provenance before any retrieval or copilot use, while MVP explicitly does not need a vector store or a second knowledge service.

## Decision

- Ingest the checked-in Markdown sources with the deterministic `markdown-sections-v1` pipeline.
- Emit checked-in `knowledge/ingested/manifest.json` and `knowledge/ingested/chunks.jsonl` artifacts.
- Require each chunk to carry source path, authority, effective date, section ID, deprecation state, normalized source hash, content hash and chunk index.
- Treat `AUTHORITATIVE_CHECKLIST` as the hard-rule source and `POSITIONING_ADDENDUM` as positioning context. Positioning context cannot override checklist rules.
- Normalize line endings and trailing whitespace before hashing so source integrity is stable across checkouts.
- Keep all ingested chunks as bounded untrusted context. Retrieval excludes `DEPRECATED` chunks by default, applies explicit result/character caps, and must not turn context into instructions.
- Defer vector indexing and live CRM insertion until a measured need and the relevant product boundary are approved. Use the small labeled evaluation set to measure retrieval grounding and first-move usefulness before expanding retrieval infrastructure.

## Alternatives considered

- Add pgvector or an external vector database now: rejected because MVP does not have a measured retrieval need and the repository explicitly avoids new vector infrastructure.
- Store only whole source files: rejected because section IDs and chunk hashes are needed for attributable, inspectable context.
- Let a model assign authority: rejected because authority is deterministic source metadata.

## Consequences

Knowledge provenance is reviewable in Git and reproducible locally with `npm run knowledge:ingest`. A deterministic lexical retriever now supplies bounded context to first-move drafting without committing to a storage provider or vector infrastructure. Live CRM insertion remains a separate TODO and is not part of this change.

## Affected paths

`lib/knowledge/knowledge-schema.ts`, `lib/knowledge/ingest.ts`, `lib/knowledge/retriever.ts`, `lib/chains/first-move.ts`, `scripts/ingest-knowledge.ts`, `knowledge/ingested/manifest.json`, `knowledge/ingested/chunks.jsonl`, `docs/runbooks/local-development.md`
