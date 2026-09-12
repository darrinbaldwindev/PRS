// Offline adversarial probe of AgentOS bounded PowerShell fail-closed semantics.
// Reads an immutable AgentOS Git object and uses stubs only; never invokes PowerShell.
// Execution-produced evidence only; this is not independent PRS certification by itself.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-powershell.mjs REPO EXACT_SHA');
}
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');

const candidatePath = 'runtime/windows-powershell-governed-candidate.mjs';
const receiptPath = 'runtime/windows-powershell-receipt-evidence.mjs';
for (const modulePath of [candidatePath, receiptPath]) {
  const exactSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const checkedOutSource = readFileSync(resolve(repo, modulePath), 'utf8');
  if (checkedOutSource !== exactSource) throw new Error(`checked-out module does not match exact Git object: ${modulePath}`);
}

const candidateModule = await import(`${pathToFileURL(resolve(repo, candidatePath)).href}?exact=${ref}`);
const receiptModule = await import(`${pathToFileURL(resolve(repo, receiptPath)).href}?exact=${ref}`);
const candidateSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${candidatePath}`], { encoding: 'utf8' });
const receiptSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${receiptPath}`], { encoding: 'utf8' });

const evidence = {
  schema: 'prs.agentos-powershell-probe.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  modules: {
    [candidatePath]: createHash('sha256').update(candidateSource).digest('hex'),
    [receiptPath]: createHash('sha256').update(receiptSource).digest('hex'),
  },
  captured_at: new Date().toISOString(),
  cases: [],
  assurance_certified: false,
  production_promotion_allowed: false,
  physical_windows_exercised: false,
};

async function run(id, fn) {
  try {
    const observed = await fn();
    evidence.cases.push({ id, ...observed, status: observed.pass ? 'pass' : 'defect_reproduced' });
  } catch (error) {
    evidence.cases.push({ id, status: 'probe_error', error: error.name, message: error.message });
  }
}

function admittedTask(overrides = {}) {
  // The canonical pickup gate allows queued work for 30 minutes. Make this
  // synthetic admitted task fresh at probe execution time so this case tests
  // execution_authorized=false rather than accidentally testing queue expiry.
  const freshCreatedAt = new Date(Date.now() - 60_000).toISOString();
  return {
    task_id: 'task-pwsh-prs',
    mission_id: 'mission-pwsh-prs',
    delivery_id: 'delivery-pwsh-prs',
    request_id: 'request-pwsh-prs',
    wake_trace_id: 'wake-pwsh-prs',
    project_id: 'agentos-local',
    target_host_id: 'host-win-prs',
    admitted_by: 'agentos:overseer',
    authority_admitted: true,
    environment: 'DRY_RUN',
    pickup_state: 'QUEUED',
    required_capabilities: ['shell.powershell.repo.read'],
    scope: ['local-runtime'],
    constraints: ['bounded-command-catalogue'],
    created_at: freshCreatedAt,
    execution: { adapter: 'windows-powershell', operation: 'repo.status', cwd: 'C:/agentos/AgentOS' },
    ...overrides,
  };
}

await run('runtime-disabled-means-zero-invocation', async () => {
  let adapterInvoked = 0;
  let boundaryInvoked = 0;
  const task = admittedTask();
  const adapter = {
    describe: () => ({ capability: 'shell.powershell.repo.read' }),
    execute: async () => { adapterInvoked += 1; return { success: true }; },
  };
  const boundary = { execute: async () => { boundaryInvoked += 1; return { status: 'VERIFIED' }; } };
  const hostProbe = { probe: async () => ({ agent_id: 'host-win-prs', mode: 'DRY_RUN', evaluation: { windows: true, eligible: true }, capabilities: ['shell.powershell.repo.read'] }) };
  let code = null;
  try {
    await candidateModule.executeWindowsPowerShellGovernedCandidate({
      admittedTask: task,
      actorContext: { actor_id: 'agentos:overseer' },
      hostIdentity: { host_id: 'host-win-prs' },
      workspaceRoot: 'C:/agentos/AgentOS',
      hostProbe,
      powerShellAdapter: adapter,
      executionBoundary: boundary,
    });
  } catch (error) { code = error.code; }
  return {
    expected_error: 'POWERSHELL_EXECUTION_NOT_AUTHORIZED',
    observed_error: code,
    adapter_invocations: adapterInvoked,
    boundary_invocations: boundaryInvoked,
    pass: code === 'POWERSHELL_EXECUTION_NOT_AUTHORIZED' && adapterInvoked === 0 && boundaryInvoked === 0,
  };
});

