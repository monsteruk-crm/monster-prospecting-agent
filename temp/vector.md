# Task: Record the Lexical Retriever as an Interim Implementation and Add the Governed Semantic Retrieval Upgrade to the TODOs

## Objective

The current Monster knowledge retriever is a deliberately lightweight, local lexical implementation.

That is acceptable for the current development stage because the active knowledge set is small, structured and authority-controlled. However, it must not be treated as the completed implementation of the governed RAG architecture described in the authoritative Monster Scout plan.

Update the project documentation and TODOs so the distinction is explicit:

1. the existing lexical retriever is the current MVP retrieval adapter;
2. it is already useful and should remain operational;
3. it is not the final governed semantic retrieval layer;
4. the future retrieval implementation must support embeddings, pgvector and semantic retrieval;
5. the upgrade must preserve authority rules, deprecation handling, bounded context and deterministic governance;
6. first-move drafting and other consumers must depend on a stable retrieval abstraction rather than directly depending on the lexical implementation.

Do not replace the current retriever as part of this task.

Do not add embeddings, pgvector infrastructure or new network dependencies as part of this task.

This task is documentation, architectural clarification and future-work preparation.

---

# 1. Inspect Before Editing

Before making changes, inspect:

* `docs/00-index.md`
* `docs/STATUS.md`
* the authoritative Monster Scout sales prospecting plan
* the relevant ADRs under `docs/adr`
* the current retriever implementation
* the first-move drafting implementation
* any knowledge ingestion or knowledge-source modules
* any TODO, roadmap, status or milestone files
* tests covering retrieval, authority filtering, deprecated content or first-move drafting

Confirm:

* where the lexical retriever is defined;
* whether it is behind an interface or abstraction;
* whether first-move drafting imports a concrete lexical implementation directly;
* which metadata fields currently exist;
* how deprecated material is excluded;
* how authority filters are applied;
* how result count and character limits are enforced;
* whether retrieval results include source identifiers or provenance;
* whether the repository currently describes this retriever as final or complete.

Do not infer architecture from filenames alone. Read the implementation and relevant ADRs.

---

# 2. Required Documentation Correction

Wherever the repository currently says or implies:

> The retriever is implemented.

replace or qualify the wording so it communicates the real status.

Use wording equivalent to:

> An initial local lexical Monster knowledge retriever is implemented and wired into first-move drafting. It provides bounded, authority-aware retrieval without embeddings, a vector store, network calls or additional infrastructure. This is the current MVP retrieval adapter, not the final governed semantic retrieval layer. The planned Monster Sales Brain phase will add semantic retrieval using embeddings and pgvector while preserving the existing authority, deprecation, provenance and context-budget rules.

Do not describe the current lexical implementation as a temporary hack.

It is a legitimate MVP implementation.

Do not describe the governed semantic retriever as already implemented.

---

# 3. Add a Dedicated TODO Section

Add a clearly named TODO or roadmap item.

Recommended title:

## Governed Semantic and Hybrid Monster Knowledge Retrieval

The TODO must explain the problem, the intended architecture, the acceptance criteria and the explicit non-goals.

Use the following requirements.

---

## 3.1 Current State

Document that the current retriever:

* runs locally;
* performs lexical or keyword-based ranking;
* makes no embedding calls;
* uses no vector database;
* makes no retrieval-time network calls;
* excludes deprecated material;
* supports authority filtering;
* applies result-count limits;
* applies total-character or context-size limits;
* is currently wired into first-move drafting;
* is appropriate for the current small and structured knowledge corpus.

State that this implementation should remain available as:

* the MVP retrieval adapter;
* a deterministic fallback;
* a test baseline;
* a possible component of future hybrid retrieval.

---

## 3.2 Limitation

Document the main limitation accurately:

Lexical retrieval depends on overlapping words between the query and source material. It may miss relevant passages when the prospect context and Monster knowledge express the same idea using different vocabulary.

Examples of semantic equivalence that lexical retrieval may miss:

