import json
import unittest

from src.prs_evaluator import EVALUATOR_VERSION, InvalidSnapshot, evaluate, evaluate_json

BASE_SNAPSHOT = {"project_id":"prs-fixture","repository":"darrinbaldwindev/PRS","commit_sha":"fixture-sha","captured_at":"2026-09-01T00:00:00Z"}
BASE_PATHS = {"README.md":"readme","docs/PROJECT.md":"project","docs/OVERSEER.md":"overseer","docs/ROADMAP.md":"roadmap","docs/ASSURANCE_CONTRACT_V0.1.md":"contract",".github/workflows/validate.yml":"workflow"}

class EvaluatorTests(unittest.TestCase):
    def test_pass_fixture(self):
        result = evaluate(BASE_SNAPSHOT, BASE_PATHS, "2026-09-01T00:00:00Z")
        self.assertEqual(result["disposition"], "verified")
        self.assertTrue(all(c["status"] == "pass" for c in result["checks"]))
        self.assertEqual(result["evaluator_version"], EVALUATOR_VERSION)

    def test_empty_foundation_file_fails(self):
        paths = dict(BASE_PATHS); paths["docs/OVERSEER.md"] = ""
        result = evaluate(BASE_SNAPSHOT, paths, "2026-09-01T00:00:00Z")
        self.assertEqual(result["disposition"], "failed")
        finding = next(f for f in result["findings"] if f["check_id"] == "foundation_files_present")
        self.assertIn("missing_or_empty:docs/OVERSEER.md", finding["evidence"])

    def test_missing_workflow_fails(self):
        paths = {p:v for p,v in BASE_PATHS.items() if not p.startswith(".github/workflows/")}
        result = evaluate(BASE_SNAPSHOT, paths, "2026-09-01T00:00:00Z")
        self.assertEqual(result["disposition"], "failed")

    def test_empty_requirements_fails(self):
        paths = dict(BASE_PATHS); paths["docs/ASSURANCE_CONTRACT_V0.1.md"] = ""
        paths["docs/PROJECT.md"] = ""
        result = evaluate(BASE_SNAPSHOT, paths, "2026-09-01T00:00:00Z")
        self.assertEqual(result["disposition"], "failed")

    def test_missing_snapshot_rejected(self):
        with self.assertRaises(InvalidSnapshot):
            evaluate({**BASE_SNAPSHOT, "commit_sha":""}, BASE_PATHS)

    def test_repeatability_and_serialization(self):
        a = evaluate(BASE_SNAPSHOT, BASE_PATHS, "2026-09-01T00:00:00Z")
        b = evaluate(BASE_SNAPSHOT, BASE_PATHS, "2026-09-01T00:00:00Z")
        self.assertEqual(a, b)
        self.assertEqual(evaluate_json(json.dumps(BASE_SNAPSHOT), BASE_PATHS, "2026-09-01T00:00:00Z"), evaluate_json(json.dumps(BASE_SNAPSHOT), BASE_PATHS, "2026-09-01T00:00:00Z"))
        self.assertEqual(a["provenance"]["commit_sha"], BASE_SNAPSHOT["commit_sha"])
        self.assertTrue(all(isinstance(x, str) for x in a["provenance"]["check_outcomes"]))

if __name__ == "__main__":
    unittest.main()
