# Local development

## Prerequisites

- Node.js 22 or the version supported by the current Next.js release.
- npm, already selected by this repository.
- A Neon or PostgreSQL database for Prisma migration and health checks.
- Vercel AI Gateway credentials and approved model IDs for the AI smoke route.

## Install and environment

```bash
npm install
cp .env.example .env
```

Fill `DATABASE_URL` with a pooled runtime URL and `DIRECT_URL` with a direct migration URL. This repository also accepts `PRISMA_DATABASE_URL` or `POSTGRES_URL` when those are the names supplied by your database provider. Fill the AI Gateway credential and all four model-role variables. Do not commit `.env`, `.env.example` secrets, or real credentials.

For the temporary CRM dry-run service boundary, configure `CRM_DRY_RUN_SERVICE_TOKEN` (a local secret of at least 16 characters), `CRM_DRY_RUN_ORGANIZATION_ID`, and optionally `CRM_DRY_RUN_SERVICE_ROLE=CRM_OPERATOR` or `ADMIN`. Send the token as `Authorization: Bearer ...` and the organisation as `x-monster-organization-id`; never place the token in source, documentation or logs.

## Database setup status

Prisma is configured for PostgreSQL with a minimal `BootstrapHealthCheck` model. The runtime uses Prisma's PostgreSQL adapter, which supports Prisma Postgres, Neon and standard PostgreSQL URLs. The current local Prisma Postgres migration has been applied. For a fresh environment, run:

```bash
npm run prisma:generate
npm run prisma:migrate
```

The bounded mission routes now require this PostgreSQL connection for durable mission, evidence, signal and pending-review persistence. The migrations create the mission business tables; the LangGraph checkpointer creates its checkpoint tables on first use.

The application health check is `GET /api/health/db`. It returns `503` with a typed configuration/blocker response until a database is configured and reachable.
The observability check is `GET /api/health/observability`; it reports LangSmith tracing configuration without exposing credentials.

## Local commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
DIRECT_URL="postgresql://bootstrap:bootstrap@localhost:5432/monster_scout" npm run build
npm run test:e2e
npm run knowledge:ingest
```

## Governed knowledge ingestion

The restored checklist and positioning addendum are ingested locally into checked-in artifacts:

```bash
npm run knowledge:ingest
cat knowledge/ingested/manifest.json
wc -l knowledge/ingested/chunks.jsonl
```

The command is deterministic. It normalizes line endings, records `AUTHORITATIVE_CHECKLIST` or `POSITIONING_ADDENDUM`, sets the source effective date and active deprecation state, and writes source/chunk SHA-256 hashes plus Markdown section IDs. Review the manifest and source diff whenever either source changes. `lib/knowledge/retriever.ts` provides bounded lexical retrieval over these chunks: active chunks only, optional authority filters, at most 8 results and at most 12,000 returned characters. First-move drafting uses at most 3 product-context chunks and 3,600 characters. The artifacts are provenance metadata and bounded context, not a live CRM feed or a vector database.

Evaluate the labeled set with `npm run knowledge:evaluate`. Add `--live` to send the three synthetic first-move cases through the configured interpretation model; this does not persist or send anything. Complete the `humanJudgment` fields using `docs/evaluation/human-judgment-sheet.md`. Results and limitations are recorded in `docs/evaluation/knowledge-retrieval-and-first-move.md`.

The home screen's smoke-test control calls `POST /api/smoke`. It remains blocked until the AI Gateway credential and central model registry variables are configured. It is not a prospecting endpoint.

Act 1 mission preparation is available at `POST /api/missions`. It accepts a validated sales brief, returns a bounded target profile and search strategy, and stops at `READY_FOR_DISCOVERY`; it performs no live research.

The discovery graph is available through the `POST /api/missions/discover` Node.js route and the server-side `discoverSalesMission` function in `lib/graph/sales-mission-discovery.ts`. It defaults to `DuckDuckGoSearchProvider`, which uses DuckDuckGo's non-JavaScript HTML results surface and requires no Brave credential. It calls the provider within the mission search budget, invokes the SSRF-safe `safe_fetchTool` within the page budget, then runs bounded account extraction and buying-signal verification using the `EXTRACTION_MODEL` and `VERIFICATION_MODEL` registry roles. The MVP default target is up to five candidate accounts. A different provider or test extractor/verifier can be injected into the graph function.

Run it locally after starting Next.js:

```bash
curl --request POST http://localhost:3000/api/missions/discover \
  --header 'content-type: application/json' \
  --data '{"name":"DACH promoter hunt","geographies":["Germany"],"accountCategories":["TICKETED_EVENT_PROMOTER"],"buyerRoles":["Managing Director"]}'
