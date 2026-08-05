# Mission discovery route contract

`POST /api/missions/discover` is a server-side Node.js route for one bounded MVP discovery run.

## Request

The JSON body is the same `SalesMissionBrief` accepted by `POST /api/missions`:

```json
{
  "name": "DACH promoter hunt",
  "geographies": ["Germany", "Austria"],
  "accountCategories": ["TICKETED_EVENT_PROMOTER"],
  "contactRequirement": "PUBLIC_EMAIL",
  "buyerRoles": ["Managing Director", "Head of Programming"]
}
```

The route applies the normal Zod defaults and mission limits. It creates a fresh mission/run ID, prepares the target profile and search strategy, then runs the LangGraph discovery segment with the default DuckDuckGo provider, SSRF-safe source fetcher, account extraction and buying-signal verification.

## Success response

Status: `201`

```text
missionId
missionRunId
graphVersion
status
discoveryStage
targetProfile
searchStrategy
budget
searchResults[]
fetchedSources[]
accountExtractionCandidates[]
accounts[]
accountIds[]
buyingSignals[]
buyingSignalIds[]
review
persistedAt
evidenceIds[]
warnings[]
errors[]
```

`searchResults[]` contains bounded DuckDuckGo discovery metadata and snippets. `fetchedSources[]` contains final URL, status, MIME type, title, a short readable excerpt, byte count, content hash, retrieval time, redirect count and the originating query. Raw page bodies are never returned.

`accountExtractionCandidates[]` contains structured model proposals linked to one fetched source hash. `accounts[]` contains deterministic account records with a stable account key and source evidence IDs. `buyingSignals[]` contains one or more verification outcomes with `verified`, `evidenceState`, `freshness`, confidence, a short supported excerpt when available, the source URL and content hash. Model output is advisory: unsupported excerpts, conflicts, missing verification and dates not present in the fetched excerpt remain unverified or unknown.

The graph stages are `SEARCH_PROVIDER`, `OFFICIAL_SOURCE_FETCH`, `ACCOUNT_EXTRACTION`, `BUYING_SIGNAL_VERIFICATION` and `READY_FOR_REVIEW`. Account extraction and verification consume the shared `maxModelCalls` budget; extraction reserves calls so verification can run when the budget allows. Partial model failures remain in `errors[]` and do not discard successful accounts or signals.

The route persists the mission, run, account entities, source evidence, buying signals, audit event and a `PENDING` review snapshot in PostgreSQL before returning. The review snapshot stores IDs, budget, warnings and errors rather than full page bodies. Repeated writes for the same mission/run use stable keys and Prisma upserts.

The route returns `201` for a completed bounded run even when individual search or source requests fail; those failures are represented in `errors[]` and successful results remain available. `cache-control: no-store` is set because the response contains mission research.

`contactRequirement` defaults to `ANY_ROUTE`. When it is `PUBLIC_EMAIL`, or when mission instructions clearly say to return only contacts with an email, the discovery graph keeps an account only when a syntactically valid email address appears in the fetched official-source excerpt. The address is stored on the provenance-linked contact route and exported; it is never inferred. Accounts without a qualifying public email are omitted and the run reports `ACCOUNT_FILTERED_NO_PUBLIC_EMAIL` as a warning.

## Error responses

- `400 INVALID_JSON` — malformed JSON body;
- `400 INVALID_SALES_MISSION_BRIEF` — the body fails the sales-mission schema;
- `500 MISSION_PREPARATION_INCOMPLETE` — preparation did not produce discovery inputs;
- `503 MISSION_PERSISTENCE_FAILED` — the database is unavailable or the mission could not be persisted;
- `503 MISSION_DISCOVERY_OR_PERSISTENCE_FAILED` — an unexpected discovery or final persistence failure.

The discovery route uses the LangGraph Postgres checkpointer and interrupts after the bounded verification stage. The run is resumable with its `missionRunId`/`thread_id`. It remains intentionally a bounded server route, not a public proxy for arbitrary URLs and not an outreach endpoint.

## Live progress, query history and continuation

- `POST /api/missions/discover/stream` accepts the same brief and returns newline-delimited JSON messages: `run_started`, `search_progress`, `progress`, `completed` or `error`. Mission Control uses this route to show live stage and query output.
- `GET /api/runs?limit=20` returns recent persisted run IDs, mission names, statuses, stages and review statuses.
- `GET /api/runs/:missionRunId` includes the saved `MISSION_PROGRESS` and `MISSION_SEARCH_PROGRESS` audit events. Search progress records the executed query, query status, result count, cumulative bounded search results and search usage.
- `POST /api/runs/:missionRunId/search-more` accepts optional `additionalSearches`, `additionalPages`, `additionalModelCalls` and `additionalCostUsd`. It reuses the saved mission strategy and evidence, asks DuckDuckGo for a deeper result window, excludes previously saved URLs, and persists the new results to the same run. Defaults are 7 searches, 20 pages, 12 model calls and USD 2; all values remain bounded.

The search plan belongs to the mission brief/run strategy, while execution history belongs to the mission run. No query is stored as an unowned browser-side event.

## Review and dossier routes

- `GET /api/runs/:missionRunId` returns the persisted mission, run, account dossiers, score snapshots, contact routes, evidence, signals, first-move drafts and review state.
- `POST /api/runs/:missionRunId/review` accepts `{ action, reviewer, note }`, where `action` is `APPROVE`, `REJECT`, `EDIT`, `DUPLICATE` or `DO_NOT_CONTACT`. Decisions are audited. Non-edit decisions resume the checkpointed graph and complete the run.
- `POST /api/runs/:missionRunId/research-gap` accepts `{ question, accountId?, reviewer? }`, records a structured `CHANGES_REQUESTED` review note and leaves the run available for a follow-up research implementation. It does not send outreach or write to CRM.
- `POST /api/runs/:missionRunId/resume` resumes a checkpointed run explicitly.

Scores are deterministic snapshots. A sourced role-only route is valid MVP reachability and contributes partial reachability points; accounts with no route at all are capped at 70. The dossier exposes route state and caps rather than implying a named contact or guessed email. Email-only missions therefore return fewer accounts, potentially zero, when official sources do not publish a usable address.

After approval, `POST /api/prospects/:accountId/first-move` generates and persists a `DRAFT` first-move brief. It requires `MissionReview.status = APPROVED`, uses only supplied evidence and routes, and never sends outreach.
