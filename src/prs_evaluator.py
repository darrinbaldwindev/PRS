"""Compatibility adapter for the canonical dependency-light PRS evaluator.

The canonical implementation lives at :mod:`prs.evaluator`.  This module keeps
legacy callers working without maintaining a second assurance decision path.
"""

from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Iterable, Mapping

from prs.evaluator import Snapshot, VERSION, evaluate as evaluate_repository

EVALUATOR_VERSION = VERSION


class InvalidSnapshot(ValueError):
    """Raised when required snapshot input is missing or malformed."""


def _snapshot_from_mapping(snapshot: Mapping[str, Any]) -> Snapshot:
    required = ("project_id", "repository", "commit_sha", "captured_at")
    missing = [key for key in required if not isinstance(snapshot.get(key), str) or not snapshot[key].strip()]
    if missing:
        raise InvalidSnapshot(f"missing required snapshot fields: {', '.join(missing)}")
    try:
        return Snapshot(*(snapshot[key] for key in required))
    except ValueError as exc:
        raise InvalidSnapshot(str(exc)) from exc


def _normalise_paths(paths: Iterable[str] | Mapping[str, Any]) -> dict[str, str]:
    """Normalise legacy path evidence into deterministic in-memory file contents."""
    if isinstance(paths, Mapping):
        result: dict[str, str] = {}
        for raw_path, value in paths.items():
            if not isinstance(raw_path, str) or not raw_path.strip():
                continue
            if isinstance(value, str):
                result[raw_path] = value
            elif value is None:
                result[raw_path] = "evidence\n"
        return result

    return {
        raw_path: "evidence\n"
        for raw_path in paths
        if isinstance(raw_path, str) and raw_path.strip()
    }


def evaluate(
    snapshot: dict[str, Any],
    paths: Iterable[str] | Mapping[str, Any],
    generated_at: str | None = None,
) -> dict[str, Any]:
    """Evaluate legacy path evidence through the canonical PRS evaluator.

    ``generated_at`` is retained only for compatibility.  PRS v0.1 provenance is
    canonicalized to ``snapshot.captured_at``; callers attempting to supply a
    different timestamp are rejected instead of creating nondeterministic drift.
    """
    canonical_snapshot = _snapshot_from_mapping(snapshot)
    if generated_at is not None and generated_at != canonical_snapshot.captured_at:
        raise InvalidSnapshot("generated_at must equal snapshot.captured_at for deterministic PRS v0.1 evaluation")

    path_map = _normalise_paths(paths)
    with TemporaryDirectory(prefix="prs-evaluator-") as directory:
        root = Path(directory)
        for relative, content in path_map.items():
            target = root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
        return evaluate_repository(root, canonical_snapshot)


def evaluate_json(
    payload: str,
    paths: Iterable[str] | Mapping[str, Any],
    generated_at: str | None = None,
) -> str:
    snapshot = json.loads(payload)
    if not isinstance(snapshot, dict):
        raise InvalidSnapshot("snapshot must be a JSON object")
    return json.dumps(evaluate(snapshot, paths, generated_at), sort_keys=True, separators=(",", ":"))
