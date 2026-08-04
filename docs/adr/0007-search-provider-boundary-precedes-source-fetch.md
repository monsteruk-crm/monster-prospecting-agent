# ADR 0007: Search-provider boundary precedes official-source fetching

Status: accepted  
Date: 2026-08-04

## Context

Monster Scout needs a provider-neutral search stage before it can inspect public source pages. Coupling a vendor SDK directly to the graph would make budgets, tests and provider replacement harder to control. The graph also needs to make the order of operations visible: bounded search results first, then bounded source fetching.

## Decision

Define a typed `SearchProvider` interface in `lib/discovery/search-provider.ts`. The discovery graph invokes one provider request per generated query, validates every returned result with Zod, deduplicates URLs, and passes the bounded result set to `fetch_official_sources`. The fetch node invokes the existing `safe_fetchTool` by default and records only source metadata, a short excerpt and a content hash in graph state.

The MVP default is `DuckDuckGoSearchProvider`, which uses DuckDuckGo's non-JavaScript HTML results surface without a paid search credential. The provider remains injectable into `discoverSalesMission` so a different adapter can be introduced later without changing the graph. No paid provider SDK, public discovery route or automatic account extraction is added in this slice.

## Alternatives considered

- Embedding a provider SDK in the graph was rejected because it would mix provider concerns with workflow governance.
- Making Brave Search API the MVP default was deferred because a paid Brave credential is not available for this phase.
- Letting the model call search and fetch directly was rejected because deterministic TypeScript must own budgets, validation, deduplication and partial-failure handling.
- Fetching before search results exist was rejected because the graph must not accept arbitrary model- or user-supplied URLs as an unbounded research surface.

## Consequences

The graph is testable without network access and can swap providers behind one contract. The MVP can run the search stage with DuckDuckGo, subject to its HTML surface, rate limits and availability. Search result snippets remain discovery aids; fetched source content remains untrusted evidence until later verification and extraction stages.

## Affected paths

`lib/discovery/search-provider.ts`, `lib/discovery/duckduckgo-search-provider.ts`, `lib/graph/sales-mission-discovery.ts`, `lib/tools/safe-fetch.ts`, `tests/unit/sales-mission-discovery.test.ts`, `tests/unit/duckduckgo-search-provider.test.ts`, `docs/architecture/system-overview.md`, `docs/runbooks/local-development.md`
