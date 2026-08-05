# Vercel AI Gateway as charged-spend source

Status: accepted
Date: 2026-08-05

## Context

The local usage ledger records mission attribution and token metadata, but it cannot reliably know provider pricing or charged spend. Vercel AI Gateway exposes credits, lifetime spend, and aggregated reports.

## Decision

The costs surface reads Vercel AI Gateway credits and the date-bounded reporting endpoint server-side. The Gateway credential is never sent to the browser. Monster Scout model requests carry the app:monster-scout reporting tag. The local ledger remains the durable operational audit record and fallback; Gateway reporting is the source of truth for charged spend.

## Alternatives considered

- Infer dollars from tokens locally: rejected because provider/model pricing changes and BYOK may be zero charged Gateway spend.
- Use only the Vercel dashboard: rejected because the product needs an inspectable in-app view.
- Make Gateway reporting mandatory for missions: rejected because a reporting outage must not stop discovery.

## Consequences

The Gateway report may lag by a few minutes and custom reporting requires the appropriate Vercel plan and credential. The page explicitly displays unavailable reporting rather than treating it as zero.

## Affected paths

lib/ai/gateway-usage.ts, lib/ai/model-factory.ts, app/api/usage/route.ts, components/costs-page.tsx, docs/contracts/settings-and-usage.md.
