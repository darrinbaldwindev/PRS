import json
import tempfile
import unittest
from pathlib import Path

from prs import __version__
from prs.evaluator import Snapshot, evaluate as canonical_evaluate
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


def canonical_result(paths):
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for relative, content in paths.items():
            target = root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
        snapshot = Snapshot(**BASE_SNAPSHOT)
        return canonical_evaluate(root, snapshot)


class EvaluatorCompatibilityTests(unittest.TestCase):
    def test_pass_fixture_matches_canonical_result(self):
        result = evaluate(BASE_SNAPSHOT, BASE_PATHS, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(result, canonical_result(BASE_PATHS))
        self.assertEqual(result["disposition"], "verified")
        self.assertEqual(result["evaluator_version"], EVALUATOR_VERSION)
        self.assertEqual(EVALUATOR_VERSION, __version__)

    def test_empty_foundation_file_matches_canonical_failure(self):
        paths = dict(BASE_PATHS)
        paths["docs/OVERSEER.md"] = ""
        result = evaluate(BASE_SNAPSHOT, paths, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(result, canonical_result(paths))
        self.assertEqual(result["disposition"], "failed")
        finding = next(f for f in result["findings"] if f["check_id"] == "foundation_files_present")
        self.assertIn("docs/OVERSEER.md", finding["evidence"])

    def test_missing_workflow_matches_canonical_failure(self):
        paths = {p: v for p, v in BASE_PATHS.items() if p != ".github/workflows/validate.yml"}
        result = evaluate(BASE_SNAPSHOT, paths, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(result, canonical_result(paths))
        self.assertEqual(result["disposition"], "failed")

    def test_arbitrary_workflow_does_not_diverge_from_canonical_policy(self):
        paths = {p: v for p, v in BASE_PATHS.items() if p != ".github/workflows/validate.yml"}
        paths[".github/workflows/other.yml"] = "workflow"
        result = evaluate(BASE_SNAPSHOT, paths, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(result, canonical_result(paths))
        workflow = next(c for c in result["checks"] if c["check_id"] == "validation_workflow_present")
        self.assertEqual(workflow["status"], "fail")

    def test_missing_requirements_matches_canonical_failure(self):
        paths = dict(BASE_PATHS)
        paths["docs/PROJECT.md"] = ""
        result = evaluate(BASE_SNAPSHOT, paths, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(result, canonical_result(paths))
        requirements = next(c for c in result["checks"] if c["check_id"] == "requirements_documented")
        self.assertEqual(requirements["status"], "fail")

    def test_missing_snapshot_rejected(self):
        with self.assertRaises(InvalidSnapshot):
            evaluate({**BASE_SNAPSHOT, "commit_sha": ""}, BASE_PATHS)

    def test_different_generated_at_is_rejected(self):
        with self.assertRaises(ValueError):
            evaluate(BASE_SNAPSHOT, BASE_PATHS, "2026-09-01T00:00:01Z")

    def test_repeatability_and_serialization(self):
        a = evaluate(BASE_SNAPSHOT, BASE_PATHS, BASE_SNAPSHOT["captured_at"])
        b = evaluate(BASE_SNAPSHOT, BASE_PATHS, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(a, b)
        encoded = evaluate_json(json.dumps(BASE_SNAPSHOT), BASE_PATHS, BASE_SNAPSHOT["captured_at"])
        self.assertEqual(json.loads(encoded), a)
        self.assertEqual(a["provenance"]["generated_at"], BASE_SNAPSHOT["captured_at"])

    def test_unsafe_path_is_rejected(self):
        with self.assertRaises(ValueError):
            evaluate(BASE_SNAPSHOT, {"../outside": "evidence"}, BASE_SNAPSHOT["captured_at"])


if __name__ == "__main__":
    unittest.main()
