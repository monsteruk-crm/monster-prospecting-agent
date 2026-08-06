# ADR 0024: Run re-execution boundary

Status: accepted
Date: 2026-08-06

## Context

Operators need to repeat a completed mission from its saved brief when provider responses, contact extraction, or transient source availability made a prior run unusable. This differs from bounded continuation, which extends existing search state.

## Decision

- Provide `POST /api/runs/:id/rerun`.
- Read and validate the saved brief, create a fresh run ID under the same parent mission, and execute the normal bounded discovery path.
- Do not copy old search results, fetched sources, accounts, signals, review, or audit events.
- Preserve the original run and reject re-execution while it is `RUNNING`.
- Expose `Re-execute run` separately from `Search deeper` in the dossier UI.

## Alternatives considered

- Reusing the existing run ID was rejected because it would destroy audit history.
- Treating re-execution as continuation was rejected because continuation preserves prior state and budgets.
- Duplicating the launch graph in the route was rejected because it would drift from the normal mission path.

## Consequences

Re-execution consumes a new bounded budget and creates a new review snapshot. The parent mission groups runs for history while each run remains independently inspectable.

## Affected paths

`lib/graph/discovery-runner.ts`, `app/api/runs/[id]/rerun/route.ts`, `components/mission-control.tsx`, `docs/contracts/mission-discovery.md`
