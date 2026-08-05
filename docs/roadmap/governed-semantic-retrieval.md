# TODO: Governed Semantic and Hybrid Monster Knowledge Retrieval

Status: planned. The current lexical adapter remains the active MVP implementation.

## Current state

`LocalLexicalMonsterKnowledgeRetriever` is a local keyword-ranked adapter over the checked-in ingestion artifacts. It makes no embedding calls, uses no vector database, makes no retrieval-time network calls, excludes deprecated chunks by default, supports authority filters, preserves source and content-hash provenance, and enforces result and character limits. First-move drafting consumes it through the `MonsterKnowledgeRetriever` contract.

This is a legitimate MVP implementation: it is useful for the current small, structured corpus and must remain available as the deterministic fallback, test baseline, comparison baseline and possible hybrid candidate retriever. It is not the final governed semantic retrieval layer.

Known risk: lexical retrieval depends on overlapping words. It may miss semantically equivalent language such as “large paid visitor experiences” versus “ticketed attractions”, “multi-city touring operator” versus “operates across multiple locations”, “family leisure programming” versus “family attraction format”, “commercial event producer” versus “ticketed-event promoter”, and “headline experiential installation” versus “destination attraction”. These are evaluation risks, not claims that the current adapter fails every example.

## Target contract and architecture

Consumers depend on a stable contract equivalent to:

```ts
interface MonsterKnowledgeRetriever {
  retrieve(request: MonsterKnowledgeRetrievalRequest): Promise<MonsterKnowledgeRetrievalResult[]>;
}
```

Expected future implementations are `LocalLexicalMonsterKnowledgeRetriever`, `PgVectorMonsterKnowledgeRetriever`, and `HybridMonsterKnowledgeRetriever`. Only the local implementation exists today. Consumers must not depend directly on filesystem scanning, lexical scoring, pgvector or an embedding provider.

Future chunks must preserve the existing metadata contract: source path/type, authority, product/topic where available, effective date, deprecation state, section ID, source hash and content hash. Deprecated content is excluded by default; operational checklist material outranks positioning material; current checklist content cannot be overridden by older deck material; filters apply before or during retrieval; returned passages retain provenance; and hashes support reproducible re-ingestion and change detection.

The authority order remains:

1. current operational and commercial checklist;
2. deterministic Sales and Monster Rule Registries;
3. current product positioning addendum;
4. approved case studies and proof material;
5. archived or deprecated knowledge only when explicitly enabled and corroborated.

Retrieval supplies explanatory and positioning context. It does not determine pricing, discounts, exclusivity, deposits, venue feasibility, safety, legal or contractual commitments, do-not-contact rules, approval decisions or CRM eligibility. Deterministic registries remain authoritative.

## Delivery stages and exit gates

### A — Preserve the abstraction

- Keep the current lexical implementation behind `MonsterKnowledgeRetriever`.
- Preserve behavior, bounded context, authority filtering, deprecation filtering and no-network operation.
- Exit when first-move drafting can replace the implementation through the contract without regression.

### B — Expand evaluation before infrastructure

- Cover exact matches, paraphrases, product comparison, authority conflicts, deprecated exclusion, keyword-heavy irrelevant chunks, no-result cases, Monster versus Mega Bounce House, promoter responsibilities, international proof and first-move sales angles.
- Record expected sections, forbidden results, whether no result is acceptable, maximum context size and human usefulness/grounding judgments.
- Exit when lexical baseline metrics and known weaknesses are visible.

### C — Governed embedding ingestion

- Define reproducible embedding generation, safe re-ingestion, unchanged-content deduplication, deprecation/deletion handling and Postgres/pgvector storage.
- Exit when metadata filters work and checklist material can be retrieved independently of positioning context.

### D — Semantic retrieval

- Implement semantic similarity behind the contract with authority/deprecation filters, count and context budgets, provenance, explicit errors and lexical fallback.
- Exit only if paraphrase recall improves over the lexical baseline without increasing unsupported first-move claims.

### E — Hybrid retrieval

```text
request -> authority/deprecation filters -> lexical candidates + semantic candidates
        -> merge/deduplicate -> deterministic ranking -> provenance validation
        -> count/context budget -> result
```

Compare lexical-only, semantic-only and hybrid retrieval for relevance, authority correctness, latency, cost and first-move grounding before choosing a default. Do not add model-assisted reranking unless evaluation proves its value.

### F — First-move validation

Verify that Monster-derived material maps to retrieved context, missing knowledge remains missing, lower-authority passages cannot override checklist rules, retrieval failures do not produce invented claims, and model/prompt/retriever versions are traceable.

## Acceptance criteria

- [ ] Stable retriever contract used by consumers.
- [ ] Lexical fallback and baseline retained.
- [ ] Authority, deprecation, provenance, count and context-budget rules retained.
- [ ] Reproducible embeddings and non-duplicating re-ingestion.
- [ ] Semantic retrieval improves paraphrase recall over lexical baseline.
- [ ] Hybrid retrieval is compared before becoming default.
- [ ] Retrieval failures are explicit and cannot silently create context.
- [ ] First-move remains human-reviewed and grounded.
- [ ] Tests cover authority conflicts, paraphrases, no-result, deprecated exclusion and context budgets.
- [ ] Latency and cost are measured before semantic retrieval becomes default.

## Explicit non-goals

This TODO does not replace deterministic rules with RAG, add another workflow orchestrator, introduce multiple vector databases, Redis, a knowledge graph, fine-tuning, automatic outreach or autonomous CRM writes. It does not embed raw web-research pages, return unlimited context, enable archived knowledge by default, add LLM reranking before evaluation, or remove the lexical adapter when embeddings exist.
