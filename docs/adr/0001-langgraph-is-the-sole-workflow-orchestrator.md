# ADR 0001: LangGraph is the sole workflow orchestrator

Status: accepted
Date: 2026-08-04

## Context

Monster Scout needs durable, inspectable mission execution with bounded steps and future human interrupts.

## Decision

LangGraph.js is the only workflow state machine. LangChain.js provides model, tool, structured-output and chain primitives inside graph nodes.

## Alternatives considered

Multiple agent frameworks, a custom queue-driven state machine, and an agent swarm were rejected for unnecessary complexity and weaker interview-proof architecture.

## Consequences

Graph state, checkpointing, reducers and interrupts have one owner. Individual agents cannot introduce a second orchestration model.

## Affected paths

`lib/graph/`, `lib/agents/`, `docs/architecture/system-overview.md`
