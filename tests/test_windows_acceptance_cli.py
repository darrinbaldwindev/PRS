import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).parents[1]
CLI = ROOT / "scripts" / "evaluate-owner-windows-level2.py"
CURRENT_FIXTURE = ROOT / "tests" / "fixtures" / "owner-windows-level2" / "current-agentos-pr104.json"
RESULT_SCHEMA = ROOT / "schemas" / "owner-windows-level2-acceptance-result-v0.1.json"


def run_cli(path: Path):
    return subprocess.run(
        [sys.executable, str(CLI), str(path)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def test_current_agentos_pr104_fixture_cli_is_fail_closed():
    completed = run_cli(CURRENT_FIXTURE)
    assert completed.returncode == 0, completed.stderr
    result = json.loads(completed.stdout)
    assert result["disposition"] == "blocked"
    assert result["production_promotion_allowed"] is False
    assert result["overall_agentos_green"] is False
    assert "B:blocked" in result["provenance"]["gate_states"]
    assert "C:blocked" in result["provenance"]["gate_states"]
    assert "E:not_exercised" in result["provenance"]["gate_states"]
    assert "10:not_exercised" in result["provenance"]["negative_case_states"]


def test_cli_output_matches_result_schema_inventory():
    completed = run_cli(CURRENT_FIXTURE)
    assert completed.returncode == 0, completed.stderr
    result = json.loads(completed.stdout)
    schema = json.loads(RESULT_SCHEMA.read_text(encoding="utf-8"))
    assert set(result) == set(schema["required"])
    assert result["scope"] == schema["properties"]["scope"]["const"]
    assert result["disposition"] in schema["properties"]["disposition"]["enum"]
    assert result["production_promotion_allowed"] is schema["properties"]["production_promotion_allowed"]["const"]
    assert result["overall_agentos_green"] is schema["properties"]["overall_agentos_green"]["const"]


def test_cli_is_deterministic_for_same_bundle():
    first = run_cli(CURRENT_FIXTURE)
    second = run_cli(CURRENT_FIXTURE)
    assert first.returncode == 0
    assert second.returncode == 0
    assert first.stdout == second.stdout


def test_cli_rejects_invalid_json_without_assurance_result(tmp_path: Path):
    invalid = tmp_path / "invalid.json"
    invalid.write_text("{not-json", encoding="utf-8")
    completed = run_cli(invalid)
    assert completed.returncode == 2
    error = json.loads(completed.stdout)
    assert error["error"] == "JSONDecodeError"
    assert "disposition" not in error


def test_cli_rejects_non_object_bundle_without_assurance_result(tmp_path: Path):
    invalid = tmp_path / "list.json"
    invalid.write_text("[]", encoding="utf-8")
    completed = run_cli(invalid)
    assert completed.returncode == 2
    error = json.loads(completed.stdout)
    assert error["error"] == "TypeError"
    assert "disposition" not in error
