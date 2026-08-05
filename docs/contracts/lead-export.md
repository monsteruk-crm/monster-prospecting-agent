# Lead export contract

The first Monster Scout integration is a dry-run CSV export matching the now-restored `docs/contracts/lead_sheet_schema.csv` source. The implementation below was reconciled against its exact header row.

Exact columns:

```text
company_name,website,country,city,contact_name,role,email,source_url,category,size/signals,notes,confidence,status,owner,last_touch,opt_out
```

Rules:

- `company_name` is mandatory.
- `website` is the canonical public website where known.
- Unknown contact fields remain blank.
- `email` is populated only when publicly confirmed in fetched official-source evidence; it is never inferred.
- `source_url` must support discovery or the buying signal.
- `size/signals` contains concise verified commercial scale and timing signals.
- `notes` contains the sales angle, gaps and next step.
- `confidence` and `status` use controlled project values.
- `owner` is populated only from explicit project configuration.
- `last_touch` remains blank for new research.
- `opt_out=true` must never be reset.

## Route

`POST /api/exports/leads` accepts `{"missionRunId":"...","mode":"DRY_RUN"}` and returns `text/csv` only when the mission review is `APPROVED`. It records a `LEAD_EXPORT_DRY_RUN` audit event and never writes to Monster CRM. Repeated exports for the same run are idempotent at the audit boundary.
- No row may use plausible-looking filler values for unknown data.

## CRM dry-run route

`POST /api/crm/dry-run` accepts a mission run plus optional manually supplied CRM snapshot values and returns `accepted`, `rejected`, `duplicate`, `opted_out`, `validation_errors` and `mode: "DRY_RUN"`. It requires an approved mission, performs no CRM write, and records an idempotency-keyed audit event.
