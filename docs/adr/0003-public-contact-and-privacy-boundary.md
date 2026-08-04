# ADR 0003: Public contact and privacy boundary

Status: accepted
Date: 2026-08-04

## Context

Prospecting needs useful routes into organisations without inventing or enriching private contact data.

## Decision

Use publicly confirmed professional contact information or a role-based route. Never guess emails, add private enrichment, or reset an opt-out.

## Alternatives considered

Email guessing, scraped contact aggregators and private enrichment were rejected because they weaken evidence and privacy integrity.

## Consequences

Unknown fields stay blank and every populated contact field requires source evidence.

## Affected paths

`lib/security/`, `lib/evidence/`, `docs/contracts/lead-export.md`