function receiptInputs(resultOverrides = {}, overrides = {}) {
  const task = admittedTask();
  return {
    candidate: { delivery_id: task.delivery_id, request_id: task.request_id, project_id: task.project_id },
    task,
    hostId: 'host-win-prs',
    workerId: 'agentos:windows-powershell-worker',
    status: 'FAILED',
    powerShellResult: {
      operation: 'repo.status', cwd: 'C:/agentos/AgentOS',
      started_at: '2026-09-12T08:00:00.000Z', finished_at: '2026-09-12T08:00:01.000Z', duration_ms: 1000,
      exit_code: null, stdout: '', stderr: '', timed_out: true, truncated: false,
      ...resultOverrides,
    },
    budgetStatus: 'RECONCILED',
    codeIdentity: 'a'.repeat(40),
    createdAt: '2026-09-12T08:00:02.000Z',
    ...overrides,
  };
}

await run('timeout-null-exit-persists-failed-receipt', async () => {
  const receipt = receiptModule.createWindowsPowerShellReceiptEvidence(receiptInputs());
  const pass = receipt.status === 'FAILED' && receipt.execution.exit_code === null && receipt.execution.timed_out === true && receipt.evidence.includes('powershell:exit_code:none');
  return { observed_status: receipt.status, observed_exit_code: receipt.execution.exit_code, timed_out: receipt.execution.timed_out, pass };
});

await run('truncation-null-exit-persists-blocked-receipt', async () => {
  const receipt = receiptModule.createWindowsPowerShellReceiptEvidence(receiptInputs({ timed_out: false, truncated: true }, { status: 'BLOCKED' }));
  const pass = receipt.status === 'BLOCKED' && receipt.execution.exit_code === null && receipt.execution.truncated === true && receipt.evidence.includes('powershell:exit_code:none');
  return { observed_status: receipt.status, observed_exit_code: receipt.execution.exit_code, truncated: receipt.execution.truncated, pass };
});

await run('null-exit-without-timeout-or-truncation-fails-closed', async () => {
  let rejected = false;
  try { receiptModule.createWindowsPowerShellReceiptEvidence(receiptInputs({ timed_out: false, truncated: false })); }
  catch (error) { rejected = error instanceof TypeError && error.message.includes('may be null only for timeout/truncation'); }
  return { rejected, pass: rejected };
});

await run('receipt-binder-cannot-self-declare-completed', async () => {
  let rejected = false;
  try { receiptModule.createWindowsPowerShellReceiptEvidence(receiptInputs({ exit_code: 0, timed_out: false }, { status: 'COMPLETED' })); }
  catch (error) { rejected = error.message === 'POWERSHELL_RECEIPT_FINAL_COMPLETION_FORBIDDEN'; }
  return { rejected, pass: rejected };
});

await run('delivery-correlation-mismatch-fails-closed', async () => {
  const inputs = receiptInputs({ exit_code: 1, timed_out: false });
  inputs.task = { ...inputs.task, delivery_id: 'borrowed-delivery' };
  let rejected = false;
  try { receiptModule.createWindowsPowerShellReceiptEvidence(inputs); }
  catch (error) { rejected = error.message === 'POWERSHELL_RECEIPT_DELIVERY_CORRELATION_MISMATCH'; }
  return { rejected, pass: rejected };
});

evidence.status = evidence.cases.some((item) => item.status === 'probe_error') ? 'INSUFFICIENT_EVIDENCE'
  : evidence.cases.every((item) => item.status === 'pass') ? 'NEGATIVE_CASES_PASS' : 'DEFECT_REPRODUCED';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.status === 'NEGATIVE_CASES_PASS' ? 0 : 1;
