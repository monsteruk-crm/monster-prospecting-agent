---
title: "MONSTER SCOUT — SALES HUNTER"
subtitle: "Authoritative Bootstrap and Delivery Plan for the Monster Prospecting Agent"
author: "The Monster Global Project"
date: "4 August 2026"
status: "Authoritative replacement plan"
supersedes:
  - "monster pronspecting langchain vercel.md"
  - "monster-scout-authoritative-bootstrap-plan.md"
production_language: "TypeScript"
application_platform: "Vercel"
agent_framework: "LangChain.js"
workflow_orchestration: "LangGraph.js"
primary_product_outcome: "Evidence-backed sales prospects and first-move briefs for The Monster"
primary_career_outcome: "Real production experience with LangChain, LangGraph, RAG, tools, structured output, human-in-the-loop, evaluation and Vercel"
---

# MONSTER SCOUT — SALES HUNTER

## The AI hunting machine for the next Monster deal

# 0. Status and authority

This document is the single authoritative build plan for the Monster Prospecting Agent.

It replaces the venue-first version of Monster Scout.

The venue-first concept remains useful as a later specialist mission, but it is not the product we build first. A system that finds technically suitable buildings may be interesting; a system that finds organisations with the ability, incentive and current reason to buy, promote, license or host The Monster is commercially useful.

The first product must therefore optimise for selling.

This plan has two equally binding outcomes:

1. **Nick outcome:** Nick receives a small number of credible, evidence-backed prospects he can act on, with a clear reason to contact each one now.
2. **Alfonso outcome:** the production implementation creates honest, demonstrable experience with LangChain.js, LangGraph.js, typed tools, structured output, durable state, human interrupts, governed RAG, evaluation, observability and Vercel deployment.

Neither outcome is permitted to become decorative.

---

# 1. The correction

The wrong opening question was:

> Where could The Monster physically fit?

The correct opening question is:

> Who is commercially capable of buying, licensing, promoting or hosting The Monster — and what public evidence gives Nick a reason to contact them now?

Venue suitability is a downstream deal-qualification question.

Prospecting begins earlier. It finds:

- companies;
- promoters;
- event producers;
- attraction operators;
- festival organisations;
- commercial partners;
- destination and leisure operators;
- programming teams;
- public professional decision-makers;
- timely buying signals;
- credible routes into a conversation.

The primary object is therefore a **Prospect Account**.

A venue may be evidence associated with that account. It is not the centre of the system.

---

# 2. Product identity

The product keeps the name:

> **MONSTER SCOUT**

The working product descriptor becomes:

> **The AI hunting machine for the next Monster deal.**

Nick begins with a **Sales Mission**, not a database filter.

Example mission:

> Find experienced ticketed-event promoters and family-attraction operators in Germany, the Netherlands and Belgium that have announced new programmes, expansion, winter events or venue partnerships during the last twelve months. Prioritise organisations with evidence of large audiences, touring attractions or multi-city operations. Find the best public commercial contact or decision-maker route. Do not invent contact data.

The system then visibly performs a bounded sales hunt:

```text
SALES BRIEF
  -> MARKET MAP
  -> ACCOUNT HUNT
  -> BUYING SIGNALS
  -> DECISION-MAKER MAP
  -> MONSTER ANGLE
  -> HUMAN REVIEW
  -> NICK'S NEXT FIVE
```

The product never claims to have found a lead merely because it found a website.

A review-ready prospect must answer:

1. **Why this organisation?**
2. **Why now?**
3. **Who should Nick approach?**
4. **What should Nick say first?**
5. **What evidence supports those recommendations?**

---

# 3. Commercial objective

The MVP exists to create conversations that could become Monster business.

It does not exist to produce a giant list.

A successful mission produces a small set of prospects where Nick can quickly see:

- what the organisation does;
- why it resembles a plausible Monster buyer or partner;
- what recent activity makes the timing relevant;
- whether it operates at an appropriate commercial scale;
- which product or proposition may be relevant;
- who the likely buyer role is;
- whether a named public professional is available;
- the safest public contact route;
- the opening sales angle;
- what remains unknown;
- the next action.

The primary unit of value is:

> **one review-ready prospect with a credible first move**

Not:

> one scraped company row

---

# 4. What counts as a prospect

## 4.1 Priority account types

The initial system may target:

- ticketed event promoters;
- family entertainment and attraction operators;
- festival producers;
- touring event operators;
- experiential event agencies with commercial delivery capability;
- venue or arena programming companies;
- exhibition and convention operators that commission public experiences;
- leisure and destination groups;
- holiday resorts and visitor attractions;
- shopping-centre and mixed-use destination operators;
- large city-event contractors;
- sports and entertainment operators with non-sport programming;
- local licensees or regional operating partners;
- companies already operating comparable paid attractions.

A mission must select a focused subset. The agent must not search every possible category at once.

## 4.2 Buying-signal examples

A prospect becomes more valuable when supported by a recent commercial signal such as:

- announcing a new event programme;
- expanding into a new territory;
- opening or taking over a venue;
- launching a new festival;
- introducing family or experiential programming;
- seeking new attractions or content;
- adding seasonal indoor programming;
- announcing a partnership with a venue, city or sponsor;
- hiring senior event, commercial or programming leadership;
- operating a comparable touring attraction;
- increasing the number of locations or event dates;
- securing funding, investment or a major contract;
- publicly describing a need The Monster could help fulfil.

Signals are evidence, not guarantees of intent.

## 4.3 Buyer-role examples

The system should look for public professional roles such as:

- Founder;
- Managing Director;
- Commercial Director;
- Event Director;
- Festival Director;
- Head of Programming;
- Head of Live Events;
- Head of Attractions;
- Partnerships Director;
- Business Development Director;
- Venue Director;
- Entertainment Director;
- Operations Director;
- Licensing Director;
- Destination Marketing or Visitor Experience Director.

The right role depends on the account type.

A role target is acceptable when no named person is publicly confirmed.

## 4.4 Non-prospects and low-priority cases

The following are rejected or heavily downgraded unless strong contrary evidence exists:

- children's birthday parties;
- schools without a credible commercial budget;
- charities without an appropriate funded event model;
- very small local events with no scale signal;
- suppliers selling services to The Monster rather than buying or operating it;
- irrelevant venue directories;
- scraped contact aggregators without source evidence;
- organisations outside the mission geography;
- duplicate companies already present in previous Monster Scout missions, the current mission, or an optional manually uploaded CSV snapshot;
- accounts marked do-not-contact or opted out;
- organisations whose only apparent relevance is a vague keyword match.

---

# 5. The experience that sells the product to Nick

The interface has two views over the same facts.

## 5.1 Nick Mode

Nick Mode is designed to feel fast, visual and alive.

It shows:

- mission objective;
- market and category targets;
- live discovery events;
- accounts entering and leaving consideration;
- buying signals as they are verified;
- decision-maker routes;
- compact lead dossiers;
- Green / Amber / Red commercial-readiness states;
- a final **Nick's Next Five** shortlist;
- one-click review actions;
- a first-move sales brief for approved prospects.

