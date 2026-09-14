import json
import unittest

from src.prs_evaluator import EVALUATOR_VERSION, InvalidSnapshot, evaluate, evaluate_json

BASE_SNAPSHOT = {
    "project_id": "prs-fixture",
    "repository": "darrinbaldwindev/PRS",
    "commit_sha": "fixture-sha",
    "captured_at": "2026-09-01T00:00:00Z",
}
BASE_PATHS = {
    "README.md": "readme",
    "docs/PROJECT.md": "project",
    "docs/OVERSEER.md": "overseer",
    "docs/PRODUCT_POSITION.md": "position",
    "docs/AGENTOS_INTEGRATION.md": "integration",
    "docs/ROADMAP.md": "roadmap",
    ".github/workflows/validate.yml": "workflow",
}


class EvaluatorCompatibilityTests(unittest.TestCase):
    def test_pass_fixture(self):
        result = evaluate(BASE_SNAPSHOT, BASE_PATHS, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(result["disposition"], "verified")
        self.assertTrue(all(c["status"] == "pass" for c in result["checks"]))
        self.assertEqual(result["evaluator_version"], EVALUATOR_VERSION)
        self.assertEqual(result["provenance"]["generated_at"], BASE_SNAPSHOT["captured_at"])

    def test_empty_foundation_file_fails(self):
        paths = dict(BASE_PATHS)
        paths["docs/OVERSEER.md"] = ""
        result = evaluate(BASE_SNAPSHOT, paths, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(result["disposition"], "failed")
        finding = next(f for f in result["findings"] if f["check_id"] == "foundation_files_present")
        self.assertIn("docs/OVERSEER.md", finding["evidence"])

    def test_missing_exact_validation_workflow_fails(self):
        paths = {p: v for p, v in BASE_PATHS.items() if p != ".github/workflows/validate.yml"}
        paths[".github/workflows/other.yml"] = "other"
        result = evaluate(BASE_SNAPSHOT, paths, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(result["disposition"], "failed")
        self.assertEqual(result["checks"][1]["status"], "fail")

    def test_missing_project_requirements_fails(self):
        paths = dict(BASE_PATHS)
        paths["docs/PROJECT.md"] = ""
        result = evaluate(BASE_SNAPSHOT, paths, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(result["disposition"], "failed")
        self.assertEqual(result["checks"][2]["status"], "fail")

    def test_missing_snapshot_rejected(self):
        with self.assertRaises(InvalidSnapshot):
            evaluate({**BASE_SNAPSHOT, "commit_sha": ""}, BASE_PATHS)

    def test_generated_at_cannot_drift_from_snapshot(self):
        with self.assertRaises(InvalidSnapshot):
            evaluate(BASE_SNAPSHOT, BASE_PATHS, "2026-09-01T00:00:01Z")

    def test_repeatability_and_serialization(self):
        a = evaluate(BASE_SNAPSHOT, BASE_PATHS, BASE_SNAPSHOT["captured_at"])
        b = evaluate(BASE_SNAPSHOT, BASE_PATHS, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(a, b)
        encoded = json.dumps(BASE_SNAPSHOT)
        self.assertEqual(
            evaluate_json(encoded, BASE_PATHS, BASE_SNAPSHOT["captured_at"]),
            evaluate_json(encoded, BASE_PATHS, BASE_SNAPSHOT["captured_at"]),
        )
        self.assertEqual(a["provenance"]["commit_sha"], BASE_SNAPSHOT["commit_sha"])
        self.assertTrue(all(isinstance(x, str) for x in a["provenance"]["check_outcomes"]))

    def test_finding_ids_match_canonical_surface(self):
        result = evaluate(BASE_SNAPSHOT, BASE_PATHS, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(
            [f["finding_id"] for f in result["findings"]],
            [
                "finding-foundation_files_present",
                "finding-validation_workflow_present",
                "finding-requirements_documented",
            ],
        )


if __name__ == "__main__":
    unittest.main()
