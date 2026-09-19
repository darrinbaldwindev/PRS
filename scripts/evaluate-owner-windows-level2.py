#!/usr/bin/env python3
"""Evaluate one supplied owner-Windows Level-2 evidence bundle offline.

This command performs no network calls and grants no execution, remediation,
scheduler, credential, production-write, merge, deployment, or promotion
authority. It prints the deterministic PRS assessment as JSON.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from prs.strict_json import loads_strict_json  # noqa: E402
from prs.windows_acceptance import evaluate_owner_windows_acceptance  # noqa: E402


def parser() -> argparse.ArgumentParser:
    value = argparse.ArgumentParser(
        description="Evaluate a supplied owner-Windows Level-2 acceptance evidence JSON bundle offline."
    )
    value.add_argument("bundle", type=Path, help="Path to the input evidence JSON bundle")
    return value


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        payload = loads_strict_json(args.bundle.read_text(encoding="utf-8"))
        result = evaluate_owner_windows_acceptance(payload)
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as error:
        print(json.dumps({"error": type(error).__name__, "message": str(error)}, sort_keys=True))
        return 2

    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
