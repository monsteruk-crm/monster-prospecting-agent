# ADR 0004: Standalone first, CRM integration later

Status: accepted
Date: 2026-08-04

## Context

The MVP must prove sales research value without coupling early implementation to Monster CRM.

## Decision

Monster Scout remains standalone through bootstrap and MVP. CSV is the first CRM boundary; any future CRM bridge requires a dry-run contract before live writes.

## Alternatives considered

Direct CRM reads and writes during bootstrap were rejected because they create premature coupling and make local verification harder.

## Consequences

Duplicate checks use Monster Scout data and optional manually uploaded CSV snapshots. No CRM identifiers or foreign keys belong in the Act 0 schema.

## Affected paths

`prisma/`, `lib/db/`, `docs/contracts/`, `docs/architecture/system-overview.md`
