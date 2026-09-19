import json

import pytest

from prs.strict_json import loads_strict_json


def test_valid_object_parses_unchanged():
    payload = '{"identity":{"task_id":"task-1"},"values":[1,2,3]}'
    assert loads_strict_json(payload) == json.loads(payload)


def test_duplicate_top_level_member_is_rejected_deterministically():
    with pytest.raises(ValueError, match=r"^duplicate JSON object key: identity$"):
        loads_strict_json('{"identity":{},"identity":{"worker_id":"forged"}}')


def test_duplicate_nested_member_is_rejected_deterministically():
    with pytest.raises(ValueError, match=r"^duplicate JSON object key: task_id$"):
        loads_strict_json('{"evidence_manifest":{"artifact-1":{"identity":{"task_id":"expected","task_id":"forged"}}}}')


def test_duplicate_manifest_reference_is_rejected_deterministically():
    with pytest.raises(ValueError, match=r"^duplicate JSON object key: artifact-1$"):
        loads_strict_json('{"evidence_manifest":{"artifact-1":{"sha256":"first"},"artifact-1":{"sha256":"second"}}}')


def test_non_object_json_remains_parseable_for_consuming_boundary_to_validate():
    assert loads_strict_json("[]") == []
