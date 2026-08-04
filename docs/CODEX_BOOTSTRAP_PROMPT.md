# Codex Bootstrap Prompt — Monster Scout Sales Hunter

You are bootstrapping a new, standalone repository for **MONSTER SCOUT — SALES HUNTER**.

This is a greenfield Next.js application. It is intentionally independent from Monster CRM during the bootstrap and MVP phases. Do not connect to Monster CRM, import its application architecture, or add direct CRM reads or writes. The only initial interchange format is the approved lead CSV contract.

## Mission

Create the smallest credible production foundation that proves the selected stack and prepares the repository for the first sales-hunt vertical slice.

The product must eventually answer:

1. Why this organisation?
2. Why now?
3. Who should Nick approach?
4. What should he say first?
5. What evidence supports those recommendations?

The primary domain object is a **Prospect Account**, not a venue.

## Mandatory first actions

Before changing code:

1. Read `AGENTS.md` completely.
2. Locate and read the authoritative product plan. Its canonical destination is:
   - `docs/product/monster-scout-sales-prospecting-authoritative-plan.md`
3. Read only the source documents needed for bootstrap:
   - `knowledge/authoritative/full-checklist.md`
   - `knowledge/positioning/product-decks-rag-addendum.md`
   - `docs/contracts/lead_sheet_schema.csv`
4. Read `docs/00-index.md` and `docs/STATUS.md` if they already exist.
5. Search the configured **Codex native memory MCP** for durable context about:
   - `monster-scout`
   - the current repository
   - prior architecture decisions
   - known blockers
6. Treat repository documents and accepted ADRs as authoritative. If memory conflicts with them, follow the repository and correct the stale memory later.
7. Inspect the repository without performing a broad, indiscriminate sweep. Read package metadata, configuration, the relevant app entry points, and the current Git status.
8. Produce a concise execution plan before implementation. Do not ask for confirmation unless a destructive or genuinely irreversible action is required.

## Source placement

If the supplied files are still at the repository root or have generated suffixes, move or copy them into these canonical paths without altering their content:

```text
docs/product/monster-scout-sales-prospecting-authoritative-plan.md
knowledge/authoritative/full-checklist.md
knowledge/positioning/product-decks-rag-addendum.md
docs/contracts/lead_sheet_schema.csv
```

Do not rewrite the authoritative business sources during bootstrap.

## Scope: Act 0 only

Complete the bootstrap foundation. Do **not** implement the real web-search prospecting mission yet.

### Required foundation

Create or verify:

```text
app/
components/
lib/
  ai/
  agents/
  graph/
  chains/
  tools/
  sales/
  monster/
  evidence/
  security/
  observability/
  db/
knowledge/
  authoritative/
  positioning/
  archive/
docs/
  00-index.md
  STATUS.md
  product/
  architecture/
  adr/
  contracts/
  runbooks/
  interview-proof/
tests/
  fixtures/
  unit/
  integration/
  e2e/
evals/
  datasets/
  evaluators/
  reports/
prisma/
```

Do not create empty decorative files throughout the tree. Add `.gitkeep` only where a directory is required now but legitimately has no content.

### Application stack

Use the current supported versions of:

- Next.js App Router;
- TypeScript with strict checking;
- React;
- Zod;
- Tailwind CSS;
- LangChain.js;
- LangGraph.js;
- `ChatOpenAI` through Vercel AI Gateway;
- Vercel AI SDK only for UI transport/streaming;
- Prisma;
- Postgres/Neon-compatible configuration;
- LangSmith tracing configuration;
- Vitest;
- Playwright only for application E2E tests.

Before installing or coding against fast-changing APIs, verify the current official documentation. Do not rely on remembered package names, model slugs, deprecated LangChain APIs, or copied snippets from old examples.

Use the package manager already selected by the repository. If the repository is genuinely empty, use `npm` and commit the lockfile.

### Architecture invariants

These are binding:

