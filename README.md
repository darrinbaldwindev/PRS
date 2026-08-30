# PRS

## Purpose

PRS is the repository for the PRS project and its controlled development record.

This repository starts intentionally minimal. The project definition, architecture, operating rules, implementation, tests, and evidence should be added incrementally and verified rather than inferred without evidence.

## Operating principle

**Inspect → define → implement → verify → record → continue.**

The PRS Overseer is responsible for maintaining project awareness, identifying the highest-value next action, preventing unsupported assumptions, and recording material decisions and verification results.

## Repository status

- Stage: Foundation
- Implementation: Not yet established
- Tests: Not yet established
- CI: Not yet established
- Last verified: 2026-08-31

## Structure

```text
PRS/
├── README.md
├── docs/
│   ├── PROJECT.md
│   └── OVERSEER.md
└── .github/
    └── workflows/
        └── validate.yml
```

## Development rule

Do not claim a feature is implemented until its source, validation, and evidence exist in the repository.
