"""Offline bridge evidence challenge; no runtime integration or execution authority.

The caller must independently load expected assignment and persisted evidence.
Never build these from the receipt being evaluated. A verified result certifies
only consistency of this supplied snapshot, not transport authenticity or Windows
acceptance. This evaluator is intentionally not wired into AgentOS.
"""
from collections.abc import Mapping
from datetime import datetime
import re

IDENTITY_FIELDS = (
    "delivery_id", "request_id", "project_id", "mission_id", "task_id",
    "wake_trace_id", "host_id", "worker_id", "code_identity", "actor_id", "issuer", "config_identity",
)


def evaluate_remote_receipt(*, receipt, expected, persisted_receipt, green, resolved_evidence,
                            persisted_result=None, evidence_records=None, execution_records=None,
                            observed_at=None, capability_health=None, max_age_seconds=900):
    checks = []

    def check(name, passed, evidence):
        checks.append({"check_id": name, "status": "pass" if passed else "fail",
                       "severity": "info" if passed else "high", "evidence": [evidence]})

    def text(value):
        return isinstance(value, str) and bool(value.strip())

    if not all(isinstance(item, Mapping) for item in (receipt, expected, persisted_receipt, green)):
        check("snapshot_shape", False, "missing_or_invalid:snapshot")
    else:
        for field in IDENTITY_FIELDS:
            check(f"correlation_{field}", text(expected.get(field)) and
                  receipt.get(field) == expected.get(field), f"assignment:{field}")
        check("receipt_schema", type(receipt.get("schema_version")) is int and
              receipt.get("schema_version") == 1, "receipt:schema_version")
        check("durable_receipt", bool(persisted_receipt) and dict(persisted_receipt) == dict(receipt),
              "persisted:remote_receipt")
        check("completed_status", receipt.get("status") == "COMPLETED", "receipt:status")
        check("budget_reconciled", receipt.get("budget_status") == "RECONCILED", "receipt:budget_status")
        check("green_pass", green.get("disposition") == "pass", "green:disposition")
        for field in IDENTITY_FIELDS:
            check(f"green_{field}", text(expected.get(field)) and green.get(field) == expected.get(field),
                  f"green:{field}")
        refs = receipt.get("evidence")
        valid_resolved = isinstance(resolved_evidence, (set, frozenset, list, tuple)) and all(text(r) for r in resolved_evidence)
        check("resolved_completion_evidence", isinstance(refs, list) and bool(refs) and
              all(text(ref) for ref in refs) and valid_resolved and
              all(ref in resolved_evidence for ref in refs), "persisted:evidence_references")

        def timestamp(value):
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                return parsed.timestamp() if parsed.tzinfo is not None else None
            except (TypeError, ValueError, AttributeError, OverflowError):
                return None

        now = timestamp(observed_at)

        def fresh(value):
            captured = timestamp(value)
            return (now is not None and captured is not None and
                    type(max_age_seconds) in (int, float) and 0 < max_age_seconds <= 900 and
                    0 <= now - captured <= max_age_seconds)

        check("exact_code_identity", bool(re.fullmatch(r"[0-9a-f]{40}", str(expected.get("code_identity", "")))) and
              receipt.get("code_dirty") is False, "assignment:exact_head_and_clean_code")
        result_ok = isinstance(persisted_result, Mapping) and persisted_result.get("status") == "COMPLETED"
        check("durable_result", result_ok and all(
              text(expected.get(field)) and persisted_result.get(field) == expected.get(field)
              for field in IDENTITY_FIELDS), "persisted:final_result")
        records_ok = isinstance(execution_records, list) and len(execution_records) == 1
        check("single_correlated_execution", records_ok and isinstance(execution_records[0], Mapping) and
              all(execution_records[0].get(f) == expected.get(f) for f in IDENTITY_FIELDS), "persisted:execution_records")
        evidence_ok = isinstance(evidence_records, Mapping) and isinstance(refs, list) and bool(refs)
        if evidence_ok:
            for ref in refs:
                item = evidence_records.get(ref) if isinstance(ref, str) else None
                evidence_ok = evidence_ok and isinstance(item, Mapping) and fresh(item.get("captured_at")) and text(item.get("provenance")) and all(item.get(f) == expected.get(f) for f in IDENTITY_FIELDS)
        check("fresh_correlated_provenance", bool(evidence_ok), "persisted:evidence_content_and_provenance")
        required = expected.get("required_capabilities")
        health_ok = isinstance(required, list) and bool(required) and isinstance(capability_health, Mapping)
        if health_ok:
            for capability in required:
                item = capability_health.get(capability) if isinstance(capability, str) else None
                health_ok = health_ok and isinstance(item, Mapping) and item.get("state") == "healthy" and fresh(item.get("observed_at")) and item.get("host_id") == expected.get("host_id")
        check("task_capability_health", bool(health_ok), "capability:task_specific_fresh_health")

    failed = any(c["status"] == "fail" for c in checks)
    return {
        "scope": "offline_bridge_snapshot_consistency",
        "disposition": "failed" if failed else "verified",
        "checks": checks,
        "findings": [dict(c, finding_id=f"bridge-{c['check_id']}") for c in checks if c["status"] == "fail"],
        "provenance": {"evaluator_version": "offline-bridge-0.4", "observed_at": observed_at,
                       "check_outcomes": [f"{c['check_id']}:{c['status']}" for c in checks],
                       "evidence_references": sorted({r for c in checks for r in c["evidence"]})},
        "production_promotion_allowed": False,
        "runtime_integration_enabled": False,
    }
