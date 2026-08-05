# TODO: Live CRM insertion

Status: deferred future work. Live CRM insertion is not required to complete the standalone MVP.

The MVP boundary ends at approved lead-sheet CSV export and authenticated CRM dry-run validation. Do not add a live Monster CRM write as part of the current MVP.

Before implementation, complete and approve:

- the target CRM API and field mapping beyond the restored CSV contract;
- production SSO or service-identity management, token rotation and organisation-level RBAC;
- idempotency keys, duplicate handling, opt-out and do-not-contact enforcement at the live boundary;
- a dry-run parity test proving live mapping matches the approved CSV and dry-run outcomes;
- retry, timeout, rate-limit and partial-failure behavior;
- audit events containing mission, run, account, actor, organisation and external CRM identifiers;
- a human approval gate immediately before insertion;
- sandbox/integration verification and an operational rollback or remediation procedure.

Explicit non-goals for this TODO are automatic outreach, campaign enrolment, guessed contact data and autonomous CRM decisions. The existing `POST /api/crm/dry-run` route remains the only CRM service boundary until this checklist is approved.

See [ADR 0004](../adr/0004-standalone-first-crm-integration-later.md), [ADR 0013](../adr/0013-approved-lead-csv-dry-run.md), and [ADR 0014](../adr/0014-crm-dry-run-validation-boundary.md).
