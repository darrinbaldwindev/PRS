// Offline exact-head adversarial probe for AgentOS remote authority admission.
// Reads immutable AgentOS Git objects and uses in-memory persistence only.
// It distinguishes caller-supplied authentication/grants from canonical runtime binding
// and checks whether admitted non-PowerShell tasks satisfy local-wake's execution contract.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-remote-authority-admission.mjs REPO EXACT_SHA');
}
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');

const admissionPath = 'runtime/remote-authority-admission.mjs';
const wakePath = 'runtime/local-wake.mjs';
const admissionSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${admissionPath}`], { encoding: 'utf8' });
const wakeSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${wakePath}`], { encoding: 'utf8' });
const checkedOutAdmission = resolve(repo, admissionPath);
if (readFileSync(checkedOutAdmission, 'utf8') !== admissionSource) throw new Error('checked-out admission module does not match exact Git object');
const admission = await import(`${pathToFileURL(checkedOutAdmission).href}?prs-remote-admission=${ref}`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const evidence = {
  schema: 'prs.agentos-remote-authority-admission.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  modules: {
    [admissionPath]: sha256(admissionSource),
    [wakePath]: sha256(wakeSource),
  },
  captured_at: new Date().toISOString(),
  cases: [],
  assurance_certified: false,
  production_promotion_allowed: false,
};

function harness() {
  const artifacts = new Map();
  return {
    artifacts,
    persistence: {
      createMany: async (entries) => {
        for (const { type, input } of entries) {
          if (type !== 'artifact') throw new Error('unexpected persistence type');
          if (artifacts.has(input.id)) throw new Error('duplicate');
          artifacts.set(input.id, structuredClone(input));
        }
      },
    },
  };
}

async function runCase(id, fn) {
  try {
    const observed = await fn();
    evidence.cases.push({ id, ...observed, status: observed.defect_reproduced ? 'defect_reproduced' : observed.pass ? 'pass' : 'insufficient_evidence' });
  } catch (error) {
    evidence.cases.push({ id, status: 'probe_error', error: error.name, message: error.message });
  }
}

const actorContext = Object.freeze({ actor_id: 'prs-owner', issuer: 'agentos:overseer', authenticated: true });
const candidate = Object.freeze({
  admission_state: 'AWAITING_AUTHORITY',
  delivery_id: 'prs-admission-delivery',
  request_id: 'prs-admission-request',
  actor_id: actorContext.actor_id,
  issuer: actorContext.issuer,
  project_id: 'agentos-local',
  objective: 'run bounded repository inspection',
  requested_capabilities: ['repository:read'],
  scope: ['local-runtime'],
  constraints: ['DRY_RUN only'],
});
const grant = Object.freeze({
  status: 'GRANTED',
  actor_id: actorContext.actor_id,
  issuer: actorContext.issuer,
  project_id: candidate.project_id,
  granted_capabilities: ['repository:read'],
  evidence_id: 'prs-authority-evidence',
  mission_id: 'prs-admission-mission',
});

await runCase('caller-supplied-authentication-and-grant-remain-composition-seams', async () => {
  const h = harness();
  let resolved = 0;
  const producer = admission.createRemoteAuthorityAdmissionProducer({
    persistence: h.persistence,
    authoritySource: { resolveGrant: async () => { resolved += 1; return grant; } },
    trustedIssuers: [actorContext.issuer],
    allowedCapabilities: ['repository:read'],
    now: () => new Date('2026-09-14T08:20:00.000Z'),
    idFactory: (() => { let n = 0; return () => `prs-${++n}`; })(),
  });
  const result = await producer.admit({ candidate, actorContext, targetHostId: 'prs-host' });
  const sourceDeclaresNoAuthentication = /does not authenticate transports/.test(admissionSource);
  const sourceRequiresCallerGrantResolver = /authoritySource\.resolveGrant/.test(admissionSource);
  const pass = resolved === 1 && result.task.authority_admitted === true && sourceDeclaresNoAuthentication && sourceRequiresCallerGrantResolver;
  return {
    expected: 'admission module must not be mistaken for authenticated transport or canonical grant-source proof',
    admitted_with_caller_authenticated_context: result.task.authority_admitted === true,
    caller_grant_resolver_invocations: resolved,
    source_declares_no_transport_authentication: sourceDeclaresNoAuthentication,
    source_requires_injected_grant_resolver: sourceRequiresCallerGrantResolver,
    canonical_authenticated_transport_proven: false,
    canonical_grant_source_proven: false,
    pass,
  };
});

await runCase('admitted-non-powershell-task-is-incompatible-with-local-wake-contract', async () => {
  const h = harness();
  const producer = admission.createRemoteAuthorityAdmissionProducer({
    persistence: h.persistence,
    authoritySource: { resolveGrant: async () => grant },
    trustedIssuers: [actorContext.issuer],
    allowedCapabilities: ['repository:read'],
    now: () => new Date('2026-09-14T08:20:00.000Z'),
    idFactory: (() => { let n = 0; return () => `prs-compat-${++n}`; })(),
  });
  const { task } = await producer.admit({ candidate, actorContext, targetHostId: 'prs-host' });

  const wakeRequiresConsent = /task\.consent_mode !== 'PRE_AUTHORIZED'/.test(wakeSource);
  const wakeRequiresAcceptance = /!Array\.isArray\(task\.acceptance_criteria\) \|\| !task\.acceptance_criteria\.length/.test(wakeSource);
  const wakeRequiresTarget = /task\.target !== RECEIVER/.test(wakeSource);
  const missing = ['consent_mode', 'acceptance_criteria', 'target'].filter((field) => task[field] == null);
  const defect = wakeRequiresConsent && wakeRequiresAcceptance && wakeRequiresTarget && missing.length === 3;
  return {
    expected: 'a canonical admission producer output should satisfy the downstream non-PowerShell local-wake envelope without out-of-band mutation',
    missing_required_fields: missing,
    local_wake_requires_consent_mode: wakeRequiresConsent,
    local_wake_requires_acceptance_criteria: wakeRequiresAcceptance,
    local_wake_requires_target: wakeRequiresTarget,
    defect_reproduced: defect,
    pass: !defect,
  };
});

const defects = evidence.cases.filter((item) => item.status === 'defect_reproduced');
const errors = evidence.cases.filter((item) => item.status === 'probe_error');
evidence.status = errors.length ? 'INSUFFICIENT_EVIDENCE' : defects.length ? 'DEFECT_REPRODUCED' : 'NEGATIVE_CASES_PASS';
evidence.defect_count = defects.length;
console.log(JSON.stringify(evidence, null, 2));
// A reproduced assurance defect is a successful probe execution; only probe errors fail CI.
process.exitCode = errors.length ? 1 : 0;
