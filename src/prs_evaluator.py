"""Dependency-light deterministic PRS v0.1 evaluator."""

from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import PurePosixPath
from typing import Any, Iterable, Mapping

EVALUATOR_VERSION = "0.1.1"
FOUNDATION_FILES = ("README.md", "docs/PROJECT.md", "docs/OVERSEER.md", "docs/ROADMAP.md")
REQUIREMENTS_FILES = ("docs/PROJECT.md", "docs/ASSURANCE_CONTRACT_V0.1.md")


class InvalidSnapshot(ValueError):
    """Raised when required snapshot input is missing or malformed."""


def _validate_snapshot(snapshot: Mapping[str, Any]) -> None:
    required = ("project_id", "repository", "commit_sha", "captured_at")
    missing = [k for k in required if not isinstance(snapshot.get(k), str) or not snapshot[k].strip()]
    if missing:
        raise InvalidSnapshot(f"missing required snapshot fields: {', '.join(missing)}")


def _normalise_paths(paths: Iterable[str] | Mapping[str, Any]) -> dict[str, int | None]:
    """Return path -> content length where available; reject non-string paths."""
    if isinstance(paths, Mapping):
        return {str(PurePosixPath(p)): (len(v) if isinstance(v, str) else None) for p, v in paths.items() if isinstance(p, str) and p.strip()}
    return {str(PurePosixPath(p)): None for p in paths if isinstance(p, str) and p.strip()}


def _check(check_id: str, passed: bool, summary: str, evidence: list[str], severity: str = "high") -> dict[str, Any]:
    return {"check_id": check_id, "status": "pass" if passed else "fail", "severity": "info" if passed else severity, "summary": summary, "evidence": evidence or [f"missing:{check_id}"]}


def evaluate(snapshot: dict[str, Any], paths: Iterable[str] | Mapping[str, Any], generated_at: str | None = None) -> dict[str, Any]:
    _validate_snapshot(snapshot)
    path_map = _normalise_paths(paths)
    generated_at = generated_at or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    def present_nonempty(path: str) -> bool:
        return path in path_map and (path_map[path] is None or path_map[path] > 0)

    missing_foundation = [p for p in FOUNDATION_FILES if not present_nonempty(p)]
    workflows = sorted(p for p, size in path_map.items() if p.startswith(".github/workflows/") and p.endswith((".yml", ".yaml")) and (size is None or size > 0))
    requirements = [p for p in REQUIREMENTS_FILES if present_nonempty(p)]

    checks = [
        _check("foundation_files_present", not missing_foundation, "Required foundation files are present and non-empty." if not missing_foundation else "Required foundation files are missing or empty.", [f"path:{p}" for p in FOUNDATION_FILES if present_nonempty(p)] + [f"missing_or_empty:{p}" for p in missing_foundation]),
        _check("validation_workflow_present", bool(workflows), "Validation workflow is present and non-empty." if workflows else "Validation workflow is missing or empty.", [f"path:{p}" for p in workflows]),
        _check("requirements_documented", bool(requirements), "Requirements documentation is present and non-empty." if requirements else "Requirements documentation is missing or empty.", [f"path:{p}" for p in requirements]),
    ]

    findings = [{"finding_id": f"F-{sha256(c['check_id'].encode()).hexdigest()[:12]}", **c} for c in checks]
    if any(c["status"] == "fail" and c["severity"] in {"high", "critical"} for c in checks):
        disposition = "failed"
    elif all(c["status"] == "pass" for c in checks):
        disposition = "verified"
    elif any(c["status"] == "pass" for c in checks):
        disposition = "partially_verified"
    else:
        disposition = "insufficient_evidence"

    provenance = {
        "evaluator_version": EVALUATOR_VERSION,
        "commit_sha": snapshot["commit_sha"],
        "check_outcomes": [f"{c['check_id']}:{c['status']}" for c in checks],
        "evidence_references": sorted({e for c in checks for e in c["evidence"]}),
        "generated_at": generated_at,
    }
    return {"snapshot": snapshot, "evaluator_version": EVALUATOR_VERSION, "checks": checks, "findings": findings, "disposition": disposition, "provenance": provenance}


def evaluate_json(payload: str, paths: Iterable[str] | Mapping[str, Any], generated_at: str | None = None) -> str:
    snapshot = json.loads(payload)
    if not isinstance(snapshot, dict):
        raise InvalidSnapshot("snapshot must be a JSON object")
    return json.dumps(evaluate(snapshot, paths, generated_at), sort_keys=True, separators=(",", ":"))
