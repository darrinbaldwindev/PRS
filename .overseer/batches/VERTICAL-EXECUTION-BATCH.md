# PRS Vertical Execution Batch

**Batch:** PRS-VERTICAL-2026-09-14-01  
**Reconciled:** 2026-09-14 18:15 Australia/Brisbane  
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

## Fresh state after this execution cycle

### PRS
- `main`: `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`.
- PR #17 adversarial head: `0defebe26f71e1cf5df1168fa5454bfd8de30091` — OPEN / DRAFT / UNMERGED.
- PR #17 exact-head project-file workflow run #9 / `34821646371`: SUCCESS as assurance execution.
- PR #23 remains independent bounded v0.1 adapter/package hardening; do not conflate it with AgentOS assurance.

### AgentOS linked target
- PR #104 exact current head at rescan: `83a58b8bd230550b5781a0fee700cca250819a75` — OPEN / DRAFT / UNMERGED.
- Exact source tree challenged: `be291054df911b487dfbf1c0e7d409fb54a61789`.
- `runtime/project-file-writer.mjs` SHA256: `bf36ef114c6db43e3b79be5d28a5850ead70f10156de390f249ec536e63cb12c`.
- Compare `71c463a...` -> `83a58b8...`: three commits changed only AgentOS vertical-batch documentation and remote-authority regression tests. The project-file writer is unchanged.
- AgentOS batch explicitly keeps continuous ownership A-OWN-01 BLOCKED and physical Windows acceptance A-WIN-09 HOLD.

## Completed P0 in this cycle

### P0-A — Detect moved target before assurance claim
**Completed.**

Fresh scan found AgentOS #104 had moved from previously falsified `71c463a...` to `83a58b8...`. Prior evidence was treated as historical immediately; no current-head claim was made from old evidence.

### P0-B — Retarget immutable PRS project-file challenge
**Completed.**

Updated `.github/workflows/validate-agentos-project-file-current-head.yml` on PRS PR #17 to exact AgentOS target `83a58b8...`, then executed the same immutable probes without weakening the negative cases.

### P0-C — Current exact-head ownership challenge
**Result: DEFECT REPRODUCED.**

Normal publish:
- target mutated;
- durable success receipt persisted;
- successor lock survived;
- only afterward did release fail `PROJECT_FILE_LOCK_RECOVERY_REQUIRED`.

Prepared-write recovery:
- recovered target mutated;
- durable success receipt persisted;
- successor lock survived;
- only afterward did release fail `PROJECT_FILE_LOCK_RECOVERY_REQUIRED`.

Probe disposition: `DEFECT_REPRODUCED`, `defect_count: 2`.

Therefore a success receipt + verified postimage do not prove continuously held ownership through final commit/release on current exact head.

### P0-D — Exact-head verification evidence
GitHub Actions `Validate AgentOS project-file current head`:
- run #9 / `34821646371`: SUCCESS as assurance execution;
- PR validation merge commit: `80fc18af3ec008609299da4c287f551f48e48a41`;
- AgentOS target: `83a58b8bd230550b5781a0fee700cca250819a75`;
- evidence artifact: `prs-agentos-project-file-current-head-34821646371-1`;
- artifact ID: `10338681051`;
- artifact zip SHA256: `ceb5ef0d4cdb9d7a4747f662215788169b33186a8cf0dc55d5ce332eb17b349c`.

The same exact-head run retained PASS for bounded ordinary external-mutation detection, approved-root containment, stale preimage rejection, idempotency conflict, prepared-state tamper/identity rejection, lock recovery fail-closed behavior, and recovery-governance correlation/authority cases.

A SUCCESS workflow means the assurance probes executed correctly. It does not upgrade the AgentOS target to PASS/GREEN.

### P0-E — Durable reconciliation
Completed:
- PRS PR #17 body updated to exact PRS `0defebe...` / AgentOS `83a58b8...` state and evidence.
- PRS issue #20 current-head checkpoint posted; prior `71c463a...` evidence explicitly historical.
- Overseer issue #49 updated with current exact defect/evidence and limitations.
- no merge, approval, ready transition, rebase, deployment, credential change, production write or production autonomy occurred.

## Current disposition

For AgentOS PR #104 exact head `83a58b8...`:
- bounded containment/preimage/idempotency/recovery-governance negative cases: execution evidence PASS;
- continuous ownership through normal publish + receipt + release: **FAIL**;
- continuous ownership through recovery publish + receipt + release: **FAIL**;
- project-file mutation production promotion: **NOT ALLOWED**;
- owner physical Windows acceptance: **NOT PROVEN**;
- scheduler/local-wake owner-machine acceptance: **NOT PROVEN**;
- overall AgentOS GREEN: **NOT ISSUED**.

## Replenished priority queue

### P0-1 — Challenge the first real ownership primitive change
On the next AgentOS #104 head that changes `runtime/project-file-writer.mjs` or its ownership dependency:
1. fetch exact head and compare against `83a58b8...`;
2. identify the kernel-enforced ownership primitive and its crash-release semantics;
3. rerun the immutable normal + recovery successor-displacement probes unchanged first;
4. add homogeneous crash/concurrency cases only after the old defects stop reproducing;
5. require durable receipt creation to remain inside the continuously owned commit boundary;
6. record exact tree/module hashes and artifact hashes;
7. keep promotion blocked until independent Green and PRS both pass that exact head.

### P0-2 — Authenticated admission/grant seam
Current AgentOS batch keeps A-AUTH-05 BLOCKED. Next PRS work should challenge the existing canonical authenticated actor + grant source path and required correlation preservation without inventing a duplicate authority source. Acceptance must prove missing/untrusted actor or grant evidence cannot reach local-wake execution.

### P0-3 — Owner physical Windows acceptance contract
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

Hosted Windows CI remains hosted evidence only.

### P1-1 — PRS core hygiene
- fresh-check PR #23 against current `main` before any further change;
- keep PR #22 historical/superseded where canonical main already absorbed its intent;
- preserve one dependency-light/offline core evaluator and deterministic provenance;
- do not mix evaluator cleanup into PR #17.

### P1-2 — Stale lineage inventory
Inventory PR #15/#16/#19/#22 against current canonical main. Classify each as still-needed, superseded, or evidence-only. Do not close/merge/rebase autonomously; record recommendations with exact overlap evidence.

## Execution log

- [x] fresh PRS scan before cycle.
- [x] fresh AgentOS #104 exact-head scan.
- [x] moved target detected (`71c463a...` -> `83a58b8...`) before current-head claim.
- [x] exact AgentOS diff inspected; project-file writer confirmed unchanged.
- [x] PRS exact-target workflow retargeted.
- [x] exact-head CI executed.
- [x] normal ownership defect independently reproduced on `83a58b8...`.
- [x] recovery ownership defect independently reproduced on `83a58b8...`.
- [x] evidence artifact/hash recorded.
- [x] PRS PR #17 reconciled.
- [x] PRS issue #20 reconciled.
- [x] Overseer issue #49 reconciled.
- [x] batch replenished with next P0/P1 tasks.

## Replenishment rule

Every autonomous continuation starts from a fresh repo/head scan. Never assume this file's recorded heads are still current. Reconcile first, execute second, verify third, rescan fourth, then replenish again.