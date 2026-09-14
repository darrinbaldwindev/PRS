# PRS Vertical Execution Batch

**Batch:** PRS-VERTICAL-2026-09-14-01  
**Reconciled:** 2026-09-14 18:40 Australia/Brisbane  
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

Verified predecessor exact PRS head `831834889182b235061156742a8ca1c4235f871e`:
- Validate repository run #141 / `34823444673`;
- Linux: 129 tests PASS;
- hosted Windows Level-2 job PASS;
- validation artifact ID `10339078228`, SHA256 `514e2dc7dcc12fa402751806aac9f565eaacec39ba0b91fc1fbdd074bc7e785a`;
- hosted Windows artifact ID `10338998585`, SHA256 `835d284d2a75735a639b45b90c4b5f98361214a46d8a167a9c69e117845a1a2c`.

The current PR #17 head moved only by the new acceptance-contract documentation below, so new exact-head CI is being collected before the current head is labelled fully verified.

## Physical Windows Level-2 acceptance contract

Created on active PR #17:
- `docs/OWNER-WINDOWS-LEVEL2-ACCEPTANCE-CONTRACT.md`
- commit/head: `604920cd8f50121200c7c82ac29b42c894df07b5`.

The contract now requires, as separate mandatory gates:
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

## Exact-head CI for current PR #17 head

Current head: `604920cd8f50121200c7c82ac29b42c894df07b5`.

- focused PR #17 workflows seen so far: SUCCESS;
- Validate repository run #143 / `34823845958`:
  - Linux validate job `103911303285`: SUCCESS;
  - `python -m pytest -q`: **129 passed in 0.17s**;
  - validation evidence artifact uploaded: `prs-validation-evidence-34823845958-1`, artifact ID `10339193628`, SHA256 `a421ccd77fb2c8e8fe41e911aae14b6269f8f52624ebf68bb3ac5c860974c8cf`;
  - hosted Windows job `103911302893`: still executing at this reconciliation; writer, filesystem and process probes have passed and executable-provenance probe is in progress.

No physical-laptop claim may be inferred from this hosted job, regardless of its final conclusion.

## Stale-lineage classification

- PR #15: superseded implementation vehicle; retain historical evidence.
- PR #16: evidence/ancestry lineage; not a standalone current promotion vehicle.
- PR #19: unique hardening has now been ported and exact-head verified on active PR #17; stale/evidence-only implementation vehicle. Do not close/rebase/merge autonomously.
- PR #22: superseded implementation vehicle; canonical main + PR #23 cover the current v0.1 consolidation/hardening path.

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

### P0-3 — Turn physical acceptance contract into a machine-readable evidence checklist
Next safe PRS work if AgentOS remains unchanged:
1. define a bounded JSON evidence-bundle schema/checklist matching the new physical acceptance contract;
2. require explicit booleans/identity refs rather than prose inference;
3. make unexercised gates produce `INSUFFICIENT_EVIDENCE`, never PASS;
4. keep the schema/evaluator offline and non-authoritative;
5. do not connect it to owner hardware until upstream AgentOS P0 blockers are repaired.

### P1-1 — PRS core hygiene
- keep PR #23 independent of PR #17;
- preserve dependency-light deterministic v0.1 evaluator;
- address Node action deprecation only as maintenance, not as an assurance-semantic change.

## Execution log

- [x] fresh PRS/AgentOS scan.
- [x] confirmed AgentOS #104 still exact `83a58b8...`.
- [x] confirmed PRS #17 Green identity hardening exact state.
- [x] reconciled PR #23 against current main without rebase.
- [x] recorded PR #23 current-main comparison on PR #23.
- [x] created owner physical Windows Level-2 acceptance contract.
- [x] current-head Linux CI passed with 129 tests.
- [x] current-head validation artifact ID/hash recorded.
- [ ] current-head hosted Windows general validation job final conclusion pending at time of this reconciliation.
- [x] batch replenished with machine-readable physical evidence-contract work if AgentOS remains unchanged.

## Replenishment rule

Every autonomous continuation starts from a fresh repo/head scan. Never assume recorded heads remain current. Reconcile first, execute second, verify third, rescan fourth, then replenish again.