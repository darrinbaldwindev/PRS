# Offline assurance: complete Green assignment identity

Base: `93f4019` on the existing immutable adversarial probe draft lineage.
The receipt evaluator checked all twelve assignment identity fields on receipts
and final results, but only six on Green records. Twelve negative cases proved
that missing or conflicting delivery, request, host, actor, issuer or configuration
identity could retain a verified offline disposition.

The evaluator now requires every canonical IDENTITY_FIELDS value on Green too.
No missing identity is inferred from the receipt. Evaluator version is 0.4.
This extends the existing independent snapshot checker; it adds no runtime gate,
execution authority, transport, scheduler, or new source of truth.

Before repair: 12/12 new negative tests failed (false verification reproduced).
After repair: full Python suite 127 passed, zero failures.
Command: PYTHONPATH=<pytest-dependencies>:src python -m pytest -q.
Production promotion and runtime integration remain false. A fixture consistency
pass is not independent certification of AgentOS, Windows, or live remote execution.
