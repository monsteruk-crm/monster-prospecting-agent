# Bounded Public Contact Intelligence After Canonical Account Discovery

Status: accepted
Date: 2026-08-05

## Context

Initial account discovery only fetched the first market-search sources. The safe fetch transformation discarded HTML links, `mailto:` and `tel:` metadata, and public-email filtering occurred before an account-specific contact attempt. This produced false negatives for ordinary organisations whose commercial route lives on a linked contact, partnerships or team page. DuckDuckGo GET requests were also intermittently rejected with HTTP 403 by hosted-function egress addresses.

## Decision

- Keep account discovery separate from a bounded contact phase after account canonicalisation and buying-signal verification.
- Use a maintained HTML parser and registrable-domain utility to retain capped same-site links, explicit email/phone hints, canonical URL metadata and safe JSON-LD contact fields. The safe fetcher remains non-recursive and keeps its SSRF, redirect, MIME, byte and timeout controls.
- Prefer linked official pages, then at most one focused same-site DuckDuckGo browser-like HTML GET search per account, then two deterministic contact paths. Fetch at most three contact pages per account within the global mission page budget.
- Derive multiple actual routes deterministically, rank them, preserve unsuitable or role-only routes for audit, and never generate an email address or scrape an external profile.
- Evaluate `PUBLIC_EMAIL` after contact enrichment. Accounts without a verified public email remain in audit data with `CONTACT_REQUIREMENT_NOT_MET` and are excluded from the email-required export.
- Support a visible per-run contact continuation route that targets one account without restarting market discovery.
- Emit structured Vercel runtime logs with a correlation ID for route failures and partial discovery errors. Legacy PostgreSQL SSL modes are normalized to explicit `verify-full`.

## Alternatives considered

- Recursive site crawling: rejected because it would expand privacy, SSRF, cost and latency exposure.
- Paid contact enrichment or email-pattern guessing: rejected by the public-source and provenance boundary.
- A new contact-route table: deferred; existing account JSON routes plus evidence and audit events are sufficient for this milestone.
- Keeping DuckDuckGo POST: rejected because the working reference implementation uses the browser-like HTML GET surface; the provider now follows that shape and uses bounded Bing HTML fallback when DuckDuckGo returns a challenge.

## Consequences

Positive: better recall for first-party contact routes, fewer email-only false negatives, explainable route ranking and targeted re-research.

Negative: contact enrichment consumes bounded page/search budget, increases partial-failure cases and adds a small amount of graph and UI complexity.

## Affected paths

`lib/tools/safe-fetch.ts`, `lib/security/ssrf.ts`, `lib/discovery/duckduckgo-search-provider.ts`, `lib/graph/sales-mission-discovery.ts`, `lib/graph/contact-continuation.ts`, `lib/sales/contact-schema.ts`, `lib/sales/contact-route-engine.ts`, `lib/sales/score-engine.ts`, `lib/persistence/mission-persistence.ts`, `app/api/runs/[id]/accounts/[accountId]/contact-enrichment/route.ts`, `lib/observability/runtime-logger.ts`.
