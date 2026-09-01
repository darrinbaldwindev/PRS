"""Deterministic, dependency-light PRS v0.1 repository evaluator."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

VERSION = "0.1.0"

REQUIRED_FOUNDATION_FILES = (
    "README.md",
    "docs/PROJECT.md",
    "docs/OVERSEER.md",
    "docs/PRODUCT_POSITION.md",
    "docs/AGENTOS_INTEGRATION.md",
    "docs/ROADMAP.md",
)
REQUIRED_CHECKS = (
    "foundation_files_present",
    "validation_workflow_present",
    "requirements_documented",
)


@dataclass(frozen=True)
class Snapshot:
    project_id: str
    repository: str
    commit_sha: str
    captured_at: str

    def __post_init__(self) -> None:
        for name, value in self.__dict__.items():
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"snapshot field '{name}' must be a non-empty string")


def _check(check_id: str, status: str, severity: str, summary: str, evidence: list[str]) -> dict[str, Any]:
    return {
        "check_id": check_id,
        "status": status,
        "severity": severity,
        "summary": summary,
        "evidence": evidence,
    }


def _present(root: Path, relative: str) -> bool:
    path = root / relative
    return path.is_file() and path.stat().st_size > 0


def evaluate(root: str | Path, snapshot: Snapshot) -> dict[str, Any]:
    """Evaluate a repository snapshot without network, credentials, or model calls."""
    root_path = Path(root)
    if not root_path.is_dir():
        raise ValueError("evaluation root must be an existing directory")

    missing_foundation = [p for p in REQUIRED_FOUNDATION_FILES if not _present(root_path, p)]
    foundation = _check(
        "foundation_files_present",
        "pass" if not missing_foundation else "fail",
        "high" if missing_foundation else "info",
        "All required foundation files are present and non-empty."
        if not missing_foundation
        else "Required foundation files are missing or empty.",
        REQUIRED_FOUNDATION_FILES if not missing_foundation else missing_foundation,
    )

    workflow_path = ".github/workflows/validate.yml"
    workflow = _check(
        "validation_workflow_present",
        "pass" if _present(root_path, workflow_path) else "fail",
        "high" if not _present(root_path, workflow_path) else "info",
        "Repository validation workflow is present and non-empty."
        if _present(root_path, workflow_path)
        else "Repository validation workflow is missing or empty.",
        [workflow_path],
    )

    requirements_path = "docs/PROJECT.md"
    requirements = _check(
        "requirements_documented",
        "pass" if _present(root_path, requirements_path) else "fail",
        "high" if not _present(root_path, requirements_path) else "info",
        "Project definition is present and non-empty."
        if _present(root_path, requirements_path)
        else "Project definition is missing or empty.",
        [requirements_path],
    )

    checks = [foundation, workflow, requirements]
    failures = [c for c in checks if c["status"] == "fail"]
    critical_or_high = [c for c in failures if c["severity"] in {"critical", "high"}]
    if critical_or_high:
        disposition = "failed"
    elif failures:
        disposition = "partially_verified"
    elif not checks:
        disposition = "insufficient_evidence"
    else:
        disposition = "verified"

    findings = [
        {
            "finding_id": f"finding-{check['check_id']}",
            "check_id": check["check_id"],
            "severity": check["severity"],
            "status": check["status"],
            "summary": check["summary"],
            "evidence": check["evidence"],
        }
        for check in checks
    ]

    return {
        "snapshot": {
            "project_id": snapshot.project_id,
            "repository": snapshot.repository,
            "commit_sha": snapshot.commit_sha,
            "captured_at": snapshot.captured_at,
        },
        "evaluator_version": VERSION,
        "checks": checks,
        "findings": findings,
        "disposition": disposition,
        "provenance": {
            "evaluator_version": VERSION,
            "commit_sha": snapshot.commit_sha,
            "check_outcomes": [f"{c['check_id']}:{c['status']}" for c in checks],
            "evidence_references": sorted({e for c in checks for e in c["evidence"]}),
            "generated_at": snapshot.captured_at,
        },
    }
