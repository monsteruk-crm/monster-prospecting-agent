# ADR 0012: Provenance-linked contact routes and approved first-move drafts

Status: accepted
Date: 2026-08-05

## Context

The persisted dossier contained accounts, evidence, signals, scores and review state, but no safe route into an organisation or human-ready first move.

## Decision

- Derive role-only routes from source-linked buyer roles and expose an official contact-page route only when the fetched source URL itself supports that route.
- Never infer email addresses, private profiles, naming patterns or current employment.
- Allow first-move drafting only after `MissionReview.status = APPROVED`.
- Use the interpretation model for a bounded structured draft grounded in supplied evidence and contact routes.
- Persist the draft on the account as `DRAFT`, audit its creation, and never send it automatically.

## Consequences

Every account now has an explicit route state, including the valid `ROLE_ONLY` outcome. The current bounded discovery run does not crawl additional contact pages; broader contact-page search remains a follow-up. First-move generation is a human-reviewed sales aid, not an outreach integration.

## Affected paths

`lib/sales/contact-schema.ts`, `lib/sales/contact-route-engine.ts`, `lib/chains/first-move.ts`, `lib/persistence/mission-persistence.ts`, `lib/persistence/review-persistence.ts`, `app/api/prospects/[id]/first-move/route.ts`, `components/mission-control.tsx`
