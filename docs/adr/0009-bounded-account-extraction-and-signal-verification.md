# ADR 0009: Bounded account extraction and buying-signal verification

Status: accepted  
Date: 2026-08-04

## Context

The discovery graph now has SSRF-safe, source-linked excerpts, but those excerpts are not yet useful prospect entities. The next stage needs to extract a small number of account hypotheses and verify buying-signal candidates without treating model output as final sales truth or placing full page bodies in graph state.

## Decision

Extend the bounded discovery graph with two sequential nodes after official-source fetching:

1. `extract_accounts` calls the central registry's `EXTRACTION_MODEL` on one short, delimited source excerpt per bounded candidate and emits a typed account candidate plus source provenance.
2. `verify_buying_signals` calls the central registry's `VERIFICATION_MODEL` on the extracted candidates and emits typed signal outcomes.

Deterministic TypeScript remains authoritative for:

- the shared `maxModelCalls` budget and call reservation;
- source-quote and event-date support checks against the fetched excerpt;
- content-hash and evidence-ID provenance;
- `verified` status, evidence state and freshness calculation;
- partial failure handling and duplicate signal IDs.

Model-facing response schemas use provider-compatible bounded primitives for strict structured output. Model-provided domains are treated as hints only; source URLs and provenance always come from the validated fetched reference.

Signals that cannot be supported remain present only as explicitly unverified or unknown outcomes. The graph stores short excerpts and structured references, never full page bodies. The route exposes bounded account candidates, accounts and signal outcomes for audit-oriented UI work, but it does not persist entities, send outreach or make CRM decisions.

## Alternatives considered

- Letting one model call both extract and verify was rejected because the verification responsibility would be implicit and harder to audit.
- Allowing models to decide freshness or final verification was rejected because those are deterministic evidence-governance rules.
- Fetching more page content for the model was rejected because source-fetch limits and graph-state minimisation remain binding.
- Dropping unsupported candidates was rejected because unknown and missing information must remain visible to human reviewers.

## Consequences

The discovery response now contains source-linked account and buying-signal material suitable for the next review stage. Small model budgets may stop extraction or verification; the graph returns partial typed results and warnings. The implementation requires the extraction and verification model-role variables in environments that run the live route, while unit tests inject deterministic adapters.

## Affected paths

`lib/chains/account-extraction.ts`, `lib/graph/sales-mission-discovery.ts`, `lib/sales/mission-schema.ts`, `app/api/missions/discover/route.ts`, `docs/contracts/mission-discovery.md`, `docs/architecture/system-overview.md`, `tests/unit/sales-mission-discovery.test.ts`