It should feel like a commercial radar, not a spreadsheet.

## 5.2 Audit Mode

Audit Mode is designed for trust, debugging and interview proof.

It shows:

- LangGraph node history;
- tool calls and tool results;
- source URLs and excerpts;
- evidence states;
- account canonicalisation decisions;
- local duplicate checks;
- scoring components;
- product knowledge passages;
- model and prompt versions;
- token use and estimated cost;
- trace IDs;
- validation failures;
- retry and resume history;
- human review history.

No hidden chain-of-thought is displayed. The UI shows actions, evidence and workflow state.

## 5.3 Screen 1 — Sales Mission Control

The opening screen asks:

> Who should The Monster sell to next?

Mission inputs:

- mission name;
- target countries or regions;
- account categories;
- preferred Monster product or `UNDECIDED`;
- event format or audience focus;
- date or seasonal context;
- buying-signal window;
- exclusion rules;
- maximum prospects;
- maximum search and model budget;
- optional strategic instruction from Nick.

Initial demo missions:

### Mission A — European Ticketed Operators

Find experienced ticketed-event and attraction operators in Germany, the Netherlands and Belgium with evidence of multi-city activity or new programming.

### Mission B — Family Festival Buyers

Find commercially serious family-festival producers in France and Spain that operate large public events and may need a headline attraction.

### Mission C — North America Licensing Partners

Find regional operators, promoters or entertainment groups with experience licensing or touring large paid attractions.

## 5.4 Screen 2 — The Hunt

The live mission path is:

```text
BRIEF
  -> ICP
  -> DISCOVERY
  -> SIGNALS
  -> CONTACT MAP
  -> SALES ANGLE
  -> REVIEW
```

Meaningful events include:

- “Account matched the selected buyer profile”;
- “Recent expansion signal found”;
- “Official event portfolio confirmed”;
- “Commercial scale remains unconfirmed”;
- “Public Head of Programming identified”;
- “Only a generic partnership route is available”;
- “Existing CRM company detected”;
- “Possible duplicate collapsed”;
- “Monster positioning evidence retrieved”;
- “First-move brief ready for review”.

## 5.5 Screen 3 — Lead Dossier

Each review-ready prospect card contains:

- company name;
- website;
- country and city;
- account category;
- business summary;
- relevant products or events;
- scale signals;
- recent buying signal;
- why the organisation may care about The Monster;
- likely buyer role;
- named public contact where confirmed;
- public email only where explicitly published;
- public contact or partnership route;
- evidence quality;
- account score;
- confidence;
- missing information;
- product recommendation;
- first-move recommendation;
- source count;
- mission cost contribution;
- review state.

## 5.6 Screen 4 — Nick's Next Five

The final show screen contains five large cards.

Each card answers:

- **Why them?**
- **Why now?**
- **Who?**
- **What angle?**
- **What next?**

It deliberately excludes technical clutter.

The ideal result is that Nick starts debating which prospect to contact first.

## 5.7 Screen 5 — First-Move Brief

After human approval, the product prepares a compact selling package:

- recommended contact channel;
- named person or target role;
- one evidence-backed opening hook;
- one-sentence Monster proposition;
- three discovery questions;
- likely objection or uncertainty;
- recommended next action;
- optional draft first-touch message.

The draft is never sent automatically.

---

# 6. Product boundary

The MVP does:

- discover prospect accounts;
- investigate official and reputable public sources;
- identify current commercial signals;
- identify public buyer roles and named people where available;
- record public contact routes;
- create evidence-backed account dossiers;
- recommend a Monster sales angle;
- prepare a first-move brief;
- pause for human review;
- export approved records to the CRM schema.

The MVP does not:

- send email;
- enrol leads in campaigns;
- guess personal email addresses;
- buy private contact data;
- bypass logins or access controls;
- scrape private social profiles;
- auto-approve prospects;
- negotiate price;
- determine final venue feasibility;
- make binding product or territory commitments;
- write directly into Monster CRM before the dry-run bridge is proven.

---

# 7. Core architecture

```text
Nick / Alfonso
      |
      v
Next.js Sales Mission Control
      |
      v
POST /api/missions/:id/run
      |
      v
LangGraph Sales Mission
thread_id = missionRunId
      |
      +--> validate_sales_brief ---------------- deterministic
      |
      +--> build_target_profile ---------------- structured LangChain chain
      |
      +--> build_search_strategy --------------- structured LangChain chain
      |
      +--> discover_accounts ------------------- Lead Hunter Agent
      |
      +--> canonicalise_accounts --------------- deterministic
      |
      +--> check_local_duplicates -------------- deterministic tool
      |
      +--> investigate_account_subgraphs ------- bounded parallel work
      |       |
      |       +--> confirm_official_identity
      |       +--> research_business_model
      |       +--> detect_buying_signals
      |       +--> map_public_decision_makers
      |       +--> inspect_contact_routes
      |       +--> extract_scale_signals
      |       +--> persist_evidence
      |
      +--> apply_sales_rules ------------------- deterministic registry
      |
      +--> retrieve_monster_context ------------ governed pgvector RAG
      |
      +--> build_sales_angle ------------------- structured LangChain chain
      |
      +--> verify_material_claims -------------- evidence verifier
      |
      +--> calculate_lead_score ---------------- deterministic formula
      |
      +--> persist_review_snapshot ------------- idempotent transaction
      |
      +--> interrupt_for_human_review ---------- LangGraph interrupt
              |
              +--> APPROVE
              +--> REJECT
              +--> EDIT
              +--> DUPLICATE
              +--> DO_NOT_CONTACT
              +--> RESEARCH_ONE_GAP
              +--> PREPARE_FIRST_MOVE
                        |
                        +--> bounded continuation
              |
              v
         export_approved_leads
              |
              v
         later Monster CRM dry-run bridge
```

## 7.1 Architectural ownership

LangGraph owns:

- mission progression;
- graph state;
- branching;
- retries at workflow level;
- account subgraph coordination;
- pause and resume;
- human review continuation;
- focused follow-up research.

Deterministic TypeScript owns:

- geography and category validation;
- duplicate detection;
- do-not-contact enforcement;
- URL and network safety;
- evidence persistence;
- public-contact rules;
- score calculation;
- score caps;
- budgets;
- idempotency;
- permissions;
- export eligibility;
- CRM writes.

Models own:

- translating Nick's brief into a target profile;
- generating search variations;
- choosing among allowed research tools;
- extracting typed facts from messy public pages;
- interpreting ambiguous commercial signals;
- selecting relevant Monster positioning context;
- proposing an evidence-backed sales angle;
- drafting a first-touch message after approval.

Models do not own final sales judgement.

---

# 8. The one production agent

The product uses one actual tool-using LangChain agent:

> **Lead Hunter Agent**

Everything else is a graph node, deterministic service or structured chain.

There is no multi-agent sales theatre.

## 8.1 Agent responsibilities

The Lead Hunter Agent:

