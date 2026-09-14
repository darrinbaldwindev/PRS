import json
from copy import deepcopy
from pathlib import Path

import pytest

from prs.windows_acceptance import (
    GATES,
    IDENTITY_FIELDS,
    NEGATIVE_CASES,
    evaluate_owner_windows_acceptance,
)


def bundle():
    return {
        "schema": "prs.owner-windows-level2-acceptance.v0.1",
        "captured_at": "2026-09-14T13:30:00+00:00",
        "identity": {field: f"acceptance-{field}" for field in IDENTITY_FIELDS},
        "physical_owner_machine": True,
        "hosted_only": False,
        "scheduler_local_wake_exercised": True,
        "physical_power_loss_exercised": False,
        "gates": {gate: {"status": "pass", "evidence": [f"evidence:gate:{gate}"]} for gate in GATES},
        "negative_cases": {
            case: {"status": "pass", "evidence": [f"evidence:negative:{case}"]}
            for case in NEGATIVE_CASES
        },
        "evidence_custody": {
            "outside_worker_path": True,
            "evidence": ["evidence:custody:independent-copy"],
        },
    }


def test_complete_physical_bundle_passes_but_does_not_promote_production():
    data = bundle()
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "pass"
    assert result["production_promotion_allowed"] is False
    assert result["overall_agentos_green"] is False
    assert "physical_power_loss_durability_not_proven" in result["limitations"]
    assert result["provenance"]["generated_at"] == data["captured_at"]


def test_evaluation_is_deterministic():
    data = bundle()
    assert evaluate_owner_windows_acceptance(data) == evaluate_owner_windows_acceptance(data)


@pytest.mark.parametrize("field", IDENTITY_FIELDS)
def test_missing_identity_can_never_pass(field):
    data = bundle()
    data["identity"][field] = ""
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert any(item["check_id"] == "complete_identity_tuple" for item in result["findings"])


def test_hosted_windows_cannot_be_relabelled_as_owner_laptop_acceptance():
    data = bundle()
    data["physical_owner_machine"] = False
    data["hosted_only"] = True
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "hosted_windows_is_not_owner_laptop_acceptance" in result["limitations"]


def test_missing_scheduler_local_wake_proof_is_insufficient():
    data = bundle()
    data["scheduler_local_wake_exercised"] = False
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert any(item["check_id"] == "scheduler_local_wake_exercised" for item in result["findings"])


def test_worker_only_evidence_custody_is_insufficient():
    data = bundle()
    data["evidence_custody"]["outside_worker_path"] = False
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert any(item["check_id"] == "independent_evidence_custody" for item in result["findings"])


@pytest.mark.parametrize("gate", GATES)
def test_any_falsified_gate_is_fail(gate):
    data = bundle()
    data["gates"][gate]["status"] = "fail"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "fail"


@pytest.mark.parametrize("gate", GATES)
def test_any_unexercised_gate_is_insufficient(gate):
    data = bundle()
    data["gates"][gate]["status"] = "not_exercised"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


def test_upstream_blocker_is_blocked_when_no_property_is_falsified():
    data = bundle()
    data["gates"]["C"]["status"] = "blocked"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "blocked"


@pytest.mark.parametrize("case", NEGATIVE_CASES)
def test_any_failed_negative_case_is_fail(case):
    data = bundle()
    data["negative_cases"][case]["status"] = "fail"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "fail"


@pytest.mark.parametrize("case", NEGATIVE_CASES)
def test_any_unexercised_negative_case_is_insufficient(case):
    data = bundle()
    data["negative_cases"][case]["status"] = "not_exercised"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


def test_known_agentos_104_acceptance_blockers_are_fail_not_green():
    data = bundle()
    data["gates"]["C"] = {"status": "fail", "evidence": ["prs:remote-admission-local-wake-defect"]}
    data["gates"]["E"] = {"status": "fail", "evidence": ["prs:continuous-ownership-defect"]}
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "fail"
    assert result["production_promotion_allowed"] is False
    assert result["overall_agentos_green"] is False


def test_current_agentos_pr104_fixture_is_fail_despite_other_missing_physical_evidence():
    fixture_path = Path(__file__).parent / "fixtures" / "owner-windows-level2" / "current-agentos-pr104.json"
    data = json.loads(fixture_path.read_text(encoding="utf-8"))
    result = evaluate_owner_windows_acceptance(data)
    assert data["identity"]["code_identity"] == "83a58b8bd230550b5781a0fee700cca250819a75"
    assert data["gates"]["C"]["status"] == "fail"
    assert data["gates"]["E"]["status"] == "fail"
    assert data["physical_owner_machine"] is False
    assert data["scheduler_local_wake_exercised"] is False
    assert result["disposition"] == "fail"
    assert result["production_promotion_allowed"] is False
    assert result["overall_agentos_green"] is False
    assert "hosted_windows_is_not_owner_laptop_acceptance" in result["limitations"]


def test_malformed_or_missing_evidence_references_never_pass():
    data = bundle()
    data["gates"]["A"]["evidence"] = []
    data["negative_cases"]["1"]["evidence"] = []
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    failed_checks = {item["check_id"] for item in result["findings"]}
    assert "gate_A_shape" in failed_checks
    assert "negative_case_1_shape" in failed_checks


def test_schema_inventory_matches_evaluator_contract():
    schema_path = Path(__file__).parents[1] / "schemas" / "owner-windows-level2-acceptance-v0.1.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    assert schema["properties"]["identity"]["required"] == list(IDENTITY_FIELDS)
    assert schema["properties"]["gates"]["required"] == list(GATES)
    assert schema["properties"]["negative_cases"]["required"] == list(NEGATIVE_CASES)


def test_input_bundle_is_not_mutated():
    data = bundle()
    before = deepcopy(data)
    evaluate_owner_windows_acceptance(data)
    assert data == before
