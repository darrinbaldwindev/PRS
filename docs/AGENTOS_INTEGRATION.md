# PRS ↔ AgentOS Integration Boundary

## Objective

Define a non-duplicative relationship between PRS and AgentOS before implementation begins.

## System responsibilities

| Concern | AgentOS | PRS |
|---|---|---|
| Mission intake | Primary | Observe/evaluate |
| Task decomposition | Primary | Verify where evidence is available |
| Agent/worker routing | Primary | Assess resulting reliability |
| Worker execution | Primary | Verify outcomes |
| Runtime permissions | Primary | Audit/evaluate evidence |
| Scheduling | Primary | Consume/report scheduled-state evidence |
| Project state | Canonical runtime/project state | Assurance view and findings |
| Repository health | Provides access/execution | **Primary assurance concern** |
| Requirements traceability | Produces mission/task evidence | **Primary assurance concern** |
| Verification evidence | Produces execution evidence | **Independent evaluation** |
| Risk/readiness assessment | Produces operational signals | **Primary assurance concern** |
| Audit/provenance | Runtime audit | **Project assurance record** |
| Remediation execution | Primary | Recommend; execute only when explicitly delegated |

## Integration model

```text
Human Owner
    ↓
GPTChat / Portfolio Overseer
    ↓
Project Overseer
    ↓
AgentOS
    │
    ├── plans / missions / workers / runtime
    │
    └── project events + execution evidence
                 ↓
                PRS
                 │
        health / verification / traceability
        findings / risk / readiness / evidence
                 │
                 ↓
          recommendations
                 ↓
              AgentOS
```

## Key rule

PRS should be an **assurance consumer and evaluator**, not a second runtime.

AgentOS remains responsible for doing authorised work. PRS determines whether the available evidence supports claims about project health, completion, reliability, and readiness.

## Shared contracts

Future integration should prefer small provider-neutral contracts for:

- project identity;
- repository identity and base commit;
- mission/task identity;
- execution/run identity;
- change set identity;
- verification result;
- finding/risk;
- recommendation;
- project health snapshot;
- readiness decision;
- provenance/evidence reference.

The exact transport is deferred. Repository-backed durable state is acceptable for early proving stages; AgentOS's existing dispatch/event direction should be preferred as the runtime integration matures.

## Event relationship

AgentOS already identifies task assignment, status transition, completion, verification, blocker, owner decision, handoff, capability/skill discovery, conflict, and project-registration events as useful control-plane events. PRS should consume relevant events rather than continuously duplicating the entire AgentOS repository/runtime scan.

PRS may request targeted inspection when an event indicates a meaningful change or assurance concern.

## Independence

PRS must retain enough independence to challenge an AgentOS completion claim. It should not simply mirror an AgentOS `completed` state and label it verified.

Where consequential completion is claimed, PRS should seek independent evidence and record the basis for its disposition.

## Security boundary

PRS does not grant authority merely by identifying a recommendation. AgentOS remains the enforcement/runtime authority. Any PRS-triggered remediation must pass AgentOS permissions, authority, approval, and safety gates.

## Initial proving ground

The first useful vertical slice should be a dependency-light project health/verification record for a repository: ingest a defined project snapshot, evaluate a small set of evidence-backed checks, produce findings and a disposition, and preserve the evidence trail.

This is a candidate vertical slice derived from the strategic direction and must be converted into explicit acceptance criteria before implementation.