- executes a bounded search strategy;
- finds candidate organisations;
- prefers official domains and first-party evidence;
- discovers relevant recent signals;
- finds public company and professional pages;
- records sources;
- returns typed account hypotheses;
- stops at explicit limits.

The agent does not:

- decide approval;
- send outreach;
- invent contact data;
- override duplicate or opt-out state;
- calculate the final score;
- declare venue feasibility;
- make pricing claims.

## 8.2 Allowed tools

### `search_web`

Input:

- query;
- country or locale;
- freshness window;
- result limit;
- mission ID.

Output:

- title;
- URL;
- snippet;
- provider rank;
- query;
- discovery time.

### `safe_fetch`

Fetches a public HTTP or HTTPS page after security validation.

Output:

- final URL;
- status;
- MIME type;
- title;
- readable text;
- byte count;
- content hash;
- retrieval time.

### `check_local_duplicates`

Checks:

- canonical domain;
- normalised company name;
- aliases;
- existing companies from previous Monster Scout missions;
- existing mission candidates;
- optional manually uploaded CSV snapshot;
- opt-out and do-not-contact state.

### `record_source`

Persists a source and links it to:

- mission run;
- account;
- claim;
- retrieval timestamp;
- content hash.

### `inspect_public_contact_route`

Finds public routes such as:

- official contact page;
- partnerships page;
- commercial enquiries page;
- public business email;
- public team page;
- public professional profile URL;
- official phone number.

It does not guess or derive private contact details.

### `search_public_professional_roles`

Finds public evidence of relevant professional roles through official sites, public biographies, press releases and search results.

It may return:

- confirmed person and role;
- role only;
- public source URL;
- confidence;
- freshness.

It may not claim current employment without current evidence.

## 8.3 Agent limits

Each invocation receives:

- maximum searches;
- maximum fetched pages;
- maximum tool calls;
- maximum bytes per page;
- maximum model tokens;
- maximum elapsed time;
- maximum estimated cost;
- allowed countries;
- allowed account categories;
- maximum candidate accounts;
- freshness requirement for buying signals.

When a limit is reached, middleware returns a typed partial result instead of allowing an uncontrolled loop.

## 8.4 Agent output

```ts
type DiscoveredAccount = {
  companyName: string;
  officialDomain?: string;
  website?: string;
  country?: string;
  city?: string;
  classification: ProspectAccountClassification;
  relevanceHypothesis: string;
  discoveredSignals: SignalHypothesis[];
  possibleBuyerRoles: string[];
  discoveryEvidenceIds: string[];
  unresolvedQuestions: string[];
};
```

Every hypothesis remains an inference until evidence verification.

---

# 9. Target profile and search strategy

The agent must not improvise an unlimited market definition.

The graph first produces a structured target profile.

```ts
type TargetProfile = {
  geographies: string[];
  accountCategories: ProspectAccountCategory[];
  excludedCategories: string[];
  productFocus: "THE_MONSTER" | "MEGA_BOUNCE_HOUSE" | "UNDECIDED";
  requiredSignals: string[];
  preferredSignals: string[];
  targetBuyerRoles: string[];
  commercialScaleIndicators: string[];
  freshnessWindowDays: number;
  maximumProspects: number;
};
```

The target profile must be visible and editable before the search begins.

The search strategy is then produced as a bounded list of query families:

- category discovery;
- geography discovery;
- event portfolio discovery;
- expansion and announcement signals;
- buyer-role discovery;
- partnership and contact-route discovery;
- comparable-attraction discovery.

Each query family has a maximum query count.

---

# 10. Evidence contract

No positive sales claim enters the lead dossier without an evidence state.

```ts
type ClaimState =
  | "FACT"
  | "COMMERCIAL_SIGNAL"
  | "INFERENCE"
  | "MISSING_INFORMATION"
  | "CONFLICT"
  | "MONSTER_KNOWLEDGE"
  | "SALES_RULE";
```

```ts
type EvidenceRecord = {
  id: string;
  missionRunId: string;
  accountId: string;
  claimKey: string;
  claimText: string;
  claimState: ClaimState;
  sourceUrl?: string;
  pageTitle?: string;
  excerpt?: string;
  publishedAt?: string;
  retrievedAt: string;
  contentHash?: string;
  authorityType:
    | "OFFICIAL_COMPANY"
    | "OFFICIAL_EVENT"
    | "OFFICIAL_PERSON"
    | "GOVERNMENT"
    | "REPUTABLE_NEWS"
    | "REPUTABLE_INDUSTRY"
    | "SEARCH_SNIPPET"
    | "PUBLIC_PROFESSIONAL_PROFILE"
    | "MONSTER_CHECKLIST"
    | "MONSTER_POSITIONING";
  confidence: "HIGH" | "MEDIUM" | "LOW";
};
```

Rules:

1. Search snippets help discovery but are weak final proof.
2. Official company and event sources are preferred.
3. Buying signals require a date where available.
4. A current-person claim requires sufficiently recent evidence.
5. Missing information remains missing.
6. The model cannot convert an inference into a fact.
7. Conflicts remain visible.
8. Each fetched page stores a content hash.
9. Evidence excerpts remain short and attributable.
10. One source may support several claims, but every claim keeps an explicit mapping.

---

# 11. Buying-signal model

The product distinguishes a general company fact from a reason to act now.

```ts
type BuyingSignal = {
  id: string;
  accountId: string;
  type:
    | "NEW_EVENT"
    | "EXPANSION"
    | "NEW_MARKET"
    | "NEW_VENUE"
    | "NEW_PROGRAMME"
    | "PARTNERSHIP"
    | "HIRING"
    | "FUNDING"
    | "SEASONAL_GAP"
    | "COMPARABLE_ATTRACTION"
    | "PUBLIC_REQUEST"
    | "OTHER";
  summary: string;
  occurredAt?: string;
  freshness: "CURRENT" | "RECENT" | "OLD" | "UNKNOWN";
  evidenceIds: string[];
  relevanceToMonster: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};
```

Signal interpretation is structured model work.

Signal freshness, evidence presence and scoring effect are deterministic.

Old activity may establish capability but must not be described as a current trigger.

---

# 12. Decision-maker mapping

The system searches for a **commercial route**, not merely a person's name.

```ts
type DecisionMakerRoute = {
  targetRole: string;
  contactName?: string;
  confirmedRole?: string;
  publicEmail?: string;
  publicPhone?: string;
  contactPageUrl?: string;
  professionalProfileUrl?: string;
  sourceEvidenceIds: string[];
  roleConfidence: "HIGH" | "MEDIUM" | "LOW";
  dataFreshness: "CURRENT" | "RECENT" | "UNKNOWN";
};
```

Rules:

- no guessed email addresses;
- no fabricated naming patterns;
- no enrichment from breached or private datasets;
- no claim that a person currently holds a role without evidence;
- a generic partnerships route is preferable to an invented personal route;
- a target role with no confirmed person is still useful;
- contact data is stored only when publicly provided for business use;
- do-not-contact and opt-out status always overrides discovery.

---

# 13. Deterministic Sales Rule Registry

Hard sales and governance rules must not be left to an LLM or vector search.

The Sales Rule Registry includes:

