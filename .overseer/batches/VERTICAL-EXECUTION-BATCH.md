# PRS Vertical Execution Batch

**Batch:** PRS-VERTICAL-2026-09-14-01  
**Reconciled:** 2026-09-14 18:21 Australia/Brisbane  
**Canonical PRS main at rescan:** `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`  
**Execution mode:** fresh scan -> prioritize -> execute fullest safe batch -> exact-head verify -> rescan -> replenish -> durable log

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
- PR #17 adversarial head: `6d28260338f3feedab8b4d845348344b40be7eed` — OPEN / DRAFT / UNMERGED.
- PR #17 exact-head project-file workflow run #9 / `34821646371`: SUCCESS as assurance execution.
- New remote-authority admission exact-head workflow run #1 / `34822423449` is in progress at this checkpoint.
- PR #23 remains independent bounded v0.1 adapter/package hardening; do not conflate it with AgentOS assurance.

### AgentOS linked target
- PR #104 exact current head: `83a58b8bd230550b5781a0fee700cca250819a75` — OPEN / DRAFT / UNMERGED.
- Exact source tree previously challenged for ownership: `be291054df911b487dfbf1c0e7d409fb54a61789`.
- `runtime/project-file-writer.mjs` SHA256: `bf36ef114c6db43e3b79be5d28a5850ead70f10156de390f249ec536e63cb12c`.
- AgentOS batch keeps continuous ownership A-OWN-01 BLOCKED, authenticated admission A-AUTH-05 BLOCKED, and physical Windows acceptance A-WIN-09 HOLD.

## Completed P0 in this cycle

### P0-A — Continuous project-file ownership
**Result: DEFECT REPRODUCED** on AgentOS `83a58b8...` for both normal publish and prepared-write recovery.

Target mutation + durable success receipt can occur before later release detects loss of lock ownership. Project-file mutation remains FAIL / production promotion not allowed.

### P0-B — Authenticated admission/grant seam scan
Exact inspection of `runtime/remote-authority-admission.mjs` and `runtime/local-wake.mjs` found two independent assurance gaps:

1. **Authenticated transport/canonical grant provenance remains unproven.** The admission module explicitly does not authenticate transports and requires caller-supplied authenticated `actorContext` plus injected `authoritySource.resolveGrant`. Unit tests can prove fail-closed composition but not end-to-end canonical identity/grant provenance.
2. **Canonical non-PowerShell admission output is incompatible with canonical local-wake execution envelope.** The producer omits `consent_mode`, `acceptance_criteria`, and `target`; the downstream local-wake path requires `consent_mode === PRE_AUTHORIZED`, non-empty `acceptance_criteria`, and `target === agentos:project-overseer` before execution.

Immutable PRS probe added:
- `scripts/challenge-agentos-remote-authority-admission.mjs`

Dedicated exact-head workflow added:
- `.github/workflows/validate-agentos-remote-authority-admission.yml`

Exact AgentOS target: `83a58b8bd230550b5781a0fee700cca250819a75`.
Exact PRS probe head: `6d28260338f3feedab8b4d845348344b40be7eed`.

CI-backed disposition is pending completion of workflow run `34822423449`; no workflow success is being interpreted as target PASS before reading probe output.

## Current disposition

For AgentOS PR #104 exact head `83a58b8...`:
- continuous ownership through normal publish + receipt + release: **FAIL**;
- continuous ownership through recovery publish + receipt + release: **FAIL**;
- project-file mutation production promotion: **NOT ALLOWED**;
- authenticated transport provenance: **NOT PROVEN**;
- canonical grant-source end-to-end provenance: **NOT PROVEN**;
- non-PowerShell remote admission -> local-wake compatibility: **DEFECT IDENTIFIED; exact-head CI evidence pending**;
- owner physical Windows acceptance: **NOT PROVEN**;
- scheduler/local-wake owner-machine acceptance: **NOT PROVEN**;
- overall AgentOS GREEN: **NOT ISSUED**.

## Replenished priority queue

### P0-1 — Complete admission exact-head evidence
1. Read workflow run `34822423449` and its job logs.
2. Capture probe disposition, exact source tree/module hashes and evidence artifact ID/hash.
3. If the compatibility defect reproduces, record bounded FAIL explicitly; workflow SUCCESS only means the assurance execution ran correctly.
4. Reconcile PR #17, relevant PRS issue and Overseer #49.
5. Rescan AgentOS #104 after evidence capture; if the head moves, downgrade this evidence to historical immediately.

### P0-2 — Challenge first real ownership primitive change
On the next AgentOS #104 head that changes `runtime/project-file-writer.mjs` or its ownership dependency:
1. fetch exact head and compare against `83a58b8...`;
2. identify the kernel-enforced ownership primitive and crash-release semantics;
3. rerun immutable normal + recovery successor-displacement probes unchanged first;
4. add homogeneous crash/concurrency cases only after old defects stop reproducing;
5. require durable receipt creation inside the continuously owned commit boundary;
6. record exact tree/module/artifact hashes;
7. keep promotion blocked until independent Green and PRS both pass that exact head.

### P0-3 — Admission/authentication closure contract
Require evidence of:
- a real existing authenticated actor source feeding admission;
- canonical grant resolution with actor/issuer/project/capability provenance;
- required downstream local-wake fields produced canonically, not patched out of band;
- duplicate/replay fail-closed behavior across request/delivery/task/mission/wake identities;
- no caller-controlled substitution of authenticated identity or grant evidence;
- durable exact correlation from admission through pickup/execution.

### P0-4 — Owner physical Windows acceptance contract
Maintain a separate gate requiring exact code/build identity, owner-machine host identity, supervised consent, real PowerShell execution, scheduler/local-wake correlation, bounded mutation receipts, crash/recovery, executable provenance/drift rejection, Green then independent PRS qualification, and off-worker evidence capture. Hosted Windows CI remains hosted evidence only.

### P1-1 — PRS core hygiene
- fresh-check PR #23 against current main before further changes;
- keep PR #22 historical/superseded where canonical main absorbed its intent;
- preserve one dependency-light/offline core evaluator and deterministic provenance;
- do not mix evaluator cleanup into PR #17.

### P1-2 — Stale lineage inventory
Inventory PR #15/#16/#19/#22 against current canonical main. Classify each as still-needed, superseded, or evidence-only. Do not close/merge/rebase autonomously; record recommendations with exact overlap evidence.

## Execution log

- [x] fresh PRS scan before cycle.
- [x] fresh AgentOS #104 exact-head scan.
- [x] ownership defect reverified on exact current target.
- [x] authenticated admission source inspected.
- [x] canonical local-wake envelope inspected.
- [x] caller-injected authentication/grant provenance seam recorded.
- [x] missing `consent_mode` / `acceptance_criteria` / `target` integration defect identified.
- [x] immutable admission adversarial probe added.
- [x] dedicated exact-head admission workflow added.
- [ ] admission workflow final evidence captured.
- [ ] PR #17 / issue / Overseer reconciliation completed for admission result.
- [ ] post-evidence AgentOS target rescan completed.

## Replenishment rule

Every autonomous continuation starts from a fresh repo/head scan. Never assume this file's recorded heads are still current. Reconcile first, execute second, verify third, rescan fourth, then replenish again.