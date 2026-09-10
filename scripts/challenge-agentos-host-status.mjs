// Offline adversarial probe of AgentOS V1 local host-status derivation.
// Reads an immutable AgentOS Git object only; never mutates the AgentOS checkout.
// Execution-produced evidence only; this is not independent PRS certification by itself.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-host-status.mjs REPO EXACT_SHA');
}
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');

const path = 'runtime/local-host-status.mjs';
const source = execFileSync('git', ['-C', repo, 'show', `${ref}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const observedAt = '2026-09-10T04:00:00.000Z';
const fresh = '2026-09-10T03:59:30.000Z';
const old = '2026-09-10T03:00:00.000Z';
const hostIdentity = { host_id: 'host-a' };
const config = { scheduler: { enabled: true } };
const evidence = {
  schema: 'prs.agentos-host-status-probe.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  module: path,
  module_sha256: createHash('sha256').update(source).digest('hex'),
  captured_at: new Date().toISOString(),
  cases: [],
  assurance_certified: false,
  production_promotion_allowed: false,
};

function task(overrides = {}) {
  return { id: 'task-artifact', artifactType: 'dispatch.task', updatedAt: fresh, payload: {
    host_id: 'host-a', task_id: 'task-1', mission_id: 'mission-1', wake_trace_id: 'wake-1',
    delivery_id: 'delivery-1', status: 'queued', pickup_state: 'QUEUED', ...overrides,
  } };
}
function receipt(overrides = {}) {
  return { id: 'receipt-1', artifactType: 'remote.execution.receipt', updatedAt: fresh, payload: {
    host_id: 'host-a', task_id: 'task-1', mission_id: 'mission-1', wake_trace_id: 'wake-1',
    delivery_id: 'delivery-1', status: 'COMPLETED', completed_at: fresh, code_identity: 'abc123',
    green_disposition: 'pass', ...overrides,
  } };
}
function hostObservation(overrides = {}) {
  return { id: 'host-observation-1', artifactType: 'local.host.observation', updatedAt: fresh, payload: {
    host_id: 'host-a', observed_at: fresh, ...overrides,
  } };
}
function claim(overrides = {}) {
  return { delivery_id: 'delivery-1', request_id: 'request-1', host_id: 'host-a', claimed_at: fresh, state: 'CLAIMED', ...overrides };
}
function run(id, input, expectedState, expectedReason = null) {
  try {
    const result = module.deriveLocalHostStatus({ hostIdentity, config, observedAt, ...input });
    const pass = result.lifecycle_state === expectedState && (expectedReason === null || result.reason === expectedReason);
    evidence.cases.push({ id, expected_state: expectedState, expected_reason: expectedReason, observed_state: result.lifecycle_state,
      observed_reason: result.reason, status: pass ? 'pass' : 'defect_reproduced' });
  } catch (error) {
    evidence.cases.push({ id, status: 'probe_error', error: error.name, message: error.message });
  }
}

run('historical-completion-alone-not-idle', { artifacts: [receipt()] }, 'offline_or_stale', 'NO_CURRENT_HOST_OBSERVATION');
run('fresh-host-observation-allows-idle', { artifacts: [receipt(), hostObservation()] }, 'idle');
run('unrelated-other-host-history-does-not-poison', { artifacts: [hostObservation(), receipt({ host_id: 'host-b', task_id: 'other' })] }, 'idle');
run('blocked-pickup-outranks-idle', { artifacts: [hostObservation(), task({ pickup_state: 'BLOCKED', pickup_blocker: 'CAPABILITY_MATCH_FAILED' })] }, 'blocked', 'CAPABILITY_MATCH_FAILED');
run('retained-lock-requires-recovery', { artifacts: [hostObservation()], locks: [{ retained: true, reason: 'LOCAL_STATE_LOCK_RECOVERY_REQUIRED' }] }, 'recovery_required', 'LOCAL_STATE_LOCK_RECOVERY_REQUIRED');
run('stale-host-observation-not-current', { artifacts: [{ ...hostObservation(), updatedAt: old, payload: { host_id: 'host-a', observed_at: old } }], staleAfterMs: 5 * 60 * 1000 }, 'offline_or_stale');
run('queued-task-with-correlated-claim-is-working', { artifacts: [hostObservation(), task()], claims: [claim()] }, 'working', 'CORRELATED_DURABLE_CLAIM');
run('queued-task-without-claim-is-not-working', { artifacts: [hostObservation(), task()] }, 'idle');
run('claim-host-mismatch-fails-closed', { artifacts: [hostObservation(), task()], claims: [claim({ host_id: 'host-b' })] }, 'blocked', 'CLAIM_CORRELATION_CONFLICT');
run('incomplete-correlated-claim-fails-closed', { artifacts: [hostObservation(), task({ wake_trace_id: null })], claims: [claim()] }, 'blocked', 'ACTIVE_TASK_CORRELATION_INCOMPLETE');

const blockers = [
  task({ task_id: 'old', mission_id: 'm-old', wake_trace_id: 'w-old', pickup_state: 'BLOCKED', pickup_blocker: 'OLD', updated_at: old }),
  { ...task({ task_id: 'new', mission_id: 'm-new', wake_trace_id: 'w-new', pickup_state: 'BLOCKED', pickup_blocker: 'NEW' }), id: 'task-new', updatedAt: fresh },
];
run('newest-blocker-selected', { artifacts: [hostObservation(), ...blockers] }, 'blocked', 'NEW');

evidence.status = evidence.cases.some((item) => item.status === 'probe_error') ? 'INSUFFICIENT_EVIDENCE'
  : evidence.cases.every((item) => item.status === 'pass') ? 'NEGATIVE_CASES_PASS' : 'DEFECT_REPRODUCED';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.status === 'NEGATIVE_CASES_PASS' ? 0 : 1;
