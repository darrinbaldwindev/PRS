// Immutable adversarial probe for AgentOS' first PowerShell local-wake slice.
// Uses a temporary AgentOS state root only. It must never execute PowerShell,
// claim a delivery, reserve budget, run a worker, or create an execution receipt.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-powershell-local-wake-evidence.mjs REPO EXACT_SHA');
}
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact AgentOS commit required');

for (const modulePath of ['runtime/local-wake.mjs', 'runtime/windows-powershell-remote-gate.mjs']) {
  const exact = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
  if (readFileSync(resolve(repo, modulePath), 'utf8') !== exact) {
    throw new Error(`checked-out ${modulePath} does not match exact Git object`);
  }
}
const wake = await import(`${pathToFileURL(resolve(repo, 'runtime/local-wake.mjs')).href}?prs-local-wake=${ref}-${Date.now()}`);
const persistenceModule = await import(`${pathToFileURL(resolve(repo, 'runtime/local-persistence.mjs')).href}?prs-local-persistence=${ref}-${Date.now()}`);

const cases = [];
async function run(id, fn) {
  try {
    const observed = await fn();
    cases.push({ id, ...observed, status: observed.pass ? 'pass' : 'defect_reproduced' });
  } catch (error) {
    cases.push({ id, pass: false, status: 'probe_error', error: error.name, code: error.code ?? null, message: error.message });
  }
}

