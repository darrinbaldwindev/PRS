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
    return {"check_id": check_id, "status": status, "severity": severity, "summary": summary, "evidence": evidence}


def _present(root: Path, relative: str) -> bool:
    path = root / relative
    return path.is_file() and path.stat().st_size > 0


def evaluate(root: str | Path, snapshot: Snapshot) -> dict[str, Any]:
    """Evaluate a repository snapshot without network, credentials, or model calls."""
    root_path = Path(root)
    if not root_path.is_dir():
        raise ValueError("evaluation root must be an existing directory")

    checks: list[dict[str, Any]] = []
    missing = [path for path in REQUIRED_FOUNDATION_FILES if not _present(root_path, path)]
    checks.append(_check(
        "foundation_files_present",
        "pass" if not missing else "fail",
        "info" if not missing else "high",
        "All required foundation files are present and non-empty." if not missing else "Required foundation files are missing or empty.",
        list(REQUIRED_FOUNDATION_FILES if not missing else missing),
    ))

    workflow = ".github/workflows/validate.yml"
    workflow_ok = _present(root_path, workflow)
    checks.append(_check(
        "validation_workflow_present", "pass" if workflow_ok else "fail", "info" if workflow_ok else "high",
        "Repository validation workflow is present and non-empty." if workflow_ok else "Repository validation workflow is missing or empty.",
        [workflow],
    ))

    requirements = "docs/PROJECT.md"
    requirements_ok = _present(root_path, requirements)
    checks.append(_check(
        "requirements_documented", "pass" if requirements_ok else "fail", "info" if requirements_ok else "high",
        "Project definition is present and non-empty." if requirements_ok else "Project definition is missing or empty.",
        [requirements],
    ))

    failures = [c for c in checks if c["status"] == "fail"]
    disposition = "failed" if any(c["severity"] in {"critical", "high"} for c in failures) else "partially_verified" if failures else "verified"
    findings = [
        {"finding_id": f"finding-{c['check_id']}", "check_id": c["check_id"], "severity": c["severity"],
         "status": c["status"], "summary": c["summary"], "evidence": c["evidence"]}
        for c in checks
    ]
    evidence = sorted({item for check in checks for item in check["evidence"]})
    outcomes = [f"{c['check_id']}:{c['status']}" for c in checks]
    return {
        "snapshot": snapshot.__dict__.copy(),
        "evaluator_version": VERSION,
        "checks": checks,
        "findings": findings,
        "disposition": disposition,
        "provenance": {
            "evaluator_version": VERSION,
            "commit_sha": snapshot.commit_sha,
            "check_outcomes": outcomes,
            "evidence_references": evidence,
            "generated_at": snapshot.captured_at,
        },
    }
