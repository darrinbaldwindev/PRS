# PRS

## Project Reliability & Assurance

PRS is part of the AgentOS product family. It is the project reliability, verification and assurance layer that complements AgentOS rather than competing with its agent runtime and orchestration capabilities.

> **AgentOS does the work. PRS proves the work is being done correctly.**

PRS is intended to provide an evidence-oriented view of project health, requirements traceability, verification, risk, readiness and autonomous-work integrity.

## Relationship to AgentOS

AgentOS owns agent orchestration, runtime execution, permissions, scheduling, mission/task coordination and provider/worker integration. PRS consumes relevant project and execution evidence and independently evaluates it.

PRS must remain sufficiently independent to challenge completion claims. It must not become a second runtime, router or worker platform.

## Operating principle

**Inspect → define → implement → verify → record → continue.**

The PRS Overseer maintains project assurance, identifies reliability gaps, evaluates evidence and recommends the highest-value next action while respecting AgentOS authority and safety boundaries.

## Current stage

**Stage: Strategic alignment / assurance contract**

Implementation is intentionally not yet claimed. The next target is a small, testable repository-assurance vertical slice.

## Repository structure

```text
PRS/
├── README.md
├── docs/
│   ├── PROJECT.md
│   ├── OVERSEER.md
│   ├── PRODUCT_POSITION.md
│   ├── AGENTOS_INTEGRATION.md
│   ├── ROADMAP.md
│   └── STATUS.md
└── .github/
    └── workflows/
        └── validate.yml
```

## Development rule

Do not claim a feature is implemented until its source, validation and evidence exist in the repository.
