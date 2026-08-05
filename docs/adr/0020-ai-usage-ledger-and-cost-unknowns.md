# AI usage ledger and cost unknowns

Status: accepted
Date: 2026-08-05

## Context

The application needs operational visibility into model calls without allowing provider accounting to become a hidden source of truth or a reason for a model call to fail.

## Decision

All production model call sites use the central model factory and invokeWithUsage. Each attempt records an idempotency key, mission/run context, model role and ID, status, latency, token metadata when supplied, and cost provenance in AiUsageEvent. The usage page distinguishes reported, estimated, and unknown cost; missing provider pricing is never presented as zero spend.

## Alternatives considered

- Log only to Vercel: rejected because logs are not durable mission evidence.
- Treat every token as a locally invented dollar estimate: rejected because it would misstate spend.
- Make ledger persistence mandatory for inference: rejected because observability failure must not break discovery.

## Consequences

The MVP has durable call and token visibility, while dollar totals remain unknown unless the provider returns cost metadata or a pricing catalogue is explicitly configured. The ledger is additive and can be aggregated later without changing graph state.

## Affected paths

lib/ai/model-factory.ts, lib/ai/usage-ledger.ts, app/api/usage/route.ts, components/costs-page.tsx, prisma/schema.prisma, prisma/migrations/20260805130000_operational_settings_and_ai_usage/.
