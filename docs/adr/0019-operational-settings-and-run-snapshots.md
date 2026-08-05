# Operational settings and run snapshots

Status: accepted
Date: 2026-08-05

## Context

Mission limits and model/cost policy must be editable without scattering constants through the UI or graph. A run must remain reproducible after settings change.

## Decision

Store one validated ScoutSettings document with monotonically increasing revisions. Launch routes resolve the effective settings and persist both settingsVersion and settingsSnapshot on SalesMissionRun. Central absolute ceilings remain code-owned and cannot be raised from the UI. Settings writes use optimistic concurrency and require SETTINGS_ADMIN_TOKEN in production.

## Alternatives considered

- Keep limits in the launch component: rejected because it allows drift between UI and graph.
- Let settings raise safety limits: rejected because safety is an architectural boundary.
- Add a separate settings service: rejected for MVP; Prisma is the existing persistence boundary.

## Consequences

Settings are auditable and each run is reproducible. The additive migration must be applied before database-backed settings writes are available; un-migrated environments fall back to validated bootstrap defaults for read-only operation.

## Affected paths

lib/settings/, app/api/settings/, prisma/schema.prisma, prisma/migrations/20260805130000_operational_settings_and_ai_usage/, lib/graph/, lib/persistence/mission-persistence.ts.
