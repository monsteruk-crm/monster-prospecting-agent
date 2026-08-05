# ADR 0014: CRM dry-run validation boundary

Status: accepted
Date: 2026-08-05

## Context

The approved CSV export is now reconciled against the restored lead-sheet schema. The product plan requires a CRM dry-run phase that reports accepted, rejected, duplicate, opted-out and validation-error outcomes before any live insertion.

## Decision

- Expose `POST /api/crm/dry-run` as a JSON validation boundary.
- Protect it with a configured bearer service token, required `x-monster-organization-id` scope header, and a server-configured `CRM_OPERATOR` or `ADMIN` role. The request cannot self-assign a role.
- Require an approved mission review through the existing export mapper.
- Accept optional existing company names and opted-out account IDs as a manually supplied CRM snapshot boundary.
- Return `accepted`, `rejected`, `duplicate`, `opted_out`, `validation_errors` and `mode` without contacting or writing to Monster CRM.
- Audit each idempotency-keyed dry-run with the source mission and graph run IDs.

## Consequences

CRM mapping can be validated against a snapshot without premature external coupling. The simple service boundary is suitable for local/MVP operation; SSO, token rotation, organisation-level RBAC and live insertion remain required before production CRM use.

## Affected paths

`lib/export/crm-dry-run.ts`, `app/api/crm/dry-run/route.ts`, `tests/unit/crm-dry-run.test.ts`, `docs/contracts/lead-export.md`
