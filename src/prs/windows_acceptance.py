"""Deterministic offline evaluator for owner Windows Level-2 acceptance evidence.

This module grants no execution, remediation, promotion, scheduler, credential,
or production authority. It evaluates a caller-supplied evidence bundle only.
"""
from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import datetime, timezone
from typing import Any

IDENTITY_FIELDS = (
    "delivery_id", "request_id", "project_id", "mission_id", "task_id",
    "wake_trace_id", "host_id", "worker_id", "code_identity", "actor_id",
    "issuer", "config_identity",
)
GATES = tuple("ABCDEFGHIJ")
NEGATIVE_CASES = tuple(str(index) for index in range(1, 16))
_ALLOWED_GATE_STATES = {"pass", "fail", "not_exercised", "blocked"}
_MAX_EVIDENCE_AGE_SECONDS = 24 * 60 * 60


def _text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _refs(value: Any) -> bool:
    return isinstance(value, Sequence) and not isinstance(value, (str, bytes)) and bool(value) and all(_text(item) for item in value)


def _sha256(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(char in "0123456789abcdef" for char in value.lower())


def _instant(value: Any) -> datetime | None:
    if not _text(value):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc)


def evaluate_owner_windows_acceptance(bundle: Mapping[str, Any]) -> dict[str, Any]:
    """Evaluate one supplied physical Windows acceptance evidence bundle."""
    if not isinstance(bundle, Mapping):
        raise TypeError("bundle must be a mapping")
    checks: list[dict[str, Any]] = []

    def check(check_id: str, passed: bool, evidence: str, *, severity: str = "high") -> None:
        checks.append({"check_id": check_id, "status": "pass" if passed else "fail", "severity": "info" if passed else severity, "evidence": [evidence]})

    captured_at = bundle.get("captured_at")
    bundle_instant = _instant(captured_at)
    check("captured_at_present", bundle_instant is not None, "bundle:captured_at")
    identity = bundle.get("identity")
    identity_ok = isinstance(identity, Mapping) and all(_text(identity.get(field)) for field in IDENTITY_FIELDS)
    check("complete_identity_tuple", identity_ok, "bundle:identity")
    physical_owner_machine = bundle.get("physical_owner_machine") is True
    hosted_only = bundle.get("hosted_only") is True
    check("physical_owner_machine_proven", physical_owner_machine and not hosted_only, "bundle:physical_owner_machine")
    check("not_hosted_only", not hosted_only, "bundle:hosted_only")
    scheduler_local_wake = bundle.get("scheduler_local_wake_exercised") is True
    check("scheduler_local_wake_exercised", scheduler_local_wake, "bundle:scheduler_local_wake_exercised")

    referenced_evidence: set[str] = set()
    gate_records = bundle.get("gates"); gate_states: dict[str, str] = {}; gate_shape_ok = isinstance(gate_records, Mapping)
    for gate in GATES:
        record = gate_records.get(gate) if gate_shape_ok else None
        state = record.get("status") if isinstance(record, Mapping) else None
        refs = record.get("evidence") if isinstance(record, Mapping) else None
        valid_state = state in _ALLOWED_GATE_STATES; valid_refs = _refs(refs)
        if valid_refs: referenced_evidence.update(refs)
        gate_states[gate] = state if valid_state else "not_exercised"
        check(f"gate_{gate}_shape", bool(valid_state and valid_refs), f"bundle:gates:{gate}")

    negative_records = bundle.get("negative_cases"); negative_states: dict[str, str] = {}; negative_shape_ok = isinstance(negative_records, Mapping)
    for case in NEGATIVE_CASES:
        record = negative_records.get(case) if negative_shape_ok else None
        state = record.get("status") if isinstance(record, Mapping) else None
        refs = record.get("evidence") if isinstance(record, Mapping) else None
        valid_state = state in {"pass", "fail", "not_exercised"}; valid_refs = _refs(refs)
        if valid_refs: referenced_evidence.update(refs)
        negative_states[case] = state if valid_state else "not_exercised"
        check(f"negative_case_{case}_shape", bool(valid_state and valid_refs), f"bundle:negative_cases:{case}")

    custody = bundle.get("evidence_custody"); custody_refs = custody.get("evidence") if isinstance(custody, Mapping) else None
    if _refs(custody_refs): referenced_evidence.update(custody_refs)
    custody_ok = isinstance(custody, Mapping) and custody.get("outside_worker_path") is True and _refs(custody_refs)
    check("independent_evidence_custody", custody_ok, "bundle:evidence_custody")

    manifest = bundle.get("evidence_manifest")
    manifest_ok = isinstance(manifest, Mapping) and bool(manifest) and bool(referenced_evidence)
    manifest_identity_ok = manifest_ok and identity_ok
    manifest_freshness_ok = manifest_ok and bundle_instant is not None
    manifest_custody_ok = manifest_ok
    if manifest_ok:
        for ref in referenced_evidence:
            record = manifest.get(ref)
            if not isinstance(record, Mapping):
                manifest_ok = manifest_identity_ok = manifest_freshness_ok = manifest_custody_ok = False
                break
            base_valid = _sha256(record.get("sha256")) and _text(record.get("source")) and _text(record.get("captured_by"))
            if not base_valid:
                manifest_ok = False
            if not identity_ok or record.get("code_identity") != identity.get("code_identity") or record.get("config_identity") != identity.get("config_identity"):
                manifest_identity_ok = False
            evidence_instant = _instant(record.get("captured_at"))
            if bundle_instant is None or evidence_instant is None or evidence_instant > bundle_instant or (bundle_instant - evidence_instant).total_seconds() > _MAX_EVIDENCE_AGE_SECONDS:
                manifest_freshness_ok = False
            if record.get("custody") != "independent":
                manifest_custody_ok = False
    if isinstance(manifest, Mapping):
        manifest_ok = bool(manifest_ok and referenced_evidence.issubset(manifest.keys()))
    else:
        manifest_ok = False
    check("evidence_manifest_bound", manifest_ok, "bundle:evidence_manifest")
    check("evidence_identity_bound", bool(manifest_ok and manifest_identity_ok), "bundle:evidence_manifest:identity")
    check("evidence_freshness_bound", bool(manifest_ok and manifest_freshness_ok), "bundle:evidence_manifest:captured_at")
    check("evidence_independent_custody_bound", bool(manifest_ok and manifest_custody_ok), "bundle:evidence_manifest:custody")
    provenance_ok = bool(manifest_ok and manifest_identity_ok and manifest_freshness_ok and manifest_custody_ok)

    known_fail = any(state == "fail" for state in gate_states.values()) or any(state == "fail" for state in negative_states.values())
    known_blocked = any(state == "blocked" for state in gate_states.values())
    all_gates_pass = all(gate_states.get(gate) == "pass" for gate in GATES)
    all_negatives_pass = all(negative_states.get(case) == "pass" for case in NEGATIVE_CASES)
    structural_failures = [item for item in checks if item["status"] == "fail"]
    if known_fail: disposition = "fail"
    elif known_blocked: disposition = "blocked"
    elif structural_failures or not all_gates_pass or not all_negatives_pass: disposition = "insufficient_evidence"
    else: disposition = "pass"
    if disposition == "pass" and not (identity_ok and physical_owner_machine and not hosted_only and scheduler_local_wake and custody_ok and provenance_ok):
        disposition = "insufficient_evidence"

    findings = [{**item, "finding_id": f"owner-windows-{item['check_id']}"} for item in checks if item["status"] == "fail"]
    limitations = []
    if bundle.get("physical_power_loss_exercised") is not True: limitations.append("physical_power_loss_durability_not_proven")
    if hosted_only: limitations.append("hosted_windows_is_not_owner_laptop_acceptance")
    if not manifest_ok: limitations.append("evidence_content_provenance_not_bound")
    if manifest_ok and not manifest_identity_ok: limitations.append("evidence_identity_not_bound")
    if manifest_ok and not manifest_freshness_ok: limitations.append("evidence_freshness_not_bound")
    if manifest_ok and not manifest_custody_ok: limitations.append("evidence_independent_custody_not_bound")
    return {
        "scope": "owner_windows_level2_physical_acceptance", "disposition": disposition, "checks": checks, "findings": findings,
        "limitations": limitations,
        "provenance": {"evaluator": "prs.windows_acceptance", "version": "0.1", "generated_at": captured_at if bundle_instant is not None else None, "identity_fields": list(IDENTITY_FIELDS), "gate_states": [f"{gate}:{gate_states.get(gate)}" for gate in GATES], "negative_case_states": [f"{case}:{negative_states.get(case)}" for case in NEGATIVE_CASES]},
        "production_promotion_allowed": False, "overall_agentos_green": False,
    }