- allowed mission geographies;
- allowed account categories;
- excluded low-budget categories;
- school, charity and birthday-event escalation;
- duplicate-account handling;
- do-not-contact enforcement;
- opt-out enforcement;
- minimum evidence for review-ready status;
- buying-signal date requirements;
- contact-data provenance requirements;
- score caps for weak evidence;
- score caps for missing commercial scale;
- score caps for no usable contact route;
- mandatory Nick review for product matching;
- mandatory Nick review for pricing, territory and exclusivity;
- no claim that event production elements are included unless explicitly confirmed;
- no venue-feasibility claim without the required site evidence.

```ts
type SalesRule = {
  id: string;
  version: number;
  topic: string;
  condition: RuleCondition;
  outcome: "PASS" | "FAIL" | "UNKNOWN" | "ESCALATE" | "CAP_SCORE";
  scoreCap?: number;
  sourceSection: string;
  effectiveDate: string;
};
```

The LLM may explain a rule result. It cannot change it.

---

# 14. Monster knowledge and RAG

RAG is used to understand how to sell The Monster, not to decide hard policy.

## 14.1 Knowledge authority order

1. current Nick operational and commercial checklist;
2. structured Sales and Monster Rule Registries;
3. current product-deck RAG addendum;
4. approved case studies and proof points;
5. older archived knowledge only when explicitly enabled and corroborated.

## 14.2 RAG use cases

RAG supports:

- product positioning;
- product comparison;
- audience fit;
- event-format fit;
- proof points;
- international operating history;
- likely commercial value proposition;
- objection preparation;
- discovery questions;
- opening sales angle;
- concise first-touch drafting.

RAG does not determine:

- price;
- discount;
- exclusivity;
- final site fit;
- final safety or compliance;
- contractual terms;
- whether Nick accepts the prospect.

## 14.3 RAG metadata

Each chunk includes:

- `source_type`;
- `authority_level`;
- `product`;
- `topic`;
- `effective_date`;
- `deprecated`;
- `section_id`;
- `content_hash`.

Deprecated content is filtered out by default.

---

# 15. Lead scoring

The final score is deterministic and inspectable.

The model supplies structured evidence and classifications. TypeScript calculates the score.

## 15.1 Score components

### Buyer Fit — 0 to 25

Evidence that the organisation is commercially capable of buying, licensing, promoting or operating the product.

Examples:

- ticketed-event experience;
- attraction operations;
- multi-event portfolio;
- relevant business model;
- appropriate audience;
- comparable commercial activity.

### Timing Signal — 0 to 25

Evidence that there is a reason to contact the account now.

Examples:

- expansion;
- new programming;
- new market;
- new event;
- partnership announcement;
- active seasonal planning;
- relevant hiring;
- comparable attraction launch.

### Monster Relevance — 0 to 20

Evidence that The Monster or Mega Bounce House could plausibly support the organisation's goals.

### Reachability — 0 to 15

Quality of the public commercial route.

Examples:

- confirmed decision-maker and public business route;
- named relevant person with public profile;
- official partnerships email;
- official commercial contact page;
- generic form only;
- no usable route.

### Evidence Quality — 0 to 15

Strength, freshness and completeness of sources.

## 15.2 Score states

```text
80–100  HOT      Strong candidate for Nick's immediate review
65–79   WARM     Credible prospect with one or more important gaps
45–64   WATCH    Some relevance, but insufficient reason to act now
0–44    REJECT   Weak, irrelevant, duplicate or unsupported
```

## 15.3 Score caps

- no verified official company identity: maximum 30;
- no evidence of commercial activity: maximum 45;
- no current or recent buying signal: maximum 65;
- no usable public contact route: maximum 70;
- unresolved duplicate: not review-ready;
- opted-out or do-not-contact: 0 and blocked;
- excluded account category without contrary evidence: maximum 25;
- unsupported positive claims: candidate returns to verification;
- hard venue incompatibility, when later known: marked separately and escalated rather than hidden in the lead score.

A high model confidence cannot override a deterministic cap.

---

# 16. Sales-angle output

The structured sales-angle chain receives:

- verified account facts;
- verified buying signals;
- decision-maker route;
- retrieved Monster context;
- Sales Rule results;
- missing information;
- human mission instructions.

It returns:

```ts
type SalesAngle = {
  recommendedProduct: "THE_MONSTER" | "MEGA_BOUNCE_HOUSE" | "UNDECIDED";
  whyThisAccount: string;
  whyNow: string;
  likelyBusinessValue: string[];
  targetRole: string;
  openingHook: string;
  discoveryQuestions: string[];
  cautions: string[];
  evidenceIds: string[];
  escalationRequired: boolean;
};
```

Rules:

- no invented pain points;
- no invented budget;
- no claim that the account is actively buying unless supported;
- no fabricated familiarity;
- no false personalisation;
- every material sentence maps to evidence or Monster knowledge;
- the opening hook must be usable in a real conversation.

---

# 17. First-touch drafting

First-touch drafting happens only after human approval.

The draft may use:

- company name;
- confirmed public contact name and role;
- recent verified signal;
- relevant Monster proof point;
- clear reason for contacting;
- one low-friction call to action.

The draft must not:

- pretend Nick met the recipient;
- pretend The Monster already knows private plans;
- exaggerate venue fit;
- make contractual promises;
- include unverified figures;
- use guessed contact details;
- send itself.

The first-touch draft is a sales aid, not an autonomous action.

---

# 18. LangGraph state

```ts
type SalesMissionGraphState = {
  missionId: string;
  missionRunId: string;
  graphVersion: string;
  brief: SalesMissionBrief;
  targetProfile?: TargetProfile;
  searchStrategy?: SearchStrategy;
  discoveredAccounts: DiscoveredAccount[];
  accountIds: string[];
  evidenceIds: string[];
  buyingSignalIds: string[];
  decisionMakerRouteIds: string[];
  salesAngleIds: string[];
  scoreIds: string[];
  reviewSnapshotId?: string;
  pendingReview?: ReviewPayload;
  reviewDecision?: ReviewDecision;
  budget: {
    maxSearches: number;
    maxPages: number;
    maxModelCalls: number;
    maxCostUsd: number;
    searchesUsed: number;
    pagesUsed: number;
    modelCallsUsed: number;
    estimatedCostUsd: number;
  };
  warnings: GraphWarning[];
  errors: GraphError[];
  status: SalesMissionRunStatus;
};
```

State rules:

- `missionRunId` is the LangGraph `thread_id`;
- production uses a Postgres checkpointer;
- graph state stores references, not entire web pages;
- accounts, signals, evidence and reviews are business entities;
- parallel arrays use explicit reducers;
- every node is idempotent;
- every side effect has a stable idempotency key;
- checkpoint retention is bounded;
- one account failure does not invalidate the whole mission.

## 18.1 Interrupt rule

The review snapshot is persisted before the graph pauses.

Review actions:

```text
APPROVE
REJECT
EDIT
DUPLICATE
DO_NOT_CONTACT
RESEARCH_ONE_GAP
PREPARE_FIRST_MOVE
```