* “large paid visitor experiences” versus “ticketed attractions”;
* “operates across multiple locations” versus “multi-city touring operator”;
* “family leisure programming” versus “family attraction format”;
* “commercial event producer” versus “ticketed-event promoter”;
* “headline experiential installation” versus “destination attraction”.

Do not claim the current retriever is failing these cases unless tests prove it.

Describe them as known retrieval risks.

---

## 3.3 Future Architecture

The future implementation must preserve a stable consumer-facing abstraction.

The expected shape should be conceptually similar to:

```ts
interface MonsterKnowledgeRetriever {
  retrieve(
    request: MonsterKnowledgeRetrievalRequest,
  ): Promise<MonsterKnowledgeRetrievalResult>;
}
```

The exact names should follow the existing repository conventions.

Consumers such as first-move drafting must depend on the abstraction, not directly on:

* filesystem scanning;
* a lexical scorer;
* pgvector;
* an embedding provider;
* a concrete vector-store implementation.

Expected implementations may include:

```text
LocalLexicalMonsterKnowledgeRetriever
PgVectorMonsterKnowledgeRetriever
HybridMonsterKnowledgeRetriever
```

Do not create empty implementations merely to satisfy these names.

Only create or strengthen the interface now if the existing code is improperly coupled and the change is small, safe and covered by tests.

If introducing the abstraction requires a wider refactor, record it as a TODO instead of expanding this task.

---

## 3.4 Knowledge Metadata Contract

The future semantic implementation must preserve or introduce an explicit metadata contract.

At minimum, retrieval chunks should support the equivalent of:

```ts
type MonsterKnowledgeChunkMetadata = {
  sourceType: string;
  authorityLevel: number | string;
  product?: string;
  topic?: string;
  effectiveDate?: string;
  deprecated: boolean;
  sectionId: string;
  contentHash: string;
};
```

Use existing project enums and naming conventions where available.

Do not invent conflicting parallel metadata types.

The TODO must state:

* deprecated content is excluded by default;
* authoritative operational material outranks positioning material;
* current checklist content must not be overridden by older deck material;
* metadata filtering happens before or during retrieval, not only after generation;
* each returned passage must retain source identity and provenance;
* future vector records must be reproducible from source content and metadata;
* content hashes should support change detection and re-ingestion.

---

## 3.5 Authority Rules

The retrieval roadmap must preserve the documented authority order:

1. current operational and commercial checklist;
2. deterministic Sales and Monster Rule Registries;
3. current product positioning addendum;
4. approved case studies and proof material;
5. archived or deprecated knowledge only when explicitly enabled and corroborated.

Clarify that deterministic rule registries are not replaced by semantic retrieval.

The retriever supplies explanatory and positioning context.

It must not determine or override:

* pricing;
* discounts;
* exclusivity;
* deposits;
* final venue feasibility;
* safety requirements;
* legal or contractual commitments;
* do-not-contact rules;
* approval decisions;
* CRM eligibility.

---

## 3.6 Proposed Retrieval Pipeline

Record the preferred future direction as hybrid retrieval unless evaluation proves semantic-only retrieval is superior.

Conceptual pipeline:

```text
Retrieval request
  -> authority and deprecation filters
  -> lexical candidate retrieval
  -> semantic vector retrieval
  -> merge and deduplicate
  -> optional deterministic or model-assisted reranking
  -> provenance validation
  -> count limit
  -> character/token budget
  -> retrieval result
```

The lexical retriever should not automatically be deleted when pgvector is introduced.

Its possible future uses include:

* exact terminology matching;
* source-section matching;
* deterministic fallback;
* comparison baseline;
* hybrid candidate generation;
* operation when embeddings are unavailable;
* tests that do not require external services.

Do not commit to model-assisted reranking unless evaluation demonstrates a benefit worth the cost and complexity.

---

# 4. Add Explicit Delivery Stages

The TODO should be broken into small delivery stages.

## Stage A — Preserve the Abstraction

* confirm or introduce a stable retriever interface;
* ensure consumers do not depend on lexical implementation details;
* preserve current behaviour;
* preserve existing tests;
* document the lexical implementation as the current default.

Exit gate:

