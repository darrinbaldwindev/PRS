import json
import hashlib
from pathlib import Path
from copy import deepcopy

import pytest

from prs.remote_snapshot import assess_remote_snapshot
from test_remote_receipt import packet


def snapshot(tmp_path):
    data = packet()
    expected = data["expected"]
    data["receipt"]["evidence"] = ["artifact:output"]
    data["persisted_receipt"] = deepcopy(data["receipt"])
    entries = [
        (f"remote-receipt:{expected['delivery_id']}", "remote.execution.receipt", data["receipt"]),
        (f"response:{expected['task_id']}", "project-overseer.response", data["persisted_result"]),
        (f"green-disposition:{expected['task_id']}", "green.disposition", data["green"]),
        ("output", "remote.execution.evidence", data["evidence_records"]["persisted:worker-output"]),
    ]
    state = {"schemaVersion": 1, "records": {"artifact": {key: {"id": key, "artifactType": kind, "payload": payload}
                                                          for key, kind, payload in entries}}}
    path = tmp_path / "state.json"
    path.write_text(json.dumps(state))
    args = dict(state_path=path, expected=expected, observed_at=data["observed_at"],
                execution_records=data["execution_records"], capability_health=data["capability_health"])
    return state, path, args


def test_reader_is_read_only_and_resolves_by_type_and_id(tmp_path):
    _, path, args = snapshot(tmp_path)
    before = path.read_bytes()
    result = assess_remote_snapshot(**args)
    assert result["disposition"] == "verified"  # synthetic snapshot consistency only
    assert path.read_bytes() == before
    assert result["snapshot_reader"]["state_sha256"]
    assert result["runtime_integration_enabled"] is False
    assert result["production_promotion_allowed"] is False


@pytest.mark.parametrize("kind", ["receipt", "result", "green", "evidence"])
def test_missing_saved_artifact_fails(tmp_path, kind):
    state, path, args = snapshot(tmp_path)
    key = list(state["records"]["artifact"])[["receipt", "result", "green", "evidence"].index(kind)]
    del state["records"]["artifact"][key]
    path.write_text(json.dumps(state))
    assert assess_remote_snapshot(**args)["disposition"] == "failed"


def test_current_task_only_green_is_not_enriched_from_receipt(tmp_path):
    state, path, args = snapshot(tmp_path)
    key = f"green-disposition:{args['expected']['task_id']}"
    state["records"]["artifact"][key]["payload"] = {"task_id": args["expected"]["task_id"], "disposition": "pass"}
    path.write_text(json.dumps(state))
    result = assess_remote_snapshot(**args)
    assert result["disposition"] == "failed"
    assert "green_code_identity:fail" in result["provenance"]["check_outcomes"]
    assert result["snapshot_reader"]["green_correlation_inferred"] is False


def test_completed_events_are_not_an_execution_census(tmp_path):
    state, path, args = snapshot(tmp_path)
    state["records"]["event"] = {"one": {"eventType": "agentos.manual-wake.completed"}}
    path.write_text(json.dumps(state))
    args["execution_records"] = None
    result = assess_remote_snapshot(**args)
    assert "single_correlated_execution:fail" in result["provenance"]["check_outcomes"]


@pytest.mark.parametrize("raw", ['{"schemaVersion":1,"schemaVersion":1}', '{"schemaVersion":NaN}', '{broken'])
def test_ambiguous_or_malformed_json_fails(tmp_path, raw):
    _, path, args = snapshot(tmp_path)
    path.write_text(raw)
    result = assess_remote_snapshot(**args)
    assert result["disposition"] == "failed"
    assert result["snapshot_reader"]["load_error"] is not None


def test_receipt_claim_cannot_replace_missing_saved_receipt(tmp_path):
    state, path, args = snapshot(tmp_path)
    key = f"remote-receipt:{args['expected']['delivery_id']}"
    args["claimed_receipt"] = state["records"]["artifact"].pop(key)["payload"]
    path.write_text(json.dumps(state))
    assert assess_remote_snapshot(**args)["disposition"] == "failed"


def test_literal_evidence_and_wrong_artifact_type_are_unresolved(tmp_path):
    state, path, args = snapshot(tmp_path)
    receipt = state["records"]["artifact"][f"remote-receipt:{args['expected']['delivery_id']}"]["payload"]
    receipt["evidence"].append('worker-output:{"success":true}')
    state["records"]["artifact"]["output"]["artifactType"] = "untrusted.note"
    path.write_text(json.dumps(state))
    result = assess_remote_snapshot(**args)
    assert result["disposition"] == "failed"
    assert len(result["snapshot_reader"]["unresolved_evidence_refs"]) == 2


def test_captured_runtime_completion_is_not_independent_verification():
    directory = Path(__file__).parent / "fixtures" / "remote-runtime"
    state = directory / "state.json"
    assignment = json.loads((directory / "assignment.json").read_text())
    capture = json.loads((directory / "capture.json").read_text())
    saved = json.loads((Path(__file__).parents[1] / "docs" / "evidence" /
                        "remote-snapshot-challenge-2026-09-09.json").read_text())
    before = state.read_bytes()
    result = assess_remote_snapshot(state_path=state, expected=assignment,
                                    observed_at=capture["observed_at"])
    assert capture["scheduler_claim"] == "COMPLETED"
    assert hashlib.sha256(before).hexdigest() == saved["snapshot_reader"]["state_sha256"]
    assert hashlib.sha256((directory / "assignment.json").read_bytes()).hexdigest() == saved["observation"]["assignment_sha256"]
    assert result["disposition"] == "failed"
    assert {check["check_id"] for check in result["checks"] if check["status"] == "fail"} == {
        "green_mission_id", "green_wake_trace_id", "green_worker_id", "green_code_identity",
        "resolved_completion_evidence", "single_correlated_execution",
        "fresh_correlated_provenance", "task_capability_health",
    }
    assert result["checks"] == saved["checks"]
    assert state.read_bytes() == before