```

The route starts a fresh bounded run, persists the prepared mission brief and search strategy, performs live DuckDuckGo and source fetch requests, filters known review sites, job boards, directories, ticket resellers and non-first-party paths before `safe_fetch`, extracts accounts from short source excerpts, verifies buying-signal candidates, persists scored entities and a `PENDING` review snapshot, then returns `201` with partial results/errors. The response includes source-linked `accounts[]`, `buyingSignals[]` and `review`; a signal with no supported excerpt or no verification remains explicitly unverified with `MISSING_INFORMATION` and/or `UNKNOWN` freshness. The graph is checkpointed after verification. HTTP 403 source failures remain visible as partial errors rather than being bypassed.

Mission Control exposes the full MVP brief before launch and shows the persisted brief above the account dossiers after launch. Geography, buyer roles, required/preferred signals and exclusions are entered as comma-separated values. Set `Contact requirement` to `Only publicly confirmed email` when every returned account must have an email; the same rule is also recognised from instructions such as `return only contacts with an email`.

Mission Control launches through `POST /api/missions/discover/stream`, so the page shows saved stage/query events while the graph runs. Every run ID is written to PostgreSQL. The `Executed runs` panel loads `GET /api/runs?limit=20`; opening a row calls `GET /api/runs/:missionRunId`. Use `Search deeper` on a completed dossier to call `POST /api/runs/:missionRunId/search-more`; it adds bounded budget, deduplicates previous URLs and attaches new query/search progress to the same run.

Use `GET /api/runs/:missionRunId` to load the dossier. Record a review with `POST /api/runs/:missionRunId/review` and `{ "action": "APPROVE", "reviewer": "Nick" }`; approval, rejection, duplicate and do-not-contact decisions resume the checkpointed thread, while `EDIT` leaves the run in `CHANGES_REQUESTED`. `POST /api/runs/:missionRunId/research-gap` records `{ "question": "...", "accountId": "..." }` as a structured gap and changes the review to `CHANGES_REQUESTED`. `POST /api/runs/:missionRunId/resume` is available for explicit operational recovery.

After approval, use `POST /api/prospects/:accountId/first-move` to generate one persisted `DRAFT` first-move brief. The route never sends it. Role-only contact routes are valid for normal missions when no public contact page is supported by evidence; email-only missions omit those accounts. Guessed email addresses are never created.

For the approved CSV dry-run, call:

```bash
curl --request POST http://localhost:3000/api/exports/leads \
  --header 'content-type: application/json' \
  --data '{"missionRunId":"...","mode":"DRY_RUN"}'
```

The response is the governed lead-sheet CSV and is available only for an `APPROVED` mission. It does not write to Monster CRM; unknown contact fields and `last_touch` remain blank.

In Mission Control, approve the dossier and click `Download approved CSV` in the dossier header. Each account's contact panel shows a verified public contact page when one is supported by evidence; otherwise it clearly labels the route as role-only. Names and direct email addresses stay blank unless publicly confirmed.

Validate approved records against a manually supplied CRM snapshot without writing to CRM. The request must include the configured bearer token and organisation header:

```bash
curl --request POST http://localhost:3000/api/crm/dry-run \
  --header 'content-type: application/json' \
  --header 'authorization: Bearer $CRM_DRY_RUN_SERVICE_TOKEN' \
  --header 'x-monster-organization-id: monster-scout' \
  --data '{"missionRunId":"...","idempotencyKey":"local-check","existingCompanyNames":[],"optedOutAccountIds":[]}'
```

The controlled DuckDuckGo smoke check is:

```bash
npx tsx -e 'import { duckDuckGoSearchProvider } from "./lib/discovery/duckduckgo-search-provider.ts"; (async () => { const results = await duckDuckGoSearchProvider.search({ query: "site:duckduckgo.com DuckDuckGo", countryOrLocale: "global", freshnessWindowDays: 365, resultLimit: 2, missionRunId: "live-ddg-smoke" }); console.log(JSON.stringify(results, null, 2)); })();'
```

It makes one bounded request to DuckDuckGo's HTML surface and should return at least one typed result. Do not use it as an automated high-volume crawler.

## Vercel and LangSmith

For a Vercel deployment, link the project with the Vercel CLI or dashboard and pull the environment configuration into the local shell as appropriate. Vercel deployments may provide `VERCEL_OIDC_TOKEN`; otherwise use `AI_GATEWAY_API_KEY`. Configure LangSmith tracing variables only in the environment where tracing is intended. Check `GET /api/health/observability` before a live model call; the route reports configuration without exposing keys.

## Known blocked steps

- `npm run prisma:migrate` is blocked until one of `DIRECT_URL`, `PRISMA_DATABASE_URL`, `POSTGRES_URL`, or `DATABASE_URL` points at a real PostgreSQL database.
- `GET /api/health/db` is blocked until one of those variables points at a reachable database.
- `POST /api/smoke` is blocked until a gateway credential and four approved model IDs are present.
- The CRM dry-run route uses a temporary bearer-token service boundary; SSO, token rotation, organisation-level RBAC and live insertion are still required before production CRM use. Live CRM insertion remains an explicitly deferred TODO.
