# Owner Windows Level-2 Acceptance Contract

**Status:** PRS assurance contract; evidence requirements only.  
**Authority:** This document grants no execution, deployment, scheduler, credential, production-write, remediation, or promotion authority.  
**Purpose:** Define the minimum evidence required before PRS may treat an owner's physical Windows laptop as having satisfied the bounded AgentOS Level-2 worker acceptance gate.

## Core rule

Hosted Windows CI, simulated host probes, repository tests, worker self-reporting, a successful mutation, or a durable receipt are each useful evidence but are **not substitutes for physical owner-machine acceptance**.

A physical-laptop acceptance result is eligible for PRS evaluation only when the evidence bundle proves one exact execution lineage from authorized assignment through physical execution, mutation/recovery, Green qualification, and independent PRS evaluation.

## Required exact identity tuple

Every independently relied-on record MUST bind the same non-empty identity tuple:

- `delivery_id`
- `request_id`
- `project_id`
- `mission_id`
- `task_id`
- `wake_trace_id`
- `host_id`
- `worker_id`
- `code_identity`
- `actor_id`
- `issuer`
- `config_identity`

No missing value may be inferred from a receipt, Green record, filename, surrounding event, or worker claim.

## Gate A — exact code and build provenance

Required evidence:

1. Exact AgentOS Git commit SHA and source tree used by the owner-machine run.
2. Exact PRS evaluator/probe commit SHA used for independent qualification.
3. Clean/dirty state recorded before execution.
4. Executable provenance for the real PowerShell binary used by the adapter, including a stable identity/hash or independently equivalent immutable identity.
5. Runtime version and platform facts sufficient to distinguish unsupported lock/runtime semantics.
6. Configuration identity/hash for the exact local runtime configuration.

Fail closed if code, executable, runtime, or configuration identity changes between admission and execution without a newly correlated assignment/evidence bundle.

## Gate B — owner-machine and supervised consent

Required evidence:

1. Evidence that the exercised host is the owner's physical Windows laptop, not a hosted runner or simulated host.
2. Canonical AgentOS `host_id` bound to that physical machine.
3. Explicit supervised owner consent for the bounded acceptance run.
4. Authenticated actor identity and trusted issuer evidence from the existing canonical AgentOS source.
5. Canonical authority/grant evidence resolving every required capability.

A caller-supplied `authenticated: true` value or injected test grant resolver is insufficient as end-to-end proof.

## Gate C — canonical pickup path

Required evidence:

1. The task is durably admitted through the canonical remote-admission contract.
2. Required downstream fields are present without out-of-band mutation, including consent, acceptance criteria, target/receiver, capabilities, scope, constraints, and exact identity correlation.
3. Existing scheduler/local-wake discovers or receives the task; no alternate scheduler/queue/worker registry is introduced.
4. Exact `delivery_id` -> `request_id` -> `task_id` -> `mission_id` -> `wake_trace_id` -> `host_id` -> `worker_id` correlation survives pickup.
5. Duplicate/replayed pickup produces zero second unauthorized execution or mutation.

Current known blocker on AgentOS PR #104 exact head `83a58b8bd230550b5781a0fee700cca250819a75`: the canonical non-PowerShell admission output lacks fields required by canonical local-wake and therefore does not satisfy this gate.

## Gate D — real PowerShell governed execution

Required evidence:

1. Real Windows PowerShell adapter invocation on the owner laptop, not a stubbed adapter.
2. Governed execution boundary records authority, consent, capability, policy, risk, budget, approval when required, execution receipt, verification, and reconciliation.
3. Execution remains within the explicitly bounded non-production acceptance workload.
4. Unsupported runtime/locking primitives fail closed before mutation.
5. Timeout/process-tree handling and executable identity drift rejection are exercised or independently evidenced for the exact runtime.

## Gate E — bounded project-file mutation

Required evidence:

1. Approved canonical root and exact target path.
2. Preimage hash/identity before mutation.
3. Desired postimage hash.
4. Prepared-write evidence where applicable.
5. Continuously enforced exclusive ownership spanning final validation, publish/recovery, post-write verification, durable success-receipt persistence, and commit/release.
6. Verified postimage identity/hash.
7. Durable receipt correlated to the full identity tuple.
8. Evidence that no unauthorized repository path changed.

Current known blocker on AgentOS PR #104 exact head `83a58b8bd230550b5781a0fee700cca250819a75`: PRS independently reproduced loss of continuous ownership for both normal publish and prepared-write recovery. A mutation plus success receipt is therefore insufficient on that exact target.

## Gate F — interruption and recovery

The owner-machine acceptance workload MUST include at least one intentional bounded interruption after durable prepared intent exists and before normal completion.

Required evidence:

