# PRS Roadmap

## Phase 0 — Product-family alignment

- Establish PRS as an AgentOS companion product.
- Define the responsibility boundary.
- Identify overlap and reuse opportunities.
- Preserve AgentOS as the execution/orchestration authority.

**Status: COMPLETE**

## Phase 1 — Assurance contract

- Define project snapshot input.
- Define health/check vocabulary.
- Define findings and severity.
- Define verification evidence references.
- Define assurance disposition.
- Define minimal acceptance criteria.

**Status: NEXT**

## Phase 2 — Repository assurance vertical slice

Candidate scope:

1. Load a defined repository/project snapshot.
2. Run deterministic health checks.
3. Produce findings.
4. Produce a project-health disposition.
5. Preserve evidence and provenance.
6. Make the result inspectable by an AgentOS Overseer.

No live autonomous remediation is required for this phase.

## Phase 3 — AgentOS integration

- Consume AgentOS project/run/change/verification events.
- Correlate assurance results with mission and run identity.
- Request targeted inspection when evidence changes materially.
- Publish findings and recommendations back through the AgentOS control plane.
- Maintain independent verification semantics.

## Phase 4 — Continuous assurance

- Event-driven assurance.
- Scheduled safety-net checks.
- Drift detection.
- Regression detection.
- Release/readiness gates.
- Cross-project assurance dashboards.

## Phase 5 — Commercial packaging

Evaluate, using evidence rather than assumption:

- basic PRS included in AgentOS;
- advanced PRS in Pro/Business/Enterprise tiers;
- paid PRS add-on;
- standalone PRS market only if independent demand is demonstrated.

Commercial packaging must not distort technical capability routing or verification results.

## Priority rule

Build one coherent, tested assurance path before expanding into broad project-management or runtime functionality already owned by AgentOS.
