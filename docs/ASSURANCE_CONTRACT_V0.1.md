# PRS Assurance Contract v0.1

## 1. Purpose

This contract defines the smallest provider-neutral, deterministic PRS assurance result that can be consumed by AgentOS or another system.

## 2. Snapshot input

Required fields:

- `project_id`
- `repository`
- `commit_sha`
- `captured_at`

The snapshot identifies the exact project state being evaluated. Missing required fields are rejected.

## 3. Deterministic checks

v0.1 evaluates:

### `foundation_files_present`
Required PRS project foundation files exist and are non-empty.

### `validation_workflow_present`
A repository validation workflow exists and is non-empty.

### `requirements_documented`
The project requirements/definition document exists and is non-empty.

Each check returns:

- stable `check_id`;
- `status`: `pass` or `fail`;
- `severity`;
- summary;
- evidence references.

## 4. Findings

```json
{
  "finding_id": "string",
  "check_id": "string",
  "severity": "info|low|medium|high|critical",
  "status": "pass|fail",
  "summary": "string",
  "evidence": ["string"]
}
```

A failed check must identify evidence or explicitly identify why required evidence is missing.

## 5. Disposition

Allowed values:

- `verified` — all required checks pass.
- `partially_verified` — some checks pass and no critical failure exists.
- `failed` — one or more critical/high assurance checks fail.
- `insufficient_evidence` — required evidence is absent or cannot be evaluated.
- `blocked` — safe evaluation cannot proceed because a required external dependency or authority is unavailable.

Disposition is calculated deterministically from check results.

## 6. Provenance

Every result records:

- `evaluator_version`;
- snapshot `commit_sha`;
- check IDs and outcomes;
- evidence references;
- `generated_at`.

## 7. Determinism and safety

The core evaluator:

- requires no network or model/provider credentials;
- rejects missing required input instead of guessing;
- produces serializable machine-readable output;
- produces the same outcomes for the same snapshot and evaluator version;
- does not execute autonomous remediation;
- does not grant authority;
- does not integrate with the AgentOS runtime in v0.1.

## 8. Acceptance tests

The v0.1 implementation is acceptable only when tests demonstrate:

1. valid snapshot evaluation;
2. missing required input rejection;
3. missing foundation evidence detection;
4. missing workflow detection;
5. missing requirements detection;
6. deterministic repeatability;
7. deterministic disposition mapping;
8. evidence/provenance presence;
9. dependency-light operation;
10. machine-readable serialization.

## 9. Integration boundary

AgentOS remains the authority for execution, orchestration, permissions, scheduling and remediation. PRS supplies assurance evidence and findings. A PRS recommendation never bypasses AgentOS authority controls.