async function fixture({ powerShellEnabled = true, taskOverrides = {}, probeCapabilities = ['shell.powershell.repo.read'] } = {}) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'prs-agentos-local-wake-'));
  const stateFile = 'state/local-state.json';
  const hostId = 'host-prs-local-wake';
  await fs.mkdir(path.join(root, 'state'), { recursive: true });
  await fs.mkdir(path.join(root, 'workspace'), { recursive: true });
  await fs.writeFile(path.join(root, 'config.json'), `${JSON.stringify({
    schemaVersion: 1,
    mode: 'DRY_RUN',
    autonomyEnabled: false,
    scheduler: { enabled: false },
    stateFile,
    workspaceRoot: 'workspace',
    remoteBridge: { enabled: true, powerShell: { enabled: powerShellEnabled } },
  }, null, 2)}\n`);
  await fs.writeFile(path.join(root, 'state', 'remote-host.json'), `${JSON.stringify({
    schema_version: 1,
    host_id: hostId,
    created_at: new Date().toISOString(),
  }, null, 2)}\n`);

  const deliveryId = `delivery-${Math.random().toString(16).slice(2)}`;
  const taskId = `task-${Math.random().toString(16).slice(2)}`;
  const task = {
    task_id: taskId,
    mission_id: `mission-${taskId}`,
    delivery_id: deliveryId,
    request_id: `request-${taskId}`,
    wake_trace_id: `wake-${taskId}`,
    project_id: 'agentos-local',
    target_host_id: hostId,
    admitted_by: 'agentos:overseer',
    authority_admitted: true,
    environment: 'DRY_RUN',
    pickup_state: 'QUEUED',
    required_capabilities: ['shell.powershell.repo.read'],
    scope: ['local-runtime'],
    constraints: ['bounded-command-catalogue'],
    created_at: new Date(Date.now() - 5_000).toISOString(),
    execution: { adapter: 'windows-powershell', operation: 'repo.status', cwd: path.join(root, 'workspace') },
    ...taskOverrides,
  };
  const persistence = await persistenceModule.createLocalPersistence({ filePath: path.join(root, stateFile) });
  await persistence.create('artifact', { id: taskId, artifactType: 'dispatch.task', payload: task });
  let probeCalls = 0;
  const hostProbe = {
    probe: async (agentId) => {
      probeCalls += 1;
      return {
        agent_id: agentId,
        mode: 'DRY_RUN',
        evaluation: { windows: true, eligible: true, tool_evidence: {
          'powershell.exe': { available: true, path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', version: '5.1-test' },
          'git.exe': { available: true, path: 'C:\\Program Files\\Git\\bin\\git.exe', version: 'git version test' },
          'npm.cmd': { available: true, path: 'C:\\Program Files\\nodejs\\npm.cmd', version: null },
        } },
        capabilities: probeCapabilities,
      };
    },
  };
  const inspect = async () => {
    const artifacts = await persistence.list('artifact');
    const events = await persistence.list('event');
    const receipts = artifacts.filter((a) => a.artifactType === 'remote.execution.receipt');
    const claimsPath = path.join(root, 'state', 'remote-claims');
    const claimsExist = Boolean(await fs.stat(claimsPath).catch(() => null));
    return { artifacts, events, receipts, claimsExist };
  };
  return { root, deliveryId, taskId, hostProbe, probeCalls: () => probeCalls, inspect, cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}

await run('feature-disabled-blocks-before-host-probe-and-side-effects', async () => {
  const f = await fixture({ powerShellEnabled: false });
  try {
    const result = await wake.__testOnlyWakeLocal({ root: f.root, deliveryId: f.deliveryId, powerShellHostProbe: f.hostProbe });
    const state = await f.inspect();
    const pass = result.status === 'BLOCKED' && result.reason === 'POWERSHELL_PICKUP_DISABLED' &&
      result.powershell_pickup?.execution_authorized === false && f.probeCalls() === 0 && !state.claimsExist && state.receipts.length === 0;
    return { status: result.status, reason: result.reason, probe_calls: f.probeCalls(), claims_created: state.claimsExist, receipt_count: state.receipts.length, pass };
  } finally { await f.cleanup(); }
});

await run('eligible-evidence-stops-before-runtime-execution', async () => {
  const f = await fixture();
  try {
    const result = await wake.__testOnlyWakeLocal({ root: f.root, deliveryId: f.deliveryId, powerShellHostProbe: f.hostProbe });
    const state = await f.inspect();
    const pass = result.status === 'BLOCKED' && result.reason === 'POWERSHELL_RUNTIME_EXECUTION_NOT_WIRED' &&
      result.powershell_pickup?.pickup_eligible === true && result.powershell_pickup?.execution_authorized === false &&
      result.powershell_pickup?.runtime_execution_enabled === false && f.probeCalls() === 1 && !state.claimsExist && state.receipts.length === 0;
    return { status: result.status, reason: result.reason, pickup_eligible: result.powershell_pickup?.pickup_eligible, execution_authorized: result.powershell_pickup?.execution_authorized, runtime_execution_enabled: result.powershell_pickup?.runtime_execution_enabled, probe_calls: f.probeCalls(), claims_created: state.claimsExist, receipt_count: state.receipts.length, pass };
  } finally { await f.cleanup(); }
});

await run('host-capability-mismatch-fails-closed-with-zero-execution-side-effects', async () => {
  const f = await fixture({ probeCapabilities: ['shell.powershell.system.read'] });
  try {
    const result = await wake.__testOnlyWakeLocal({ root: f.root, deliveryId: f.deliveryId, powerShellHostProbe: f.hostProbe });
    const state = await f.inspect();
    const pass = result.status === 'BLOCKED' && result.reason === 'HOST_CAPABILITY_MISMATCH' &&
      result.powershell_pickup?.pickup_eligible === false && result.powershell_pickup?.execution_authorized === false &&
      !state.claimsExist && state.receipts.length === 0;
    return { status: result.status, reason: result.reason, claims_created: state.claimsExist, receipt_count: state.receipts.length, pass };
  } finally { await f.cleanup(); }
});

await run('authority-denial-fails-closed-with-zero-execution-side-effects', async () => {
  const f = await fixture({ taskOverrides: { authority_admitted: false } });
  try {
    const result = await wake.__testOnlyWakeLocal({ root: f.root, deliveryId: f.deliveryId, powerShellHostProbe: f.hostProbe });
    const state = await f.inspect();
    const pass = result.status === 'BLOCKED' && result.reason === 'AUTHORITY_NOT_ADMITTED' &&
      result.powershell_pickup?.pickup_eligible === false && result.powershell_pickup?.execution_authorized === false &&
      !state.claimsExist && state.receipts.length === 0;
    return { status: result.status, reason: result.reason, claims_created: state.claimsExist, receipt_count: state.receipts.length, pass };
  } finally { await f.cleanup(); }
});

await run('repeat-after-evidence-only-block-never-creates-claim-or-receipt', async () => {
  const f = await fixture();
  try {
    const first = await wake.__testOnlyWakeLocal({ root: f.root, deliveryId: f.deliveryId, powerShellHostProbe: f.hostProbe });
    const second = await wake.__testOnlyWakeLocal({ root: f.root, deliveryId: f.deliveryId, powerShellHostProbe: f.hostProbe });
    const state = await f.inspect();
    const pass = first.reason === 'POWERSHELL_RUNTIME_EXECUTION_NOT_WIRED' && second.status === 'BLOCKED' &&
      second.reason === 'PICKUP_STATE_NOT_QUEUED' && !state.claimsExist && state.receipts.length === 0;
    return { first_reason: first.reason, repeat_reason: second.reason, claims_created: state.claimsExist, receipt_count: state.receipts.length, pass };
  } finally { await f.cleanup(); }
});

const evidence = {
  schema: 'prs.agentos-powershell-local-wake-evidence.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  cases,
  local_wake_powerShell_evidence_only_exercised: true,
  scheduler_execution_exercised: false,
  powershell_process_execution_exercised: false,
  owner_windows_laptop_exercised: false,
  production_repository_mutated: false,
  assurance_certified: false,
  production_promotion_allowed: false,
};
evidence.pass = cases.length === 5 && cases.every((item) => item.pass === true);
evidence.status = evidence.pass ? 'POWERSHELL_LOCAL_WAKE_EVIDENCE_ONLY_PASS' : 'POWERSHELL_LOCAL_WAKE_EVIDENCE_ONLY_FAIL';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.pass ? 0 : 1;
