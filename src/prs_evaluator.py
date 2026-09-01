"""Dependency-light deterministic PRS v0.1 evaluator.

The evaluator consumes an explicit project snapshot and a list of repository
paths. It performs only deterministic local checks; it does not use network,
providers, credentials, or AgentOS runtime services.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import PurePosixPath
from typing import Any, Iterable

EVALUATOR_VERSION = "0.1.0"

REQUIRED_CHECKS = (
    ("foundation_files_present", "Required PRS foundation files are present and non-empty."),
    ("validation_workflow_present", "A repository validation workflow is present and non-empty."),
    ("requirements_documented", "Authoritative project requirements are present and non-empty."),
)

FOUNDATION_FILES = (
    "README.md",
    "docs/PROJECT.md",
    "docs/OVERSEER.md",
    "docs/ROADMAP.md",
)
REQUIREMENTS_FILES = ("docs/PROJECT.md", "docs/ASSURANCE_CONTRACT_V0.1.md")


class InvalidSnapshot(ValueError):
    """Raised when required snapshot input is missing or malformed."""


def _non_empty_paths(paths: Iterable[str]) -> set[str]:
    return {str(PurePosixPath(path)) for path in paths if isinstance(path, str) and path.strip()}


def _validate_snapshot(snapshot: dict[str, Any]) -> None:
    required = ("project_id", "repository", "commit_sha", "captured_at")
    missing = [key for key in required if not isinstance(snapshot.get(key), str) or not snapshot[key].strip()]
    if missing:
        raise InvalidSnapshot(f"missing required snapshot fields: {', '.join(missing)}")


def _check(check_id: str, passed: bool, summary: str, evidence: list[str], severity: str = "high") -> dict[str, Any]:
    return {
        "check_id": check_id,
        "status": "pass" if passed else "fail",
        "severity": "info" if passed else severity,
        "summary": summary,
        "evidence": evidence or ([f"missing:{check_id}"] if not passed else []),
    }


def evaluate(snapshot: dict[str, Any], paths: Iterable[str], generated_at: str | None = None) -> dict[str, Any]:
    _validate_snapshot(snapshot)
    path_set = _non_empty_paths(paths)
    generated_at = generated_at or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    foundation_missing = [path for path in FOUNDATION_FILES if path not in path_set]
    workflow_paths = sorted(path for path in path_set if path.startswith(".github/workflows/") and path.endswith((".yml", ".yaml")))
    requirements_present = any(path in path_set for path in REQUIREMENTS_FILES)

    checks = [
        _check("foundation_files_present", not foundation_missing, "Required foundation files are present." if not foundation_missing else "Required foundation files are missing.", [f"path:{p}" for p in FOUNDATION_FILES if p in path_set] + [f"missing:{p}" for p in foundation_missing]),
        _check("validation_workflow_present", bool(workflow_paths), "Validation workflow is present." if workflow_paths else "Validation workflow is missing.", [f"path:{p}" for p in workflow_paths]),
        _check("requirements_documented", requirements_present, "Requirements documentation is present." if requirements_present else "Requirements documentation is missing.", [f"path:{p}" for p in REQUIREMENTS_FILES if p in path_set]),
    ]

    findings = []
    for result in checks:
        digest = sha256(result["check_id"].encode("utf-8")).hexdigest()[:12]
        findings.append({
            "finding_id": f"F-{digest}",
            **result,
        })

    statuses = [check["status"] for check in checks]
    severities = {check["severity"] for check in checks if check["status"] == "fail"}
    if "high" in severities:
        disposition = "failed"
    elif all(status == "pass" for status in statuses):
        disposition = "verified"
    elif any(status == "pass" for status in statuses):
        disposition = "partially_verified"
    else:
        disposition = "insufficient_evidence"

    provenance = {
        "evaluator_version": EVALUATOR_VERSION,
        "snapshot_commit_sha": snapshot["commit_sha"],
        "check_outcomes": [{"check_id": c["check_id"], "status": c["status"]} for c in checks],
        "evidence_references": sorted({ref for c in checks for ref in c["evidence"]}),
        "generated_at": generated_at,
    }
    return {
        "snapshot": snapshot,
        "evaluator_version": EVALUATOR_VERSION,
        "checks": checks,
        "findings": findings,
        "disposition": disposition,
        "provenance": provenance,
    }


def evaluate_json(payload: str, paths: Iterable[str], generated_at: str | None = None) -> str:
    snapshot = json.loads(payload)
    if not isinstance(snapshot, dict):
        raise InvalidSnapshot("snapshot must be a JSON object")
    return json.dumps(evaluate(snapshot, paths, generated_at), sort_keys=True, separators=(",", ":"))
