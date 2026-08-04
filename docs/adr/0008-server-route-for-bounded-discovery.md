# ADR 0008: Server route for bounded discovery

Status: accepted  
Date: 2026-08-04

## Context

The preparation and discovery graphs now exist as server-side functions, but the application needs one explicit HTTP boundary to run a fresh MVP discovery mission. The route must not expose arbitrary fetching, raw page bodies or an unbounded long-running workflow.

## Decision

Add `POST /api/missions/discover` as a Node.js App Router route. It:

- validates the request as a `SalesMissionBrief`;
- creates a fresh mission and LangGraph thread ID through the preparation graph;
- invokes `discoverSalesMission` with the default DuckDuckGo provider and `safe_fetchTool`;
- returns bounded search metadata, source references, excerpts, hashes, budgets, warnings and typed errors;
- returns `cache-control: no-store`;
- returns partial discovery results with HTTP `201` when individual provider or source calls fail;
- returns `502` only for an unexpected route-level failure.

The route does not persist business entities, expose a resume endpoint, accept arbitrary source URLs or send outreach. Durable checkpoints, authentication and human review remain later milestones.

## Alternatives considered

- Reusing `POST /api/missions` was rejected because preparation and live network discovery have different latency, failure and operational boundaries.
- Exposing `safe_fetchTool` directly was rejected because it would create an arbitrary URL proxy.
- Adding a queue was rejected because the current bounded function path has not crossed the measured queue threshold.

## Consequences

The MVP has a concrete server boundary for a fresh bounded discovery run and a stable response contract for the UI. The route can still be slow or rate-limited by DuckDuckGo, and it does not yet support durable resume, authentication or persistent mission history.

## Affected paths

`app/api/missions/discover/route.ts`, `docs/contracts/mission-discovery.md`, `tests/unit/mission-discovery-route.test.ts`, `docs/architecture/system-overview.md`, `docs/runbooks/local-development.md`, `docs/STATUS.md`

