# PRS Vertical Execution Batch

**Batch:** PRS-VERTICAL-2026-09-14-01  
**Reconciled:** 2026-09-14 Australia/Brisbane  
**Canonical PRS main at rescan:** `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`  
**Execution mode:** fresh scan -> prioritize -> execute -> exact-head verify -> rescan -> replenish -> durable log

## Mission

Maximize useful PRS assurance progress per owner interaction while preserving independent evidence boundaries. AgentOS owns execution/orchestration; PRS challenges claims, detects false-GREEN conditions, preserves provenance, and withholds assurance where evidence is insufficient.

## Automatic trigger

`cont`, `continue`, `continue autonomously`, and `continue autonomously vertically` mean:
1. fresh-scan PRS and every linked exact target needed by the current P0;
2. reconcile this batch file against those live heads;
3. execute the fullest safe useful vertical batch without asking for already-authorized confirmations;
4. verify exact changed state and CI/evidence;
5. fresh-scan again;
6. convert moved-head evidence to historical status;
7. replenish this same batch with the next highest-value unresolved tasks;
8. durably log the result to the relevant PRS issue/PR and Overseer coordination source.

## Hard governance boundaries

- No merge, approval, ready transition, rebase, deployment, credential/security-setting changes, production writes, purchases, supplier contact, lock clearing, scheduler mutation, or production autonomy.
- No alternate scheduler, worker registry, mission ledger, authority system, governance layer, persistence layer, assurance source of truth, or remediation authority.
- Exact-head evidence only. A moved target invalidates prior current-head claims and downgrades them to historical evidence.
- Hosted/CI Windows evidence is not owner physical Windows acceptance.
- Worker success, filesystem state, or receipt presence alone never implies Green/PRS certification or overall completion.

## Fresh state after execution

### PRS
- `main`: `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`.
- PR #17 adversarial head: `8479ae148694af24ae5a492036f3b5cd56fd8c5c` — OPEN / DRAFT / UNMERGED.
- All 12 pull-request workflows associated with PR #17 head `8479ae...` completed SUCCESS as execution runs.
- PR #23 remains independent bounded v0.1 adapter/package hardening; do not conflate it with AgentOS assurance.

### AgentOS linked target
- PR #104 exact current head at end-of-batch rescan: `71c463a77b31ebeac2bfe00da13c684512daccf7`.
- Exact source tree challenged: `b7f8ce749552aad03002d4d48806232d47f2a435`.
- `runtime/project-file-writer.mjs` SHA256: `bf36ef114c6db43e3b79be5d28a5850ead70f10156de390f249ec536e63cb12c`.
- PR #104 remains DRAFT / UNMERGED. No scheduler/local-wake PowerShell production execution is enabled.

## Completed P0 in this batch

### P0-A — Normal project-file commit ownership
**Result: DEFECT REPRODUCED.**

PRS immutable probe: `scripts/challenge-agentos-project-file-commit-ownership.mjs`.

Observed on exact AgentOS `71c463a...`:
- target mutation occurred;
- success receipt persisted;
- successor lock survived;
- only afterward did release fail with `PROJECT_FILE_LOCK_RECOVERY_REQUIRED`.

Therefore success receipt + verified postimage do not prove continuously held ownership through commit.

### P0-B — Recovery project-file commit ownership
**Result: DEFECT REPRODUCED.**

Prepared-write recovery reproduced the same ordering defect:
- recovery mutation occurred;
- success receipt persisted;
- successor lock survived;
- only afterward did lock release detect ownership loss.

### P0-C — Exact-head verification evidence
GitHub Actions `Validate AgentOS project-file current head`:
- run #8 / `34810516744`: SUCCESS as assurance execution;
- PR validation merge commit: `acc757418e52d57f7a4cb18986d1f5e36d4cf4ea`;
- probe disposition: `DEFECT_REPRODUCED`;
- defect count: `2`;
- evidence artifact: `prs-agentos-project-file-current-head-34810516744-1`;
- artifact ID: `10334129980`;
- artifact zip SHA256: `6760fe9e80ca32482dcc214924cc5e844656935df71e911b38a67a81f054e489`.