`RESEARCH_ONE_GAP` must contain one focused question and one bounded continuation.

It cannot silently restart the entire mission.

---

# 19. Authoritative technical stack

## Application

- Next.js App Router;
- TypeScript;
- React;
- Route Handlers and Server Actions;
- Zod;
- Tailwind and shadcn/ui adapted to the Monster identity;
- Auth.js or the existing project authentication pattern;
- Nick and Alfonso allowlist for the initial deployment.

## LangChain

- `langchain`;
- `@langchain/core`;
- `@langchain/openai`;
- current `createAgent()` API;
- typed tools;
- structured output schemas;
- LCEL / runnable composition for bounded chains;
- middleware for limits, error handling and trace metadata.

LangChain must be used in the production path, not included decoratively.

## LangGraph

- `@langchain/langgraph`;
- `StateGraph`;
- typed graph state;
- conditional edges;
- account-investigation subgraphs;
- bounded parallelism;
- durable checkpointing;
- `thread_id`;
- `interrupt()`;
- `Command({ resume })`;
- graph event streaming.

LangGraph is the sole agent workflow orchestrator.

## Vercel AI layer

- Vercel AI Gateway;
- `ChatOpenAI` configured through the Gateway's OpenAI-compatible endpoint;
- Vercel OIDC in deployed environments;
- environment-configured model registry;
- separate model settings for planning, extraction, interpretation and verification;
- provider and model names centralised in one module.

## UI streaming

- `ai`;
- `@ai-sdk/react`;
- `@ai-sdk/langchain`;
- LangChain/LangGraph event conversion to UI messages;
- a live mission event stream.

The AI SDK is the UI transport layer. It is not the agent framework.

## Data

- Neon Postgres;
- Prisma for business entities and migrations;
- `@langchain/langgraph-checkpoint-postgres`;
- `PostgresSaver`;
- pgvector for Monster knowledge retrieval;
- optional Vercel Blob for large page snapshots or exports.

## Search

Use a provider abstraction:

```ts
interface SearchProvider {
  search(input: SearchRequest): Promise<SearchResult[]>;
}
```

For the MVP, use the configured Brave Search API through the provider adapter. Keep DuckDuckGo's non-JavaScript HTML adapter as a no-key compatibility path and keep the abstraction vendor-neutral so provider behavior can change without changing the graph.

The graph and tools must not depend on provider-specific shapes.

Page acquisition begins with safe HTTP fetch and readable-text extraction.

Do not add Playwright scraping by default.

## Observability and evaluation

- LangSmith traces, datasets and experiments;
- Vercel AI Gateway usage, latency and cost visibility;
- Vercel application and function observability;
- Postgres audit events;
- Vitest;
- Playwright for product E2E tests, not default web scraping;
- GitHub Actions;
- Vercel preview deployments.

## Later scaling primitive

- Vercel Queues for one-account-per-message fan-out and retries.

Queues transport work. LangGraph remains the domain state machine.

---

# 20. Runtime strategy

## MVP envelope

- three to five prospect accounts per mission;
- maximum three search-query families;
- bounded searches per family;
- bounded pages per account;
- bounded parallel account investigation;
- persistent checkpoints after meaningful stages;
- streamed mission progress;
- explicit function `maxDuration`;
- no dependence on one long-running request surviving.

## Expansion threshold

Increase mission size only after measuring:

- time to first useful prospect;
- median account research time;
- search-provider latency;
- model latency;
- cost per review-ready prospect;
- duplicate rate;
- signal freshness rate;
- decision-maker discovery rate;
- evidence completeness;
- timeout and retry rate.

## Queue threshold

Add Vercel Queues only when:

- account fan-out exceeds the safe function envelope;
- retries must survive deployments independently;
- controlled concurrency is required;
- one slow account blocks the mission;
- at-least-once delivery is acceptable and idempotent consumers are implemented.

---

# 21. Data model

## SalesMission

- ID;
- name;
- owner;
- geographies;
- account categories;
- product focus;
- required and preferred signals;
- buyer roles;
- freshness window;
- exclusions;
- instructions;
- limits;
- budget;
- status;
- timestamps.

## SalesMissionRun

- mission ID;
- graph thread ID;
- graph version;
- deployment ID;
- model-registry snapshot;
- prompt versions;
- current stage;
- status;
- counts;
- cost;
- start and completion timestamps;
- error summary.

## ProspectAccount

- canonical company name;
- canonical domain;
- website;
- country;
- city;
- classification;
- business summary;
- scale signals;
- account fingerprint;
- CRM company ID where matched;
- opt-out state;
- do-not-contact state.

## BuyingSignal

- account ID;
- signal type;
- summary;
- event or publication date;
- freshness;
- relevance;
- confidence;
- evidence references.

## DecisionMakerRoute

- account ID;
- target role;
- contact name where confirmed;
- confirmed role;
- public business email;
- public phone;
- contact page;
- professional profile;
- freshness;
- evidence references.

## ProspectCandidate

- mission and account IDs;
- buyer-fit score;
- timing score;
- Monster-relevance score;
- reachability score;
- evidence score;
- total score;
- score state;
- product recommendation;
- why this account;
- why now;
- sales angle;
- missing information;
- escalation state;
- review state;
- owner.

## ReviewDecision

- candidate ID;
- action;
- reason;
- edits;
- reviewer;
- timestamp;
- graph thread ID;
- review snapshot ID.

## AuditEvent

- actor;
- action;
- entity;
- before and after values;
- mission, run and thread IDs;
- graph and deployment versions;
- timestamp.

---

# 22. CRM export contract

The first integration is a CSV matching the existing lead-sheet schema exactly:

```text
company_name
website
country
city
contact_name
role
email
source_url
category
size/signals
notes
confidence
status
owner
last_touch
opt_out
```

Export rules:

- `company_name` is mandatory;
- `website` must be the canonical public website where known;
- unknown contact name, role or email remains blank;
- `email` is populated only when publicly confirmed;
- `source_url` points to the strongest discovery or signal source;
- `size/signals` contains concise verified commercial scale and timing signals;
- `notes` contains the sales angle, gaps and next step;
- `confidence` uses a controlled value;
- `status` reflects the human-approved workflow state;
- `owner` defaults only according to explicit project configuration;
- `last_touch` remains blank for newly researched prospects;
- `opt_out` is never overwritten from true to false.

No exported row may look complete by filling unknown fields with plausible text.

---

# 23. Repository structure