- Monster Scout is a standalone application during MVP.
- The primary object is `ProspectAccount`.
- LangGraph is the sole workflow orchestrator.
- Use one future tool-using production agent: `LeadHunterAgent`.
- LangChain owns model integration, typed tools, structured extraction, RAG, and bounded model chains.
- Deterministic TypeScript owns validation, duplicate detection, privacy rules, scoring, score caps, budgets, idempotency, exports, and future CRM eligibility.
- RAG must never override the current checklist.
- No automatic outreach.
- No direct Monster CRM integration.
- No guessed emails or private contact enrichment.
- No multi-agent swarm, Python duplicate service, Redis, queues, browser automation, or MCP product feature.
- Codex native memory MCP is for development continuity only. It is not part of the Monster Scout runtime architecture.

## Required bootstrap deliverables

### 1. Documentation router

Create `docs/00-index.md` as a compact router. It must link to:

- the authoritative product plan;
- `docs/STATUS.md`;
- architecture overview;
- ADR index or ADR directory;
- local-development runbook;
- lead export contract;
- authoritative knowledge sources.

Descriptions must be one line each. Do not duplicate the documents inside the index.

### 2. Status file

Create `docs/STATUS.md` containing only:

- current milestone;
- what works now;
- what is intentionally not implemented;
- active blockers;
- verification performed;
- next three concrete actions;
- last updated date and commit hash when available.

Keep it short enough to read at the start of every Codex session.

### 3. Architecture overview

Create `docs/architecture/system-overview.md` describing:

- standalone application boundary;
- planned UI boundary;
- LangChain versus LangGraph responsibilities;
- deterministic versus probabilistic responsibilities;
- Postgres business data versus LangGraph checkpoints;
- native memory MCP as development memory only;
- CSV as the first CRM boundary;
- explicit non-goals for bootstrap.

Use a Mermaid system diagram if the repository renderer supports Mermaid.

### 4. Initial ADRs

Create these ADRs using the repository ADR template:

```text
docs/adr/0001-langgraph-is-the-sole-workflow-orchestrator.md
docs/adr/0002-deterministic-governance-is-separated-from-rag.md
docs/adr/0003-public-contact-and-privacy-boundary.md
docs/adr/0004-standalone-first-crm-integration-later.md
docs/adr/0005-codex-native-memory-is-not-project-documentation.md
```

Each ADR must contain:

- title;
- status;
- date;
- context;
- decision;
- alternatives considered;
- consequences;
- affected paths.

Do not create ADRs for routine implementation details.

### 5. Lead export contract

Create `docs/contracts/lead-export.md` from `docs/contracts/lead_sheet_schema.csv`.

Document the exact columns and these rules:

- `company_name` is mandatory;
- unknown contact fields remain blank;
- email is populated only when publicly confirmed;
- `source_url` must support discovery or the buying signal;
- `last_touch` remains blank for new research;
- `opt_out=true` must never be reset;
- no plausible-looking filler values.

Do not change the CSV schema.

### 6. Local-development runbook

Create `docs/runbooks/local-development.md` covering:

- prerequisites;
- package installation;
- environment setup;
- database setup status;
- local run command;
- typecheck, lint, test, and build commands;
- how to refresh Vercel OIDC/local environment configuration where applicable;
- known blocked steps that require external credentials.

Do not include secrets or real credentials.

### 7. Environment contract

Create `.env.example` with documented placeholders for only the variables currently required or deliberately prepared during bootstrap.

Likely categories:

- database URL;
- Vercel AI Gateway/OIDC configuration supported by current official docs;
- centrally configured planning/extraction/verification model IDs;
- LangSmith tracing/project variables;
- initial access allowlist;
- application URL/environment.

Do not invent provider keys or duplicate model IDs across modules.

### 8. Central model registry

Create one model registry/configuration module under `lib/ai/`.

Requirements:

- all model identifiers come from environment-backed configuration;
- Zod validates configuration at startup or first use;
- no model slug is scattered through route handlers or components;
- expose explicit roles such as planning, extraction, interpretation, and verification;
- do not silently fall back to an unapproved model.

### 9. AI Gateway smoke path

Create the smallest safe path that proves a deployed or local `ChatOpenAI` call can travel through Vercel AI Gateway.

