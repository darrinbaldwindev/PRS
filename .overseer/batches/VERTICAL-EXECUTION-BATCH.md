# PRS Vertical Execution Batch

**Batch:** PRS-VERTICAL-2026-09-14-01  
**Reconciled:** 2026-09-14 18:41 Australia/Brisbane  
**Canonical PRS main:** `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`  
**Execution mode:** fresh scan -> prioritize -> execute fullest safe batch -> exact-head verify -> rescan -> replenish -> durable log

## Mission

Maximize useful PRS assurance progress per owner interaction while preserving independent evidence boundaries. AgentOS owns execution/orchestration; PRS independently challenges claims, detects false-GREEN conditions, preserves provenance, and withholds assurance where evidence is insufficient.

## Automatic trigger

`cont`, `continue`, `continue autonomously`, and `continue autonomously vertically` mean:
1. fresh-scan PRS and every linked exact target needed by the current P0;
2. reconcile this batch file against live heads;
3. execute the fullest safe useful vertical batch without asking for already-authorized confirmations;
4. verify exact changed state and CI/evidence;
5. fresh-scan again;
6. downgrade moved-head evidence to historical;
7. replenish this same batch with the next highest-value unresolved tasks;
8. durably log the result to relevant PRS issue/PR and Overseer coordination.

## Hard governance boundaries

- No merge, approval, ready transition, rebase, deployment, credential/security-setting changes, production writes, purchases, supplier contact, lock clearing, scheduler mutation, or production autonomy.
- No alternate scheduler, worker registry, mission ledger, authority system, governance layer, persistence layer, assurance source of truth, or remediation authority.
- Exact-head evidence only.
- Hosted/CI Windows evidence is not owner physical Windows acceptance.
- Worker success, filesystem state, receipt presence, CI success, Green, and PRS are distinct evidence/decision layers.

## Current exact state

### PRS
- `main`: `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`.
- PR #17 active adversarial head: `604920cd8f50121200c7c82ac29b42c894df07b5` — OPEN / DRAFT / UNMERGED.
- PR #17 validation merge commit: `ff139ec3bceb9df9777fddafe257bb936c0cf991`.
- PR #23 head: `ea6d40c06361f3f598eb71b2e009feefb46c4d37` — OPEN / DRAFT / UNMERGED.
- PR #23 is one doctrine-only commit behind current main; the only intervening main file is `.overseer/VERTICAL-BATCH-ADOPTION.md`, so its six-file functional evidence is not invalidated, but no autonomous rebase is permitted.

### AgentOS
- PR #104 exact current head: `83a58b8bd230550b5781a0fee700cca250819a75` — OPEN / DRAFT / UNMERGED.
- No new project-file ownership or admission/local-wake implementation change was detected in this cycle.

## Controlling P0 findings

### A. Continuous project-file ownership — FAIL
PRS independently reproduced on exact AgentOS `83a58b8...` that both normal publish and prepared-write recovery can mutate the target and persist a success receipt before release discovers ownership loss.

Disposition:
- project-file continuous ownership: **FAIL**;
- project-file production promotion: **NOT ALLOWED**.

### B. Remote admission -> local-wake compatibility — FAIL
On exact AgentOS `83a58b8...`, canonical non-PowerShell admission omits `consent_mode`, `acceptance_criteria`, and `target`, while canonical local-wake requires them before execution.

Disposition:
- canonical admission/local-wake compatibility: **FAIL**;
- authenticated transport provenance: **NOT PROVEN**;
- canonical grant-source end-to-end provenance: **NOT PROVEN**;
- production remote execution: **NOT AUTHORIZED**.

## PRS hardening completed

### Complete Green assignment identity
The unique semantic hardening from stale PR #19 was ported onto active PR #17 without rebasing/merging the stale PR.

Current behavior:
- Green must match all twelve canonical assignment identity fields;
- 12 negative tests reject missing/mismatched delivery, request, host, actor, issuer and configuration identity;
- evaluator provenance is `offline-bridge-0.4`.

## Physical Windows Level-2 acceptance contract

Created on active PR #17:
- `docs/OWNER-WINDOWS-LEVEL2-ACCEPTANCE-CONTRACT.md`
- exact current head: `604920cd8f50121200c7c82ac29b42c894df07b5`.

The contract requires separate mandatory gates for:
1. exact AgentOS/PRS code and build provenance;
2. physical owner-machine identity and supervised consent;
3. canonical authenticated actor + authority/grant evidence;
4. canonical scheduler/local-wake pickup with complete correlation;
5. real PowerShell governed execution on the owner laptop;
6. bounded project-file mutation with continuous ownership through receipt persistence/release;
7. intentional interruption plus correlated recovery;
8. concurrency/replay/idempotency negative cases;
9. durable result/evidence provenance;
10. Green qualification with full 12-field identity;
11. independent PRS qualification after Green;
12. off-worker evidence custody for independent review.

It explicitly distinguishes PASS / FAIL / INSUFFICIENT EVIDENCE / BLOCKED and states that process interruption is not proof of physical power-loss durability.

