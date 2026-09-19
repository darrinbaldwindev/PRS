from test_windows_acceptance import bundle
from prs.windows_acceptance import evaluate_owner_windows_acceptance


def test_explicit_evidence_id_matching_manifest_key_preserves_pass():
    data = bundle()
    for ref, record in data["evidence_manifest"].items():
        record["evidence_id"] = ref
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "pass"


def test_explicit_evidence_id_conflicting_with_manifest_key_fails_closed():
    data = bundle()
    data["evidence_manifest"]["evidence:gate:A"]["evidence_id"] = "evidence:gate:B"
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_record_identity_not_bound" in result["limitations"]
    assert any(item["check_id"] == "evidence_record_id_bound" for item in result["findings"])


def test_same_digest_same_class_with_conflicting_provenance_fails_closed():
    data = bundle()
    first = data["evidence_manifest"]["evidence:gate:A"]
    second = data["evidence_manifest"]["evidence:gate:B"]
    second["sha256"] = first["sha256"]
    second["source"] = "fixture:conflicting-representation"
    result = evaluate_owner_windows_acceptance(data)
    assert result["disposition"] == "insufficient_evidence"
    assert "evidence_record_identity_not_bound" in result["limitations"]


def test_same_digest_same_class_with_identical_provenance_remains_shareable():
    data = bundle()
    first = data["evidence_manifest"]["evidence:gate:A"]
    second = data["evidence_manifest"]["evidence:gate:B"]
    for field in ("sha256", "source", "captured_by", "captured_at", "custody", "code_identity", "config_identity", "identity"):
        second[field] = first[field]
    assert evaluate_owner_windows_acceptance(data)["disposition"] == "pass"