* first-move drafting can use the retriever through a stable contract;
* no retrieval behaviour regression;
* no embeddings or database dependency introduced.

## Stage B — Evaluation Dataset

Create a retrieval evaluation dataset before adding pgvector.

Include query cases covering:

* exact keyword matches;
* paraphrased business concepts;
* product comparison;
* operational authority conflicts;
* deprecated source exclusion;
* irrelevant but keyword-heavy chunks;
* queries where no suitable context exists;
* Monster versus Mega Bounce House positioning;
* promoter responsibilities;
* international proof points;
* first-move sales-angle support.

Each case should identify:

* expected relevant section or sections;
* forbidden deprecated or lower-authority section where applicable;
* whether returning no result is acceptable;
* maximum useful context size.

Exit gate:

* lexical baseline metrics are recorded;
* known strengths and weaknesses are visible;
* no semantic implementation is promoted without comparison against this baseline.

## Stage C — Ingestion and Embeddings

* define deterministic chunking rules;
* preserve source section IDs;
* preserve content hashes;
* preserve authority metadata;
* generate embeddings through the centrally configured model or embedding registry;
* store vectors in Postgres with pgvector;
* support safe re-ingestion;
* avoid duplicate vectors for unchanged chunks;
* remove or archive vectors when source content is deprecated or deleted.

Exit gate:

* ingestion is repeatable;
* unchanged content is not duplicated;
* metadata filters work;
* the current checklist can be retrieved independently of positioning content.

## Stage D — Semantic Retriever

* implement semantic similarity search behind the retriever abstraction;
* apply authority and deprecation filters;
* cap result count;
* cap total characters or tokens;
* return source metadata and section identifiers;
* preserve deterministic error behaviour;
* define fallback behaviour when vector retrieval is unavailable.

Exit gate:

* semantic retrieval improves paraphrase recall over the lexical baseline;
* deprecated content is never returned under default settings;
* source provenance is retained;
* failure does not silently produce ungrounded drafting context.

## Stage E — Hybrid Retrieval

* run lexical and semantic candidate retrieval;
* merge by stable chunk identity;
* deduplicate results;
* define deterministic scoring or ranking rules;
* evaluate whether reranking is necessary;
* preserve strict context budgets;
* compare hybrid performance with lexical-only and semantic-only retrieval.

Exit gate:

* hybrid retrieval matches or improves relevance metrics;
* operational authority remains correct;
* latency and cost remain inside the agreed budget;
* no increase in unsupported first-move claims.

## Stage F — First-Move Integration Validation

* run first-move drafting tests using retrieved knowledge;
* verify every Monster-derived material statement maps to retrieved context;
* verify missing knowledge remains missing;
* verify low-authority passages cannot override the checklist;
* verify retrieval failures do not cause invented product claims;
* record model, prompt and retriever versions in traces where supported.

Exit gate:

* first-move drafting remains grounded;
* retrieval provenance is inspectable;
* semantic retrieval does not increase confident unsupported claims;
* lexical fallback behaviour is tested.

---

# 5. Add Acceptance Criteria

The final governed retrieval implementation is complete only when all of the following are true:

* [ ] Consumers use a stable retriever abstraction.
* [ ] The lexical retriever remains available as a fallback or evaluation baseline.
* [ ] Knowledge chunks carry authority and provenance metadata.
* [ ] Deprecated chunks are filtered out by default.
* [ ] Checklist material outranks positioning and archived material.
* [ ] Embeddings and vectors are generated reproducibly.
* [ ] Unchanged chunks are not duplicated during ingestion.
* [ ] Semantic retrieval is evaluated against the lexical baseline.
* [ ] Hybrid retrieval is evaluated before choosing a final default.
* [ ] Retrieval count is bounded.
* [ ] Retrieval character or token size is bounded.
* [ ] Every result retains section and source identity.
* [ ] Retrieval failure is explicit and does not silently produce invented context.
* [ ] First-move drafting remains human-reviewed.
* [ ] Deterministic Sales and Monster Rule Registries remain authoritative.
* [ ] Tests prove old deck material cannot override the current checklist.
* [ ] Tests cover paraphrased retrieval cases.
* [ ] Tests cover no-result cases.
* [ ] Tests cover deprecated-content exclusion.
* [ ] Tests cover context-budget enforcement.
* [ ] Latency and cost are measured before semantic retrieval becomes the default.

