import json
import unittest

from src.prs_evaluator import EVALUATOR_VERSION, InvalidSnapshot, evaluate, evaluate_json


BASE_SNAPSHOT = {
    "project_id": "prs-fixture",
    "repository": "darrinbaldwindev/PRS",
    "commit_sha": "fixture-sha",
    "captured_at": "2026-09-01T00:00:00Z",
}

BASE_PATHS = [
    "README.md",
    "docs/PROJECT.md",
    "docs/OVERSEER.md",
    "docs/ROADMAP.md",
    "docs/ASSURANCE_CONTRACT_V0.1.md",
    ".github/workflows/validate.yml",
]


class EvaluatorTests(unittest.TestCase):
    def test_pass_fixture(self):
        result = evaluate(BASE_SNAPSHOT, BASE_PATHS, "2026-09-01T00:00:00Z")
        self.assertEqual(result["disposition"], "verified")
        self.assertTrue(all(check["status"] == "pass" for check in result["checks"]))
        self.assertEqual(result["evaluator_version"], EVALUATOR_VERSION)

    def test_missing_foundation_file_fails(self):
        result = evaluate(BASE_SNAPSHOT, [p for p in BASE_PATHS if p != "docs/OVERSEER.md"], "2026-09-01T00:00:00Z")
        self.assertEqual(result["disposition"], "failed")
        finding = next(f for f in result["findings"] if f["check_id"] == "foundation_files_present")
        self.assertIn("missing:docs/OVERSEER.md", finding["evidence"])

    def test_missing_snapshot_input_rejected(self):
        with self.assertRaises(InvalidSnapshot):
            evaluate({**BASE_SNAPSHOT, "commit_sha": ""}, BASE_PATHS)

    def test_repeatability(self):
        a = evaluate(BASE_SNAPSHOT, BASE_PATHS, "2026-09-01T00:00:00Z")
        b = evaluate(BASE_SNAPSHOT, BASE_PATHS, "2026-09-01T00:00:00Z")
        self.assertEqual(a, b)
        self.assertEqual(evaluate_json(json.dumps(BASE_SNAPSHOT), BASE_PATHS, "2026-09-01T00:00:00Z"), evaluate_json(json.dumps(BASE_SNAPSHOT), BASE_PATHS, "2026-09-01T00:00:00Z"))

    def test_disposition_partial(self):
        paths = [p for p in BASE_PATHS if p != ".github/workflows/validate.yml"]
        result = evaluate(BASE_SNAPSHOT, paths, "2026-09-01T00:00:00Z")
        self.assertEqual(result["disposition"], "partially_verified")


if __name__ == "__main__":
    unittest.main()
