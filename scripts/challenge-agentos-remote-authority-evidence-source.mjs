// Independent exact-head adversarial probe for AgentOS durable remote authority evidence loading.
// This probe is read-only: it imports the exact target module, injects an in-memory artifact reader,
// and checks fail-closed behavior. It does not authenticate transports, issue grants/consent, or execute work.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-remote-authority-evidence-source.mjs REPO EXACT_SHA');
}
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');

const modulePath = 'runtime/remote-authority-evidence-source.mjs';
const source = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
const checkedOut = resolve(repo, modulePath);
if (readFileSync(checkedOut, 'utf8') !== source) throw new Error('checked-out module does not match exact Git object');
const mod = await import(`${pathToFileURL(checkedOut).href}?prs-authority-evidence=${ref}`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const NOW = new Date('2026-09-19T04:30:00.000Z');
const sessionId = 'prs-session-evidence';
const grantId = 'prs-grant-evidence';
const consentId = 'prs-consent-evidence';

const request = Object.freeze({
  delivery_id: 'prs-delivery',
  request_id: 'prs-request',
  actor_id: 'prs-owner',
  issuer: 'agentos:overseer',
  project_id: 'agentos',
  objective: 'bounded exact-head authority evidence challenge',
  requested_capabilities: Object.freeze(['project.file.write']),
});
const candidate = Object.freeze({ ...request, admission_state: 'AWAITING_AUTHORITY' });

function windowFields(overrides = {}) {
  return {
    issued_at: '2026-09-19T04:29:00.000Z',
    expires_at: '2026-09-19T04:40:00.000Z',
    revoked_at: null,
    ...overrides,
  };
}
function sessionPayload(overrides = {}) {
  return {
    evidence_id: sessionId,
    status: 'AUTHENTICATED',
    actor_id: request.actor_id,
    issuer: request.issuer,
    session_id: 'prs-session',
    transport_id: 'prs-transport',
    authentication_method: 'prs-fixture',
    request_id: request.request_id,
    delivery_id: request.delivery_id,
    ...windowFields(),
    ...overrides,
  };
}
function consentPayload(overrides = {}) {
  return {
    evidence_id: consentId,
    status: 'ACTIVE',
    actor_id: request.actor_id,
    issuer: request.issuer,
    project_id: request.project_id,
    mission_id: 'prs-mission',
    request_id: request.request_id,
    delivery_id: request.delivery_id,
    objective: request.objective,
    target: 'docs/level2.md',
    consent_mode: 'PRE_AUTHORIZED',
    ...windowFields({ issued_at: '2026-09-19T04:29:05.000Z' }),
    ...overrides,
  };
}
function grantPayload(overrides = {}) {
  return {
    evidence_id: grantId,
    status: 'GRANTED',
    actor_id: request.actor_id,
    issuer: request.issuer,
    project_id: request.project_id,
    mission_id: 'prs-mission',
    request_id: request.request_id,
    delivery_id: request.delivery_id,
    objective: request.objective,
    granted_capabilities: ['project.file.write'],
    target: 'docs/level2.md',
    acceptance_criteria: ['exact requested file changed'],
    consent_mode: 'PRE_AUTHORIZED',
    consent_evidence_id: consentId,
    ...windowFields({ issued_at: '2026-09-19T04:29:10.000Z' }),
    ...overrides,
  };
}

function harness({ session = sessionPayload(), grant = grantPayload(), consent = consentPayload() } = {}) {
  const artifacts = new Map();
  if (session) artifacts.set(sessionId, { id: sessionId, artifactType: mod.REMOTE_AUTHORITY_EVIDENCE_TYPES.session, payload: session });
  if (grant) artifacts.set(grantId, { id: grantId, artifactType: mod.REMOTE_AUTHORITY_EVIDENCE_TYPES.grant, payload: grant });
  if (consent) artifacts.set(consentId, { id: consentId, artifactType: mod.REMOTE_AUTHORITY_EVIDENCE_TYPES.consent, payload: consent });
  let reads = 0;
  const persistence = Object.freeze({
    get: async (type, id) => {
      if (type !== 'artifact') throw new Error('unexpected persistence type');
      reads += 1;
      return artifacts.get(id) ?? null;
    },
  });
  return { source: mod.createRemoteAuthorityEvidenceSource({ persistence, now: () => NOW }), artifacts, reads: () => reads };
}

async function actor(source, req = request) {
  return source.authenticatedActorContext({ sessionEvidenceId: sessionId, request: req });
}
async function grant(source, actorContext, cand = candidate, requested = ['project.file.write']) {
  return source.resolveGrant({ grantEvidenceId: grantId, candidate: cand, actorContext, requestedCapabilities: requested });
}
async function errorCode(fn) {
  try { await fn(); return null; } catch (error) { return error?.message ?? String(error); }
}

const evidence = {
  schema: 'prs.agentos-remote-authority-evidence-source.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  module: modulePath,
  module_sha256: sha256(source),
  captured_at: new Date().toISOString(),
  cases: [],
  canonical_session_issuer_exercised: false,
  canonical_grant_issuer_exercised: false,
  canonical_consent_issuer_exercised: false,
  authenticated_transport_exercised: false,
  production_execution_enabled: false,
  assurance_certified: false,
  production_promotion_allowed: false,
};

async function runCase(id, fn) {
  try {
    const observed = await fn();
    evidence.cases.push({ id, ...observed, status: observed.pass ? 'pass' : 'defect_reproduced' });
  } catch (error) {
    evidence.cases.push({ id, status: 'probe_error', error: error.name, message: error.message });
  }
}

await runCase('valid-durable-session-grant-consent-reconstruct-read-only-evidence', async () => {
  const h = harness();
  const a = await actor(h.source);
  const g = await grant(h.source, a);
  return {
    actor_authenticated: a.authenticated === true,
    exact_session_evidence: a.authentication_evidence_id === sessionId,
    exact_grant_evidence: g.evidence_id === grantId,
    exact_consent_evidence: g.consent_evidence_id === consentId,
    exact_target: g.target === 'docs/level2.md',
    persistence_reads: h.reads(),
    source_exposes_no_issue_api: !['create', 'update', 'delete', 'authenticate', 'issue', 'execute'].some((name) => typeof h.source[name] === 'function'),
    pass: a.authenticated === true && g.evidence_id === grantId && g.consent_evidence_id === consentId && g.target === 'docs/level2.md' && h.reads() === 3 && !['create', 'update', 'delete', 'authenticate', 'issue', 'execute'].some((name) => typeof h.source[name] === 'function'),
  };
});

await runCase('caller-authentication-shape-cannot-replace-durable-session-evidence', async () => {
  const h = harness({ session: null });
  const observed = await errorCode(() => actor(h.source));
  return { observed_error: observed, pass: observed === 'REMOTE_SESSION_EVIDENCE_REQUIRED' };
});

await runCase('cross-request-session-borrowing-fails-closed', async () => {
  const h = harness();
  const observed = await errorCode(() => actor(h.source, { ...request, request_id: 'other-request' }));
  return { observed_error: observed, pass: observed === 'REMOTE_SESSION_EVIDENCE_CORRELATION_MISMATCH' };
});

await runCase('expired-or-revoked-session-fails-closed', async () => {
  const expired = harness({ session: sessionPayload({ expires_at: '2026-09-19T04:29:59.000Z' }) });
  const revoked = harness({ session: sessionPayload({ revoked_at: '2026-09-19T04:29:30.000Z' }) });
  const errors = [await errorCode(() => actor(expired.source)), await errorCode(() => actor(revoked.source))];
  return { observed_errors: errors, pass: errors[0] === 'REMOTE_SESSION_EVIDENCE_EXPIRED' && errors[1] === 'REMOTE_SESSION_EVIDENCE_REVOKED' };
});

await runCase('opaque-consent-id-without-durable-consent-artifact-fails-closed', async () => {
  const h = harness({ consent: null });
  const a = await actor(h.source);
  const observed = await errorCode(() => grant(h.source, a));
  return { observed_error: observed, pass: observed === 'REMOTE_CONSENT_EVIDENCE_REQUIRED' };
});

await runCase('consent-intent-target-and-mode-cannot-be-borrowed', async () => {
  const cases = [
    [consentPayload({ objective: 'different intent' }), 'REMOTE_CONSENT_INTENT_MISMATCH'],
    [consentPayload({ target: 'docs/other.md' }), 'REMOTE_CONSENT_TARGET_MISMATCH'],
    [consentPayload({ consent_mode: 'CONFIRMATION_REQUIRED' }), 'REMOTE_CONSENT_MODE_MISMATCH'],
  ];
  const observed = [];
  for (const [consent, expected] of cases) {
    const h = harness({ consent });
    const a = await actor(h.source);
    observed.push({ expected, actual: await errorCode(() => grant(h.source, a)) });
  }
  return { observed, pass: observed.every((item) => item.actual === item.expected) };
});

await runCase('revoked-consent-and-grant-fail-closed', async () => {
  const consentH = harness({ consent: consentPayload({ revoked_at: '2026-09-19T04:29:30.000Z' }) });
  const consentActor = await actor(consentH.source);
  const grantH = harness({ grant: grantPayload({ revoked_at: '2026-09-19T04:29:30.000Z' }) });
  const grantActor = await actor(grantH.source);
  const errors = [await errorCode(() => grant(consentH.source, consentActor)), await errorCode(() => grant(grantH.source, grantActor))];
  return { observed_errors: errors, pass: errors[0] === 'REMOTE_CONSENT_EVIDENCE_REVOKED' && errors[1] === 'REMOTE_AUTHORITY_GRANT_EVIDENCE_REVOKED' };
});

await runCase('capability-and-intent-replay-fails-closed', async () => {
  const h = harness();
  const a = await actor(h.source);
  const capabilityError = await errorCode(() => grant(h.source, a, { ...candidate, requested_capabilities: ['project.file.write', 'shell.powershell.dev.execute'] }, ['project.file.write']));
  const intentError = await errorCode(() => grant(h.source, a, { ...candidate, objective: 'different intent' }));
  return { capability_error: capabilityError, intent_error: intentError, pass: capabilityError === 'REMOTE_AUTHORITY_REQUESTED_CAPABILITY_MISMATCH' && intentError === 'REMOTE_AUTHORITY_GRANT_PROVENANCE_MISMATCH' };
});

await runCase('artifact-type-and-embedded-id-integrity-fails-closed', async () => {
  const wrongType = harness();
  wrongType.artifacts.set(consentId, { id: consentId, artifactType: 'remote.execution.receipt', payload: consentPayload() });
  const a1 = await actor(wrongType.source);
  const typeError = await errorCode(() => grant(wrongType.source, a1));
  const wrongId = harness();
  wrongId.artifacts.set(grantId, { id: grantId, artifactType: mod.REMOTE_AUTHORITY_EVIDENCE_TYPES.grant, payload: grantPayload({ evidence_id: 'other-grant' }) });
  const a2 = await actor(wrongId.source);
  const idError = await errorCode(() => grant(wrongId.source, a2));
  return { type_error: typeError, id_error: idError, pass: typeError === 'REMOTE_CONSENT_EVIDENCE_TYPE_MISMATCH' && idError === 'REMOTE_AUTHORITY_GRANT_TYPE_MISMATCH_ID_MISMATCH' };
});

const defects = evidence.cases.filter((item) => item.status === 'defect_reproduced');
const errors = evidence.cases.filter((item) => item.status === 'probe_error');
evidence.defect_count = defects.length;
evidence.status = errors.length ? 'INSUFFICIENT_EVIDENCE' : defects.length ? 'DEFECT_REPRODUCED' : 'NEGATIVE_CASES_PASS';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = errors.length || defects.length ? 1 : 0;
