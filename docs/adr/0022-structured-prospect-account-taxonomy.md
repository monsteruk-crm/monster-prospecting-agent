# ADR 0022: Structured prospect-account taxonomy and grouped mission targets

Status: accepted
Date: 2026-08-06

## Context

Monster Scout previously exposed a single buyer-type field in the mission forms and stored discovered account categories as a flat array. That was too narrow for the commercial scope of the product, and it made the UI, graph, scoring, export and dossier surfaces depend on duplicated category constants.

The product now needs a canonical account taxonomy that supports grouped multi-select mission targeting, a controlled buyer model, and structured account classification without inventing a free-text taxonomy.

## Decision

- Introduce one canonical taxonomy registry in `lib/sales/prospect-taxonomy.ts` for prospect account categories, buyer models, category groups, featured categories, labels, descriptions, search hints and structured classification helpers.
- Keep `SalesMissionBrief.accountCategories` as the bounded multi-select mission target list, with a 1-6 selection limit.
- Store discovered accounts as a structured `ProspectAccountClassification` object with exactly one primary category, zero or more secondary categories, a controlled buyer model, and a normalized `subtypes` array (empty when unsupported). Keeping every classification property required in the generated strict JSON schema is necessary for OpenAI-compatible extraction providers.
- Persist the structured classification in the existing Prisma JSON `categories` column for now, while normalising legacy array rows on read so older runs remain usable without a forced database reset.
- Use the canonical registry in the mission form, preparation graph, extraction prompt, scoring, export mapper and persisted dossier rendering so the product shows the same taxonomy everywhere.

## Alternatives considered

- Keeping the old single buyer-type dropdown was rejected because it could not express the target organisation mix needed by the MVP.
- Free-text categories were rejected because they would make search and scoring inconsistent.
- Adding a second taxonomy for UI only was rejected because it would drift from the graph and export layers.
- Renaming the Prisma column immediately was deferred because the structured JSON payload is sufficient for the MVP and avoids a migration just to rename storage.

## Consequences

The mission builder and run dossier now show grouped, searchable account categories and structured account classification. Search strategy generation can use labels and hints instead of raw enum slugs. Legacy persisted rows remain readable through normalisation, but the storage column name remains historical until a future migration. Video hosts and general reference/download pages are also filtered before official-source fetching so they do not consume the bounded source budget.

## Affected paths

`lib/sales/prospect-taxonomy.ts`, `lib/sales/mission-schema.ts`, `lib/settings/scout-settings.ts`, `lib/graph/sales-mission-preparation.ts`, `lib/chains/account-extraction.ts`, `lib/graph/sales-mission-discovery.ts`, `lib/graph/discovery-continuation.ts`, `lib/graph/contact-continuation.ts`, `lib/persistence/mission-persistence.ts`, `lib/persistence/review-persistence.ts`, `lib/sales/score-engine.ts`, `lib/export/lead-export.ts`, `components/mission-builder.tsx`, `components/mission-control.tsx`, `docs/contracts/mission-discovery.md`
