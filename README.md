# MONSTER SCOUT — SALES HUNTER

The AI hunting machine for the next Monster deal.

Monster Scout is a standalone, human-reviewed sales-prospecting MVP. It performs bounded public-web research, creates evidence-backed prospect dossiers, persists LangGraph checkpoints and review state, drafts but does not send a first move, and exports approved records without writing to the live Monster CRM.

## Start here

- [Using Monster Scout — MVP Guide](docs/guides/using-monster-scout-mvp.md)
- [How Monster Scout Works](docs/guides/how-monster-scout-works.md)
- [Documentation router](docs/00-index.md)
- [Current status](docs/STATUS.md)

## Getting started

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use Sales Mission Control.

See the [local-development runbook](docs/runbooks/local-development.md) for database, AI Gateway, LangSmith, knowledge ingestion, verification and CRM dry-run configuration.

## MVP boundaries

- Discovery currently runs synchronously; UI progress labels are not streamed graph events.
- Research-gap capture records a change request but does not automatically re-run research.
- HTTP 403 source failures remain visible and are not bypassed.
- First-move output is a human-reviewed draft and is never sent automatically.
- CSV export and CRM dry-run validation do not write to Monster CRM.
- The active Monster knowledge retriever is local and lexical; semantic and hybrid retrieval remain roadmap work.
- General production authentication, organisation-level RBAC and live CRM insertion are not implemented.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run knowledge:ingest
npm run knowledge:evaluate
```
