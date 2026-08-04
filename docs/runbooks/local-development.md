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

## Database setup status

Prisma is configured for PostgreSQL with a minimal `BootstrapHealthCheck` model. The runtime uses Prisma's PostgreSQL adapter, which supports Prisma Postgres, Neon and standard PostgreSQL URLs. The current local Prisma Postgres migration has been applied. For a fresh environment, run:

```bash
npm run prisma:generate
npm run prisma:migrate
```

The application health check is `GET /api/health/db`. It returns `503` with a typed configuration/blocker response until a database is configured and reachable.

## Local commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
DIRECT_URL="postgresql://bootstrap:bootstrap@localhost:5432/monster_scout" npm run build
npm run test:e2e
```

The home screen's smoke-test control calls `POST /api/smoke`. It remains blocked until the AI Gateway credential and central model registry variables are configured. It is not a prospecting endpoint.

## Vercel and LangSmith

For a Vercel deployment, link the project with the Vercel CLI or dashboard and pull the environment configuration into the local shell as appropriate. Vercel deployments may provide `VERCEL_OIDC_TOKEN`; otherwise use `AI_GATEWAY_API_KEY`. Configure LangSmith tracing variables only in the environment where tracing is intended. No Vercel project, OIDC token, LangSmith key or deployment was configured during bootstrap.

## Known blocked steps

- `npm run prisma:migrate` is blocked until one of `DIRECT_URL`, `PRISMA_DATABASE_URL`, `POSTGRES_URL`, or `DATABASE_URL` points at a real PostgreSQL database.
- `GET /api/health/db` is blocked until one of those variables points at a reachable database.
- `POST /api/smoke` is blocked until a gateway credential and four approved model IDs are present.
- The lead export contract cannot be finally verified until the supplied CSV source is restored.
