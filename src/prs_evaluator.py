"""Compatibility adapter for the canonical :mod:`prs.evaluator` API.

This module preserves the legacy dict/path-set calling surface without maintaining
an independent assurance implementation. All assurance outcomes are produced by
``prs.evaluator``.
"""

from __future__ import annotations

import json
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory
from typing import Any, Iterable, Mapping

from prs import __version__
from prs.evaluator import REQUIRED_FOUNDATION_FILES, Snapshot, evaluate as _canonical_evaluate

EVALUATOR_VERSION = __version__
FOUNDATION_FILES = REQUIRED_FOUNDATION_FILES
REQUIREMENTS_FILES = ("docs/PROJECT.md",)


class InvalidSnapshot(ValueError):
    """Raised when required snapshot input is missing or malformed."""


def _snapshot_from_mapping(snapshot: Mapping[str, Any]) -> Snapshot:
    if not isinstance(snapshot, Mapping):
        raise InvalidSnapshot("snapshot must be a mapping")
    required = ("project_id", "repository", "commit_sha", "captured_at")
    missing = [key for key in required if not isinstance(snapshot.get(key), str) or not snapshot[key].strip()]
    if missing:
        raise InvalidSnapshot(f"missing required snapshot fields: {', '.join(missing)}")
    try:
        return Snapshot(*(snapshot[key] for key in required))
    except ValueError as exc:
        raise InvalidSnapshot(str(exc)) from exc


def _safe_relative_path(value: str) -> Path:
    pure = PurePosixPath(value)
    if pure.is_absolute() or ".." in pure.parts or not pure.parts:
        raise ValueError(f"unsafe repository path: {value!r}")
    return Path(*pure.parts)


def _materialize(root: Path, paths: Iterable[str] | Mapping[str, Any]) -> None:
    if isinstance(paths, Mapping):
        items = paths.items()
    else:
        items = ((path, None) for path in paths)

    for raw_path, content in items:
        if not isinstance(raw_path, str) or not raw_path.strip():
            continue
        target = root / _safe_relative_path(raw_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, str):
            target.write_text(content, encoding="utf-8")
        else:
            # Legacy iterable/path-only callers can prove presence but not content;
            # materialize a stable non-empty sentinel so the canonical evaluator
            # applies one assurance policy rather than a second inferred policy.
            target.write_text("present\n", encoding="utf-8")


def evaluate(
    snapshot: Mapping[str, Any],
    paths: Iterable[str] | Mapping[str, Any],
    generated_at: str | None = None,
) -> dict[str, Any]:
    """Delegate legacy input to the canonical evaluator.

    Deterministic v0.1 provenance uses ``snapshot.captured_at``. A legacy caller
    may still pass ``generated_at`` only when it is identical; accepting a
    different timestamp would make this compatibility surface diverge from the
    canonical assurance result.
    """
    canonical_snapshot = _snapshot_from_mapping(snapshot)
    if generated_at is not None and generated_at != canonical_snapshot.captured_at:
        raise ValueError("generated_at must equal snapshot captured_at for deterministic v0.1 evaluation")

    with TemporaryDirectory(prefix="prs-evaluator-") as temp_dir:
        root = Path(temp_dir)
        _materialize(root, paths)
        return _canonical_evaluate(root, canonical_snapshot)


def evaluate_json(
    payload: str,
    paths: Iterable[str] | Mapping[str, Any],
    generated_at: str | None = None,
) -> str:
    snapshot = json.loads(payload)
    if not isinstance(snapshot, dict):
        raise InvalidSnapshot("snapshot must be a JSON object")
    return json.dumps(
        evaluate(snapshot, paths, generated_at),
        sort_keys=True,
        separators=(",", ":"),
    )