```text
monster-scout/
|-- app/
|   |-- api/
|   |   |-- missions/route.ts
|   |   |-- missions/[id]/run/route.ts
|   |   |-- runs/[id]/stream/route.ts
|   |   |-- runs/[id]/resume/route.ts
|   |   |-- prospects/[id]/route.ts
|   |   |-- prospects/[id]/first-move/route.ts
|   |   `-- exports/leads/route.ts
|   |-- missions/
|   |-- runs/[id]/
|   |-- prospects/[id]/
|   `-- settings/
|-- components/
|   |-- sales-mission-control/
|   |-- hunt-timeline/
|   |-- account-radar/
|   |-- lead-dossier/
|   |-- nicks-next-five/
|   |-- first-move-brief/
|   `-- audit-view/
|-- lib/
|   |-- ai/
|   |   |-- gateway-models.ts
|   |   |-- model-registry.ts
|   |   |-- prompts/
|   |   `-- schemas/
|   |-- agents/
|   |   `-- lead-hunter-agent.ts
|   |-- graph/
|   |   |-- sales-mission-state.ts
|   |   |-- sales-mission-graph.ts
|   |   |-- account-investigation-subgraph.ts
|   |   |-- nodes/
|   |   `-- checkpointer.ts
|   |-- chains/
|   |   |-- target-profile.ts
|   |   |-- search-strategy.ts
|   |   |-- account-extraction.ts
|   |   |-- signal-interpretation.ts
|   |   |-- sales-angle.ts
|   |   |-- first-touch.ts
|   |   `-- evidence-verifier.ts
|   |-- tools/
|   |   |-- search-web.ts
|   |   |-- safe-fetch.ts
|   |   |-- account-dedup.ts
|   |   |-- crm-duplicate-check.ts
|   |   |-- public-contact-route.ts
|   |   `-- professional-role-search.ts
|   |-- sales/
|   |   |-- rule-registry.ts
|   |   |-- rule-engine.ts
|   |   |-- score-engine.ts
|   |   `-- export-mapper.ts
|   |-- monster/
|   |   |-- knowledge-ingest.ts
|   |   `-- retriever.ts
|   |-- evidence/
|   |-- security/
|   |-- observability/
|   |-- db/
|   `-- exports/
|-- knowledge/
|   |-- authoritative/
|   |-- positioning/
|   `-- archive/
|-- prisma/
|-- evals/
|   |-- datasets/
|   |-- evaluators/
|   `-- reports/
|-- tests/
|   |-- fixtures/
|   |-- unit/
|   |-- integration/
|   `-- e2e/
|-- docs/
|   |-- architecture/
|   |-- adr/
|   |-- interview-proof/
|   `-- runbooks/
|-- instrumentation.ts
|-- next.config.ts
|-- vercel.json
`-- package.json
```

---

# 24. Delivery plan: six acts

Every act has three gates:

1. **Nick proof** — visible commercial value.
2. **Engineering proof** — real LangChain/LangGraph skill.
3. **Exit gate** — an objective condition.

Progress happens when the gate passes, not when the calendar changes.

## Act 0 — Bootstrap contract

**Target:** one focused session.

### Build

- create the Next.js TypeScript repository;
- create `/docs/adr` before feature code;
- add an ADR making LangGraph the sole workflow engine;
- add an ADR separating deterministic rules from RAG;
- add an ADR defining public-contact and privacy boundaries;
- install current stable LangChain, LangGraph, AI SDK adapter and data packages;
- query the AI Gateway model endpoint;
- configure central model IDs;
- configure `ChatOpenAI` through AI Gateway;
- configure LangSmith;
- connect Neon;
- deploy an authenticated smoke route.

### Nick proof

A branded screen says:

> Monster Scout is alive. Give it a market to hunt.

### Engineering proof

A Vercel deployment invokes a model through LangChain and AI Gateway with a visible LangSmith trace.

### Exit gate

No direct provider configuration or model ID is duplicated outside the model registry.

---

## Act 1 — The First Sales Hunt

**Target:** first two to three working days.

### Build

Implement one thin vertical slice:

```text
sales brief
  -> structured target profile
  -> bounded search strategy
  -> Lead Hunter Agent
  -> maximum three prospect accounts
  -> safe fetch of official sources
  -> buying-signal extraction
  -> public contact-route discovery
  -> basic lead score
  -> three lead dossiers
  -> manual approve/reject
  -> CRM-schema CSV
```

Use real public research.

### Nick proof

Nick launches one mission and receives three companies, each with:

- why it may buy;
- why now;
- who to approach;
- what to say first;
- supporting evidence.

### Engineering proof

- LangChain structured chains;
- `createAgent()`;
- typed tools;
- Zod outputs;
- LangGraph nodes and conditional routing;
- streamed workflow events;
- deterministic export mapping.

### Exit gate

At least two of three accounts have:

- a confirmed official identity;
- one evidence-backed commercial-scale signal;
- one dated or explicitly unknown buying-signal state;
- a public commercial route or target role;
- an honest missing-information list;
- a valid human decision.

---

## Act 2 — Durable Sales Mission

**Target:** days four to seven.

### Build

- use PostgresSaver outside tests;
- use `missionRunId` as graph `thread_id`;
- persist accounts, signals, evidence and review entities;
- implement stable idempotency keys;
- add restart and resume;
- add a run-history screen;
- add controlled retries;
- isolate account-subgraph failures;
- prove deployment-safe resume.

### Nick proof

Nick can close the browser and return later to the same sales hunt.

### Engineering proof

- durable checkpoints;
- thread state;
- subgraphs;
- fault recovery;
- idempotent side effects;
- graph history.

### Exit gate

A forced failure after account one resumes without duplicating account one, its signals or its evidence.

---

## Act 3 — The Monster Sales Brain

**Target:** week two.

### Build

- create the versioned Sales Rule Registry;
- write tests for every hard rule and score cap;
- ingest the checklist and positioning addendum with authority metadata;
- create authority-aware retrieval;
- add signal-interpretation, sales-angle and evidence-verifier chains;
- add deterministic lead scoring;
- show exact evidence, rules and product passages in Audit Mode;
- create the First-Move Brief.

### Nick proof

Lead dossiers now answer:

- why the account is commercially relevant;
- what current signal makes it timely;
- which Monster proposition fits;
- who the likely buyer is;
- what Nick should say;
- what Nick still needs to discover.

### Engineering proof

- governed RAG;
- pgvector;
- metadata filtering;
- deterministic plus probabilistic architecture;
- structured signal interpretation;
- claim verification;
- inspectable scoring.

### Exit gate

Fixtures prove that:

- old product material cannot override the current checklist;
- a vague website cannot receive a high score;
- an old signal cannot be presented as current;
- an invented contact cannot enter the dossier.

---

## Act 4 — Nick in the Graph

**Target:** week three.

### Build

Add the human review interrupt.

Review actions:

- APPROVE;
- REJECT;
- EDIT;
- DUPLICATE;
- DO_NOT_CONTACT;
- RESEARCH_ONE_GAP;
- PREPARE_FIRST_MOVE.

Build:

- Nick Mode;
- Nick's Next Five;
- Audit Mode;
- durable First-Move Brief;
- optional first-touch draft after approval.

### Nick proof

Nick can steer the agent into one missing question and then decide whether the account deserves outreach.

### Engineering proof

- LangGraph `interrupt()`;
- `Command({ resume })`;
- human-in-the-loop;
- editable state;
- durable review;
- audit trail;
- bounded continuation.

### Exit gate

A mission can pause, survive a new deployment, resume with the same thread ID and export only approved accounts.

---

## Act 5 — Reliability and evaluation

**Target:** week four.

