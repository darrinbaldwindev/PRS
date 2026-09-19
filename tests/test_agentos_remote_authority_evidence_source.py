import json
import pathlib
import subprocess
import tempfile

AGENTOS_REPO = "https://github.com/darrinbaldwindev/AgentOS.git"
AGENTOS_HEAD = "ecd7fa33536fa963c51dbbcf381ee676e385c117"
SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "challenge-agentos-remote-authority-evidence-source.mjs"


def run(*args, cwd=None):
    return subprocess.run(args, cwd=cwd, check=True, text=True, capture_output=True)


def test_agentos_pr129_exact_head_remote_authority_evidence_source():
    with tempfile.TemporaryDirectory(prefix="prs-agentos-pr129-") as tmp:
        target = pathlib.Path(tmp) / "AgentOS"
        run("git", "init", str(target))
        run("git", "remote", "add", "origin", AGENTOS_REPO, cwd=target)
        run("git", "fetch", "--depth=1", "origin", AGENTOS_HEAD, cwd=target)
        run("git", "checkout", "--detach", "FETCH_HEAD", cwd=target)
        exact = run("git", "rev-parse", "HEAD", cwd=target).stdout.strip()
        assert exact == AGENTOS_HEAD

        completed = run("node", str(SCRIPT), str(target), AGENTOS_HEAD)
        evidence = json.loads(completed.stdout)
        assert evidence["schema"] == "prs.agentos-remote-authority-evidence-source.v1"
        assert evidence["exact_head"] == AGENTOS_HEAD
        assert evidence["status"] == "NEGATIVE_CASES_PASS"
        assert evidence["defect_count"] == 0
        assert evidence["assurance_certified"] is False
        assert evidence["production_promotion_allowed"] is False
        assert evidence["canonical_session_issuer_exercised"] is False
        assert evidence["canonical_grant_issuer_exercised"] is False
        assert evidence["canonical_consent_issuer_exercised"] is False
        assert evidence["authenticated_transport_exercised"] is False
        assert evidence["production_execution_enabled"] is False
        assert all(case["status"] == "pass" for case in evidence["cases"])
