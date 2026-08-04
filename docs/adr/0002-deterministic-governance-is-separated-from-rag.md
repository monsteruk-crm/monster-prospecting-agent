# ADR 0002: Deterministic governance is separated from RAG

Status: accepted
Date: 2026-08-04

## Context

Commercial, privacy, scoring and export rules must be stable even when model output or retrieved context varies.

## Decision

Deterministic TypeScript owns validation, duplicate handling, privacy, scoring, budgets, idempotency and eligibility. RAG supplies product context and explanations but cannot override the current checklist.

## Alternatives considered

Letting prompts or retrieved documents enforce business rules was rejected because it is not auditable or reliably bounded.

## Consequences

Rules require versioned code/tests; model output must pass typed validation before it can affect business state.

## Affected paths

`lib/evidence/`, `lib/security/`, `lib/sales/`, `knowledge/`, `docs/contracts/`
