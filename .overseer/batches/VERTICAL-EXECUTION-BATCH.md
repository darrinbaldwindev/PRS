# PRS Vertical Execution Batch

**Batch:** PRS-VERTICAL-2026-09-14-01  
**Reconciled:** 2026-09-14 23:49 Australia/Brisbane  
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
- PR #17 active adversarial head: `25bbf34deeeb6f9cc7893b6a662baf38957da06e` — OPEN / DRAFT / UNMERGED.
- PR #17 validation merge commit: `b5fd4051ea00b04fd71cec08aaf05792b3d5584f`.
- PR #23 head: `ea6d40c06361f3f598eb71b2e009feefb46c4d37` — OPEN / DRAFT / UNMERGED; keep independent of PR #17.
- Issue #21 repository-side legacy-consumer inventory now finds only compatibility tests/default-branch adapter references; no additional in-repo runtime/CLI consumer was found. Unknown external consumers are not inferred away.

### AgentOS
- PR #104 exact current head after post-execution rescan: `83a58b8bd230550b5781a0fee700cca250819a75` — OPEN / DRAFT / UNMERGED.
- No project-file ownership or admission/local-wake implementation repair landed during this batch.

## Controlling P0 findings

### A. Continuous project-file ownership — FAIL
On exact AgentOS `83a58b8...`, normal publish and prepared-write recovery can mutate the target and persist a success receipt before release discovers successor displacement.

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

## Completed P0 — owner Windows machine-readable acceptance

The prose contract remains:
- `docs/OWNER-WINDOWS-LEVEL2-ACCEPTANCE-CONTRACT.md`.

This cycle added to active PR #17:
- `schemas/owner-windows-level2-acceptance-v0.1.json`;
- `src/prs/windows_acceptance.py`;
- `tests/test_windows_acceptance.py`;
- `tests/fixtures/owner-windows-level2/current-agentos-pr104.json`.

### Deterministic disposition rules
PASS requires one supplied bundle with:
- complete 12-field identity tuple;
- physical owner-machine proof;
- `hosted_only:false`;
- scheduler/local-wake exercised;
- Gates A-J all PASS with evidence references;
- all 15 mandatory negative cases PASS with evidence references;
- evidence custody outside the worker-controlled path.

Fail-closed precedence:
1. any gate/negative case explicitly falsified -> **FAIL**;
2. otherwise upstream blocked gate -> **BLOCKED**;
3. otherwise hosted-only, incomplete identity, missing scheduler/local-wake proof, unexercised gate/case, malformed evidence references, or worker-only custody -> **INSUFFICIENT EVIDENCE**;
4. PASS only when all mandatory conditions are satisfied.

Physical power-loss durability remains an explicit limitation unless physically exercised. Process interruption does not substitute for power loss. The evaluator always leaves `production_promotion_allowed:false` and `overall_agentos_green:false`.

### Current-state fixture
`tests/fixtures/owner-windows-level2/current-agentos-pr104.json` binds exact AgentOS `83a58b8...` and records:
- physical owner machine: unproven;
- hosted-only evidence: true;
- scheduler/local-wake owner-machine exercise: false;
- Gate C admission/local-wake compatibility: **FAIL**;
- Gate E continuous project-file ownership: **FAIL**;
- successor-displacement negative case 10: **FAIL**;
- other physical cases remain blocked/not exercised as evidence dictates.

The machine evaluator returns **FAIL**. Known falsification therefore cannot be diluted to UNKNOWN/INSUFFICIENT/GREEN merely because other physical gates are incomplete.

## Exact-head verification

Exact PRS head: `25bbf34deeeb6f9cc7893b6a662baf38957da06e`.

GitHub Actions `Validate repository` run #150 / `34851438093`:
- PR validation merge commit: `b5fd4051ea00b04fd71cec08aaf05792b3d5584f`;
- Linux validate job `104000102075`: **SUCCESS**;
- `python -m pytest -q`: **202 passed in 0.17s**;
- hosted Windows Level-2 job `104000102778`: **SUCCESS**;
- hosted writer/filesystem/process/executable-provenance steps: SUCCESS;
- validation artifact `prs-validation-evidence-34851438093-1`, ID `10350872479`, SHA256 `88dce3812006e8fe365f85b4f8cdc365ca889a461ecd638186361acd4d9256e0`;
- hosted Windows artifact `prs-hosted-windows-level2-34851438093-1`, ID `10350407774`, SHA256 `60014c847a524a17669f53ecc2f9b05decf6440ce604c4f754989c40bc985f2b`.

