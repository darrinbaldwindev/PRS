# PRS Vertical Execution Batch

**Batch:** PRS-VERTICAL-2026-09-14-01  
**Reconciled:** 2026-09-18 Australia/Brisbane  
**Canonical PRS main:** `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`  
**Execution mode:** fresh scan -> prioritize -> execute fullest safe batch -> exact-head verify -> rescan -> replenish -> durable log

## Mission

Maximize useful PRS assurance progress per owner interaction while preserving independent evidence boundaries. AgentOS owns execution/orchestration; PRS independently challenges claims, detects false-GREEN conditions, preserves provenance, and withholds assurance where evidence is insufficient.

## Automatic trigger

`cont`, `continue`, `continue autonomously`, and `continue autonomously vertically` trigger the full cycle: fresh-scan live heads; reconcile this batch; execute the fullest safe useful work; exact-head verify; rescan; downgrade moved-head evidence to historical; replenish; durably log.

## Hard governance boundaries

- No merge, approval, ready transition, rebase, deployment, credential/security-setting changes, production writes, purchases, supplier contact, lock clearing, scheduler mutation, or production autonomy.
- No alternate scheduler, worker registry, mission ledger, authority system, governance layer, persistence layer, assurance source of truth, or remediation authority.
- Exact-head evidence only.
- Hosted/CI Windows evidence is not owner physical Windows acceptance.
- Worker success, filesystem state, receipt presence, CI success, Green, and PRS are distinct evidence/decision layers.

## Fresh exact state — 2026-09-18

### PRS
- `main`: `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`.
- PR #17: exact head `11bb5da26578be285e86ff6196196c07b77e863a`; OPEN / DRAFT / UNMERGED / mergeable.
- PR #17 exact-head repository validation run #171 / `35313642563`: SUCCESS; Linux suite **218 passed in 0.50s**; hosted Windows job SUCCESS as hosted evidence only.
- Validation artifact `prs-validation-evidence-35313642563-1`, ID `10534107049`, SHA256 `310feae07eb8b7455a00bde49fda6f76e3bbd2342b37fd23df9e2b315516a217`.
- Hosted artifact `prs-hosted-windows-level2-35313642563-1`, ID `10534756620`, SHA256 `73abd104d1f284d808f23811152753654c30c9b6f873d4f7e0c5641960393f50`.
- All 13 PR-triggered workflows associated with exact head `11bb5da...` completed SUCCESS as probe/test execution evidence.
- PR #23 remains independent bounded v0.1 adapter/package hardening at `ea6d40c06361f3f598eb71b2e009feefb46c4d37`; OPEN / DRAFT / UNMERGED / mergeable. Do not conflate or autonomously merge/rebase.

### AgentOS
- PR #104 exact current head: `607f2683b7d3b234fc6ffa70e2a7d42e31499c3a`; OPEN / DRAFT / UNMERGED / mergeable.
- Its PR body is stale and names an older checkpoint; PR metadata head controls.
- Exact current immutable PRS probes reproduce both controlling P0 defects below.

## Controlling P0 findings

### A. Continuous project-file ownership — FAIL
Exact-current-head workflow run #35 / `35313235376` reproduced normal-publish and prepared-recovery successor-displacement false-success cases on AgentOS `607f2683...`.

Observed in both bounded cases: target mutation occurred; a success receipt persisted; successor lock survived; release only then detected `PROJECT_FILE_LOCK_RECOVERY_REQUIRED`.

Evidence artifact `prs-agentos-project-file-current-head-35313235376-1`, ID `10534586329`, SHA256 `4da92cacfdaea2f1bfbd8855189668578ca5bde688f3491ecbe7910bf4f930de`.

Disposition: continuous ownership **FAIL**; project-file production promotion **NOT ALLOWED**.

### B. Remote admission -> local-wake compatibility — FAIL
Exact-current-head workflow run #25 / `35313235339` reproduced the canonical mismatch on AgentOS `607f2683...`: admitted non-PowerShell tasks omit `consent_mode`, `acceptance_criteria`, and `target`, while local-wake requires all three. Caller-supplied authenticated actor context and injected grant resolver remain composition seams, not end-to-end provenance.

Evidence artifact `prs-agentos-remote-authority-admission-35313235339-1`, ID `10534810632`, SHA256 `b69e714d972c192480f273323008fc4aab53730fd45807bb098257f2940a79bd`.

