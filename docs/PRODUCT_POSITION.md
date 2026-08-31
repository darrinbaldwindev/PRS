# PRS Product Position

**Status:** Strategic direction established 2026-08-31

## Product family

PRS belongs to the same product family as AgentOS. It is not intended to become a competing general-purpose agent operating system.

## Working role

PRS is the **Project Reliability & Assurance layer** for AgentOS and for projects operated through AgentOS.

AgentOS primarily coordinates and executes work. PRS primarily evaluates project state, implementation integrity, verification evidence, reliability, governance, and readiness.

This separation is a working product direction, not a claim that the final boundary is complete.

## Value proposition

> AgentOS does the work. PRS proves the work is being done correctly.

PRS should make autonomous development safer by providing an independent, evidence-oriented view of whether project state matches requirements, whether changes are verified, and whether the project is healthy enough to proceed.

## Candidate capabilities

These are candidate capabilities for validation, not yet implementation requirements:

- repository and project health assessment;
- requirements-to-implementation traceability;
- architecture and configuration drift detection;
- CI/test/validation health;
- change-impact assessment;
- technical debt and maintenance signals;
- autonomous-work verification;
- evidence collection and provenance;
- release/readiness assessment;
- project status and risk reporting;
- detection and escalation of autonomous work that is off-track;
- durable project assurance history.

## Non-overlap principle

PRS should not duplicate AgentOS runtime responsibilities such as agent lifecycle, provider routing, worker execution, task scheduling, permissions enforcement, or mission orchestration when those are already owned by AgentOS.

Where AgentOS exposes a reusable primitive, PRS should consume it through a defined interface rather than create a competing implementation.

## Commercial packaging

The eventual commercial model may be:

1. included in higher AgentOS subscription tiers;
2. offered as a paid PRS add-on;
3. offered as a standalone assurance product only if later evidence shows a meaningful independent market; or
4. combined, with basic assurance included and advanced assurance monetised.

No pricing or tier promises are established by this document.

## Authority

The product-family direction is owner-provided. Detailed functional requirements still require explicit definition and acceptance criteria before implementation claims are made.
