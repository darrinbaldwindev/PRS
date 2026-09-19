# PRS Maximized Vertical Execution Batch — 2026-09-19 / 02

**Batch ID:** PRS-MAX-2026-09-19-02  
**Trigger:** `cont`, `continue`, `continue autonomously`, `continue autonomously vertically`  
**Doctrine:** FRESH SCAN → RECONCILE → RISK-RANK → EXECUTE DEEPLY → EXACT-HEAD VERIFY → REPAIR → RESCAN → REPLENISH → DURABLE HANDOFF

## Mission
Use each owner interaction to advance the highest-value PRS assurance work that is safe, independent, exact-head scoped and non-duplicative of AgentOS execution/authority systems. PRS challenges and proves; AgentOS executes and owns authority.

## Hard governance boundaries
- Keep implementation/challenge lineages DRAFT / UNMERGED unless explicitly authorized by the owner.
- No merge, approval, ready transition, rebase, deployment, credentials/security-setting change, production write, physical-host action, external contact, spend, unrestricted execution, production autonomy or overall GREEN issuance.
- No alternate scheduler, queue, worker registry, mission/task ledger, authority/grant service, persistence plane, governance plane, assurance source of truth or remediation authority.
- Exact-head evidence only. If a head moves, prior verdicts become historical immediately.
- Hosted Windows is regression evidence only, never owner physical-Windows acceptance.
- Workflow SUCCESS proves the probe executed; it does not automatically prove target readiness.

## Fresh scan — controlling state
### PRS canonical
- `main`: `3b3e22d9a20d05f0dde1a0d25a4e7edb9e3d8207`.
- PR #17 `work/immutable-adversarial-probes`: `114dc29cfb2018cfeb0058f1e57ea6d9dd933d3d`; OPEN / DRAFT / UNMERGED / mergeable; latest exact validation run `35445739583` SUCCESS; 252 tests passed; strict duplicate-member JSON ingestion centralized in `src/prs/strict_json.py`.
- PR #23 `assurance/adapter-containment-package-proof`: `ea6d40c06361f3f598eb71b2e009feefb46c4d37`; OPEN / DRAFT / UNMERGED / mergeable; independent core v0.1 adapter/package-provenance lane.
- PR #31 `work/pr129-authority-evidence-assurance-20260919`: `802eb5365bf4dff258fff0797223da1b3cf09b6d`; OPEN / DRAFT / UNMERGED / non-mergeable due stale stacked base; immutable #129 loader challenge evidence only. Do not autonomously rebase.

### AgentOS dependencies
- PR #104: `6b32b2cad54eb58bbf8d30285c82af875a211686`; canonical Windows-worker/remote-bridge lineage; SG-01/02 remains BLOCKED_STABLE on trusted issuer/authenticator plus governed admission integration.
- PR #125: `203273761794cca8c7a9636d45eae0249a435a72`; bounded SG-08 continuous-fence repair candidate; exact-head repair evidence only.
- PR #129: `ecd7fa33536fa963c51dbbcf381ee676e385c117`; read-only durable session/grant/consent loader; explicitly does not authenticate transports, issue authority/consent or wire admission.
- Fresh active-PR search finds no newer canonical issuer/authenticator/admission-integration implementation. Do not manufacture one in PRS.

## Risk-ranked work stack

### P0-A — Strict raw-JSON grammar at assurance ingestion
Current shared parser closes duplicate-object-member collapse but still delegates to Python `json.loads`, which accepts non-standard constants `NaN`, `Infinity`, and `-Infinity` unless `parse_constant` rejects them. For evidence/security inputs, the canonical parser should accept RFC-style JSON only.

Execute:
1. make `loads_strict_json()` reject non-standard numeric constants deterministically;
2. preserve duplicate-key rejection at every depth;
3. keep valid JSON semantics unchanged;
4. prove the owner-Windows CLI exits code 2 and emits no assurance disposition for non-standard constants;
5. do not add network/filesystem authority to the mapping evaluator.

Acceptance evidence:
- direct parser rejects `NaN`, `Infinity`, `-Infinity` with deterministic `ValueError`;
- nested non-standard constants also reject;
- CLI rejects the same without assurance disposition;
- valid JSON numbers remain accepted;
- full exact-head suite passes.

### P0-B — Trusted issuer/authenticator emergence watch
Every cycle fresh-scan AgentOS Issue #90 / active PRs for a real creator/authoritative selector of `remote.authenticated.session`, `remote.authority.grant`, or `remote.consent.decision`. If found, challenge immediately for caller-selected IDs, actor/issuer/request/delivery/project/mission/objective/target/capability/mode mismatch, expiry/revocation/replay, validator self-issuance, partial-persistence side effects and admission→local-wake provenance loss.

### P0-C — Evidence provenance alias resistance
Preserve exact class/semantic/digest/identity/freshness/custody binding on #17. Reject same-digest conflicting provenance, incompatible classes, conflicting record IDs and assertion relabelling. Explicit known FAIL must continue to outrank incomplete provenance.

### P0-D — SG-08 moved-head challenge
If #125 moves, immediately rerun unchanged successor-displacement, crash/recovery, concurrency and replay probes. If unchanged, do not create synthetic work and do not transfer its bounded verdict to #104.

### P1-A — Raw-ingestion callsite control
Inventory owner-Windows/raw assurance ingestion callsites on #17. Any future raw text/file loader must reuse `prs.strict_json` instead of permissive `json.loads`. Keep core adapter #23 independent unless a shared helper boundary is deliberately and separately justified.

### P1-B — Stale-lineage hygiene
Keep #31 and older assurance branches as evidence/probe lineages, not promotion vehicles. No autonomous rebase/merge/close. Reuse challenge logic only on a safe exact-head branch when a target moves.

## First execution slice
1. Implement P0-A in `src/prs/strict_json.py`.
2. Add direct parser tests for `NaN`, `Infinity`, `-Infinity`, nested constants and valid finite numbers.
3. Add CLI no-disposition regression for non-standard constants.
4. Run exact-head CI and inspect failures.
5. Rescan #104/#125/#129 while CI runs.
6. Reconcile PR #17, this batch and Overseer #49 only after final exact-head success.

## Controlling disposition
- trusted canonical session authenticator: NOT PROVEN / BLOCKED_STABLE.
- trusted canonical grant issuer: NOT PROVEN / BLOCKED_STABLE.
- trusted canonical consent issuer: NOT PROVEN / BLOCKED_STABLE.
- governed admission integration: NOT PROVEN / BLOCKED_STABLE.
- #129 loader contract: bounded exact-head evidence only.
- #125 SG-08 repair: bounded exact-head evidence only.
- owner physical Windows acceptance: NOT PROVEN.
- physical power-loss durability: NOT PROVEN.
- production promotion: NOT AUTHORIZED.
- overall AgentOS GREEN: NOT ISSUED.
