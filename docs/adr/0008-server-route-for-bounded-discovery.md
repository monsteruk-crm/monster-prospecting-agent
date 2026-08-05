# ADR 0008: Server route for bounded discovery

Status: superseded in part by ADR 0011
Date: 2026-08-04

## Context

The preparation and discovery graphs now exist as server-side functions, but the application needs one explicit HTTP boundary to run a fresh MVP discovery mission. The route must not expose arbitrary fetching, raw page bodies or an unbounded long-running workflow.

## Decision

Add `POST /api/missions/discover` as a Node.js App Router route. It:

- validates the request as a `SalesMissionBrief`;
- creates a fresh mission and LangGraph thread ID through the preparation graph;
- invokes `discoverSalesMission` with the default DuckDuckGo provider and `safe_fetchTool`;
- persists the prepared mission/run and final bounded account, evidence, signal, audit and pending-review records through Prisma;
- returns bounded search metadata, source references, excerpts, hashes, budgets, review state, warnings and typed errors;
- returns `cache-control: no-store`;
- returns partial discovery results with HTTP `201` when individual provider or source calls fail;
- returns `502` only for an unexpected route-level failure.

The route does not expose a resume endpoint, accept arbitrary source URLs, mutate review decisions, authenticate users or send outreach. Durable LangGraph checkpoints, authentication and human review actions remain later milestones.

## Alternatives considered

- Reusing `POST /api/missions` was rejected because preparation and live network discovery have different latency, failure and operational boundaries.
- Exposing `safe_fetchTool` directly was rejected because it would create an arbitrary URL proxy.
- Adding a queue was rejected because the current bounded function path has not crossed the measured queue threshold.

## Consequences

The MVP has a concrete server boundary for a fresh bounded discovery run and a stable response contract for the UI. Mission history and pending review snapshots are durable, while the route can still be slow or rate-limited by DuckDuckGo and does not yet support durable graph resume, authentication or review-decision mutation.

## Affected paths

`app/api/missions/discover/route.ts`, `docs/contracts/mission-discovery.md`, `tests/unit/mission-discovery-route.test.ts`, `docs/architecture/system-overview.md`, `docs/runbooks/local-development.md`, `docs/STATUS.md`