### Build

Security:

- HTTP/HTTPS only;
- block localhost, private, link-local and metadata-service ranges;
- DNS and redirect revalidation;
- MIME allowlist;
- byte, redirect and timeout caps;
- content treated as untrusted data;
- prompt-injection fixtures;
- no login bypass;
- no private-data enrichment;
- no guessed email addresses;
- contact provenance checks.

Budgets:

- per-mission searches;
- pages;
- model calls;
- tokens;
- cost;
- elapsed time.

Evaluation dataset:

- excellent buyer with fresh signal;
- excellent buyer with no current signal;
- irrelevant company with keyword overlap;
- small low-budget event;
- duplicate local account;
- opted-out account;
- public named buyer;
- role-only contact route;
- stale executive information;
- conflicting company facts;
- marketing-heavy page;
- prompt-injection page;
- wrong geography;
- no public contact route;
- comparable attraction operator;
- weak evidence presented confidently.

Evaluators:

- schema validity;
- official-domain accuracy;
- account-category accuracy;
- buying-signal support;
- signal freshness correctness;
- decision-maker role correctness;
- contact provenance;
- unsupported-claim rate;
- duplicate detection;
- rule correctness;
- score agreement with human review;
- first-move usefulness;
- cost per approved prospect.

### Nick proof

Confidence and readiness displays correspond to actual evidence completeness and signal strength.

### Engineering proof

- LangSmith datasets and experiments;
- offline evaluation;
- code evaluators;
- selected LLM-as-judge evaluation;
- regression gates;
- production observability;
- cost governance.

### Exit gate

A prompt or model change cannot be promoted without matching or improving the evaluation baseline inside the agreed cost limit.

---

## Act 6 — Scale and Monster CRM bridge

**Target:** only after useful prospect lists exist.

### Scale work

- measure the bounded path;
- add Vercel Queues only when threshold conditions are met;
- publish one account-investigation message per account;
- implement idempotent consumers;
- coordinate completion through persisted state;
- add concurrency controls;
- add failed-account review.

### CRM bridge

#### Phase 1 — CSV

Export the exact lead-sheet schema.

#### Phase 2 — Dry run

The CRM endpoint returns:

```text
accepted
rejected
duplicate
opted_out
validation_errors
```

#### Phase 3 — Human-approved insertion

Requirements:

- service authentication;
- organisation scope;
- RBAC;
- idempotency key;
- source mission;
- graph thread ID;
- evidence links;
- review decision;
- audit event;
- no campaign enrolment;
- no automatic outreach.

### Exit gate

A CRM lead can be traced back to:

- mission;
- graph thread;
- account evidence;
- buying signal;
- decision-maker route;
- sales angle;
- human approval;
- exact CRM insert event.

---

# 25. First 72 hours

## Day 1 — Alive on Vercel

1. Create the repository.
2. Create the three initial ADRs.
3. Install current stable packages and commit the lockfile.
4. Link the Vercel project.
5. Connect Neon.
6. Enable AI Gateway.
7. discover available model IDs;
8. configure the central model registry;
9. configure LangSmith;
10. deploy one `ChatOpenAI` call through AI Gateway;
11. create the Monster Scout Sales Hunter shell.

**Proof:** deployed call, visible trace, branded mission screen.

## Day 2 — One company becomes one lead dossier

1. Save one official event-operator fixture.
2. Define Zod schemas for account, signal, contact route and evidence.
3. Build a structured extraction chain.
4. Store content hash and evidence.
5. classify one buying signal;
6. identify one public buyer role or contact route;
7. produce one dossier;
8. add malformed and prompt-injection fixtures.

**Proof:** one official company site becomes one typed, sourced sales prospect.

## Day 3 — The first real sales hunt

1. Implement `SearchProvider`.
2. Connect and verify the configured Brave Search API provider, retaining DuckDuckGo as a no-key compatibility adapter.
3. Define `search_web`, `safe_fetch`, `check_local_duplicates` and `inspect_public_contact_route`.
4. Create the bounded Lead Hunter Agent.
5. Build the minimal LangGraph mission.
6. Run a mission with at most three accounts.
7. produce three dossiers;
8. approve one;
9. export one CRM-schema row;
10. create one First-Move Brief.

**Proof:** a live deployed mission discovers at least one previously unknown, credible prospect with a real reason for Nick to contact it.

---

# 26. Testing strategy

## Unit tests

- Sales Rule Registry;
- score calculation;
- score caps;
- buying-signal freshness;
- public-contact provenance;
- opt-out and DNC enforcement;
- URL and IP validation;
- redirect validation;
- domain canonicalisation;
- account fingerprinting;
- evidence-state transitions;
- budget counters;
- idempotency-key generation;
- CRM export mapping.

## Integration tests

- AI Gateway model wrapper;
- search-provider adapter with fixtures;
- PostgresSaver;
- pgvector retrieval with authority filters;
- local duplicate check;
- graph resume after failure;
- interrupt and resume;
- account-subgraph partial failure;
- duplicate collapse;
- first-move generation from verified evidence.

## End-to-end tests

- create mission;
- edit target profile;
- launch hunt;
- watch streamed events;
- inspect account dossier;
- inspect buying signal;
- inspect decision-maker route;
- approve one account;
- reject one account;
- request one focused continuation;
- resume graph;
- prepare first move;
- export approved leads;
- verify rejected and opted-out accounts are absent.

## Evaluation metrics

Track:

- supported-claim precision;
- official-domain precision;
- buying-signal precision;
- signal freshness accuracy;
- decision-maker role accuracy;
- public-contact provenance rate;
- duplicate rate;
- product-angle agreement with Nick;
- lead-score agreement with Nick;
- approval rate;
- useful-first-move rate;
- average cost per approved prospect;
- median time to first useful prospect.

---

# 27. Security, privacy and trust

The agent works only with public business information.

Non-negotiable protections:

- no private-network fetching;
- no authentication bypass;
- no CAPTCHA bypass;
- no credential use for scraping;
- no private social-profile scraping;
- no guessed email addresses;
- no sensitive personal-data enrichment;
- no data from breaches;
- no hidden tracking of individuals;
- source provenance for contact data;
- content treated as untrusted;
- explicit opt-out and do-not-contact enforcement;
- minimal retention of raw page content;
- deletion and retention rules;
- audit trail for exports and CRM insertion.

This is commercial research, not surveillance.

---

# 28. Demo script for Nick

1. Open Sales Mission Control.
2. Select “European Ticketed Operators”.
3. Change one country or add one instruction from Nick.
4. Show the generated target profile.
5. Launch the mission.
6. Let the timeline show account discovery, signal detection and contact mapping.
7. Open the first HOT or WARM dossier.
8. Show “Why them”.
9. Show the dated “Why now” signal.
10. Show the target buyer or public decision-maker.
11. Show one honest missing item.
12. Switch to Audit Mode and reveal the exact source.
13. Return to Nick Mode.
14. Ask the system to research one gap.
15. Resume the same graph.
16. Approve the prospect.
17. Open the First-Move Brief.
18. Finish on Nick's Next Five.
19. Export the approved lead.

