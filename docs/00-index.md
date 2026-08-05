# Monster Scout documentation router

## Use the MVP

- [Using Monster Scout — MVP Guide](guides/using-monster-scout-mvp.md) — setup, health checks, mission launch, dossier review, research gaps, first moves, export, CRM dry-run and troubleshooting.
- [How Monster Scout Works](guides/how-monster-scout-works.md) — internal workflow, LangGraph lifecycle, safe fetching, evidence, persistence, scoring, governed retrieval, review boundaries and Mermaid diagrams.
- [Local development runbook](runbooks/local-development.md) — environment, Prisma, AI Gateway, LangSmith and verification commands.
- [Current status](STATUS.md) — milestone, verification, blockers and next actions.

## Product and architecture

- [Authoritative product plan](product/monster-scout-sales-prospecting-authoritative-plan.md) — the binding product and delivery plan.
- [System overview](architecture/system-overview.md) — the application boundary and responsibility split.
- [Architecture decisions](adr/) — accepted decisions that implementation must respect, including the [bounded extraction and verification boundary](adr/0009-bounded-account-extraction-and-signal-verification.md), [Prisma persistence boundary](adr/0010-prisma-mission-persistence-and-review-snapshots.md), [checkpoint/review/scoring boundary](adr/0011-checkpoint-review-and-scoring.md), [contact/first-move boundary](adr/0012-contact-routes-and-first-move-drafts.md), [approved export boundary](adr/0013-approved-lead-csv-dry-run.md), [CRM dry-run boundary](adr/0014-crm-dry-run-validation-boundary.md), and [governed knowledge ingestion](adr/0015-governed-knowledge-ingestion.md). The [proposed lexical MVP/hybrid target decision](adr/0016-lexical-mvp-adapter-hybrid-target.md) is not yet accepted.

## Contracts and operational surfaces

- [Mission discovery contract](contracts/mission-discovery.md) — bounded discovery, dossier, review, research-gap, resume and first-move routes.
- [Lead export contract](contracts/lead-export.md) — exact CSV boundary and field rules.
- [Lead sheet schema](contracts/lead_sheet_schema.csv) — reconciled CSV header contract.
- [Observability health route](../app/api/health/observability/route.ts) — LangSmith tracing configuration status without credentials.

## Governed knowledge and evaluation

- [Authoritative checklist](../knowledge/authoritative/full-checklist.md) — hard commercial and operational source.
- [Positioning addendum](../knowledge/positioning/product-decks-rag-addendum.md) — governed product and sales context.
- [Ingested knowledge manifest](../knowledge/ingested/manifest.json) — source authority, hashes and chunking metadata.
- [Knowledge retrieval evaluation](evaluation/knowledge-retrieval-and-first-move.md) — labelled retrieval and first-move results.
- [Human judgment sheet](evaluation/human-judgment-sheet.md) — pending usefulness and grounding review instructions.

## Roadmap

- [Governed semantic retrieval TODO](roadmap/governed-semantic-retrieval.md) — future embeddings, pgvector and hybrid retrieval.
- [Live CRM insertion TODO](roadmap/live-crm-insertion.md) — deferred post-MVP integration prerequisites.
