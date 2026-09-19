import json
from copy import deepcopy
from pathlib import Path

import pytest

from prs.windows_acceptance import GATES, IDENTITY_FIELDS, NEGATIVE_CASES, evaluate_owner_windows_acceptance


def bundle():
    data = {
        "schema": "prs.owner-windows-level2-acceptance.v0.1",
        "captured_at": "2026-09-14T13:30:00+00:00",
        "identity": {field: f"acceptance-{field}" for field in IDENTITY_FIELDS},
        "physical_owner_machine": True,
        "hosted_only": False,
        "scheduler_local_wake_exercised": True,
        "physical_power_loss_exercised": False,
        "gates": {gate: {"status": "pass", "evidence": [f"evidence:gate:{gate}"]} for gate in GATES},
        "negative_cases": {case: {"status": "pass", "evidence": [f"evidence:negative:{case}"]} for case in NEGATIVE_CASES},
        "evidence_custody": {"outside_worker_path": True, "evidence": ["evidence:custody:independent-copy"]},
    }
    assertions = {}
    for gate, record in data["gates"].items():
        for ref in record["evidence"]: assertions.setdefault(ref, []).append(f"gate:{gate}:{record['status']}")
    for case, record in data["negative_cases"].items():
        for ref in record["evidence"]: assertions.setdefault(ref, []).append(f"negative:{case}:{record['status']}")
    for ref in data["evidence_custody"]["evidence"]:
        assertions.setdefault(ref, []).append("custody:outside_worker_path:true")
    data["evidence_manifest"] = {
        ref: {
            "sha256": "a" * 64,
            "source": f"fixture:{ref}",
            "captured_by": "independent-test-harness",
            "captured_at": "2026-09-14T13:29:00+00:00",
            "custody": "independent",
            "code_identity": data["identity"]["code_identity"],
            "config_identity": data["identity"]["config_identity"],
            "identity": dict(data["identity"]),
            "assertions": values,
        }
        for ref, values in assertions.items()
    }
    return data


def test_complete_physical_bundle_passes_but_does_not_promote_production():
    data = bundle(); result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "pass"
    assert result["production_promotion_allowed"] is False
    assert result["overall_agentos_green"] is False
    assert "physical_power_loss_durability_not_proven" in result["limitations"]
    assert result["provenance"]["generated_at"] == data["captured_at"]


def test_evaluation_is_deterministic():
    data = bundle(); assert evaluate_owner_windows_acceptance(data) == evaluate_owner_windows_acceptance(data)


@pytest.mark.parametrize("field", IDENTITY_FIELDS)
def test_missing_identity_can_never_pass(field):
    data = bundle(); data["identity"][field] = ""
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert any(item["check_id"] == "complete_identity_tuple" for item in result["findings"])


def test_hosted_windows_cannot_be_relabelled_as_owner_laptop_acceptance():
    data = bundle(); data["physical_owner_machine"] = False; data["hosted_only"] = True
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "hosted_windows_is_not_owner_laptop_acceptance" in result["limitations"]


def test_missing_scheduler_local_wake_proof_is_insufficient():
    data = bundle(); data["scheduler_local_wake_exercised"] = False
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


def test_worker_only_evidence_custody_is_insufficient():
    data = bundle(); data["evidence_custody"]["outside_worker_path"] = False
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


@pytest.mark.parametrize("gate", GATES)
def test_any_falsified_gate_is_fail(gate):
    data = bundle(); data["gates"][gate]["status"] = "fail"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "fail"


@pytest.mark.parametrize("gate", GATES)
def test_any_unexercised_gate_is_insufficient(gate):
    data = bundle(); data["gates"][gate]["status"] = "not_exercised"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


def test_upstream_blocker_is_blocked_when_no_property_is_falsified():
    data = bundle(); data["gates"]["C"]["status"] = "blocked"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "blocked"


@pytest.mark.parametrize("case", NEGATIVE_CASES)
def test_any_failed_negative_case_is_fail(case):
    data = bundle(); data["negative_cases"][case]["status"] = "fail"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "fail"


@pytest.mark.parametrize("case", NEGATIVE_CASES)
def test_any_unexercised_negative_case_is_insufficient(case):
    data = bundle(); data["negative_cases"][case]["status"] = "not_exercised"
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
    data = json.loads(fixture_path.read_text(encoding="utf-8")); result = evaluate_owner_windows_acceptance(data)
    assert data["gates"]["C"]["status"] == "fail" and data["gates"]["E"]["status"] == "fail"
    assert result["disposition"] == "fail"
    assert result["production_promotion_allowed"] is False and result["overall_agentos_green"] is False
    assert "evidence_content_provenance_not_bound" in result["limitations"]