Workflow SUCCESS proves the probes/tests ran successfully. It does not certify current AgentOS, physical owner-laptop acceptance, production readiness, or overall GREEN.

## PRS core/stale-lineage reconciliation

- PR #23 remains the bounded v0.1 adapter-containment/package-provenance hardening vehicle. No autonomous rebase/merge.
- PR #22 remains superseded as an implementation vehicle by canonical main plus PR #23-equivalent residual hardening direction.
- PR #19 unique Green identity hardening is present and verified on active PR #17; PR #19 itself is stale/evidence-only.
- PR #16 remains evidence/ancestry lineage, not a current standalone promotion vehicle.
- PR #15 remains a superseded implementation vehicle with a potentially useful explicit finding/provenance assertion pattern; do not merge/rebase/close autonomously.

## Current physical acceptance disposition

For exact AgentOS PR #104 `83a58b8...`:
- owner physical Windows acceptance: **FAIL as current aggregate machine disposition because known required properties are falsified**;
- physical owner-machine exercise itself: **NOT PROVEN**;
- scheduler/local-wake owner-machine acceptance: **NOT PROVEN**;
- physical power-loss durability: **NOT PROVEN**;
- project-file production promotion: **NOT ALLOWED**;
- production remote execution: **NOT AUTHORIZED**;
- overall AgentOS GREEN: **NOT ISSUED**.

## Replenished priority queue

### P0-1 — Challenge first AgentOS admission/local-wake repair
When AgentOS #104 changes relevant code:
1. fresh-fetch exact head;
2. compare `runtime/remote-authority-admission.mjs` and `runtime/local-wake.mjs` against `83a58b8...`;
3. rerun immutable compatibility probe unchanged first;
4. require one canonical contract carrying required consent/acceptance/target semantics without weakening fail-closed checks;
5. require real existing authenticated actor + grant-source provenance end to end;
6. preserve full 12-field assignment/result identity.

### P0-2 — Challenge first project-file ownership repair
When AgentOS #104 changes writer/ownership code:
1. fresh-fetch exact head;
2. identify the kernel-enforced crash-releasing ownership primitive;
3. rerun normal/recovery successor-displacement probes unchanged first;
4. require durable receipt persistence within the continuously owned commit boundary;
5. then expand homogeneous crash/concurrency/replay cases;
6. require independent Green then PRS before promotion consideration.

### P0-3 — Physical acceptance bundle evolution
While AgentOS runtime remains unchanged:
1. keep the current-state fixture synchronized to exact AgentOS code identity only when evidence materially changes;
2. add machine validation of evidence provenance/content rather than trusting reference strings alone;
3. define a bounded serialization/CLI surface only if it does not create runtime integration or authority;
4. preserve runtime dependency-light behavior; schema validation may be test/dev-only if added;
5. never substitute hosted Windows for physical owner-machine evidence.

### P1-1 — Core evaluator hygiene
- consider porting PR #15's explicit finding/provenance negative assertions into the active core-hardening path without reviving the stale PR;
- keep PR #23 independent from AgentOS adversarial PR #17;
- preserve one canonical dependency-light v0.1 decision engine.

### P1-2 — CI maintenance
Track GitHub Actions Node 20 deprecation separately from assurance semantics. Do not use maintenance warnings to alter PASS/FAIL assurance dispositions.

## Execution log

- [x] fresh PRS/AgentOS scan.
- [x] confirmed AgentOS #104 unchanged at `83a58b8...`.
- [x] completed repository-side legacy consumer inventory for issue #21.
- [x] created machine-readable owner-Windows acceptance schema.
- [x] created deterministic offline owner-Windows acceptance evaluator.
- [x] added exhaustive fail-closed gate/negative tests.
- [x] added current AgentOS #104 evidence fixture.
- [x] proved current fixture resolves to FAIL because known falsifications outrank incomplete evidence.
- [x] exact-head Linux suite passed: 202 tests.
- [x] exact-head hosted-Windows bounded job passed.
- [x] artifact IDs/hashes recorded.
- [x] PR #17 body reconciled to exact current head/evidence.
- [x] Overseer #49 updated during the cycle; final exact-head checkpoint remains to be logged after this batch reconciliation.
- [x] batch replenished.

## Replenishment rule

Every autonomous continuation starts from a fresh repo/head scan. Never assume recorded heads remain current. Reconcile first, execute second, verify third, rescan fourth, then replenish again.