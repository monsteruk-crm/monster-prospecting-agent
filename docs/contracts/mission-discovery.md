# Mission discovery route contract

`POST /api/missions/discover` is a server-side Node.js route for one bounded MVP discovery run.

## Request

The JSON body is the same `SalesMissionBrief` accepted by `POST /api/missions`:

```json
{
  "name": "DACH promoter hunt",
  "geographies": ["Germany", "Austria"],
  "accountCategories": ["TICKETED_EVENT_PROMOTER"],
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
evidenceIds[]
warnings[]
errors[]
```

`searchResults[]` contains bounded DuckDuckGo discovery metadata and snippets. `fetchedSources[]` contains final URL, status, MIME type, title, a short readable excerpt, byte count, content hash, retrieval time, redirect count and the originating query. Raw page bodies are never returned.

`accountExtractionCandidates[]` contains structured model proposals linked to one fetched source hash. `accounts[]` contains deterministic account records with a stable account key and source evidence IDs. `buyingSignals[]` contains one or more verification outcomes with `verified`, `evidenceState`, `freshness`, confidence, a short supported excerpt when available, the source URL and content hash. Model output is advisory: unsupported excerpts, conflicts, missing verification and dates not present in the fetched excerpt remain unverified or unknown.

The graph stages are `SEARCH_PROVIDER`, `OFFICIAL_SOURCE_FETCH`, `ACCOUNT_EXTRACTION`, `BUYING_SIGNAL_VERIFICATION` and `READY_FOR_REVIEW`. Account extraction and verification consume the shared `maxModelCalls` budget; extraction reserves calls so verification can run when the budget allows. Partial model failures remain in `errors[]` and do not discard successful accounts or signals.

The route returns `201` for a completed bounded run even when individual search or source requests fail; those failures are represented in `errors[]` and successful results remain available. `cache-control: no-store` is set because the response contains mission research.

## Error responses

- `400 INVALID_JSON` — malformed JSON body;
- `400 INVALID_SALES_MISSION_BRIEF` — the body fails the sales-mission schema;
- `500 MISSION_PREPARATION_INCOMPLETE` — preparation did not produce discovery inputs;
- `502 MISSION_DISCOVERY_FAILED` — an unexpected server-side discovery failure.

The route does not persist missions or provide resume/checkpoint semantics yet. It is intentionally a bounded server route, not a public proxy for arbitrary URLs and not an outreach endpoint.
