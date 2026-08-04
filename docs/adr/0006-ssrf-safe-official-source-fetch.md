# ADR 0006: SSRF-safe official-source fetching

Status: accepted  
Date: 2026-08-04

## Context

The discovery stage needs to inspect public first-party pages, but accepting arbitrary URLs from search results or model output creates a server-side request forgery boundary. A fetcher must not reach localhost, private networks, link-local services, cloud metadata endpoints or internal hostnames. It also must not retain unbounded page bodies or follow unvalidated redirects.

## Decision

Implement one server-only `safe_fetch` LangChain tool backed by deterministic TypeScript:

- allow only HTTP and HTTPS with standard ports and no URL credentials;
- reject local, internal, reserved, private, link-local and metadata-style hostnames and IP addresses;
- resolve hostnames and require every answer to be public before each request and redirect;
- follow redirects manually, cap them at three, revalidate every destination and reject HTTPS-to-HTTP downgrades;
- allow only HTML, XHTML and plain text responses;
- enforce a one-megabyte body cap and ten-second request/body timeout;
- return final URL, status, MIME type, title, bounded readable text, byte count, SHA-256 content hash, retrieval time and redirect count;
- treat fetched text as untrusted data and never expose a public proxy route for arbitrary callers.

The tool is connected to the bounded `fetch_official_sources` node in the discovery graph. The current mission-preparation graph still stops at `READY_FOR_DISCOVERY`; a separate discovery run consumes that prepared state and requires an injected search provider.

## Alternatives considered

- Direct `fetch` from a route or model tool was rejected because it would not centralise URL, redirect, byte, MIME and timeout controls.
- Browser automation was rejected because the MVP does not need it and it expands the network and execution surface.
- Allowing arbitrary ports, credentials, PDFs or authenticated sources was rejected because those paths are unnecessary for the first official-source discovery slice.

## Consequences

The discovery agent gets a bounded, provenance-bearing source reader that can return partial mission progress when individual sources fail. Some legitimate sites will be rejected when they use unsupported MIME types, non-standard ports, private DNS answers, HTTP downgrade redirects or bodies larger than the limit. Raw page bodies are not persisted by this tool.

## Affected paths

`lib/security/ssrf.ts`, `lib/tools/safe-fetch.ts`, `lib/graph/sales-mission-discovery.ts`, `tests/unit/safe-fetch.test.ts`, `tests/unit/sales-mission-discovery.test.ts`, `docs/architecture/system-overview.md`, `docs/STATUS.md`
