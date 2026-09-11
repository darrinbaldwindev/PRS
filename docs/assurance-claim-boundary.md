# PRS assurance claim boundary

This document defines the claim boundary for the offline remote-bridge evaluator.

## What a passing offline assessment means

A passing assessment means the supplied snapshot is internally consistent with the independently supplied assignment and auxiliary evidence provided to the evaluator.

It does **not** by itself prove:

- transport authenticity;
- that the assignment was independently anchored before execution;
- that the supplied execution census is exhaustive;
- that timestamps are independently trustworthy;
- that the reported Git identity equals the bytes that actually executed;
- physical Windows execution;
- production readiness or production authority.

The offline evaluator remains read-only and must not authorize runtime execution, recovery, deployment, or production promotion.

## Disposition vocabulary

Use `consistent` for a passing offline snapshot assessment. Use `failed` when any required check fails.

Do not use `verified` as a synonym for authenticated execution. Stronger assurance requires an independent trust anchor outside the evidence producer's ability to rewrite after the fact.

## Required negative cases

The test suite must preserve the following boundaries:

1. A perfectly coherent self-authored evidence bundle is not equivalent to authenticated independent evidence.
2. A supplied single execution record is not proof of an exhaustive runtime census without an independent census boundary.
3. Assignment values supplied by the same producer as execution evidence are correlated, not independently authenticated.

These are claim-boundary constraints, not requests for a second scheduler, ledger, persistence layer, or execution runtime.
