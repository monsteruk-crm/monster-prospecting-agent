# ADR 0005: Codex native memory is not project documentation

Status: accepted
Date: 2026-08-04

## Context

Development continuity can be useful, but runtime architecture and project decisions need reviewable repository sources.

## Decision

Codex native memory may store compact continuity records only. Repository documents, accepted ADRs, tests and implementation remain authoritative.

## Alternatives considered

Using memory as a second project knowledge base was rejected because it would be opaque, hard to review and easy to drift.

## Consequences

Durable decisions must be written to repository docs first. Memory must not contain secrets, raw source documents or hidden reasoning.

## Affected paths

`docs/`, `knowledge/`, Codex native memory integration
