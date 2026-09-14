from copy import deepcopy

import pytest

from prs.remote_receipt import IDENTITY_FIELDS, evaluate_remote_receipt


def packet():
    expected = {field: f"assigned-{field}" for field in IDENTITY_FIELDS}
    expected.update(code_identity="a" * 40, required_capabilities=["repository:read"])
    receipt = dict(expected, schema_version=1, status="COMPLETED", budget_status="RECONCILED", code_dirty=False, evidence=["persisted:worker-output"])
    green = dict(expected, disposition="pass")
    return dict(receipt=receipt, expected=expected, persisted_receipt=deepcopy(receipt), green=green,
                resolved_evidence={"persisted:worker-output"},
                persisted_result=dict(expected, status="COMPLETED"),
                evidence_records={"persisted:worker-output": dict(expected, captured_at="2026-09-09T10:00:00Z", provenance="independently-loaded-artifact")},
                execution_records=[deepcopy(expected)], observed_at="2026-09-09T10:01:00Z",
                capability_health={"repository:read": {"state": "healthy", "observed_at": "2026-09-09T10:00:00Z", "host_id": expected["host_id"]}})


def assert_failed(data, check_id):
    result = evaluate_remote_receipt(**data)
    assert result["disposition"] == "failed"
    finding = next(f for f in result["findings"] if f["check_id"] == check_id)
    assert finding["status"] == "fail"
    assert finding["severity"] == "high"
    assert finding["evidence"]
    assert f"{check_id}:fail" in result["provenance"]["check_outcomes"]
    assert result["production_promotion_allowed"] is False


def test_correlated_fixture_is_consistent_and_deterministic():
    data = packet()
    result = evaluate_remote_receipt(**data)
    assert result == evaluate_remote_receipt(**data)
    assert result["disposition"] == "consistent"
    assert result["assurance_claim"] == "supplied_snapshot_internal_consistency_only"
    assert result["execution_authenticity_verified"] is False
    assert result["execution_census_completeness_verified"] is False
    assert result["runtime_integration_enabled"] is False
    assert result["production_promotion_allowed"] is False


def test_perfectly_coherent_packet_never_claims_authenticity_or_complete_census():
    result = evaluate_remote_receipt(**packet())
    assert all(check["status"] == "pass" for check in result["checks"])
    assert result["disposition"] == "consistent"
    assert result["execution_authenticity_verified"] is False
    assert result["execution_census_completeness_verified"] is False
    assert result["production_promotion_allowed"] is False


@pytest.mark.parametrize("field", IDENTITY_FIELDS)
@pytest.mark.parametrize("value", [None, "", "wrong-identity"])
def test_missing_or_wrong_receipt_correlation_fails(field, value):
    data = packet()
    data["receipt"][field] = value
    data["persisted_receipt"] = deepcopy(data["receipt"])
    assert_failed(data, f"correlation_{field}")


@pytest.mark.parametrize("refs", [[], [" "], ["unresolved:output"]])
def test_missing_or_unresolved_evidence_fails(refs):
    data = packet()
    data["receipt"]["evidence"] = refs
    data["persisted_receipt"] = deepcopy(data["receipt"])
    assert_failed(data, "resolved_completion_evidence")


def test_result_write_failure_cannot_be_verified():
    data = packet()
    data["persisted_receipt"] = {}
    assert_failed(data, "durable_receipt")


@pytest.mark.parametrize("field", ["project_id", "task_id", "mission_id", "wake_trace_id", "worker_id", "code_identity"])
def test_borrowed_green_pass_fails(field):
    data = packet()
    del data["green"][field]
    assert_failed(data, f"green_{field}")


def test_blocked_green_and_unreconciled_budget_fail():
    data = packet()
    data["green"]["disposition"] = "blocked"
    assert_failed(data, "green_pass")
    data = packet()
    data["receipt"]["budget_status"] = "reserved"
    assert_failed(data, "budget_reconciled")


@pytest.mark.parametrize("field,check_id", [
    ("persisted_result", "durable_result"), ("execution_records", "single_correlated_execution"),
    ("evidence_records", "fresh_correlated_provenance"), ("capability_health", "task_capability_health"),
])
def test_missing_independent_snapshot_fails(field, check_id):
    data = packet()
    data[field] = None
    assert_failed(data, check_id)


def test_completion_authorization_alone_is_not_a_result():
    data = packet()
    data["persisted_result"] = {"actions": ["COMPLETION_AUTHORIZED"], "outcome": "green_verified"}
    assert_failed(data, "durable_result")


@pytest.mark.parametrize("field", IDENTITY_FIELDS)
def test_borrowed_or_mismatched_final_result_fails(field):
    data = packet()
    data["persisted_result"][field] = "other-execution"
    assert_failed(data, "durable_result")


@pytest.mark.parametrize("count", [0, 2])
def test_duplicate_or_absent_execution_fails(count):
    data = packet()
    data["execution_records"] *= count
    assert_failed(data, "single_correlated_execution")


def test_single_supplied_execution_record_does_not_claim_census_completeness():
    result = evaluate_remote_receipt(**packet())
    assert next(check for check in result["checks"] if check["check_id"] == "single_correlated_execution")["status"] == "pass"
    assert result["execution_census_completeness_verified"] is False


@pytest.mark.parametrize("stamp", [None, "invalid", "2020-01-01T00:00:00Z", "2026-09-09T11:00:00Z", "2026-09-09T10:00:00"])
def test_stale_invalid_or_future_evidence_fails(stamp):
    data = packet()
    data["evidence_records"]["persisted:worker-output"]["captured_at"] = stamp
    assert_failed(data, "fresh_correlated_provenance")


@pytest.mark.parametrize("field", ["task_id", "mission_id", "delivery_id", "request_id", "host_id", "code_identity", "provenance"])
def test_unrelated_or_missing_provenance_fails(field):
    data = packet()
    del data["evidence_records"]["persisted:worker-output"][field]
    assert_failed(data, "fresh_correlated_provenance")


@pytest.mark.parametrize("state", ["plan_limited", "quota_limited", "stale", "unavailable", "permission_denied", "auth_required", "degraded"])
def test_provider_healthy_cannot_override_restricted_capability(state):
    data = packet()
    data["capability_health"]["provider"] = {"state": "healthy"}
    data["capability_health"]["repository:read"]["state"] = state
    assert_failed(data, "task_capability_health")


def test_stale_capability_health_fails():
    data = packet()
    data["capability_health"]["repository:read"]["observed_at"] = "2020-01-01T00:00:00Z"
    assert_failed(data, "task_capability_health")


def test_dirty_execution_is_not_exact_head_evidence():
    data = packet()
    data["receipt"]["code_dirty"] = True
    assert_failed(data, "exact_code_identity")
