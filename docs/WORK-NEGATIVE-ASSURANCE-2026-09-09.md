# Work negative assurance — 2026-09-09

Current-main baseline inspected: `3059f80ed9d98a9b54db4ff29b33d18f232db062`.
All 13 existing tests passed locally, including missing/empty foundation,
workflow and requirements rejection. This is an exact-main local test result;
it does not replace the outstanding independent canonical CI gate in STATUS.md.
No merge of PR #15 or other branch was performed.

Added an offline bridge snapshot consistency evaluator and negative fixtures:
missing/wrong delivery, request, project, mission, task, wake, host, worker and
code identity; missing/unresolved evidence; missing persisted result; borrowed
Green PASS; blocked Green and unreconciled budget. Updated suite: 51 passed.

Run: `python -m pytest -q` with pytest installed and repository import paths.
The Work runtime used Python 3.11+ and a scratch-only pytest dependency directory.

`prs.remote_receipt.evaluate_remote_receipt` consumes an independently obtained
assignment, a receipt read back from persistence, a correlated Green record,
and resolved evidence references. Its `verified` disposition is limited to
consistency of that supplied snapshot. It does not prove source authenticity,
evidence content quality, single execution, Windows acceptance or authorization.
Never derive expected identity or resolved evidence from the receipt under test.

This is draft offline assurance research, not a live AgentOS integration or a
replacement repository evaluator. Existing schema and runtime integration gates
remain unchanged. The existing AgentOS Green disposition lacks the complete
bridge correlation this evaluator requires, so it cannot pass this bridge gate
without independently resolved additional evidence.

AgentOS PR #91 baseline `afc0d1d` had a reproducible mixed-task local-wake completion.
The AgentOS regression now preserves the older queued task and verifies exact
task/mission/wake identity. Its repair is not independently certified merely
because the implementing Work session ran tests. Independent review remains open.

## Next cycle challenge

AgentOS target PR #91: `ea2e0d88cc178786f2c94e99c20020d8a6fab079`.
Its previous head `54db1e76f9d7a3c62ad26a137618ca28975f987d` passed CI #544,
run 34341864965. That CI does not attest the new scheduler changes.
PRS PR #16 was still draft at `645ea9ec4bd85a29c6068ff6ea5d2cf864f539a6`;
CI #42 / 34300329641 passed with the earlier Amazon Q COMMENTED review.
PR #15 remains a separate older draft, not merged or rewritten.

The offline evaluator now also requires independently loaded final response,
exactly one execution record, correlated evidence contents with provenance and
fresh timestamps, a 40-character code SHA with clean-code flag, and fresh
capability-level health for every required capability. Provider-wide healthy
cannot override plan_limited/quota_limited/auth_required/permission_denied/
degraded/stale/unavailable task capability. Budget status uses AgentOS's actual
uppercase RECONCILED vocabulary; the previous lowercase fixture was incompatible.

Negative fixtures explicitly reject completion-authorization ledger records used
as final results, absent/duplicate executions, stale/future/invalid evidence,
missing provenance and borrowed task/mission/delivery/request/host/code identity.
All existing missing receipt and Green mismatch cases remain. These are offline
snapshot challenges, not proof that untrusted callers cannot forge a snapshot.

New AgentOS receipts still cannot automatically satisfy this independent gate:
Green's persisted record lacks full code/wake/mission/worker correlation required
here, no authenticated remote evidence resolver supplies the execution census,
and live capability evidence is not yet integrated. Outcome for full bridge:
INSUFFICIENT INDEPENDENT EVIDENCE. Physical Windows execution remains NOT PROVEN.
Work implementation/test success is not independent PRS approval.

Local validation before adding the existing PR #16 fixture: 88 tests passed.

Final combined local suite, retaining PR #16's exact existing negative fixture:
89 tests passed. Additive draft update only; no change to PR #15.

## Read-only runtime snapshot challenge

Added `prs.remote_snapshot`, which reads the existing AgentOS state once and
resolves artifacts by exact ID and type. It rejects ambiguous JSON and does not
fill missing Green fields from the receipt, treat literal evidence strings as
resolved artifacts, or infer an execution census from completion events.
It creates no scheduler, persistence store, ledger or recovery action.

The captured Linux DRY_RUN fixture is preserved under
`tests/fixtures/remote-runtime/`; its machine-readable assessment is
`docs/evidence/remote-snapshot-challenge-2026-09-09.json`. Hashes bind the saved
state and assignment. Expected identities come from the pre-execution admitted
fixture, host identity, known registry worker, git HEAD and configuration hash;
the allocated wake ID comes from the saved dispatch task, not the receipt.
These are local fixture sources, not authenticated remote attestations.

The scheduler reports COMPLETED and persists a result/receipt. PRS returns failed
on eight exact checks: Green mission/wake/worker/code correlation, resolved
completion evidence, single correlated execution, fresh evidence provenance,
and task-specific capability health. Seven literal evidence references do not
resolve to independent saved evidence. The regression reproduces these failures
from the captured bytes without executing AgentOS or changing its state.

Tested runtime: local commit `be2135ba8e0f28d72b2c22cdb7e1e25fe4fab2a6`,
tree `c4418b517c95a23bf76df1cfa1f28cfe82f52848`, matching published AgentOS
head `ea2e0d88cc178786f2c94e99c20020d8a6fab079` by tree. This capture replaces
an earlier scratch-only observation whose raw state was not retained.
Current PR #91 has advanced to `5cc27c96d48e18419cc678fd03b37c9e1c7ccd70`.
The intervening diff adds only the upstream reconciliation helper and its tests;
that helper is preserved and is not executed by this baseline capture.
Do not describe this as exact-current-head or independent full-bridge assurance.

Local combined suite: 102 tests passed. Physical Windows execution remains
NOT PROVEN. No overall GREEN, runtime integration or production promotion.
