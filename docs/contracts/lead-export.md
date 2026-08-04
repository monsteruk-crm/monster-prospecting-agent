# Lead export contract

The first Monster Scout integration is a CSV export matching the declared lead-sheet schema. The supplied `docs/contracts/lead_sheet_schema.csv` source was not present during bootstrap; the columns below are transcribed from the authoritative product plan and must be checked against the supplied CSV before export implementation is started.

Exact columns:

```text
company_name,website,country,city,contact_name,role,email,source_url,category,size/signals,notes,confidence,status,owner,last_touch,opt_out
```

Rules:

- `company_name` is mandatory.
- `website` is the canonical public website where known.
- Unknown contact fields remain blank.
- `email` is populated only when publicly confirmed.
- `source_url` must support discovery or the buying signal.
- `size/signals` contains concise verified commercial scale and timing signals.
- `notes` contains the sales angle, gaps and next step.
- `confidence` and `status` use controlled project values.
- `owner` is populated only from explicit project configuration.
- `last_touch` remains blank for new research.
- `opt_out=true` must never be reset.
- No row may use plausible-looking filler values for unknown data.
