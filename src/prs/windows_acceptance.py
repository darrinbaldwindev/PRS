"""Deterministic offline evaluator for owner Windows Level-2 acceptance evidence.

This module grants no execution, remediation, promotion, scheduler, credential,
or production authority. It evaluates a caller-supplied evidence bundle only.
"""
from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

IDENTITY_FIELDS = (
    "delivery_id", "request_id", "project_id", "mission_id", "task_id",
    "wake_trace_id", "host_id", "worker_id", "code_identity", "actor_id",
    "issuer", "config_identity",
)

GATES = tuple("ABCDEFGHIJ")
NEGATIVE_CASES = tuple(str(index) for index in range(1, 16))
_ALLOWED_GATE_STATES = {"pass", "fail", "not_exercised", "blocked"}


def _text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _refs(value: Any) -> bool:
    return isinstance(value, Sequence) and not isinstance(value, (str, bytes)) and bool(value) and all(_text(item) for item in value)


def evaluate_owner_windows_acceptance(bundle: Mapping[str, Any]) -> dict[str, Any]:
    """Evaluate one supplied physical Windows acceptance evidence bundle.

    The result is deterministic: ``generated_at`` is copied from the supplied
    ``captured_at`` value. Missing or ambiguous evidence never becomes PASS.
    """
    if not isinstance(bundle, Mapping):
        raise TypeError("bundle must be a mapping")

    checks: list[dict[str, Any]] = []

    def check(check_id: str, passed: bool, evidence: str, *, severity: str = "high") -> None:
        checks.append({
            "check_id": check_id,
            "status": "pass" if passed else "fail",
            "severity": "info" if passed else severity,
            "evidence": [evidence],
        })

    captured_at = bundle.get("captured_at")
    check("captured_at_present", _text(captured_at), "bundle:captured_at")

    identity = bundle.get("identity")
    identity_ok = isinstance(identity, Mapping) and all(_text(identity.get(field)) for field in IDENTITY_FIELDS)
    check("complete_identity_tuple", identity_ok, "bundle:identity")

    physical_owner_machine = bundle.get("physical_owner_machine") is True
    hosted_only = bundle.get("hosted_only") is True
    check("physical_owner_machine_proven", physical_owner_machine and not hosted_only, "bundle:physical_owner_machine")
    check("not_hosted_only", not hosted_only, "bundle:hosted_only")

    scheduler_local_wake = bundle.get("scheduler_local_wake_exercised") is True
    check("scheduler_local_wake_exercised", scheduler_local_wake, "bundle:scheduler_local_wake_exercised")

    gate_records = bundle.get("gates")
    gate_states: dict[str, str] = {}
    gate_shape_ok = isinstance(gate_records, Mapping)
    for gate in GATES:
        record = gate_records.get(gate) if gate_shape_ok else None
        state = record.get("status") if isinstance(record, Mapping) else None
        refs = record.get("evidence") if isinstance(record, Mapping) else None
        valid_state = state in _ALLOWED_GATE_STATES
        gate_states[gate] = state if valid_state else "not_exercised"
        check(f"gate_{gate}_shape", bool(valid_state and _refs(refs)), f"bundle:gates:{gate}")

    negative_records = bundle.get("negative_cases")
    negative_states: dict[str, str] = {}
    negative_shape_ok = isinstance(negative_records, Mapping)
    for case in NEGATIVE_CASES:
        record = negative_records.get(case) if negative_shape_ok else None
        state = record.get("status") if isinstance(record, Mapping) else None
        refs = record.get("evidence") if isinstance(record, Mapping) else None
        valid_state = state in {"pass", "fail", "not_exercised"}
        negative_states[case] = state if valid_state else "not_exercised"
        check(f"negative_case_{case}_shape", bool(valid_state and _refs(refs)), f"bundle:negative_cases:{case}")

    custody = bundle.get("evidence_custody")
    custody_ok = isinstance(custody, Mapping) and custody.get("outside_worker_path") is True and _refs(custody.get("evidence"))
    check("independent_evidence_custody", custody_ok, "bundle:evidence_custody")

    known_fail = any(state == "fail" for state in gate_states.values()) or any(
        state == "fail" for state in negative_states.values()
    )
    known_blocked = any(state == "blocked" for state in gate_states.values())
    all_gates_pass = all(gate_states.get(gate) == "pass" for gate in GATES)
    all_negatives_pass = all(negative_states.get(case) == "pass" for case in NEGATIVE_CASES)
    structural_failures = [item for item in checks if item["status"] == "fail"]

    if known_fail:
        disposition = "fail"
    elif known_blocked:
        disposition = "blocked"
    elif structural_failures or not all_gates_pass or not all_negatives_pass:
        disposition = "insufficient_evidence"
    else:
        disposition = "pass"

    # Physical acceptance can never PASS without these non-inferable facts even
    # if a malformed caller attempts to mark every gate as pass.
    if disposition == "pass" and not (
        identity_ok and physical_owner_machine and not hosted_only and
        scheduler_local_wake and custody_ok
    ):
        disposition = "insufficient_evidence"

    findings = [
        {
            **item,
            "finding_id": f"owner-windows-{item['check_id']}",
        }
        for item in checks if item["status"] == "fail"
    ]

    limitations = []
    if bundle.get("physical_power_loss_exercised") is not True:
        limitations.append("physical_power_loss_durability_not_proven")
    if hosted_only:
        limitations.append("hosted_windows_is_not_owner_laptop_acceptance")

    return {
        "scope": "owner_windows_level2_physical_acceptance",
        "disposition": disposition,
        "checks": checks,
        "findings": findings,
        "limitations": limitations,
        "provenance": {
            "evaluator": "prs.windows_acceptance",
            "version": "0.1",
            "generated_at": captured_at if _text(captured_at) else None,
            "identity_fields": list(IDENTITY_FIELDS),
            "gate_states": [f"{gate}:{gate_states.get(gate)}" for gate in GATES],
            "negative_case_states": [f"{case}:{negative_states.get(case)}" for case in NEGATIVE_CASES],
        },
        "production_promotion_allowed": False,
        "overall_agentos_green": False,
    }
