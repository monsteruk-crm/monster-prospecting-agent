# ADR 0017: Streamed search progress and bounded mission continuation

Status: accepted
Date: 2026-08-05

## Context

The original discovery POST returned only after the bounded graph finished. Operators could not see which stage was running, and a completed run did not expose a durable way to inspect executed queries or continue deeper into search results.

## Decision

- Keep the mission brief and prepared `searchStrategy` as the source of truth for query planning.
- Bind every execution to `SalesMissionRun.missionId` and `missionRunId`.
- Persist cumulative `searchResults` after each query and record query status, query text, result count and detail in `MISSION_SEARCH_PROGRESS` audit events.
- Stream live NDJSON progress to Mission Control while retaining the existing synchronous JSON discovery route for API compatibility.
- Support bounded `search-more` continuation against the same run. It increases explicit budgets, requests deeper provider result windows, deduplicates previously saved URLs, and reuses persisted sources/accounts/signals.
- Keep continuation bounded and human-triggered; it does not create a second mission or silently run an unbounded crawler.

## Alternatives considered

- Browser-only progress state: rejected because it disappears on refresh and cannot support continuation.
- A separate query database: rejected because the existing run JSON plus idempotent audit event boundary is sufficient for the MVP.
- Automatic retries or unbounded pagination: rejected because source and model budgets must remain explicit.

## Consequences

Operators can watch search, fetch, extraction and verification progress, reopen saved run IDs, inspect executed queries and request one more bounded search pass. Search history is durable through the existing mission audit boundary. Continuation currently runs as a fresh bounded graph invocation seeded from the saved run rather than attempting to mutate the completed LangGraph checkpoint in place; its progress and outputs remain attached to the original run.

## Affected paths

`app/api/missions/discover/stream/route.ts`, `app/api/runs/route.ts`, `app/api/runs/[id]/search-more/route.ts`, `lib/graph/sales-mission-discovery.ts`, `lib/graph/discovery-runner.ts`, `lib/graph/discovery-continuation.ts`, `lib/persistence/mission-persistence.ts`, `lib/persistence/review-persistence.ts`, `components/mission-control.tsx`

## Supersedes / Superseded by

None.
