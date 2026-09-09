"""Read-only adapter for an existing AgentOS JSON snapshot.

This is not a ledger, persistence layer or recovery executor. Expected assignment,
capability observations and any execution census must come from independent
sources. Completed-event counts are never promoted into an execution census.
"""
import argparse
import hashlib
import json
from pathlib import Path

from .remote_receipt import evaluate_remote_receipt


def _object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError("duplicate JSON key")
        value[key] = item
    return value


def read_json(path):
    raw = Path(path).read_bytes()
    def invalid_constant(_):
        raise ValueError("non-finite JSON number")
    return json.loads(raw, object_pairs_hook=_object, parse_constant=invalid_constant), hashlib.sha256(raw).hexdigest()


def assess_remote_snapshot(*, state_path, expected, observed_at, capability_health=None,
                           execution_records=None, claimed_receipt=None):
    """Inspect a single read of state; never synthesize missing Green fields."""
    inspected = []
    unresolved = []
    snapshot_sha = None
    load_error = None
    receipt = result = green = None
    evidence = {}
    try:
        state, snapshot_sha = read_json(state_path)
        if not isinstance(expected, dict):
            raise ValueError("assignment must be an object")
        if not isinstance(state, dict) or type(state.get("schemaVersion")) is not int or state["schemaVersion"] != 1:
            raise ValueError("unsupported state schema")
        artifacts = state["records"]["artifact"]
        if not isinstance(artifacts, dict):
            raise ValueError("artifacts must be an object")

        def artifact(identity, kind):
            inspected.append(identity)
            entry = artifacts.get(identity)
            if not isinstance(entry, dict) or entry.get("id") != identity or entry.get("artifactType") != kind:
                return None
            payload = entry.get("payload")
            return payload if isinstance(payload, dict) else None

        delivery = expected.get("delivery_id")
        task = expected.get("task_id")
        if not all(isinstance(v, str) and v.strip() for v in (delivery, task)):
            raise ValueError("assignment identities missing")
        receipt = artifact(f"remote-receipt:{delivery}", "remote.execution.receipt")
        result = artifact(f"response:{task}", "project-overseer.response")
        green = artifact(f"green-disposition:{task}", "green.disposition")
        refs = receipt.get("evidence", []) if receipt else []
        if not isinstance(refs, list):
            refs = []
        for ref in refs:
            # Literal strings such as worker:id, green:pass and worker-output:JSON
            # are claims, not independently resolved persisted evidence.
            if not isinstance(ref, str) or not ref.startswith("artifact:"):
                unresolved.append(ref)
                continue
            resolved = artifact(ref[len("artifact:"):], "remote.execution.evidence")
            if resolved is None:
                unresolved.append(ref)
            else:
                evidence[ref] = resolved
    except (OSError, ValueError, TypeError, KeyError) as error:
        load_error = type(error).__name__
        # Never continue with partial data from an invalid state document.
        receipt = result = green = None
        evidence = {}

    assessment = evaluate_remote_receipt(
        receipt=claimed_receipt if claimed_receipt is not None else receipt,
        expected=expected, persisted_receipt=receipt, green=green,
        persisted_result=result, resolved_evidence=list(evidence), evidence_records=evidence,
        execution_records=execution_records, capability_health=capability_health, observed_at=observed_at,
    )
    assessment["snapshot_reader"] = {
        "version": "0.1", "read_only": True, "state_sha256": snapshot_sha,
        "inspected_artifact_ids": inspected, "unresolved_evidence_refs": unresolved,
        "load_error": load_error, "execution_census_inferred": False,
        "green_correlation_inferred": False,
    }
    return assessment


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", required=True)
    parser.add_argument("--assignment", required=True)
    parser.add_argument("--observed-at", required=True)
    args = parser.parse_args()
    expected, _ = read_json(args.assignment)
    result = assess_remote_snapshot(state_path=args.state, expected=expected, observed_at=args.observed_at)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["disposition"] == "verified" else 1


if __name__ == "__main__":
    raise SystemExit(main())
