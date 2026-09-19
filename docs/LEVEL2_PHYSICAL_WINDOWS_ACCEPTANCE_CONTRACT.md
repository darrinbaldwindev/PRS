# PRS Level 2 Physical Windows Acceptance Contract

**Status:** draft assurance contract  
**Scope:** owner-supervised physical Windows laptop acceptance for AgentOS Level 2  
**Authority boundary:** PRS evaluates evidence only. It does not grant runtime authority, clear locks, mutate scheduler state, approve production promotion, or replace Green.

## Purpose

Define the minimum independent evidence required before PRS may say that AgentOS Level 2 has been exercised successfully on the owner's actual Windows laptop.

Hosted Windows CI, deterministic Windows-path fixtures, mock adapters, or repository-side acceptance harnesses are useful evidence but are not substitutes for physical owner-machine acceptance.

## Required identity envelope

One acceptance run must bind every artifact to one exact immutable execution envelope:

- `agentos_commit_sha`
- `agentos_tree_sha`
- installed/executed build identity
- executable/script identity and digest where applicable
- `project_id`
- `mission_id`
- `task_id`
- `wake_id`
- `delivery_id` / request identity where present
- `host_id`
- `worker_id`
- actor / authority / issuer identity
- policy/configuration identity
- acceptance-run ID
- capture timestamps with one declared clock/source

Missing or conflicting required identity is a fail-closed assurance result, not an inferred match.

## Gate A — Owner machine and consent

Required:

1. Evidence must identify the actual owner laptop host, not a hosted runner or VM substituted for it.
2. Owner-supervised consent for the bounded acceptance mission must be recorded.
3. Machine identity evidence must be bound to the same task/wake/worker envelope used by execution receipts.
4. PRS must be able to distinguish the physical-owner run from hosted CI evidence.

Failure condition: host identity absent, ambiguous, stale, or conflicting.

## Gate B — Real scheduler/local-wake pickup

Required:

1. The existing canonical scheduler/local-wake path must discover/pick up the bounded task.
2. Pickup must preserve exact project/mission/task/wake/host/worker correlation.
3. No manually invoked substitute path may be represented as scheduler/local-wake proof.
4. Duplicate pickup/replay must not produce duplicate mutation or duplicate completion evidence.

Failure condition: task can only be executed by direct/manual adapter invocation, or pickup identity cannot be correlated exactly.

## Gate C — Real PowerShell adapter execution

Required:

1. Execute at least one bounded allow-listed PowerShell operation through the governed adapter on the physical machine.
2. Preserve command/operation identity, executable provenance, exit state, captured result, and receipt correlation.
3. Unsupported runtime primitives must fail closed; no silent fallback to weaker locking/execution behavior.
4. Executable/path/version drift after admission must be rejected or surfaced as recovery/assurance failure.

Failure condition: mock-only evidence, unbound executable identity, unrestricted shell authority, or provenance drift accepted silently.

## Gate D — Governed project-file mutation

Required bounded fixture:

1. approved-root containment proven on the physical filesystem;
2. exact preimage captured;
3. authorized bounded mutation performed;
4. exact postimage independently re-read;
5. prepared-write evidence and durable receipt correlated to the same task and intent;
6. idempotent replay produces no duplicate mutation;
7. stale preimage and path-escape negative cases fail closed;
8. writer ownership remains continuously enforced through publish/recovery, verification, receipt persistence, and commit release.

A target mutation plus a persisted success receipt is insufficient if ownership can be lost before commit release.

## Gate E — Crash/interruption and recovery

At least one deliberately interrupted bounded run must exercise a real recovery boundary on the owner machine.

Required:

- exact interruption point recorded;
- no fabricated success receipt after interruption;
- retained/prepared state independently inspectable;
- recovery requires explicit, correctly correlated recovery evidence/authority;
- stale, mismatched, replayed, future, expired, or differently correlated recovery evidence is rejected;
- recovered result binds to the original prepared intent and exact postimage;
- recovery does not steal a live or uncertain lock;
- power-loss durability remains UNKNOWN unless the test actually includes physical power loss or an equivalent independently justified durability experiment.

## Gate F — Receipt, result, Green, and PRS separation

Required order:

1. worker executes bounded task;
2. exact durable result and mutation receipt exist;
3. execution verification checks exact correlation and evidence;
4. Green independently evaluates its own gate;
5. PRS independently evaluates supplied evidence after Green;
6. only then may a higher-level coordinator consider completion eligibility.

Prohibited inference:

- worker success -> Green
- receipt presence -> Green
- filesystem postimage -> Green
- Green -> PRS
- hosted CI PASS -> physical acceptance
- PRS bounded PASS -> overall AgentOS GREEN

## Gate G — Evidence export and independence

The acceptance bundle must be copied/persisted outside the mutable worker execution path before PRS evaluates it.

Minimum bundle:

- exact Git/build identities;
- host identity evidence;
- authority/consent evidence;
- scheduler/local-wake pickup evidence;
- adapter/executable provenance;
- task/result/receipt artifacts;
- preimage/postimage hashes;
- prepared/recovery evidence for interrupted case;
- Green result and provenance;
- PRS result and provenance;
- timestamps and correlation IDs;
- explicit list of untested boundaries.

The worker must not be the sole verifier of its own completion.

## Required negative acceptance cases

The physical acceptance mission must include bounded attempts proving fail-closed behavior for at least:

1. stale/wrong preimage;
2. out-of-root target/junction or equivalent physical Windows containment boundary where permitted;
3. duplicate/replayed task;
4. conflicting idempotency intent;
5. missing/mismatched receipt;
6. executable provenance drift;
7. missing/mismatched authority or consent;
8. stale/conflicting host identity;
9. retained/uncertain lock;
10. recovery evidence mismatch/replay;
11. result/receipt/task/wake/host correlation mismatch;
12. Green or PRS evidence missing;
13. success evidence created before continuous mutation ownership is safely released.

## Disposition vocabulary

- `PHYSICAL_WINDOWS_ACCEPTANCE_VERIFIED` — every required gate and required negative case is evidenced for one exact immutable run envelope.
- `PHYSICAL_WINDOWS_ACCEPTANCE_FAILED` — a required property is falsified.
- `PHYSICAL_WINDOWS_ACCEPTANCE_INSUFFICIENT_EVIDENCE` — required evidence is absent, stale, ambiguous, hosted-only, or not exactly correlated.
- `PHYSICAL_WINDOWS_ACCEPTANCE_BLOCKED` — the acceptance mission cannot safely proceed because a required authority/capability/runtime primitive is unavailable.

## Current known state

As of the PRS vertical batch that tested AgentOS PR #104 exact head `71c463a77b31ebeac2bfe00da13c684512daccf7`:

- owner physical Windows acceptance: **NOT PROVEN**;
- scheduler/local-wake owner-machine pickup: **NOT PROVEN**;
- current-head physical power-loss durability: **NOT PROVEN**;
- project-file continuous ownership through commit: **FAILED in independent PRS POSIX adversarial probes**;
- production promotion: **NOT ALLOWED**;
- overall AgentOS GREEN: **NOT ISSUED**.

This document defines evidence requirements only. It does not authorize executing the physical acceptance mission without the existing AgentOS authority/consent controls and owner supervision.