Disposition: admission/local-wake compatibility **FAIL**; authenticated transport **NOT PROVEN**; canonical grant source end to end **NOT PROVEN**; production remote execution **NOT AUTHORIZED**.

## Completed P0 — owner-Windows evidence provenance hardening

The machine evaluator now requires every PASS-supporting evidence reference to resolve through `evidence_manifest`. Each relied-on record must carry a valid SHA256, non-empty source/captured_by, parseable `captured_at`, `custody: independent`, and matching bundle `code_identity` + `config_identity`. Records older than 24 hours relative to bundle capture, future-dated records, mismatched code/config identity, unresolved records, malformed records, or worker-only custody cannot establish PASS.

Known explicit falsification retains precedence: an already failed gate/negative case remains **FAIL** and cannot be softened merely because provenance is incomplete.

Generic `Validate repository` explicitly labels its pinned AgentOS commits as historical regression fixtures and records `target_semantics: historical_regression_fixture` plus `current_agentos_head_validated:false`. Dedicated exact-current-head workflows control current AgentOS #104 assurance claims.

## Current owner-Windows Level-2 disposition

For exact AgentOS `607f2683...`:
- aggregate machine disposition: **FAIL** due independently reproduced required-property failures;
- owner physical-machine exercise: **NOT PROVEN**;
- scheduler/local-wake owner-machine acceptance: **NOT PROVEN**;
- physical power-loss durability: **NOT PROVEN**;
- project-file production promotion: **NOT ALLOWED**;
- production remote execution: **NOT AUTHORIZED**;
- overall AgentOS GREEN: **NOT ISSUED**.

This does not claim the owner's physical laptop itself was exercised and failed.

## Replenished priority queue

### P0-1 — Challenge first AgentOS project-file ownership repair
When #104 changes relevant ownership/writer code, rerun the unchanged successor-displacement probes first. Require one crash-releasing ownership fence held continuously through publish/prepared recovery, verification, durable success receipt, and release. Then expand crash/concurrency/replay coverage. Independent Green then PRS remain downstream gates.

### P0-2 — Challenge first admission/local-wake repair
When #104 changes relevant admission/wake code, rerun the unchanged compatibility probe first. Require one canonical contract carrying consent/acceptance/target semantics without weakening fail-closed checks, plus evidence of a real existing authenticated actor and canonical grant source end to end. Preserve full identity correlation.

### P0-3 — Evidence-record identity closure
Next PRS-side hardening while AgentOS remains unchanged:
1. bind relied-on evidence records to the full 12-field acceptance identity where the evidence class can observe those fields;
2. define explicit partial-identity semantics for evidence that legitimately cannot observe all fields rather than silently omitting identity;
3. reject conflicting evidence records and duplicate evidence IDs with divergent semantics;
4. preserve exact code/config binding, staleness checks and independent custody;
5. keep the evaluator offline/dependency-light and do not connect to owner hardware;
6. retain explicit FAIL precedence for the current AgentOS fixture.

### P1-1 — Core evaluator hygiene
Keep PR #23 independent. Consider porting PR #15's explicit finding/provenance negative assertion pattern into the active core-hardening path without reviving stale implementation lineage.

### P1-2 — Batch/coordination hygiene
Keep this batch current after each owner continuation and log verified exact-head changes to Overseer issue #49. Do not treat workflow SUCCESS as target PASS/GREEN.

## Execution log

- [x] fresh-scanned PRS main, PR #17, PR #23, AgentOS #104.
- [x] verified PR #17 remains exact head `11bb5da...`, open/draft/unmerged/mergeable.
- [x] verified AgentOS #104 remains exact head `607f2683...`, open/draft/unmerged/mergeable.
- [x] verified PRS main remains `3b3e22d...`.
- [x] exact-head PRS validation at `11bb5da...`: 218 tests passed; all 13 workflows successful as execution evidence.
- [x] PR #17 body reconciled to current PRS/AgentOS exact heads and current artifacts.
- [x] PR #17 labels now make P0/evidence/no-GREEN/promotion-blocked status explicit.
- [x] durable coordination checkpoint written to Overseer issue #49.
- [x] this vertical batch reconciled and replenished.

## Replenishment rule

Every autonomous continuation starts from a fresh repo/head scan. Never assume recorded heads remain current. Reconcile first, execute second, verify third, rescan fourth, then replenish again.
