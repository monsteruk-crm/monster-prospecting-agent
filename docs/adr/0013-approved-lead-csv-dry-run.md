# ADR 0013: Approved lead CSV dry-run boundary

Status: accepted
Date: 2026-08-05

## Context

Monster Scout now has approved, scored dossiers and first-move drafts. The MVP needs a safe bridge to the existing lead-sheet shape without coupling the application to Monster CRM or exporting unreviewed records.

## Decision

- Expose `POST /api/exports/leads` as a CSV dry-run route.
- Require `MissionReview.status = APPROVED` for every exported run.
- Map only persisted evidence-backed fields; unknown contact values remain blank.
- Keep `last_touch` blank for new research and set `opt_out=false` only because these are newly created Scout rows with no opt-out source; any future imported `true` must win.
- Record an idempotent `LEAD_EXPORT_DRY_RUN` audit event and perform no CRM write.

## Consequences

The export can be inspected and handed to a human or later CRM dry-run bridge. The lead-sheet schema has now been restored and reconciled. Automatic outreach and live CRM insertion remain out of scope.

## Affected paths

`lib/export/lead-export.ts`, `app/api/exports/leads/route.ts`, `tests/unit/lead-export.test.ts`, `docs/contracts/lead-export.md`