Current physical disposition remains:
- owner physical Windows acceptance: **NOT PROVEN**;
- scheduler/local-wake owner-machine acceptance: **NOT PROVEN**;
- physical power-loss durability: **NOT PROVEN**;
- overall AgentOS GREEN: **NOT ISSUED**.

## Exact-head verification for current PR #17 head

Current head: `604920cd8f50121200c7c82ac29b42c894df07b5`.

GitHub Actions `Validate repository` run #143 / `34823845958`:
- validation merge commit: `ff139ec3bceb9df9777fddafe257bb936c0cf991`;
- Linux validate job `103911303285`: **SUCCESS**;
- `python -m pytest -q`: **129 passed in 0.17s**;
- hosted Windows Level-2 job `103911302893`: **SUCCESS**;
- hosted writer/filesystem/process/executable-provenance steps: SUCCESS;
- validation artifact `prs-validation-evidence-34823845958-1`, ID `10339193628`, SHA256 `a421ccd77fb2c8e8fe41e911aae14b6269f8f52624ebf68bb3ac5c860974c8cf`;
- hosted Windows artifact `prs-hosted-windows-level2-34823845958-1`, ID `10339610036`, SHA256 `97feca898e160b57b7a030c52315e6d8469bfc6fbff54c052aa728fe151029af`.

All focused PR #17 workflows observed for this exact head completed SUCCESS as execution evidence.

This exact-head CI verifies repository/probe integrity after adding the contract. It does **not** prove physical owner-laptop acceptance.

## PR #23 current-main reconciliation

- PR #23 exact head: `ea6d40c06361f3f598eb71b2e009feefb46c4d37`.
- Current main is one commit ahead of PR #23's base.
- Direct compare shows that intervening main commit only adds `.overseer/VERTICAL-BATCH-ADOPTION.md`.
- PR #23's functional files are untouched by that main change; existing PR #23 exact-head evidence remains evidence for its own head.
- No autonomous rebase/merge was performed; a reconciliation comment was added to PR #23.

## Stale-lineage classification

- PR #15: superseded implementation vehicle; retain historical evidence.
- PR #16: evidence/ancestry lineage; not a standalone current promotion vehicle.
- PR #19: unique hardening ported and exact-head verified on active PR #17; stale/evidence-only implementation vehicle. Do not close/rebase/merge autonomously.
- PR #22: superseded implementation vehicle; canonical main + PR #23 cover current v0.1 consolidation/hardening direction.

## Replenished priority queue

### P0-1 — Challenge first admission/local-wake repair
When AgentOS #104 changes relevant code:
1. fresh-fetch exact head;
2. compare admission/local-wake modules against `83a58b8...`;
3. rerun immutable PRS compatibility probe unchanged first;
4. require canonical downstream consent/acceptance/target fields or a single reconciled canonical contract;
5. prove existing authenticated actor and grant source end to end rather than with injected test substitutes;
6. preserve exact delivery/request/project/mission/task/wake/host/worker/code/actor/issuer/config correlation.

### P0-2 — Challenge first project-file ownership repair
When AgentOS #104 changes writer/ownership code:
1. fresh-fetch exact head;
2. identify kernel-enforced ownership and crash-release semantics;
3. rerun normal/recovery successor-displacement probes unchanged first;
4. require durable success receipt within the continuously owned commit boundary;
5. only then expand crash/concurrency/replay cases;
6. require independent Green then PRS before any promotion consideration.

### P0-3 — Machine-readable physical acceptance evidence contract
If AgentOS remains unchanged:
1. define a bounded JSON schema/checklist matching `OWNER-WINDOWS-LEVEL2-ACCEPTANCE-CONTRACT.md`;
2. require explicit identity/evidence references rather than prose inference;
3. make unexercised gates resolve to `INSUFFICIENT_EVIDENCE`, never PASS;
4. keep the schema/evaluator offline, deterministic and non-authoritative;
5. add negative fixtures for hosted-only evidence, missing physical-host proof, missing scheduler/local-wake proof, incomplete 12-field correlation, missing crash/recovery proof, and worker-only evidence custody;
6. do not connect the evaluator to owner hardware while AgentOS P0 blockers remain unresolved.

### P1-1 — PRS core hygiene
- keep PR #23 independent of PR #17;
- preserve dependency-light deterministic v0.1 evaluator;
- track Node action deprecation as maintenance, not assurance semantics.

## Execution log

- [x] fresh PRS/AgentOS scan.
- [x] confirmed AgentOS #104 still exact `83a58b8...`.
- [x] reconciled PR #23 against current main without rebase.
- [x] recorded PR #23 comparison on PR #23.
- [x] created owner physical Windows Level-2 acceptance contract.
- [x] exact current-head Linux CI passed with 129 tests.
- [x] exact current-head hosted Windows evidence job passed.
- [x] validation and hosted-Windows artifact IDs/hashes recorded.
- [x] physical acceptance remains explicitly unproven despite hosted CI success.
- [x] batch replenished with machine-readable physical evidence-contract work.

## Replenishment rule

Every autonomous continuation starts from a fresh repo/head scan. Never assume recorded heads remain current. Reconcile first, execute second, verify third, rescan fourth, then replenish again.