Requirements:

- use the current official LangChain/Vercel integration pattern;
- return a tiny structured result such as a generated mission title and status;
- use Zod validation;
- emit trace metadata suitable for LangSmith;
- handle missing configuration with a clear typed error;
- do not expose secrets;
- do not implement a general chat endpoint;
- do not implement prospect search.

### 10. Branded shell UI

Create a minimal but polished Monster Scout shell with:

- product name: `MONSTER SCOUT`;
- descriptor: `The AI hunting machine for the next Monster deal.`;
- an initial Sales Mission Control screen;
- visible standalone/MVP status;
- a smoke-test control or server-rendered result;
- placeholder stages:
  - Brief;
  - ICP;
  - Discovery;
  - Signals;
  - Contact Map;
  - Sales Angle;
  - Review.

The screen must not pretend that live research is already implemented.

Use accessible HTML and responsive layout. Do not spend the bootstrap on elaborate animation or pixel-perfect branding.

### 11. Database foundation

Configure Prisma and a Neon-compatible Postgres connection without prematurely implementing the full Act 1–4 schema.

Create only the minimum needed to prove connectivity and establish migration conventions. If credentials are unavailable:

- prepare the schema/configuration;
- document the blocked command precisely;
- do not fake a successful connection or migration.

Do not add CRM foreign keys or CRM identifiers.

### 12. Tests and scripts

Provide scripts for:

- development;
- build;
- lint;
- typecheck;
- unit tests;
- E2E tests.

Add focused tests for:

- environment/model-registry validation;
- smoke-result schema;
- missing-configuration error behaviour.

Do not create dozens of placeholder tests.

## Native memory MCP protocol

Use the configured Codex native memory MCP deliberately.

### At the beginning

Search memory for:

- project identity;
- accepted architecture decisions;
- current milestone;
- blockers;
- previous verification results.

### During work

Write memory only when a durable fact is established, for example:

- a significant architecture decision was accepted;
- a canonical path changed;
- an external integration was configured;
- a persistent blocker was identified;
- a milestone exit gate passed.

### At the end

Store one compact bootstrap record containing:

- project: Monster Scout Sales Hunter;
- repository path/name;
- current milestone and status;
- canonical plan path;
- ADRs created;
- stack actually installed;
- verification commands and results;
- unresolved blockers;
- exact next action;
- commit hash if one exists.

### Memory prohibitions

Do not store:

- secrets;
- credentials;
- personal contact data;
- raw tool output;
- full source documents;
- entire ADR bodies;
- speculative ideas presented as decisions;
- hidden reasoning or chain-of-thought;
- copied code that already exists in the repository.

Memory is a compact navigation and continuity layer. Repository docs, ADRs, tests, and code remain authoritative.

## Validation requirements

Run the strongest applicable checks available after implementation:

```text
lint
typecheck
unit tests
production build
```

Run the smoke route locally when configuration permits.

Do not claim a command passed if it did not run. Separate:

- passed;
- failed;
- blocked by missing external configuration;
- intentionally not attempted.

## Git safety

- Inspect `git status` before editing.
- Preserve user changes.
- Do not delete or overwrite unrelated work.
- Do not commit, push, create a pull request, or deploy unless explicitly requested.
- Do not rewrite Git history.

## Stop condition

Stop when the Act 0 foundation is complete and verified.

Do **not** proceed into live search, buying-signal detection, contact discovery, lead scoring, LangGraph human interrupts, pgvector ingestion, or CRM integration.

## Final response format

Return a concise report containing:

1. **Result** — what is now working.
2. **Files created or changed** — grouped by code, configuration, tests, and docs.
3. **Architecture decisions** — ADR titles only with one-line consequences.
4. **Validation** — exact commands and outcomes.
5. **External blockers** — credentials, Vercel linking, Neon connection, or deployment steps not completed.
6. **Memory update** — what durable record was written to native memory.
7. **Next action** — exactly one recommended next implementation task from Act 1.

Do not provide a vague future roadmap. The authoritative plan already contains it.