---

# 6. Add Explicit Non-Goals

The TODO must state that this work does not require:

* replacing deterministic business rules with RAG;
* adding a second workflow orchestrator;
* introducing multiple vector databases;
* adding Redis;
* adding a knowledge graph;
* fine-tuning a model;
* sending outreach automatically;
* enabling autonomous CRM writes;
* embedding raw web-research pages into the Monster product knowledge store;
* returning unlimited context;
* enabling archived knowledge by default;
* reranking with an LLM before evaluation proves it useful;
* removing the lexical retriever merely because embeddings exist.

---

# 7. Tests Required for Any Small Refactor in This Task

If this task introduces or strengthens a retriever interface, add focused tests proving:

* the current lexical retrieval output remains unchanged for existing fixtures;
* deprecated chunks remain excluded;
* authority filtering still works;
* count limits still work;
* character limits still work;
* first-move drafting receives the same bounded retrieval shape;
* the concrete implementation can be injected or replaced in tests;
* no network call is introduced by the current default retriever.

Do not add broad end-to-end tests unrelated to this change.

Do not implement pgvector tests yet unless pgvector already exists in the repository.

---

# 8. Status and Roadmap Updates

Update `docs/STATUS.md` or the equivalent current-status file.

The current implementation should be described as:

* implemented: bounded local lexical knowledge retrieval;
* implemented: authority and deprecation filtering;
* implemented: first-move drafting integration;
* planned: governed embedding ingestion;
* planned: pgvector semantic retrieval;
* planned: lexical versus semantic evaluation;
* planned: hybrid retrieval;
* planned: production retrieval metrics and fallback behaviour.

Do not mark governed RAG, semantic retrieval or pgvector ingestion as complete.

If the current milestone terminology places this work in the Monster Sales Brain act, record it under that future act.

---

# 9. ADR Requirement

Determine whether an ADR already defines the retrieval strategy.

If no ADR clearly records the decision, add a proposed ADR or TODO for an ADR with a title similar to:

> Lexical Retrieval as MVP Adapter, Governed Hybrid Retrieval as Target Architecture

The ADR should record:

## Context

* small initial knowledge corpus;
* need for immediate, testable retrieval;
* desire to avoid premature infrastructure;
* long-term requirement for semantic recall;
* need to preserve authority and deterministic governance.

## Decision

* keep local lexical retrieval as the current implementation;
* place retrieval behind a stable abstraction;
* add pgvector semantic retrieval only after baseline evaluation;
* evaluate hybrid retrieval as the expected target;
* retain lexical retrieval as fallback and baseline;
* never allow RAG to override deterministic rule registries.

## Consequences

Positive:

* faster MVP;
* deterministic tests;
* low cost;
* no premature infrastructure;
* easy fallback;
* measurable semantic upgrade later.

Negative:

* weaker paraphrase recall initially;
* later ingestion and vector infrastructure work;
* need to maintain metadata compatibility;
* need for retrieval evaluation before migration.

Do not mark the ADR accepted without following the repository’s normal ADR process.

---

# 10. Completion Report

At the end, report:

1. files inspected;
2. files changed;
3. exact wording added to the status documentation;
4. where the TODO was added;
5. whether a retriever abstraction already existed;
6. whether first-move drafting was coupled to the concrete lexical retriever;
7. whether any code refactor was made;
8. tests run;
9. confirmation that no embeddings, vector store or new infrastructure were introduced;
10. remaining future stages.

The completion report must explicitly state:

> The current lexical retriever remains the active MVP implementation. Governed semantic and hybrid retrieval are documented future work and have not been falsely marked complete.

---

# Final Constraint

Do not turn this documentation task into the pgvector implementation.

The purpose of this task is to preserve the current working MVP, prevent architectural drift and create an explicit, testable path toward governed semantic or hybrid retrieval.
