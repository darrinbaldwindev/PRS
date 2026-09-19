# PRS Maximized Vertical Execution Batch — 2026-09-19

**Batch ID:** PRS-MAX-2026-09-19-01  
**Owner trigger:** `cont`, `continue`, `continue autonomously`, `continue autonomously vertically`  
**Execution doctrine:** FRESH SCAN → RECONCILE → RISK-RANK → EXECUTE DEEPLY → VERIFY EXACT HEAD → REPAIR → RESCAN → REPLENISH → DURABLE HANDOFF

## Mission
Use every owner interaction to advance the highest-value PRS assurance work that can be completed safely and independently, with exact-head evidence and without duplicating AgentOS authority/runtime infrastructure. PRS proves and challenges; AgentOS executes.

## Non-negotiable governance
- Keep active implementation/challenge branches DRAFT / UNMERGED unless the owner explicitly authorizes otherwise.
- No merge, approval, ready transition, rebase, deployment, credential/security-setting changes, production writes, purchases, supplier contact, physical-host action, unrestricted PowerShell/browser automation, production autonomy, or overall GREEN issuance.
- Never create a competing scheduler, worker registry, mission/task ledger, authority/grant service, persistence plane, governance plane, assurance source of truth, or remediation authority.
- Never transfer PASS/FAIL across commit heads. Moved-head evidence becomes historical immediately.
- Hosted Windows is historical/regression evidence only unless an owner physical laptop is explicitly exercised with complete provenance.
- CI SUCCESS proves execution of a test/probe, not correctness of the target beyond the probe's stated disposition.

## Fresh baseline at batch creation
### PRS
- PR #17 `work/immutable-adversarial-probes`: exact head `09e732a0a7cd06a82ea3fa38f7f30d0016b5c786`; OPEN / DRAFT / UNMERGED / mergeable; exact validation run `35445121276` successful; 247 tests passed; duplicate raw-JSON member rejection verified on canonical owner-Windows CLI ingestion.
- PR #23 `assurance/adapter-containment-package-proof`: exact head `ea6d40c06361f3f598eb71b2e009feefb46c4d37`; OPEN / DRAFT / UNMERGED / mergeable; independent core-v0.1 adapter/package-provenance lane.
- PR #31 `work/pr129-authority-evidence-assurance-20260919`: exact head `802eb5365bf4dff258fff0797223da1b3cf09b6d`; OPEN / DRAFT / UNMERGED; stale stacked base / non-mergeable; bounded #129 loader challenge evidence only. Do not autonomously rebase.

### AgentOS
- PR #104 exact head `6b32b2cad54eb58bbf8d30285c82af875a211686`: canonical Windows-worker/remote-bridge lineage; SG-01/02 BLOCKED_STABLE on canonical issuer/authenticator + governed admission integration.
- PR #125 exact head `203273761794cca8c7a9636d45eae0249a435a72`: bounded SG-08 POSIX continuous-fence repair candidate; independent challenge passed specific successor-displacement false-success cases only.
- PR #129 exact head `ecd7fa33536fa963c51dbbcf381ee676e385c117`: bounded read-only durable session/grant/consent evidence loader; trusted issuers/authenticated transport/admission integration remain absent by design.

## Maximized priority stack
### P0-A — Trusted issuer/authenticator emergence watch
Every cycle, fresh-scan Issue #90 and active AgentOS PRs for an implementation that creates or authoritatively selects `remote.authenticated.session`, `remote.authority.grant`, or `remote.consent.decision` evidence. If found, challenge it immediately for:
- untrusted payload-selected evidence IDs or caller truth claims;
- actor/issuer/request/delivery/project/mission/objective/target/capability/consent-mode mismatch;
- lifetime, expiry, revocation and replay;
- issuer self-validation or validator self-issuance;
- PRE_AUTHORIZED provenance substitution;
- persistence failure or partial admission leaving runnable artifacts;
- admission→local-wake schema/provenance loss.

### P0-B — PRS evidence-ingestion consistency
Canonical owner-Windows raw JSON ingestion must reject ambiguous duplicate member names before mapping construction. Consolidate this behavior into a dependency-light reusable PRS helper so every future raw-text/file acceptance path uses one strict parser rather than ad-hoc permissive `json.loads`. Keep the deterministic mapping evaluator pure and filesystem/network free.

Acceptance tests:
- duplicate top-level security field rejected;
- duplicate evidence-manifest ref rejected;
- duplicate nested identity/security field rejected;
- valid JSON object unchanged;
- non-object JSON rejected by the consuming boundary as before;
- deterministic error type/message;
- no assurance disposition emitted on parse ambiguity.

### P0-C — Evidence identity/provenance alias resistance
On #17 lineage, preserve exact evidence-class/semantic/digest/identity/freshness/custody binding. Any same-digest reuse must not permit conflicting provenance metadata, incompatible classes, conflicting record IDs, or assertion relabelling. Keep explicit known FAIL precedence.

### P0-D — SG-08 exact-head challenge maintenance
If #125 moves, immediately rerun unchanged successor-displacement, crash/recovery, concurrency/replay probes against the new exact head. If unchanged, do not create artificial work or transfer the bounded repair verdict to #104.

### P1-A — Core evaluator isolation
PR #23 remains an independent core-v0.1 lane. Do not casually mix owner-Windows acceptance behavior into `src/prs_evaluator.py` or its adapter. Inventory overlaps; only move/shared-harden behavior when the dependency boundary is explicit and does not destabilize the already-verified core.

### P1-B — Stale lineage hygiene
PR #31 and older assurance branches may contain valuable immutable probes but are not promotion vehicles. Do not rebase/merge/close them autonomously. Record stale-base status and reuse probe logic only through safe exact-head branches when necessary.

## Execution rules for this batch
1. Fetch exact current heads before every write.
2. If any relevant head moved, compare files before interpreting prior evidence.
3. Prefer tests plus the smallest dependency-light implementation change.
4. After a write, treat every prior exact-head claim as historical until new CI completes.
5. Inspect failing job logs and repair only the narrow failure surface.
6. Record exact run IDs, test counts, artifact IDs and SHA256 values only after final exact-head success.
7. Reconcile PR body and durable batch only after evidence exists.
8. Comment Overseer issue #49 only for material verified checkpoints or blocker-state changes.
9. End every cycle with a replenished P0 queue rather than an empty batch.

## First execution slice
1. Confirm AgentOS #104/#125/#129 and PRS #17/#23/#31 exact heads.
2. Confirm no new trusted issuer/authenticator/admission-integration candidate exists.
3. Implement reusable strict JSON object parsing for PRS owner-Windows raw evidence ingestion on #17 without changing the mapping evaluator's authority/purity.
4. Refactor canonical owner-Windows CLI to use the shared parser.
5. Add direct parser tests plus retained CLI adversarial tests.
6. Run exact-head CI; repair failures if any.
7. Rescan AgentOS issuer boundary while CI runs.
8. Reconcile this batch and Overseer #49 only after exact-head verification.

## Current controlling disposition
- SG-01/02 trusted issuer/authenticator: NOT PROVEN / BLOCKED_STABLE.
- governed admission integration: NOT PROVEN / BLOCKED_STABLE.
- #129 loader contract: bounded exact-head negative-case evidence only.
- #125 SG-08 repair: bounded exact-head evidence only.
- owner physical Windows acceptance: NOT PROVEN.
- physical power-loss durability: NOT PROVEN.
- production promotion: NOT AUTHORIZED.
- overall AgentOS GREEN: NOT ISSUED.
