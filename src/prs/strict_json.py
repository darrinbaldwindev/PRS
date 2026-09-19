"""Dependency-light strict JSON parsing for assurance ingestion boundaries.

The deterministic evaluators accept already-built Python mappings. Raw JSON text must
be parsed before evaluation. Assurance ingestion rejects duplicate object member names
before mapping construction and rejects non-standard numeric constants that Python's
``json`` decoder otherwise accepts.
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


def _reject_nonstandard_constant(value: str) -> None:
    raise ValueError(f"non-standard JSON constant: {value}")


def loads_strict_json(payload: str) -> Any:
    """Parse strict JSON, rejecting duplicate members and non-standard constants."""
    return json.loads(
        payload,
        object_pairs_hook=_unique_object,
        parse_constant=_reject_nonstandard_constant,
    )