def test_malformed_or_missing_evidence_references_never_pass():
    data = bundle(); data["gates"]["A"]["evidence"] = []; data["negative_cases"]["1"]["evidence"] = []
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


def test_unbound_reference_strings_can_never_create_pass():
    data = bundle(); data.pop("evidence_manifest")
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_content_provenance_not_bound" in result["limitations"]


def test_missing_manifest_record_can_never_create_pass():
    data = bundle(); data["evidence_manifest"].pop("evidence:gate:A")
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


@pytest.mark.parametrize("field,value", [("sha256", "not-a-hash"), ("source", ""), ("captured_by", "")])
def test_malformed_manifest_provenance_can_never_create_pass(field, value):
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"][field] = value
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


@pytest.mark.parametrize("field", ["code_identity", "config_identity"])
def test_mismatched_manifest_identity_can_never_create_pass(field):
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"][field] = "different-identity"
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_identity_not_bound" in result["limitations"]


def test_partial_observed_identity_is_allowed_when_every_observed_field_matches():
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"]["identity"] = {"task_id": data["identity"]["task_id"]}
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "pass"


def test_missing_observed_identity_can_never_create_pass():
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"].pop("identity")
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_identity_not_bound" in result["limitations"]


@pytest.mark.parametrize("field", IDENTITY_FIELDS)
def test_conflicting_observed_identity_field_can_never_create_pass(field):
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"]["identity"] = {field: "conflicting-value"}
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_identity_not_bound" in result["limitations"]


def test_unknown_observed_identity_field_can_never_create_pass():
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"]["identity"] = {"unknown_id": "value"}
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


def test_stale_manifest_evidence_can_never_create_pass():
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"]["captured_at"] = "2026-09-12T13:29:00+00:00"
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_freshness_not_bound" in result["limitations"]


def test_future_manifest_evidence_can_never_create_pass():
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"]["captured_at"] = "2026-09-14T13:31:00+00:00"
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


def test_worker_custody_manifest_evidence_can_never_create_pass():
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"]["custody"] = "worker"
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_independent_custody_not_bound" in result["limitations"]


def test_missing_semantic_assertion_can_never_create_pass():
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"]["assertions"] = []
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_semantics_not_bound" in result["limitations"]


def test_conflicting_semantic_assertion_can_never_create_pass():
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"]["assertions"] = ["gate:A:fail"]
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_semantics_not_bound" in result["limitations"]


def test_extra_semantic_assertion_can_never_create_pass():
    data = bundle(); data["evidence_manifest"]["evidence:gate:A"]["assertions"].append("gate:B:pass")
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


def test_shared_evidence_must_bind_every_acceptance_use():
    data = bundle(); shared = "evidence:gate:A"; data["gates"]["B"]["evidence"] = [shared]
    data["evidence_manifest"].pop("evidence:gate:B")
    data["evidence_manifest"][shared]["assertions"] = ["gate:A:pass", "gate:B:pass"]
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "pass"
    data["evidence_manifest"][shared]["assertions"] = ["gate:A:pass"]
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "insufficient_evidence"


def test_known_failure_still_outranks_provenance_insufficiency():
    data = bundle(); data["gates"]["E"]["status"] = "fail"; data.pop("evidence_manifest")
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "fail"


def test_schema_inventory_matches_evaluator_contract():
    schema_path = Path(__file__).parents[1] / "schemas" / "owner-windows-level2-acceptance-v0.1.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    assert schema["properties"]["identity"]["required"] == list(IDENTITY_FIELDS)
    assert schema["properties"]["gates"]["required"] == list(GATES)
    assert schema["properties"]["negative_cases"]["required"] == list(NEGATIVE_CASES)
    manifest = schema["$defs"]["evidenceManifestRecord"]
    assert manifest["required"] == ["sha256", "source", "captured_by", "captured_at", "custody", "code_identity", "config_identity", "identity", "assertions"]
    assert schema["$defs"]["observedIdentity"]["minProperties"] == 1
    assert set(schema["$defs"]["observedIdentity"]["properties"]) == set(IDENTITY_FIELDS)


def test_input_bundle_is_not_mutated():
    data = bundle(); before = deepcopy(data); evaluate_owner_windows_acceptance(data); assert data == before