A SUCCESS workflow means the assurance probes executed correctly. It does not upgrade the target to PASS/GREEN.

### P0-D — Durable reconciliation
Completed:
- PRS issue #20 retargeted to exact AgentOS `71c463a...`, with continuous-ownership cases 25/26 explicitly recorded as falsified.
- PRS PR #17 body reconciled to exact PRS/AgentOS heads and evidence.
- Overseer issue #49 updated with exact defect/evidence and limitations.
- end-of-batch rescan confirmed AgentOS #104 remains at exact tested head `71c463a...`.

## Current disposition

For AgentOS PR #104 exact head `71c463a...`:
- ordinary bounded containment/preimage/idempotency/recovery-governance negative cases: execution evidence PASS;
- continuous ownership through normal publish + receipt + release: **FAIL**;
- continuous ownership through recovery publish + receipt + release: **FAIL**;
- project-file mutation production promotion: **NOT ALLOWED**;
- overall AgentOS GREEN: **NOT ISSUED**.

## Replenished priority queue

### P0-1 — Challenge the next AgentOS ownership repair immediately
On the next AgentOS #104 head change:
1. fresh-fetch the exact head before reading claims;
2. inspect whether a kernel-enforced ownership primitive spans final publish/recovery, receipt persistence and commit release;
3. retarget the immutable PRS commit-ownership probe only after reviewing the exact implementation;
4. reproduce both normal and recovery races;
5. require the old failing fixtures to become negative-case PASS without weakening them;
6. record exact Git/tree/module identity and artifact hashes;
7. keep production promotion blocked until independent Green and PRS both pass the repaired exact head.

### P0-2 — Owner physical Windows acceptance contract
Maintain a separate evidence gate requiring all of:
- exact AgentOS commit/tree/build identity;
- owner-machine host identity and explicit supervised owner consent;
- real PowerShell adapter execution on the owner's laptop;
- scheduler/local-wake pickup with exact project/mission/task/wake/host/worker correlation;
- bounded project-file mutation with preimage/postimage and durable receipt;
- intentional interruption/crash and correlated recovery evidence;
- executable provenance and drift rejection;
- no unsupported Windows lock primitive fallback;
- exact result/receipt/Green/PRS correlation;
- Green qualification followed by independent PRS qualification;
- evidence bundle copied off the worker path for independent review.

Hosted Windows CI must remain labelled hosted evidence only.

### P0-3 — Admission/authentication seam
Fresh-scan AgentOS PR #104/#91 before execution. Challenge the current authenticated transport / canonical grant lookup / task-field binding path. No production remote execution is acceptable while authenticated admission identity remains only a composition seam.

### P1-1 — PRS core hygiene
- fresh-check PR #23 against current `main` before any further change;
- keep PR #22 historical/superseded where canonical main already absorbed its intent;
- preserve one dependency-light/offline core evaluator and deterministic provenance;
- do not mix evaluator cleanup into PR #17.

### P1-2 — Stale lineage inventory
Inventory PR #15/#16/#19/#22 against current canonical main. Classify each as still-needed, superseded, or evidence-only. Do not close/merge/rebase autonomously; record recommendations with exact overlap evidence.

## Execution log

- [x] fresh PRS scan before batch.
- [x] fresh AgentOS #104 exact-head scan.
- [x] moved target detected (`7f82f1d...` -> `71c463a...`) before assurance claim.
- [x] exact current project-file source inspected.
- [x] immutable normal-publish commit-ownership adversarial probe added.
- [x] immutable prepared-recovery commit-ownership adversarial probe added.
- [x] exact-head CI executed.
- [x] normal ownership defect independently reproduced.
- [x] recovery ownership defect independently reproduced.
- [x] evidence artifact/hash recorded.
- [x] PRS issue #20 reconciled.
- [x] PRS PR #17 reconciled.
- [x] Overseer issue #49 updated.
- [x] end-of-batch AgentOS #104 rescan performed; target remained `71c463a...`.
- [x] batch replenished with next P0/P1 tasks.

## Replenishment rule

Every autonomous continuation starts from a fresh repo/head scan. Never assume this file's recorded heads are still current. Reconcile first, execute second, verify third, rescan fourth, then replenish again.