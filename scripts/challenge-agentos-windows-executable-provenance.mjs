// Hosted-Windows-only provenance probe for exact AgentOS Level-2 PowerShell execution.
// Confirms canonical host-probe identity matches execution and identity drift fails closed.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (process.platform !== 'win32') throw new Error('WINDOWS_HOST_REQUIRED');
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-windows-executable-provenance.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');

async function loadExact(modulePath, query) {
  const exactSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
  const checkedOut = resolve(repo, modulePath);
  const checkoutSource = readFileSync(checkedOut, 'utf8');
  const exactBytes = checkoutSource === exactSource;
  const eolTranslationOnly = !exactBytes && checkoutSource.replaceAll('\r\n', '\n') === exactSource;
  if (!exactBytes && !eolTranslationOnly) throw new Error(`checked-out ${modulePath} does not match exact Git object`);
  const module = await import(`${pathToFileURL(checkedOut).href}?${query}=${ref}-${Date.now()}`);
  return { module, exactBytes, eolTranslationOnly };
}

function sameIdentity(a, b) {
  return a?.path === b?.path && a?.version === b?.version && typeof a?.path === 'string' && a.path.length > 0;
}

const hostLoaded = await loadExact('runtime/windows-worker-default-host-probe.mjs', 'host-provenance');
const adapterLoaded = await loadExact('runtime/windows-powershell-adapter.mjs', 'adapter-provenance');
const receiptLoaded = await loadExact('runtime/windows-powershell-receipt-evidence.mjs', 'receipt-provenance');
const base = mkdtempSync(path.join(tmpdir(), 'prs-win-provenance-'));
const evidence = { cases: [] };

try {
  execFileSync('git', ['init', base], { stdio: 'ignore' });
  writeFileSync(path.join(base, 'package.json'), JSON.stringify({ private: true, scripts: { test: 'node -e "process.exit(0)"' } }), 'utf8');

  const hostProbe = hostLoaded.module.createDefaultWindowsWorkerHostProbe({ workspaceRoot: base });
  const hostEvidence = await hostProbe.probe('prs-hosted-windows');
  const tools = hostEvidence.evaluation.tool_evidence;

  const adapter = adapterLoaded.module.createWindowsPowerShellAdapter({ allowedRoots: [base], timeoutMs: 30_000 });
  const repoResult = await adapter.execute({ operation: 'repo.status', cwd: base, expectedExecutables: tools });
  const testResult = await adapter.execute({ operation: 'test.run', cwd: base, expectedExecutables: tools });

  const psMatchesRepo = sameIdentity(tools['powershell.exe'], repoResult.resolved_executables['powershell.exe']);
  const psMatchesTest = sameIdentity(tools['powershell.exe'], testResult.resolved_executables['powershell.exe']);
  const gitMatches = sameIdentity(tools['git.exe'], repoResult.resolved_executables['git.exe']);
  const npmMatches = sameIdentity(tools['npm.cmd'], testResult.resolved_executables['npm.cmd']);

  const candidate = { delivery_id: 'prov-delivery', request_id: 'prov-request', project_id: 'agentos-local' };
  const task = { delivery_id: 'prov-delivery', request_id: 'prov-request', mission_id: 'prov-mission', task_id: 'prov-task', wake_trace_id: 'prov-wake' };
  const receipt = receiptLoaded.module.createWindowsPowerShellReceiptEvidence({
    candidate,
    task,
    hostId: 'prs-hosted-windows',
    workerId: 'agentos:windows-powershell-worker',
    status: 'AWAITING_GREEN',
    powerShellResult: repoResult,
    budgetStatus: 'RECONCILED',
    codeIdentity: ref,
    createdAt: new Date().toISOString(),
  });
  const receiptPreserves = sameIdentity(receipt.execution.resolved_executables['powershell.exe'], repoResult.resolved_executables['powershell.exe']) &&
    sameIdentity(receipt.execution.resolved_executables['git.exe'], repoResult.resolved_executables['git.exe']);

  evidence.cases.push({
    id: 'host-probe-and-execution-bind-same-binaries',
    host_eligible: hostEvidence.evaluation.eligible,
    repo_success: repoResult.success,
    test_success: testResult.success,
    powershell_matches_repo_execution: psMatchesRepo,
    powershell_matches_test_execution: psMatchesTest,
    git_matches_repo_execution: gitMatches,
    npm_matches_test_execution: npmMatches,
    receipt_preserves_resolved_executables: receiptPreserves,
    host_tool_evidence: tools,
    repo_resolved_executables: repoResult.resolved_executables,
    test_resolved_executables: testResult.resolved_executables,
    pass: hostEvidence.evaluation.eligible === true && repoResult.success === true && testResult.success === true && psMatchesRepo && psMatchesTest && gitMatches && npmMatches && receiptPreserves,
  });

  let driftExecutorCalls = 0;
  const driftAdapter = adapterLoaded.module.createWindowsPowerShellAdapter({
    allowedRoots: [base],
    timeoutMs: 30_000,
    toolResolver: async (tool) => {
      if (tool === 'powershell.exe') return { path: tools['powershell.exe'].path, version: tools['powershell.exe'].version };
      if (tool === 'git.exe') return { path: 'C:\\shadowed-tools\\git.exe', version: tools['git.exe'].version };
      return { path: tools[tool]?.path, version: tools[tool]?.version ?? null };
    },
    executor: async () => {
      driftExecutorCalls += 1;
      return { stdout: 'UNSAFE_EXECUTION_OCCURRED', stderr: '', exitCode: 0 };
    },
  });
  const driftResult = await driftAdapter.execute({ operation: 'repo.status', cwd: base, expectedExecutables: tools });
  evidence.cases.push({
    id: 'post-probe-operation-tool-identity-drift-fails-before-spawn',
    simulated_drift: 'git.exe path replaced after host probe',
    adapter_success: driftResult.success,
    executor_invocations: driftExecutorCalls,
    observed_stderr: driftResult.stderr,
    observed_resolved_git: driftResult.resolved_executables?.['git.exe'] ?? null,
    pass: driftResult.success === false && driftExecutorCalls === 0 && /POWERSHELL_EXECUTABLE_IDENTITY_MISMATCH:git\.exe/.test(driftResult.stderr),
  });
} finally {
  await rm(base, { recursive: true, force: true });
}

evidence.schema = 'prs.agentos-windows-executable-provenance.v2';
evidence.exact_head = ref;
evidence.platform = process.platform;
evidence.hosted_windows_runner_exercised = true;
evidence.owner_windows_laptop_exercised = false;
evidence.scheduler_or_local_wake_exercised = false;
evidence.production_repository_mutated = false;
evidence.identity_drift_simulated = true;
evidence.assurance_certified = false;
evidence.production_promotion_allowed = false;
evidence.pass = evidence.cases.length === 2 && evidence.cases.every((item) => item.pass === true);
evidence.status = evidence.pass ? 'HOSTED_WINDOWS_EXECUTABLE_PROVENANCE_AND_DRIFT_PASS' : 'HOSTED_WINDOWS_EXECUTABLE_PROVENANCE_FAIL';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.pass ? 0 : 1;
