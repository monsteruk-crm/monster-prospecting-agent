# ADR 0025: Brave Search provider default

Status: accepted
Date: 2026-08-06

## Context

DuckDuckGo's public HTML endpoint has repeatedly returned hosted-egress challenge responses. A Brave Search API credential is now configured for the MVP deployment.

## Decision

- Use `BraveSearchProvider` as the default search adapter when `BRAVE_API` or `BRAVE_API_KEY` is configured.
- Call Brave's HTTPS Web Search endpoint with the secret in `X-Subscription-Token`, never in the URL or logs.
- Map Brave's typed `web.results` into the existing `SearchResult` contract and clamp each API request to 20 results.
- Retain the DuckDuckGo adapter, including its bounded Bing fallback, as the no-key local compatibility path and injectable test adapter.
- Keep official-source filtering and SSRF-safe fetching unchanged after search results are returned.

## Alternatives considered

- Keeping DuckDuckGo as primary was rejected because hosted runs were repeatedly challenged.
- Replacing the `SearchProvider` contract was rejected because the graph boundary already isolates provider-specific behavior.
- Passing the API key through query parameters was rejected because Brave requires the subscription header and headers avoid secret leakage.

## Consequences

Search queries now consume the configured Brave API allowance. Provider HTTP/auth failures remain typed partial mission errors. Deployments must define `BRAVE_API` (the existing local variable) or `BRAVE_API_KEY`; deployments without either continue using DuckDuckGo/Bing compatibility behavior.

## Affected paths

`lib/discovery/brave-search-provider.ts`, `lib/graph/sales-mission-discovery.ts`, `tests/unit/brave-search-provider.test.ts`, `docs/contracts/mission-discovery.md`

## Supersedes

The Brave-deferred portions of ADR 0007 and the earlier DuckDuckGo-only MVP wording in the authoritative plan.
