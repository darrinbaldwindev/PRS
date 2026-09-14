# PRS Vertical Execution Batch

**Batch:** PRS-VERTICAL-2026-09-14-01  
**Reconciled:** 2026-09-15 00:10 Australia/Brisbane  
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
- PR #17 active adversarial head: `49fe1f8bca3ddae271d85e0f4767173060267222` — OPEN / DRAFT / UNMERGED.
- PR #17 validation merge commit: `2f87c0aa0ede41a44124c15279c20be1db433a95`.
- PR #23 remains independent bounded v0.1 adapter/package hardening; no autonomous rebase/merge.

### AgentOS
- PR #104 exact current head after fresh scan: `83a58b8bd230550b5781a0fee700cca250819a75` — OPEN / DRAFT / UNMERGED.
- No project-file ownership or admission/local-wake implementation repair landed during this cycle.

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

## Completed P0 — operational owner-Windows acceptance evaluation

The prose and machine contracts now comprise:
- `docs/OWNER-WINDOWS-LEVEL2-ACCEPTANCE-CONTRACT.md`;
- `schemas/owner-windows-level2-acceptance-v0.1.json`;
- `schemas/owner-windows-level2-acceptance-result-v0.1.json`;
- `src/prs/windows_acceptance.py`;
- `scripts/evaluate-owner-windows-level2.py`;
- `tests/test_windows_acceptance.py`;
- `tests/test_windows_acceptance_cli.py`;
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

The evaluator always leaves `production_promotion_allowed:false` and `overall_agentos_green:false`.

### Offline CLI
`scripts/evaluate-owner-windows-level2.py`:
- reads exactly one supplied JSON evidence bundle;
- performs no network/runtime integration;
- prints deterministic JSON from `prs.windows_acceptance`;
- rejects malformed JSON and non-object bundles with exit code 2;
- emits no assurance disposition for rejected input;
- grants no execution, scheduler, remediation, credential, production-write, merge, deployment, or promotion authority.

### Current-state fixture
`tests/fixtures/owner-windows-level2/current-agentos-pr104.json` binds exact AgentOS `83a58b8...` and records:
- physical owner machine: unproven;
- hosted-only evidence: true;
- scheduler/local-wake owner-machine exercise: false;
- Gate C admission/local-wake compatibility: **FAIL**;
- Gate E continuous project-file ownership: **FAIL**;
- successor-displacement negative case 10: **FAIL**.

Both direct evaluator and CLI return **FAIL**. Known falsification cannot be diluted to UNKNOWN/INSUFFICIENT/GREEN merely because other physical gates are incomplete.

## Exact-head verification

Exact PRS head: `49fe1f8bca3ddae271d85e0f4767173060267222`.

GitHub Actions `Validate repository` run #154 / `34853618081`:
- PR validation merge commit: `2f87c0aa0ede41a44124c15279c20be1db433a95`;
- Linux validate job `104007451100`: **SUCCESS**;
- `python -m pytest -q`: **207 passed in 0.47s**;
- hosted Windows Level-2 job `104007451490`: **SUCCESS**;
- validation artifact `prs-validation-evidence-34853618081-1`, ID `10351696593`, SHA256 `266364534fae54132d8fbae6c9f4d188aaf728889c9ef4c39470577a3923f148`;
- hosted Windows artifact `prs-hosted-windows-level2-34853618081-1`, ID `10351621820`, SHA256 `63d3730966926b304b499e2744663abd67395d3d09f9171f735f6a4af4c771a8`.

Focused PR #17 workflows associated with this exact head completed SUCCESS as execution evidence. Workflow success proves the assurance code/probes executed; it does not certify AgentOS, physical owner-laptop acceptance, production readiness, or overall GREEN.

## Current physical acceptance disposition

For exact AgentOS PR #104 `83a58b8...`:
- aggregate machine disposition: **FAIL** because required properties are independently falsified;
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
2. compare admission/local-wake modules against `83a58b8...`;
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

### P0-3 — Evidence provenance resolution
While AgentOS runtime remains unchanged:
1. evolve the acceptance evaluator from checking non-empty reference strings toward independently supplied evidence-record resolution;
2. require evidence records to bind the same 12-field identity tuple where applicable;
3. require provenance/source/custody metadata and exact code/config identity for machine relied-on records;
4. reject unresolved, duplicate, conflicting, stale, or worker-only records fail closed;
5. keep runtime dependency-light/offline and do not connect to owner hardware;
6. add current-state fixtures proving known AgentOS failures remain FAIL even with partial referenced evidence.

### P1-1 — Core evaluator hygiene
- consider porting PR #15's explicit finding/provenance negative assertion pattern into the active core-hardening path without reviving the stale PR;
- keep PR #23 independent from AgentOS adversarial PR #17;
- preserve one canonical dependency-light v0.1 decision engine.

### P1-2 — CI maintenance
Track GitHub Actions Node 20 deprecation separately from assurance semantics. Do not use maintenance warnings to alter PASS/FAIL assurance dispositions.

## Execution log

- [x] fresh PRS/AgentOS scan.
- [x] confirmed AgentOS #104 unchanged at `83a58b8...`.
- [x] added deterministic result schema for owner-Windows assessment.
- [x] added offline read-only owner-Windows evaluator CLI.
- [x] added CLI tests for current FAIL fixture, determinism, schema inventory, malformed JSON and non-object input.
- [x] exact-head Linux suite passed: 207 tests.
- [x] exact-head hosted-Windows bounded job passed.
- [x] artifact IDs/hashes recorded.
- [x] PR #17 body reconciled to exact current head/evidence.
- [x] batch replenished with evidence provenance resolution as next independent P0.

## Replenishment rule

Every autonomous continuation starts from a fresh repo/head scan. Never assume recorded heads remain current. Reconcile first, execute second, verify third, rescan fourth, then replenish again.