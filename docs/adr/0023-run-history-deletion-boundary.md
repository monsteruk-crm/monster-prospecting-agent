# ADR 0023: Run history deletion boundary

Status: accepted
Date: 2026-08-06

## Context

Operators need to remove stale or unusable mission runs from the Runs history. A run owns its accounts, evidence, signals, reviews and audit events, while the parent mission may have other runs and must remain available.

## Decision

- Provide `DELETE /api/runs` with `{ "ids": string[] }` for bounded bulk deletion of up to 50 selected run IDs.
- Provide `DELETE /api/runs/:id` for a single-run equivalent.
- Delete only `SalesMissionRun` records. Prisma cascades remove run-owned accounts, evidence, signals, review and audit rows; the parent `SalesMission` and unrelated runs remain.
- The Runs UI deletes selected rows immediately without a confirmation prompt, as an explicit operator choice.

## Alternatives considered

- Deleting the parent mission was rejected because it could remove unrelated run history.
- Soft deletion was deferred because the MVP needs simple cleanup and has no retention/recovery workflow.
- An unbounded delete-all endpoint was rejected because destructive scope must remain explicit.

## Consequences

Run deletion is immediate and not recoverable through the application. Checkpoint garbage collection remains an operational follow-up if orphaned LangGraph checkpoint rows become material.

## Affected paths

`lib/persistence/mission-persistence.ts`, `app/api/runs/route.ts`, `app/api/runs/[id]/route.ts`, `components/runs-page.tsx`
