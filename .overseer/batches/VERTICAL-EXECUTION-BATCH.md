# PRS Vertical Execution Batch

**Batch:** PRS-VERTICAL-2026-09-14-01  
**Created:** 2026-09-14 Australia/Brisbane  
**Canonical PRS base at scan:** `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`  
**Execution mode:** fresh scan -> prioritize -> execute -> exact-head verify -> rescan -> replenish -> durable log

## Mission

Maximize useful PRS assurance progress per owner interaction while preserving independent evidence boundaries. AgentOS owns execution/orchestration; PRS challenges claims, detects false-GREEN conditions, preserves provenance, and withholds assurance where evidence is insufficient.

## Hard governance boundaries

- No merge, approval, ready transition, rebase, deployment, credential/security-setting changes, production writes, purchases, supplier contact, lock clearing, scheduler mutation, or production autonomy.
- No alternate scheduler, worker registry, mission ledger, authority system, governance layer, persistence layer, assurance source of truth, or remediation authority.
- Exact-head evidence only. A moved target invalidates prior current-head claims and downgrades them to historical evidence.
- Hosted/CI Windows evidence is not owner physical Windows acceptance.
- Worker success, filesystem state, or receipt presence alone never implies Green/PRS certification or overall completion.

## Fresh scan inputs

### PRS
- `main`: `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207` (`docs: adopt portfolio vertical batch execution doctrine`).
- Canonical doctrine: `.overseer/VERTICAL-BATCH-ADOPTION.md` requires this batch cycle.
- Open assurance lineages: PR #17 adversarial probes; PR #23 bounded v0.1 adapter/package hardening; older #15/#16/#19/#22 remain draft and must not be treated as canonical without reconciliation.

### AgentOS linked targets
- PR #104 current head at scan: `7f82f1d76d6182b9acbe6ce2595850e8527cf597`.
- PR #104 itself records independent Green FAIL on the project-file writer ownership boundary and keeps project-file mutation AMBER/not enabled.
- PR #91 current head at scan: `ea2e0d88cc178786f2c94e99c20020d8a6fab079`.
- PR #101 remains at `d91abaecf602d7ef223c4888f10fa9361677302e`; existing PRS evidence for this exact host-status repair remains bounded historical/current-to-that-head only.

## Priority queue

### P0-A — Reproduce current project-file ownership false-GREEN race
**Goal:** independently reproduce on PRS adversarial lineage that AgentOS PR #104 can mutate/persist success evidence before discovering lock ownership loss at release.

Tasks:
1. Read exact Git object `runtime/project-file-writer.mjs` at AgentOS `7f82f1d...`.
2. Confirm publish order: lock assertion -> target recheck -> rename -> post-write verify -> receipt persist -> lock retirement.
3. Add immutable PRS adversarial case using existing `afterLockValidation` release hook to replace the writer's lock with a successor after mutation/receipt but before retirement completes.
4. Assert all of the following together:
   - writer returns/fails with `PROJECT_FILE_LOCK_RECOVERY_REQUIRED` at release;
   - target was nevertheless mutated;
   - success receipt was already persisted;
   - successor lock survives;
   - therefore mutation + success receipt do not prove continuously held ownership through commit.
5. Run exact-target probe in CI and record exact PRS/AgentOS SHAs, result, run IDs and artifacts.

**Disposition target:** defect reproduced -> fail closed / no production promotion; never overall GREEN.

### P0-B — Refresh issue #20 to current exact AgentOS target
1. Supersede stale target `6805b713...` with `7f82f1d...` after probe evidence exists.
2. Preserve older evidence as historical rather than deleting it.
3. Add the continuous-ownership-through-publish/receipt condition explicitly to acceptance.
4. Record that owner physical Windows, scheduler/local-wake owner-machine pickup, power-loss durability and complete recovery remain unproven.

### P0-C — Challenge recovery path for the same ownership gap
1. Inspect `recoverPreparedIfPresent` ordering at exact target.
2. Determine whether recovery publish also lacks continuous lock ownership across decision -> target recheck -> rename -> receipt.
3. Add a bounded negative case if reproducible with existing hooks; otherwise record exact untestable seam and evidence needed.

### P0-D — Exact-head assurance state reconciliation
1. Fresh-check AgentOS PR #104 after probe work; if its head moved, do not certify the new head with old evidence.
2. Fresh-check PRS PR #17 exact head and its CI.
3. Update PR #17 body with current exact evidence and explicit limitations.
4. Update Overseer issue #49 with the bounded result.

### P1-A — PRS core hygiene
1. Keep PR #23 independent of PR #17 and verify its head remains exact/CI-backed.
2. Record PR #22 as superseded by canonical main/PR #23 where appropriate; do not rebase or merge it autonomously.
3. Preserve v0.1 dependency-light/offline evaluator boundary.

### P1-B — Physical Windows acceptance contract
Define the minimum independent evidence bundle for owner-laptop acceptance:
- exact AgentOS code identity;
- owner-machine host identity;
- real PowerShell adapter execution;
- scheduler/local-wake pickup correlation;
- project-file mutation and receipt provenance;
- crash/recovery case;
- executable provenance/drift check;
- Green then PRS independent qualification;
- explicit negative evidence and fail-closed behavior.

Do not substitute hosted Windows Server CI for this gate.

## Execution log

- [x] Fresh PRS scan completed.
- [x] Fresh linked AgentOS PR #104/#91/#101 state scanned.
- [x] Current AgentOS project-file writer exact source inspected.
- [x] Current source ordering confirms no kernel-held ownership primitive spans final ownership validation through publish/receipt.
- [ ] P0-A executable PRS reproduction added and verified.
- [ ] P0-B issue #20 refreshed.
- [ ] P0-C recovery path challenged.
- [ ] P0-D exact-head state reconciled and portfolio coordination updated.
- [ ] P1 hygiene/physical acceptance evidence contract advanced as remaining batch capacity permits.

## Replenishment rule

At the end of this batch, fresh-scan PRS and linked AgentOS heads again. Mark completed work with exact evidence, convert moved-head evidence to historical, and refill this same file with the next highest-value unresolved assurance tasks. `cont`, `continue`, `continue autonomously`, and `continue autonomously vertically` invoke the full cycle again.