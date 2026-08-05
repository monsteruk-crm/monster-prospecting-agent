# Monster Scout documentation router

- [Authoritative product plan](product/monster-scout-sales-prospecting-authoritative-plan.md) — the binding product and delivery plan.
- [Current status](STATUS.md) — milestone, verification, blockers and next actions.
- [System overview](architecture/system-overview.md) — the Act 0 system boundary and responsibility split.
- [Architecture decisions](adr/) — accepted bootstrap decisions that future implementation must respect, including the [bounded extraction and verification boundary](adr/0009-bounded-account-extraction-and-signal-verification.md), [Prisma persistence boundary](adr/0010-prisma-mission-persistence-and-review-snapshots.md), [checkpoint/review/scoring boundary](adr/0011-checkpoint-review-and-scoring.md), [contact/first-move boundary](adr/0012-contact-routes-and-first-move-drafts.md), [approved export boundary](adr/0013-approved-lead-csv-dry-run.md), [CRM dry-run boundary](adr/0014-crm-dry-run-validation-boundary.md), and [governed knowledge ingestion](adr/0015-governed-knowledge-ingestion.md). The [proposed lexical MVP/hybrid target decision](adr/0016-lexical-mvp-adapter-hybrid-target.md) is not yet accepted.
- [Local development runbook](runbooks/local-development.md) — setup, commands and external configuration.
- [Lead export contract](contracts/lead-export.md) — the first CRM boundary and CSV rules.
- [Mission discovery contract](contracts/mission-discovery.md) — the bounded server route for DuckDuckGo discovery and safe source references.
- [Observability health route](../app/api/health/observability/route.ts) — LangSmith tracing configuration status without credentials.
- [Review and dossier API](contracts/mission-discovery.md#review-and-dossier-routes) — persisted dossier reads, review decisions and checkpoint resume.
- [Authoritative checklist](../knowledge/authoritative/full-checklist.md) — required hard commercial and operational rules.
- [Positioning addendum](../knowledge/positioning/product-decks-rag-addendum.md) — governed product and sales context.
- [Ingested knowledge manifest](../knowledge/ingested/manifest.json) — source authority, hashes and chunking metadata.
- [Knowledge retrieval evaluation](evaluation/knowledge-retrieval-and-first-move.md) — small labeled retrieval and first-move usefulness results.
- [Human judgment sheet](evaluation/human-judgment-sheet.md) — rubric and pending review instructions for usefulness and grounding.
- [Governed semantic retrieval TODO](roadmap/governed-semantic-retrieval.md) — future embedding, pgvector and hybrid-retrieval stages.
- [Live CRM insertion TODO](roadmap/live-crm-insertion.md) — deferred post-MVP integration prerequisites.
- [Lead sheet schema](contracts/lead_sheet_schema.csv) — reconciled source CSV contract.
