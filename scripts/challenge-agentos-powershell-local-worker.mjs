// Independent immutable PRS probe for AgentOS' composition-only PowerShell local worker.
// No PowerShell process is executed: the adapter and governed boundary are deterministic stubs.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-powershell-local-worker.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact AgentOS commit required');
for (const modulePath of ['runtime/windows-powershell-local-worker.mjs','runtime/windows-powershell-governed-candidate.mjs','runtime/windows-powershell-remote-gate.mjs']) {
  const exact = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
  if (readFileSync(resolve(repo, modulePath), 'utf8') !== exact) throw new Error(`checked-out ${modulePath} does not match exact Git object`);
}
const workerModule = await import(`${pathToFileURL(resolve(repo, 'runtime/windows-powershell-local-worker.mjs')).href}?prs=${ref}-${Date.now()}`);

const identities = Object.freeze({
  'powershell.exe': Object.freeze({ available: true, path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', version: '5.1-test' }),
  'git.exe': Object.freeze({ available: true, path: 'C:\\Program Files\\Git\\bin\\git.exe', version: 'git version test' }),
});
function task(hostId, overrides = {}) {
  return {
    task_id: 'task-prs-worker-1', mission_id: 'mission-prs-worker-1', delivery_id: 'delivery-prs-worker-1', request_id: 'request-prs-worker-1', wake_trace_id: 'wake-prs-worker-1',
    project_id: 'agentos-local', actor_id: 'agentos:overseer', target_host_id: hostId, admitted_by: 'agentos:overseer', authority_admitted: true,
    environment: 'DRY_RUN', pickup_state: 'QUEUED', required_capabilities: ['shell.powershell.repo.read'], scope: ['local-runtime'], constraints: ['bounded-command-catalogue'],
    created_at: new Date().toISOString(), execution: { adapter: 'windows-powershell', operation: 'repo.status', cwd: 'C:/agentos/AgentOS' }, ...overrides,
  };
}
function probe(capabilities = ['shell.powershell.repo.read'], withIdentity = true) {
  return { probe: async (agentId) => ({ agent_id: agentId, mode: 'DRY_RUN', evaluation: { windows: true, eligible: true, ...(withIdentity ? { tool_evidence: identities } : {}) }, capabilities }) };
}
function harness({ enabled = false, hostProbe = probe(), boundaryFailure = null } = {}) {
  let adapterCalls = 0; let boundaryCalls = 0;
  const adapter = {
    operations: ['repo.status','test.run','process.list'],
    describe: (operation) => ({ capability: operation === 'repo.status' ? 'shell.powershell.repo.read' : operation === 'test.run' ? 'shell.powershell.dev.execute' : 'shell.powershell.system.read' }),
    execute: async ({ operation, cwd, expectedExecutables }) => { adapterCalls += 1; return { success: true, operation, cwd, exit_code: 0, stdout: 'ok', stderr: '', timed_out: false, truncated: false, started_at: '2026-09-12T11:00:00.000Z', finished_at: '2026-09-12T11:00:00.010Z', duration_ms: 10, resolved_executables: expectedExecutables }; },
  };
  const boundary = { execute: async ({ invoke }) => { boundaryCalls += 1; const result = await invoke(); if (boundaryFailure) throw new Error(boundaryFailure); return { status: 'VERIFIED', result, receipt: { receipt_id: 'prs-receipt' }, verification: { passed: true }, budget: { status: 'RECONCILED' } }; } };
  const hostId = 'host-prs-worker';
  const local = workerModule.createWindowsPowerShellLocalWorker({ hostIdentity: { host_id: hostId }, workspaceRoot: 'C:/agentos/AgentOS', hostProbe, powerShellAdapter: adapter, executionBoundary: boundary, runtimeExecutionEnabled: enabled });
  return { local, hostId, adapterCalls: () => adapterCalls, boundaryCalls: () => boundaryCalls };
}
const cases = [];
async function run(id, fn) { try { const o = await fn(); cases.push({ id, ...o, status: o.pass ? 'pass' : 'defect_reproduced' }); } catch (e) { cases.push({ id, pass: false, status: 'probe_error', message: e.message }); } }

await run('default-disabled-zero-invocation', async () => { const h = harness(); const r = await h.local.execute(task(h.hostId)); return { pass: !r.success && /NOT_AUTHORIZED/.test(r.error) && h.adapterCalls()===0 && h.boundaryCalls()===0, success:r.success, error:r.error, adapter_calls:h.adapterCalls(), boundary_calls:h.boundaryCalls() }; });
await run('eligible-enabled-exactly-once-and-correlated', async () => { const h = harness({ enabled:true }); const t = task(h.hostId); const r = await h.local.execute(t); const o=r.output??{}; return { pass: r.success && h.adapterCalls()===1 && h.boundaryCalls()===1 && o.task_id===t.task_id && o.mission_id===t.mission_id && o.delivery_id===t.delivery_id && o.request_id===t.request_id && o.wake_trace_id===t.wake_trace_id && o.host_id===h.hostId, adapter_calls:h.adapterCalls(), boundary_calls:h.boundaryCalls(), output:o }; });
await run('capability-mismatch-zero-invocation', async () => { const h = harness({ enabled:true, hostProbe:probe(['shell.powershell.system.read']) }); const r=await h.local.execute(task(h.hostId)); return { pass: !r.success && /HOST_CAPABILITY_MISMATCH/.test(r.error) && h.adapterCalls()===0 && h.boundaryCalls()===0, error:r.error }; });
await run('host-mismatch-zero-invocation', async () => { const h=harness({enabled:true}); const r=await h.local.execute(task(h.hostId,{target_host_id:'other-host'})); return { pass:!r.success && /HOST_MISMATCH/.test(r.error) && h.adapterCalls()===0 && h.boundaryCalls()===0, error:r.error }; });
await run('missing-executable-identity-zero-invocation', async () => { const h=harness({enabled:true,hostProbe:probe(['shell.powershell.repo.read'],false)}); const r=await h.local.execute(task(h.hostId)); return { pass:!r.success && /EXECUTABLE_IDENTITY_EVIDENCE_REQUIRED/.test(r.error) && h.adapterCalls()===0 && h.boundaryCalls()===0, error:r.error }; });
await run('post-invoke-boundary-failure-never-success', async () => { const h=harness({enabled:true,boundaryFailure:'EXECUTION_VERIFICATION_FAILED'}); const r=await h.local.execute(task(h.hostId)); return { pass:!r.success && /EXECUTION_VERIFICATION_FAILED/.test(r.error) && h.adapterCalls()===1 && h.boundaryCalls()===1, error:r.error }; });
await run('metadata-only-bounded-capabilities', async () => { const h=harness(); const caps=h.local.worker.capabilities; return { pass: JSON.stringify(caps)===JSON.stringify(['shell.powershell.dev.execute','shell.powershell.repo.read','shell.powershell.system.read']), capabilities:caps }; });

const evidence = { schema:'prs.agentos-powershell-local-worker.v1', exact_head:ref, source_tree:git('rev-parse',`${ref}^{tree}`), cases, powershell_process_execution_exercised:false, local_wake_execution_exercised:false, scheduler_execution_exercised:false, owner_windows_laptop_exercised:false, assurance_certified:false, production_promotion_allowed:false };
evidence.pass = cases.length===7 && cases.every((x)=>x.pass===true);
evidence.status = evidence.pass ? 'POWERSHELL_LOCAL_WORKER_SEAM_PASS' : 'POWERSHELL_LOCAL_WORKER_SEAM_FAIL';
console.log(JSON.stringify(evidence,null,2));
process.exitCode = evidence.pass ? 0 : 1;
