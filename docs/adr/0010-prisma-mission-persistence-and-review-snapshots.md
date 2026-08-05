# ADR 0010: Prisma mission persistence and review snapshots

Status: accepted  
Date: 2026-08-05

## Context

The bounded discovery route previously returned useful research but discarded it after the HTTP response. The product plan requires missions, runs, accounts, evidence, signals, reviews and audits to be business entities with idempotent side effects. LangGraph checkpoint/resume and human review interrupts are not yet enabled in the current package set.

## Decision

Use the existing Prisma PostgreSQL boundary for durable business persistence. The persistence service in `lib/persistence/mission-persistence.ts` owns:

- `SalesMission` and `SalesMissionRun` records keyed by the generated mission and LangGraph thread IDs;
- source-linked `ProspectAccount`, `MissionEvidence` and `BuyingSignal` entities;
- a `MissionReview` record containing a bounded `PENDING` review snapshot;
- idempotent `MissionAuditEvent` records for preparation and discovery persistence.

Each final discovery write runs in one Prisma transaction. Stable IDs and compound unique keys make retries safe. The review snapshot stores entity references, budget, graph stage, warnings and errors; it does not duplicate raw page bodies. Model-generated domains are not used for provenance; validated fetched source references remain authoritative.

The discovery route persists the prepared mission before network work and persists final results before returning. It returns the pending review record but does not expose review-decision mutation or resume semantics yet.

## Alternatives considered

- Keeping results only in the HTTP response was rejected because mission history and review state would be lost after the request.
- Storing full graph state as one JSON blob was rejected because accounts, evidence, signals and reviews are business entities requiring independent provenance and idempotency.
- Adding a separate storage service was rejected because Prisma PostgreSQL is already configured and is the planned business-data boundary.
- Adding a Postgres LangGraph checkpointer in this slice was deferred because the checkpoint adapter is not installed and durable resume needs a separate graph interrupt contract.

## Consequences

The MVP route now requires a reachable PostgreSQL database and returns a durable pending review snapshot. Retries update the same mission/run/entity records rather than creating duplicates within a run. Authentication, review actions, checkpoint resume and CRM writes remain intentionally unimplemented.

## Affected paths

`prisma/schema.prisma`, `prisma/migrations/20260805070547_durable_mission_persistence/migration.sql`, `lib/persistence/mission-persistence.ts`, `lib/sales/review-schema.ts`, `app/api/missions/route.ts`, `app/api/missions/discover/route.ts`, `docs/contracts/mission-discovery.md`, `docs/architecture/system-overview.md`, `docs/runbooks/local-development.md`
