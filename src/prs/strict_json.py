"""Dependency-light strict JSON parsing for assurance ingestion boundaries.

The deterministic evaluators accept already-built Python mappings. Raw JSON text must
be parsed before evaluation, and duplicate object member names must be rejected before
ordinary mapping construction can collapse them.
"""
from __future__ import annotations

import json
from typing import Any


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON object key: {key}")
        result[key] = value
    return result


def loads_strict_json(payload: str) -> Any:
    """Parse JSON while rejecting duplicate object member names at every depth."""
    return json.loads(payload, object_pairs_hook=_unique_object)
