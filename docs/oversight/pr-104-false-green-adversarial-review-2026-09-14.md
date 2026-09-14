# Independent PRS Adversarial Review — AgentOS PR #104

**Focus:** False-GREEN vulnerabilities in the Level 2 Windows/PowerShell worker  
**Exact head:** `7f82f1d76d6182b9acbe6ce2595850e8527cf597`  
**PR:** [#104](https://github.com/darrinbaldwindev/AgentOS/pull/104)  
**Review mode:** Independent Lite-capacity wide review; five probes plus one synthesis pass.  
**Platform note:** Lite was selected for all workflow agents. An independent daily-credit meter was unavailable.

## Disposition

**FALSE-GREEN / REVIEW_REQUIRED. Do not approve, merge, deploy, or communicate externally.** Risk is **HIGH**.

The current green checks are bounded component evidence, not proof of runtime, security, production, or release readiness.

## Verified facts

1. The exact head changes only `.github/workflows/agentos-tests.yml`, adding a five-minute job timeout. It does not change the PowerShell/native-process implementation or its tests. The Ubuntu/Windows matrix runs `npm test` and `npm audit`; successful check-runs are evidence for this SHA only.
2. The default PowerShell executor uses `child_process.execFile`. A zero-error callback resolves with exit code `0`, and the adapter marks success when `exit_code === 0`. Diagnostic/error text on stderr is copied into evidence but is not itself a failure criterion. **Exit 0 plus stderr remains Green-eligible** unless a higher layer rejects it; no such adapter/verifier policy was found.
3. Ordinary nonzero exits fail closed: the catch path sets `success:false`, captures numeric `error.code`, and the verifier requires `success:true` and `exit_code===0`. Unusual Windows termination/error shapes with absent code or signal-only status remain unproven.
4. Timeout is implemented by an internal timer using `taskkill.exe /PID /T /F`, with `child.kill('SIGTERM')` fallback. There is no caller-facing `AbortSignal`, distinct cancellation state, or proof descendants are gone before receipt persistence.
5. Max-buffer errors are marked `truncated:true` and `success:false`, and truncated results are rejected. Coverage uses mocked executors and does not establish actual `execFile` behavior for stdout/stderr overflow, simultaneous overflow, partial multibyte output, stream draining, or descendant cleanup.
6. Adapter output is opaque text. `process.list` and `service.list` produce JSON, but the adapter/verifier does not parse or schema-validate syntax, shape, item bounds, multiple documents, empty output, or valid-exit malformed/partial JSON. **Exit 0 plus malformed output can remain Green-eligible.**
7. PowerShell tests cover mocked success, timeout, max-buffer failure, and missing exit code, but do not invoke a real PowerShell/native process. The local-wake path explicitly returns `POWERSHELL_RUNTIME_EXECUTION_NOT_WIRED` with `runtimeExecutionEnabled:false` before claim, budget, receipt, worker, or process execution.
8. The governed verifier checks correlation, `AWAITING_GREEN`, operation, cwd, success, exit code, timeout/truncation, and receipt/result agreement, but reports execution-evidence-only, `assurance_complete:false`, and `completion_eligible:false`. It does not independently establish postconditions, target identity/effect, freshness, ordering, receipt provenance, durability, replay resistance, or tamper resistance.
9. Green normalization has completeness/provenance gaps: successful workflow conclusions are verified; missing commit fields are not rejected; empty evidence arrays can normalize Green; completed responses need only status and wake trace; and partial/ambiguous/unknown outcomes lack an explicit terminal fail-closed contract.
10. Claims are persisted before local execution and exceptions return `RECOVERY_REQUIRED` with `executed:'unknown'`, avoiding blind retry in the shown path but leaving reconciliation external. Reference persistence is in-memory/single-process. Temp-file-plus-rename is not a multi-file/power-loss transaction, and no real multi-process contention, crash-boundary, power-loss, or non-idempotent side-effect test was found.
11. PR #104 is open and draft. Available review records contain no `APPROVED` review; listed reviews are comments and precede the current head. No current-head approval/authority evidence was verified.
12. Windows host tests inject platform, command, and workspace probes. They do not prove a real host, executable paths/versions, ACLs, policy, checkout, writable state, installer/doctor/boot, Task Scheduler registration, unattended wake, or a real Windows wake-to-worker receipt.

## P0 false-GREEN blockers

| Area | Adversarial finding | Status |
|---|---|---|
| Process result integrity | Exit-0 stderr and malformed/partial JSON can be accepted as successful execution evidence. | **P0 — review required** |
| Cancellation and process-tree safety | External cancellation is undefined; timeout/tree termination and stream closure are unproven; receipt timing relative to descendant termination is unknown. | **P0 — review required** |
| Governed completion | Process metadata and matching supplied receipt do not prove intended postconditions, correct target, durable provenance, causal ordering, or fresh evidence. | **P0 — review required** |
| Crash/replay durability | Crash after side effect or target rename but before result/receipt persistence can leave an unknown outcome; at-most-once external effects are unproven. | **P0 — review required** |
| Windows readiness | Local-wake runtime execution is deliberately not wired; no real Windows acceptance or scheduler evidence was verified. | **P0 — blocked** |
| Authority/provenance | No exact-head approval was verified; stale, borrowed, or cross-run workflow/receipt/consent evidence is not demonstrably rejected. | **P0 — review required** |

## Required evidence before reassessment

1. Run exact-head Windows tests using real resolved `powershell.exe`, `npm.cmd`, and `git.exe`, including exit-0-plus-stderr, nonzero exit, signal/termination, missing code, and executable-not-found.
2. Add a real timeout fixture whose child spawns a descendant and keeps both streams open; prove tree termination, stream closure, no post-timeout output, durable `timed_out:true`, and no Green receipt before termination confirmation.
3. Define and test `AbortSignal` behavior for already-aborted and mid-flight cancellation, distinct from timeout, including claim/budget/receipt recovery semantics.
4. Exercise real stdout/stderr overflow independently and concurrently, including encoding boundaries; prove truncation cannot parse or succeed and descendants are cleaned up.
5. Add schema validation for `process.list`/`service.list`; malformed, empty, scalar, wrong-shape, multiple-document, and valid-JSON-plus-stderr inputs must produce explicit failed/non-Green evidence.
6. Supply executable postcondition assertions with before/after or independent observation, correct target identity, negative assertions, and a reducer where `UNKNOWN`, `PARTIAL`, `AMBIGUOUS`, timeout, cancellation, contradiction, missing evidence, and stale evidence block Green.
7. Run exact-head crash/restart tests with two independent processes and the intended persistence provider: claim races, lease expiry, kill at claim/side-effect/receipt boundaries, durable transaction semantics, reconciliation, and a non-idempotent side effect proving no duplicate execution.
8. Bind every workflow/check/artifact/receipt/scheduler/consent record to repository, PR, exact SHA, run ID/attempt, event/ref, checkout SHA, task, mission, worker, and wake trace; reject missing or mismatched identity. Verify branch protection and obtain any required approval explicitly tied to this head.
9. Execute a clean Windows host acceptance flow covering install, doctor, boot, effective enablement, Task Scheduler registration and persistence, real scheduler trigger, local wake, authorization/lease/idempotency, worker, durable receipt/audit, and observed postcondition. Include negative controls for disabled, unauthorized, stale, duplicate, and non-Windows invocation.

## Final recommendation

Retain the current fail-closed dry-run and ordinary nonzero/truncation rejection, but classify PR #104 as **REVIEW_REQUIRED / false-GREEN risk**, not Green. Do not promote completion, approval, merge, deployment, or release decisions until the P0 evidence above is obtained and independently correlated.

> A specification, source inspection, static test suite, or successful CI check is not proof of runtime correctness, security, production readiness, or release readiness.
