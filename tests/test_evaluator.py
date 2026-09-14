from pathlib import Path

import pytest

from prs.evaluator import Snapshot, evaluate


def make_repo(tmp_path: Path) -> Path:
    files = [
        "README.md", "docs/PROJECT.md", "docs/OVERSEER.md",
        "docs/PRODUCT_POSITION.md", "docs/AGENTOS_INTEGRATION.md",
        "docs/ROADMAP.md", ".github/workflows/validate.yml",
    ]
    for relative in files:
        path = tmp_path / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("evidence\n", encoding="utf-8")
    return tmp_path


def snapshot() -> Snapshot:
    return Snapshot("test-project", "owner/repo", "abc123", "2026-09-02T00:00:00+00:00")


def test_complete_repository_is_verified(tmp_path: Path) -> None:
    result = evaluate(make_repo(tmp_path), snapshot())
    assert result["disposition"] == "verified"
    assert all(check["status"] == "pass" for check in result["checks"])
    assert result["provenance"]["commit_sha"] == "abc123"


def test_missing_foundation_is_failed(tmp_path: Path) -> None:
    root = make_repo(tmp_path)
    (root / "docs/PROJECT.md").unlink()
    result = evaluate(root, snapshot())
    assert result["disposition"] == "failed"
    assert result["checks"][0]["status"] == "fail"
    assert "docs/PROJECT.md" in result["checks"][0]["evidence"]


def test_missing_workflow_is_failed(tmp_path: Path) -> None:
    root = make_repo(tmp_path)
    (root / ".github/workflows/validate.yml").unlink()
    result = evaluate(root, snapshot())
    assert result["disposition"] == "failed"
    assert result["checks"][1]["status"] == "fail"


def test_missing_snapshot_field_is_rejected() -> None:
    with pytest.raises(ValueError):
        Snapshot("", "owner/repo", "abc123", "2026-09-02T00:00:00+00:00")


def test_evaluation_is_deterministic(tmp_path: Path) -> None:
    root = make_repo(tmp_path)
    assert evaluate(root, snapshot()) == evaluate(root, snapshot())


def test_missing_root_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        evaluate(tmp_path / "missing", snapshot())


def test_evidence_references_are_sorted_and_unique(tmp_path: Path) -> None:
    result = evaluate(make_repo(tmp_path), snapshot())
    evidence = result["provenance"]["evidence_references"]
    assert evidence == sorted(set(evidence))


def test_missing_required_assurance_evidence_cannot_be_green(tmp_path: Path) -> None:
    root = make_repo(tmp_path)
    (root / "docs/PROJECT.md").unlink()
    result = evaluate(root, snapshot())

    assert result["checks"][0]["check_id"] == "foundation_files_present"
    assert result["checks"][0]["status"] == "fail"
    assert result["checks"][0]["severity"] == "high"
    assert result["disposition"] != "verified"
    assert result["disposition"] == "failed"
    assert "docs/PROJECT.md" in result["checks"][0]["evidence"]
    assert result["findings"][0]["status"] == "fail"
    assert result["provenance"]["check_outcomes"][0] == "foundation_files_present:fail"