1. Exact interruption point and persisted state after interruption.
2. No fabricated successful completion before recovery.
3. Recovery authority is independently correlated to project/mission/task/worker/path/intent/key/lock/prepared ID and is fresh.
4. Recovery does not steal a live/uncertain owner's lock.
5. Recovered publish preserves continuous ownership through durable receipt persistence.
6. Replay after successful recovery performs zero duplicate mutation.
7. If physical power loss is not exercised, that limitation remains explicitly `NOT PROVEN`; process interruption is not equivalent to power-loss durability.

## Gate G — concurrency and replay

Required physical or independently equivalent exact-runtime evidence:

1. Two competing governed writers cannot both publish under the same target ownership epoch.
2. A successor cannot displace a writer and leave the predecessor with a valid-looking success receipt.
3. Same idempotency key + same intent replays without second mutation.
4. Same idempotency key + different intent fails closed.
5. Duplicate delivery/task execution cannot create a second durable completion receipt.

## Gate H — durable result and evidence provenance

Required evidence:

1. Exactly one correlated execution record.
2. Durable final result with `COMPLETED` only after the governed execution requirements are met.
3. Durable execution receipt and mutation receipt as applicable.
4. Every referenced evidence artifact exists, is fresh enough for its policy, has independent provenance, and binds the full identity tuple.
5. Capability health evidence is task-specific, fresh, and bound to the owner host.
6. Result-write or receipt-write failure cannot be reconstructed as success from filesystem state alone.

## Gate I — Green qualification

Green is a separate qualification step and MUST NOT be synthesized by the worker, adapter, receipt binder, or PRS.

Required Green evidence:

1. `disposition: pass` from the canonical Green path.
2. Full twelve-field assignment identity exactly matches the independently expected assignment.
3. Green references independently resolved evidence rather than trusting worker claims.
4. Missing or conflicting identity/evidence fails closed.

PRS active adversarial lineage requires all twelve canonical identity fields on Green records as of PRS head `831834889182b235061156742a8ca1c4235f871e` / evaluator `offline-bridge-0.4`.

## Gate J — independent PRS qualification

PRS evaluation MUST occur after the execution/Green evidence bundle exists and MUST remain independent of the execution instance.

Required PRS outcome:

1. Exact PRS evaluator/probe identity recorded.
2. Complete independently loaded assignment + persisted evidence supplied.
3. All required checks pass; no unresolved high/critical finding.
4. `production_promotion_allowed` remains false unless a separate explicitly authorized production-promotion process exists.
5. PRS result states scope precisely; Level-2 physical acceptance is not overall AgentOS production readiness.

## Minimum evidence bundle

A complete bundle SHOULD contain machine-readable records for:

- physical host identity and environment
- owner consent/authenticated actor evidence
- authority/grant evidence
- admitted task
- scheduler/local-wake pickup/disposition
- execution claim
- executable provenance
- governed execution decision trail
- mutation prepared intent
- mutation/recovery receipt
- interruption/recovery decision and authority evidence
- final execution receipt/result
- capability health
- Green result
- PRS result
- exact code/config hashes
- negative/adversarial case outcomes

The bundle MUST be copied or persisted outside the worker-controlled execution path before independent review so the worker cannot be the sole custodian of evidence used to certify itself.

## Required negative cases

Physical acceptance is not eligible for PASS unless the exact runtime demonstrates fail-closed behavior for at least:

1. actor authentication missing/mismatched;
2. grant missing/incomplete/outside policy;
3. required admission field missing;
4. host mismatch;
5. capability mismatch;
6. executable provenance drift;
7. stale/wrong preimage;
8. outside-root/reparse/junction escape;
9. duplicate delivery/replay;
10. concurrent writer/successor displacement;
11. interruption after prepared evidence;
12. receipt/result persistence failure;
13. stale/mismatched recovery authority;
14. Green missing/conflicting identity;
15. missing/stale/unresolved evidence.

## Dispositions

- **PASS / physical acceptance proven:** every mandatory gate above has exact correlated evidence and all required negative cases pass on the physical owner machine/exact runtime.
- **FAIL:** a required property is independently falsified.
- **INSUFFICIENT EVIDENCE:** no falsification is established, but one or more mandatory gates are unexercised, ambiguous, stale, hosted-only, or lack independent provenance.
- **BLOCKED:** a known upstream defect prevents meaningful execution of a later gate.

## Current portfolio disposition

As of the exact AgentOS PR #104 head `83a58b8bd230550b5781a0fee700cca250819a75`:

- Gate C canonical admission -> local-wake compatibility: **FAIL**.
- Gate E continuous project-file ownership: **FAIL**.
- Authenticated transport/canonical grant-source end-to-end provenance: **NOT PROVEN**.
- Owner physical Windows acceptance: **NOT PROVEN**.
- Scheduler/local-wake owner-machine acceptance: **NOT PROVEN**.
- Physical power-loss durability: **NOT PROVEN**.
- Production remote execution: **NOT AUTHORIZED**.
- Overall AgentOS GREEN: **NOT ISSUED**.

Hosted Windows evidence remains useful bounded evidence only and must not be relabelled as owner physical Windows acceptance.