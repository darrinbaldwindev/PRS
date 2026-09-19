import json
import re

import pytest

from prs.strict_json import loads_strict_json


def test_valid_object_parses_unchanged():
    payload = '{"identity":{"task_id":"task-1"},"values":[1,2,3],"ratio":1.25,"negative":-4}'
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


@pytest.mark.parametrize("constant", ["NaN", "Infinity", "-Infinity"])
def test_nonstandard_numeric_constants_are_rejected_deterministically(constant: str):
    with pytest.raises(ValueError, match=rf"^non-standard JSON constant: {re.escape(constant)}$"):
        loads_strict_json(f'{{"value":{constant}}}')


def test_nested_nonstandard_constant_is_rejected():
    with pytest.raises(ValueError, match=r"^non-standard JSON constant: NaN$"):
        loads_strict_json('{"evidence_manifest":{"artifact-1":{"identity":{"task_id":NaN}}}}')


def test_non_object_json_remains_parseable_for_consuming_boundary_to_validate():
    assert loads_strict_json("[]") == []
