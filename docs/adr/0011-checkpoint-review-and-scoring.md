# ADR 0011: Checkpointed review, deterministic scoring and persisted dossiers

Status: accepted  
Date: 2026-08-05

## Context

Mission discovery now persists research and a pending review snapshot, but the graph did not yet survive a deployment boundary, record a human decision, or expose a usable prospect dossier. The product plan requires durable pause/resume, deterministic scores and review before export.

## Decision

- Use `@langchain/langgraph-checkpoint-postgres` with the existing Postgres database and `missionRunId` as `thread_id`.
- Interrupt the discovery graph after buying-signal verification. Review decisions are persisted in `MissionReview` and audited before an approved, rejected, duplicate or do-not-contact decision resumes the graph.
- Keep `EDIT` as `CHANGES_REQUESTED` without completing the run; later edits must use a governed mutation contract.
- Calculate scores in deterministic TypeScript and persist a bounded score snapshot on each `ProspectAccount`. Missing public contact routes cap the score at 70.
- Serve persisted dossiers through `GET /api/runs/:missionRunId` and render the review surface in the existing Mission Control UI.

## Consequences

Checkpoint tables are created in Postgres by the checkpointer setup. Review actions are durable and idempotent at the audit-event boundary. The current dossier supports evidence inspection and review decisions but does not yet discover public contact routes, generate first-move briefs or export to CRM.

## Affected paths

`lib/graph/checkpointer.ts`, `lib/graph/sales-mission-discovery.ts`, `lib/persistence/review-persistence.ts`, `lib/sales/score-engine.ts`, `prisma/schema.prisma`, `app/api/runs/[id]/`, `components/mission-control.tsx`
