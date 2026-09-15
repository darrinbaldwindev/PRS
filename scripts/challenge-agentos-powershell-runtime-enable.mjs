// Immutable stub-only adversarial probe for AgentOS bounded PowerShell runtime-enable seam.
// Never invokes PowerShell. Confirms default-false behavior cannot be bypassed and
// explicit enablement still requires canonical pickup + executable identity evidence.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-powershell-runtime-enable.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');

const modulePath = 'runtime/windows-powershell-governed-candidate.mjs';
const exact = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
const checked = readFileSync(resolve(repo, modulePath), 'utf8');
if (checked !== exact) throw new Error('checked-out governed candidate does not match exact Git object');
const candidate = await import(`${pathToFileURL(resolve(repo, modulePath)).href}?exact=${ref}-${Date.now()}`);

const identities = Object.freeze({
  'powershell.exe': Object.freeze({ available: true, path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', version: '5.1.26100.33296' }),
  'git.exe': Object.freeze({ available: true, path: 'C:\\Program Files\\Git\\bin\\git.exe', version: 'git version 2.55.0.windows.5' }),
  'npm.cmd': Object.freeze({ available: true, path: 'C:\\Program Files\\nodejs\\npm.cmd', version: null }),
});

function task(hostId) {
  return {
    task_id: 'task-runtime-prs', mission_id: 'mission-runtime-prs', delivery_id: 'delivery-runtime-prs', request_id: 'request-runtime-prs', wake_trace_id: 'wake-runtime-prs',
    project_id: 'agentos-local', target_host_id: hostId, admitted_by: 'agentos:overseer', authority_admitted: true,
    environment: 'DRY_RUN', pickup_state: 'QUEUED', required_capabilities: ['shell.powershell.repo.read'], scope: ['local-runtime'],
    constraints: ['bounded-command-catalogue'], created_at: new Date(Date.now() - 60_000).toISOString(),
    execution: { adapter: 'windows-powershell', operation: 'repo.status', cwd: 'C:/agentos/AgentOS' },
  };
}

function probe(capabilities = ['shell.powershell.repo.read'], includeIdentity = true) {
  return { probe: async (agentId) => ({
    agent_id: agentId, mode: 'DRY_RUN',
    evaluation: { windows: true, eligible: true, ...(includeIdentity ? { tool_evidence: identities } : {}) },
    capabilities,
  }) };
}

const cases = [];
async function run(id, fn) {
  try { const observed = await fn(); cases.push({ id, ...observed, status: observed.pass ? 'pass' : 'defect_reproduced' }); }
  catch (error) { cases.push({ id, status: 'probe_error', error: error.name, code: error.code ?? null, message: error.message }); }
}

await run('default-false-remains-zero-invocation', async () => {
  let boundaryCalls = 0, adapterCalls = 0, code = null;
  const host = { host_id: 'host-runtime-prs-default' };
  try {
    await candidate.executeWindowsPowerShellGovernedCandidate({
      admittedTask: task(host.host_id), actorContext: { actor_id: 'agentos:overseer' }, hostIdentity: host,
      workspaceRoot: 'C:/agentos/AgentOS', hostProbe: probe(),
      powerShellAdapter: { describe: () => ({ capability: 'shell.powershell.repo.read' }), execute: async () => { adapterCalls += 1; } },
      executionBoundary: { execute: async () => { boundaryCalls += 1; } },
    });
  } catch (error) { code = error.code; }
  return { observed_error: code, boundary_calls: boundaryCalls, adapter_calls: adapterCalls,
    pass: code === 'POWERSHELL_EXECUTION_NOT_AUTHORIZED' && boundaryCalls === 0 && adapterCalls === 0 };
});

await run('explicit-enable-traverses-existing-governed-boundary-once', async () => {
  let boundaryCalls = 0, adapterCalls = 0, observedExpected = null;
  const host = { host_id: 'host-runtime-prs-enabled' };
  const admitted = task(host.host_id);
  const result = await candidate.executeWindowsPowerShellGovernedCandidate({
    admittedTask: admitted, actorContext: { actor_id: 'agentos:overseer' }, hostIdentity: host,
    workspaceRoot: 'C:/agentos/AgentOS', hostProbe: probe(), runtimeExecutionEnabled: true,
    powerShellAdapter: {
      describe: () => ({ capability: 'shell.powershell.repo.read' }),
      execute: async ({ expectedExecutables }) => { adapterCalls += 1; observedExpected = expectedExecutables; return { success: true, operation: 'repo.status', cwd: admitted.execution.cwd, exit_code: 0 }; },
    },
    executionBoundary: {
      execute: async ({ invoke }) => { boundaryCalls += 1; const invocation = await invoke(); return { status: 'VERIFIED', result: invocation, receipt: { receipt_id: 'prs-runtime' }, verification: { passed: true } }; },
    },
  });
  return { status: result.status, execution_authorized: result.pickup.execution_authorized, boundary_calls: boundaryCalls, adapter_calls: adapterCalls,
    identity_forwarded: observedExpected === identities,
    pass: result.status === 'VERIFIED' && result.pickup.execution_authorized === true && boundaryCalls === 1 && adapterCalls === 1 && observedExpected === identities };
});

await run('explicit-enable-cannot-bypass-capability-mismatch', async () => {
  let boundaryCalls = 0, adapterCalls = 0, code = null;
  const host = { host_id: 'host-runtime-prs-cap-mismatch' };
  try {
    await candidate.executeWindowsPowerShellGovernedCandidate({
      admittedTask: task(host.host_id), actorContext: { actor_id: 'agentos:overseer' }, hostIdentity: host,
      workspaceRoot: 'C:/agentos/AgentOS', hostProbe: probe(['shell.powershell.system.read']), runtimeExecutionEnabled: true,
      powerShellAdapter: { describe: () => ({ capability: 'shell.powershell.repo.read' }), execute: async () => { adapterCalls += 1; } },
      executionBoundary: { execute: async () => { boundaryCalls += 1; } },
    });
  } catch (error) { code = error.code; }
  return { observed_error: code, boundary_calls: boundaryCalls, adapter_calls: adapterCalls,
    pass: code === 'POWERSHELL_PICKUP_BLOCKED' && boundaryCalls === 0 && adapterCalls === 0 };
});

await run('explicit-enable-requires-probe-time-executable-identity', async () => {
  let boundaryCalls = 0, adapterCalls = 0, code = null;
  const host = { host_id: 'host-runtime-prs-no-identity' };
  try {
    await candidate.executeWindowsPowerShellGovernedCandidate({
      admittedTask: task(host.host_id), actorContext: { actor_id: 'agentos:overseer' }, hostIdentity: host,
      workspaceRoot: 'C:/agentos/AgentOS', hostProbe: probe(['shell.powershell.repo.read'], false), runtimeExecutionEnabled: true,
      powerShellAdapter: { describe: () => ({ capability: 'shell.powershell.repo.read' }), execute: async () => { adapterCalls += 1; } },
      executionBoundary: { execute: async () => { boundaryCalls += 1; } },
    });
  } catch (error) { code = error.code; }
  return { observed_error: code, boundary_calls: boundaryCalls, adapter_calls: adapterCalls,
    pass: code === 'POWERSHELL_EXECUTABLE_IDENTITY_EVIDENCE_REQUIRED' && boundaryCalls === 0 && adapterCalls === 0 };
});

const evidence = {
  schema: 'prs.agentos-powershell-runtime-enable.v1', exact_head: ref, cases,
  assurance_certified: false, production_promotion_allowed: false, physical_windows_exercised: false,
  local_wake_or_scheduler_connected: false,
};
evidence.pass = cases.length === 4 && cases.every((item) => item.pass === true);
evidence.status = evidence.pass ? 'BOUNDED_RUNTIME_ENABLE_SEAM_PASS' : 'BOUNDED_RUNTIME_ENABLE_SEAM_FAIL';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.pass ? 0 : 1;
