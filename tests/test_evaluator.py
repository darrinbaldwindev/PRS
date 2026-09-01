from pathlib import Path

import pytest

from prs.evaluator import Snapshot, evaluate


def make_repo(tmp_path: Path, *, complete: bool = True) -> Path:
    files = [
        "README.md",
        "docs/PROJECT.md",
        "docs/OVERSEER.md",
        "docs/PRODUCT_POSITION.md",
        "docs/AGENTOS_INTEGRATION.md",
        "docs/ROADMAP.md",
        ".github/workflows/validate.yml",
    ]
    if complete:
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
    make_repo(tmp_path)
    (tmp_path / "docs/PROJECT.md").unlink()
    result = evaluate(tmp_path, snapshot())
    assert result["disposition"] == "failed"
    assert result["checks"][0]["status"] == "fail"


def test_missing_workflow_is_failed(tmp_path: Path) -> None:
    make_repo(tmp_path)
    (tmp_path / ".github/workflows/validate.yml").unlink()
    result = evaluate(tmp_path, snapshot())
    assert result["disposition"] == "failed"
    assert result["checks"][1]["status"] == "fail"


def test_missing_snapshot_field_is_rejected() -> None:
    with pytest.raises(ValueError):
        Snapshot("", "owner/repo", "abc123", "2026-09-02T00:00:00+00:00")


def test_evaluation_is_deterministic(tmp_path: Path) -> None:
    root = make_repo(tmp_path)
    first = evaluate(root, snapshot())
    second = evaluate(root, snapshot())
    assert first == second


def test_missing_root_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        evaluate(tmp_path / "missing", snapshot())