The demo succeeds when Nick says one of these:

- “Find me more companies like this.”
- “I know these people — try this market instead.”
- “This one is worth contacting.”
- “Can it look for promoters in another country?”

The demo has failed if the main conversation becomes venue dimensions or technical architecture.

---

# 29. Non-negotiable rules

1. **The primary object is a Prospect Account, not a venue.**
2. **The primary output is a credible first move, not a long list.**
3. **LangChain is real production code.**
4. **LangGraph is the sole workflow state machine.**
5. **One production agent is enough.**
6. **Hard sales, privacy and governance rules are deterministic.**
7. **RAG cannot override the current checklist.**
8. **Every material claim has an evidence state.**
9. **Every buying signal has a freshness state.**
10. **Unknown remains unknown.**
11. **No guessed email addresses.**
12. **No unsupported claim that an account is actively buying.**
13. **Every model output is schema-validated.**
14. **Every side effect is idempotent.**
15. **Every run is bounded by searches, pages, time, calls and cost.**
16. **Human review is required before export or CRM insertion.**
17. **No automatic outreach.**
18. **No automatic campaign enrolment.**
19. **No queue dependency until measurement proves it is needed.**
20. **No direct CRM insert before the dry-run contract is stable.**
21. **No architecture change without an ADR.**
22. **No model or prompt promotion without evaluation evidence.**

---

# 30. Explicitly out of scope

Do not add before Act 5 is complete:

- venue-first product redesign;
- automated site-plan feasibility;
- OpenAI Agents SDK;
- Vercel Workflow as a second orchestrator;
- Python/FastAPI duplicate service;
- CrewAI;
- AutoGen;
- agent swarms;
- autonomous browser clicking;
- Playwright scraping by default;
- automatic email sending;
- autonomous campaign creation;
- autonomous CRM writes;
- speculative contact enrichment;
- fine-tuning;
- knowledge graphs;
- Redis;
- Kubernetes;
- MCP;
- multiple vector databases;
- custom model hosting.

---

# 31. Honest CV statement

> Built and deployed Monster Scout, a Vercel-native AI sales-prospecting application using Next.js, TypeScript, LangChain.js and LangGraph.js. I implemented a bounded tool-using research agent that discovered prospect accounts, detected evidence-backed buying signals, mapped public decision-maker routes and generated human-reviewed first-move briefs. LangGraph provided durable Postgres checkpoints, account-investigation subgraphs and interrupt/resume approval flows. I used governed pgvector RAG for Monster positioning, deterministic TypeScript rules for privacy, qualification and scoring, and LangSmith datasets to evaluate grounding, signal freshness, contact accuracy, lead quality and cost.

---

# 32. Interview explanation

> I used LangChain for model integration, typed tools, structured extraction, signal interpretation, RAG and first-touch drafting. I used LangGraph because the prospecting workflow is stateful: it fans out account investigations, persists evidence, handles partial failures, pauses for human approval and resumes later. The most important architecture decision was separating probabilistic research from deterministic governance. The model could identify a likely buying signal or sales angle, but code enforced contact provenance, duplicate handling, do-not-contact rules, score caps and CRM eligibility. OpenAI-compatible models were routed through Vercel AI Gateway, Postgres held business data and graph checkpoints, and LangSmith evaluations measured whether the system found real, timely and actionable prospects rather than merely producing plausible text.

---

# 33. Skills genuinely earned

```text
LangChain.js
LangGraph.js
createAgent
StateGraph
LangChain tools
structured output
Zod schemas
LCEL / runnables
middleware
tool budgets
bounded agent loops
context engineering
Vercel AI Gateway
ChatOpenAI
Next.js App Router
AI SDK LangChain adapter
streaming agent events
conditional graph edges
subgraphs
checkpointing
PostgresSaver
thread state
interrupt and resume
human-in-the-loop
idempotent workflow design
RAG
embeddings
pgvector
metadata filtering
knowledge authority rules
public-web research
buying-signal detection
decision-maker mapping
contact provenance
lead scoring
evidence grounding
claim verification
LangSmith tracing
LangSmith datasets
offline evaluation
LLM-as-judge
SSRF defence
cost governance
Vercel deployment
production observability
CRM dry-run integration
```

---

# 34. Release definitions

## Prototype

- deployed LangChain model call through AI Gateway;
- one official company page becomes one typed dossier;
- trace visible in LangSmith.

## Alpha

- sales brief creates an editable target profile;
- Lead Hunter Agent discovers accounts;
- buying signals and contact routes are extracted;
- graph state persists in Postgres;
- progress streams to the UI.

## MVP

Nick can:

1. create a sales mission;
2. launch a LangGraph run;
3. watch account discovery and signal investigation;
4. receive at least five researched accounts;
5. inspect why each may buy;
6. inspect why now;
7. inspect who to approach;
8. see evidence and uncertainty;
9. approve, reject, edit or research one gap;
10. prepare a first move;
11. export approved leads;
12. verify that no outreach was sent automatically.

## Job-ready

- live Vercel deployment;
- public architecture and ADRs;
- LangSmith traces;
- evaluation report;
- durable interrupt/resume demo;
- security note;
- demo video;
- CI and tests;
- credible interview explanation.

## Production-ready

- security limits;
- cost limits;
- idempotent retries;
- proven contact provenance;
- evaluation gates;
- operational runbooks;
- queue fan-out only where measured;
- complete audit trail;
- Monster CRM dry-run and approved insertion;
- real missions producing useful sales conversations.

---

# 35. Official documentation baseline

The implementation must verify current APIs against official documentation during bootstrap.

Baseline references:

- Vercel AI Gateway LangChain integration;
- Vercel AI Gateway authentication and model discovery;
- AI SDK LangChain adapter;
- LangChain JavaScript agents;
- LangChain structured output;
- LangChain ChatOpenAI integration;
- LangGraph persistence;
- LangGraph interrupts;
- LangChain human-in-the-loop;
- LangChain PGVectorStore;
- LangSmith observability;
- LangSmith evaluation;
- Neon on Vercel;
- Vercel Queues;
- Vercel Function duration and runtime documentation.

Do not trust remembered package APIs when the official current documentation disagrees.

---

# 36. Final authoritative rule

Build this exact thin vertical slice before anything else:

```text
Nick's sales brief
  -> editable target profile
  -> bounded search strategy
  -> LangChain Lead Hunter Agent
  -> maximum three real accounts
  -> official-source investigation
  -> buying-signal detection
  -> public decision-maker or role route
  -> deterministic lead score
  -> Monster sales angle from governed RAG
  -> evidence verification
  -> LangGraph human interrupt
  -> approval
  -> First-Move Brief
  -> CRM-schema CSV
```

Once that works end to end:

1. make the graph durable;
2. expand the evaluation dataset;
3. improve signal and contact accuracy;
4. increase the account limit;
5. add queue fan-out only if measured runtime requires it;
6. connect approved prospects to Monster CRM.

Do not drift back into building a venue database.

The system exists to find the next people capable of creating the next Monster deal.
