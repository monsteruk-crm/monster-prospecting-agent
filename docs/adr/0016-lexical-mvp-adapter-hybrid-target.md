# ADR 0016: Lexical MVP adapter, governed hybrid retrieval target

Status: proposed
Date: 2026-08-05

## Context

Monster Scout has a small, structured, authority-controlled knowledge corpus and needs immediate deterministic retrieval. The long-term product plan also requires semantic recall for paraphrased sales language. Premature embeddings or vector infrastructure would make the MVP harder to inspect without an evaluation baseline.

## Decision

- Keep local lexical retrieval as the current MVP implementation and deterministic fallback.
- Require consumers such as first-move drafting to use the `MonsterKnowledgeRetriever` abstraction.
- Evaluate semantic retrieval against the lexical baseline before adding pgvector or embeddings.
- Treat governed hybrid retrieval as the target direction unless evaluation proves semantic-only retrieval superior.
- Preserve authority order, deprecation filtering, provenance, content hashes, context budgets and deterministic business-rule governance.
- Never allow retrieval context to override deterministic rule registries or approval and CRM eligibility rules.

## Alternatives considered

- Add pgvector immediately: rejected until labeled evaluation demonstrates a retrieval need and acceptable cost/latency.
- Make first-move drafting depend on the concrete lexical module: rejected because it would make the semantic upgrade a consumer refactor.
- Use model-assisted reranking now: rejected until measured benefit justifies cost and complexity.

## Consequences

The MVP remains fast, low-cost, deterministic and testable, with an explicit fallback and comparison baseline. The tradeoff is weaker paraphrase recall and future embedding/pgvector migration work. Metadata compatibility and evaluation must be maintained during that migration.

## Affected paths

`lib/knowledge/retriever.ts`, `lib/chains/first-move.ts`, `docs/roadmap/governed-semantic-retrieval.md`, `tests/fixtures/knowledge-evaluation.json`

## Supersedes / Superseded by

None. This proposed ADR requires normal review before acceptance.
