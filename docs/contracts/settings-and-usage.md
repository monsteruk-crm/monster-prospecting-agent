# Settings and usage contract

GET /api/settings returns validated effective settings, revision version, source (DATABASE or bootstrap fallback), and absolute ceiling metadata. PATCH /api/settings accepts { version, patch, changeSummary }; a stale version returns 409 SETTINGS_VERSION_CONFLICT. Production writes require x-settings-admin-token matching SETTINGS_ADMIN_TOKEN. POST /api/settings/reset uses the same protection.

Settings are applied at mission launch and copied to SalesMissionRun.settingsSnapshot. Later edits therefore do not change an executing or completed run.

GET /api/usage?from=<ISO date> returns local model-call counts, token totals, recent usage events, and a gateway object. The gateway object reads Vercel AI Gateway credits and a date-bounded report with the app:monster-scout tag. Gateway charged spend and balance are the cost source of truth; local reported/estimated/unknown values remain diagnostics. Gateway reporting can lag or be unavailable on plans without Custom Reporting access, and the API returns an explicit unavailable state.

Live CRM insertion remains outside this contract.
