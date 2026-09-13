// Independent PRS challenge for AgentOS governed PowerShell composition.
// Exact-head only; no real PowerShell process, scheduler execution, or owner-laptop claim.
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-powershell-governed-composition.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact AgentOS commit required');
for (const path of [
  'runtime/governed-execution-boundary.mjs',
  'runtime/governed-execution-canonical-adapters.mjs',
  'runtime/governed-execution-claim-guard.mjs',
  'runtime/remote-delivery-claim-store.mjs',
  'runtime/execution-risk-policy.mjs',
  'runtime/local-wake.mjs',
]) {
  const exact = execFileSync('git', ['-C', repo, 'show', `${ref}:${path}`], { encoding: 'utf8' });
  if (readFileSync(resolve(repo, path), 'utf8') !== exact) throw new Error(`${path} checkout mismatch`);
}

const stamp = `?prs=${ref}-${Date.now()}`;
const load = async (path) => import(`${pathToFileURL(resolve(repo, path)).href}${stamp}`);
const boundaryMod = await load('runtime/governed-execution-boundary.mjs');
const adapterMod = await load('runtime/governed-execution-canonical-adapters.mjs');
const claimGuardMod = await load('runtime/governed-execution-claim-guard.mjs');
const claimStoreMod = await load('runtime/remote-delivery-claim-store.mjs');
const consentMod = await load('runtime/worker-consent-gate.mjs');
const riskMod = await load('runtime/execution-risk-policy.mjs');
const budgetMod = await load('runtime/mission-budget.mjs');
const toolPolicyMod = await load('runtime/tool-policy.mjs');
const humanGateMod = await load('runtime/overseer-human-gate.mjs');
const authorityMod = await load('src/dispatch/authority.mjs');
const installMod = await load('scripts/install-local.mjs');
const persistenceMod = await load('runtime/local-persistence.mjs');
const hostIdentityMod = await load('runtime/remote-host-identity.mjs');
const localWakeMod = await load('runtime/local-wake.mjs');

const actor = Object.freeze({ actor_id: 'agentos:overseer' });
const task = () => ({
  delivery_id: 'delivery:1', request_id: 'request:1', project_id: 'agentos-local', mission_id: 'mission:1',
  task_id: 'task:1', wake_trace_id: 'wake:1', issuer: 'agentos:overseer',
  authority: { granted_capabilities: ['shell.powershell.dev.execute'] },
  required_capabilities: ['shell.powershell.dev.execute'],
  execution: { adapter: 'windows-powershell', operation: 'test.run', cwd: 'C:/agentos/AgentOS' },
});
const result = () => ({
  success: true, operation: 'test.run', cwd: 'C:\\agentos\\AgentOS', exit_code: 0,
  started_at: '2026-09-13T02:10:00.000Z', finished_at: '2026-09-13T02:10:01.000Z', duration_ms: 1000,
  stdout: 'ok\n', stderr: '', timed_out: false, truncated: false,
  resolved_executables: { pwsh: { path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', version: '7.5.2' } },
});
const cases = [];
async function run(id, fn) {
  try {
    const out = await fn();
    cases.push({ id, ...out, status: out.pass ? 'pass' : 'defect_reproduced' });
  } catch (e) {
    cases.push({ id, pass: false, status: 'probe_error', message: e.message, code: e.code ?? null });
  }
}

async function fixture({
  consent = 'PRE_AUTHORIZED', eligible = true, authorized = true, riskLevel = null,
  approvalRequired = false, approve = false, recordReceipt = async () => ({ persisted: true }),
  verify = async () => ({ passed: true, evidence: ['prs'] }),
} = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'prs-governed-'));
  const budget = await budgetMod.createMissionBudget({ filePath: join(dir, 'budget.sqlite') });
  const human = humanGateMod.createHumanGate();
  if (approve) {
    human.request({ missionId: 'mission:1', reason: 'prs' });
    human.resolve({ missionId: 'mission:1', decision: 'approved' });
  }
  const classify = riskLevel == null
    ? riskMod.classifyWindowsPowerShellOperationRisk
    : async () => ({ level: riskLevel, approvalRequired, reason: 'prs risk override', evidence: ['prs:risk'] });
  const boundary = boundaryMod.createGovernedExecutionBoundary({
    context: adapterMod.createCanonicalContextGate({ canonicalContext: { missions: [{ id: 'mission:1' }], decisions: [] } }),
    authority: adapterMod.createCanonicalAuthorityGate({ authorityPolicy: authorityMod.createAuthorityPolicy({ issuers: ['agentos:overseer'], capabilities: ['shell.powershell.dev.execute'] }) }),
    consent: consentMod.createWorkerConsentGate({ async resolveConsent() { return { state: consent, confirmed: false, reason: 'prs' }; } }),
    capability: adapterMod.createCanonicalPowerShellCapabilityGate({
      hostIdentity: { host_id: 'host:1' }, runtimeExecutionEnabled: authorized,
      async evaluatePickup() { return { pickup_eligible: eligible, execution_authorized: authorized, disposition: eligible && authorized ? 'ELIGIBLE' : 'BLOCKED' }; },
    }),
    policy: adapterMod.createCanonicalToolPolicyGate({ toolPolicy: toolPolicyMod.createToolPolicy({ allow: ['test.run'] }) }),
    risk: riskMod.createExecutionRiskPolicy({ classify }),
    budget,
    approval: adapterMod.createCanonicalHumanApprovalGate({ humanGate: human }),
    receipts: adapterMod.createCanonicalPowerShellReceiptGate({
      hostId: 'host:1', workerId: 'agentos:windows-powershell-worker', codeIdentity: ref,
      async resolveBudgetStatus({ reservation }) { return reservation.status; }, recordReceipt,
    }),
    verification: adapterMod.createCanonicalVerificationGate({
      verificationRouter: { async selectVerifier() { return { id: 'verifier:prs' }; } },
      async runVerifier(input) { return verify(input); },
    }),
  });
  return {
    boundary, budget, dir,
    async guarded() {
      const claims = await claimStoreMod.createRemoteDeliveryClaimStore({ root: join(dir, 'claims') });
      return {
        claims,
        guard: claimGuardMod.createGovernedExecutionClaimGuard({ boundary, claims, hostId: 'host:1' }),
      };
    },
    async cleanup() { budget.close(); await rm(dir, { recursive: true, force: true }); },
  };
}

await run('policy-owned-operation-risk-mapping', async () => {
  const readDecision = riskMod.classifyWindowsPowerShellOperationRisk({ task: { execution: { adapter: 'windows-powershell', operation: 'repo.status' } } });
  const executeDecision = riskMod.classifyWindowsPowerShellOperationRisk({ task: { execution: { adapter: 'windows-powershell', operation: 'test.run' } } });
  let unknown = null;
  try { riskMod.classifyWindowsPowerShellOperationRisk({ task: { execution: { adapter: 'windows-powershell', operation: 'shell.arbitrary' } } }); } catch (e) { unknown = e.code; }
  return {
    pass: readDecision.level === 'A0' && readDecision.approvalRequired === false &&
      executeDecision.level === 'A2' && executeDecision.approvalRequired === false &&
      unknown === 'EXECUTION_RISK_OPERATION_UNKNOWN',
    read_level: readDecision.level, execute_level: executeDecision.level, unknown_code: unknown,
  };
});

await run('success-requires-receipt-verification-budget-and-policy-risk', async () => {
  const f = await fixture(); let invokes = 0;
  try {
    const out = await f.boundary.execute({ actorContext: actor, task: task(), actualUnits: 1, async invoke() { invokes += 1; return result(); } });
    return {
      pass: invokes === 1 && out.status === 'VERIFIED' && out.receipt.status === 'AWAITING_GREEN' &&
        out.verification.passed === true && out.budget.status === 'RECONCILED' && out.risk.level === 'A2' &&
        out.receipt.task_id === 'task:1' && out.receipt.wake_trace_id === 'wake:1',
      invokes, status: out.status, receipt_status: out.receipt.status, budget_status: out.budget.status, risk_level: out.risk.level,
    };
  } finally { await f.cleanup(); }
});

await run('duplicate-delivery-zero-second-invoke', async () => {
  const f = await fixture(); let invokes = 0;
  try {
    const { guard } = await f.guarded();
    const first = await guard.execute({ actorContext: actor, task: task(), actualUnits: 1, async invoke() { invokes += 1; return result(); } });
    let secondCode = null;
    try { await guard.execute({ actorContext: actor, task: task(), actualUnits: 1, async invoke() { invokes += 1; return result(); } }); } catch (e) { secondCode = e.code; }
    return { pass: first.status === 'VERIFIED' && invokes === 1 && secondCode === 'GOVERNED_EXECUTION_DUPLICATE_DELIVERY', invokes, second_code: secondCode };
  } finally { await f.cleanup(); }
});

await run('receipt-loss-retains-claim-and-blocks-replay', async () => {
  const f = await fixture({ recordReceipt: async () => null }); let invokes = 0;
  try {
    const { guard, claims } = await f.guarded();
    let first = null;
    try { await guard.execute({ actorContext: actor, task: task(), actualUnits: 1, async invoke() { invokes += 1; return result(); } }); } catch (e) {
      first = { code: e.code, claim_retained: e.claim_retained, replay_safe_to_invoke: e.replay_safe_to_invoke };
    }
    const retained = await claims.get('delivery:1');
    let secondCode = null;
    try { await guard.execute({ actorContext: actor, task: task(), actualUnits: 1, async invoke() { invokes += 1; return result(); } }); } catch (e) { secondCode = e.code; }
    return {
      pass: first?.code === 'EXECUTION_RECEIPT_PERSISTENCE_REQUIRED' && first.claim_retained === true &&
        first.replay_safe_to_invoke === false && retained?.state === 'CLAIMED' &&
        secondCode === 'GOVERNED_EXECUTION_DUPLICATE_DELIVERY' && invokes === 1,
      first_code: first?.code ?? null, claim_state: retained?.state ?? null, second_code: secondCode, invokes,
    };
  } finally { await f.cleanup(); }
});

await run('prohibited-consent-zero-invoke', async () => {
  const f = await fixture({ consent: 'PROHIBITED' }); let invokes = 0, code = null;
  try {
    try { await f.boundary.execute({ actorContext: actor, task: task(), async invoke() { invokes += 1; return result(); } }); } catch (e) { code = e.code; }
    return { pass: code === 'WORKER_CONSENT_PROHIBITED' && invokes === 0, code, invokes };
  } finally { await f.cleanup(); }
});

await run('capability-denial-zero-invoke', async () => {
  const f = await fixture({ eligible: false, authorized: false }); let invokes = 0, code = null;
  try {
    try { await f.boundary.execute({ actorContext: actor, task: task(), async invoke() { invokes += 1; return result(); } }); } catch (e) { code = e.code; }
    return { pass: code === 'POWERSHELL_CAPABILITY_NOT_ELIGIBLE' && invokes === 0, code, invokes };
  } finally { await f.cleanup(); }
});

await run('a4-without-approval-zero-invoke', async () => {
  const f = await fixture({ riskLevel: 'A4', approvalRequired: true, approve: false }); let invokes = 0, code = null;
  try {
    try { await f.boundary.execute({ actorContext: actor, task: task(), async invoke() { invokes += 1; return result(); } }); } catch (e) { code = e.code; }
    return { pass: code === 'HUMAN_APPROVAL_RECORD_REQUIRED' && invokes === 0, code, invokes };
  } finally { await f.cleanup(); }
});

await run('verification-failure-after-invoke-never-verified', async () => {
  const f = await fixture({ verify: async () => ({ passed: false, evidence: ['prs:rejected'] }) }); let invokes = 0, code = null, receiptStatus = null;
  try {
    try { await f.boundary.execute({ actorContext: actor, task: task(), actualUnits: 1, async invoke() { invokes += 1; return result(); } }); } catch (e) { code = e.code; receiptStatus = e.receipt?.status ?? null; }
    return { pass: code === 'EXECUTION_VERIFICATION_FAILED' && receiptStatus === 'AWAITING_GREEN' && invokes === 1, code, receipt_status: receiptStatus, invokes };
  } finally { await f.cleanup(); }
});

await run('dry-run-local-wake-recognizes-but-never-authorizes-powershell', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prs-powershell-dry-wake-'));
  try {
    await installMod.installLocal({ root });
    const configPath = join(root, 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    await writeFile(configPath, JSON.stringify({ ...config, remoteBridge: { enabled: true, powerShell: { enabled: true } } }));
    const host = await hostIdentityMod.loadOrCreateRemoteHostIdentity({ filePath: join(root, 'state', 'remote-host.json') });
    const store = await persistenceMod.createLocalPersistence({ filePath: join(root, installMod.DEFAULT_CONFIG.stateFile) });
    const admitted = {
      task_id: 'task:dry', mission_id: 'mission:dry', delivery_id: 'delivery:dry', request_id: 'request:dry', wake_trace_id: 'wake:dry',
      project_id: 'agentos-local', target_host_id: host.host_id, actor_id: 'owner-fixture', issuer: 'agentos:overseer', admitted_by: 'agentos:overseer',
      target: 'agentos:project-overseer', authority_admitted: true, environment: 'DRY_RUN', pickup_state: 'QUEUED', status: 'queued', consent_mode: 'PRE_AUTHORIZED',
      authority: { action: 'execute', granted_capabilities: ['shell.powershell.repo.read'] }, required_capabilities: ['shell.powershell.repo.read'],
      execution: { adapter: 'windows-powershell', operation: 'repo.status', cwd: root }, scope: ['local-runtime'], constraints: ['DRY_RUN only'],
      objective: 'PRS dry-run pickup challenge', priority: 'high', acceptance_criteria: ['no PowerShell process invocation'], created_at: new Date().toISOString(),
    };
    await store.create('artifact', { id: admitted.task_id, artifactType: 'dispatch.task', payload: admitted });
    const hostProbe = { async probe(hostId) { return { host_id: hostId, platform: 'win32', capabilities: ['shell.powershell.system.read', 'shell.powershell.repo.read', 'shell.powershell.dev.execute'] }; } };
    const out = await localWakeMod.__testOnlyWakeLocal({ root, deliveryId: admitted.delivery_id, powerShellHostProbe: hostProbe });
    const artifacts = await store.list('artifact');
    let claimsAbsent = false, budgetAbsent = false;
    try { await access(join(root, 'state', 'remote-claims')); } catch (e) { claimsAbsent = e.code === 'ENOENT'; }
    try { await access(join(root, 'state', 'mission-budget.sqlite')); } catch (e) { budgetAbsent = e.code === 'ENOENT'; }
    return {
      pass: out.status === 'BLOCKED' && out.reason === 'POWERSHELL_RUNTIME_EXECUTION_NOT_WIRED' && out.executed === false &&
        out.powershell_pickup?.pickup_eligible === true && out.powershell_pickup?.execution_authorized === false &&
        out.powershell_pickup?.runtime_execution_enabled === false && out.response?.wake_trace_id === admitted.wake_trace_id &&
        !artifacts.some((x) => x.artifactType === 'remote.execution.receipt') && claimsAbsent && budgetAbsent,
      status: out.status, reason: out.reason, executed: out.executed,
      pickup_eligible: out.powershell_pickup?.pickup_eligible ?? null,
      execution_authorized: out.powershell_pickup?.execution_authorized ?? null,
      runtime_execution_enabled: out.powershell_pickup?.runtime_execution_enabled ?? null,
      claims_absent: claimsAbsent, budget_absent: budgetAbsent,
    };
  } finally { await rm(root, { recursive: true, force: true }); }
});

const evidence = {
  schema: 'prs.agentos-powershell-governed-composition.v2',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  cases,
  real_powershell_process_exercised: false,
  local_wake_dry_run_gate_exercised: true,
  local_wake_execution_exercised: false,
  scheduler_execution_exercised: false,
  operation_risk_mapping_exercised: true,
  replay_recovery_exercised: true,
  owner_windows_laptop_exercised: false,
  assurance_certified: false,
  production_promotion_allowed: false,
};
evidence.pass = cases.length === 9 && cases.every((x) => x.pass === true);
evidence.status = evidence.pass ? 'POWERSHELL_GOVERNED_COMPOSITION_PASS' : 'POWERSHELL_GOVERNED_COMPOSITION_FAIL';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.pass ? 0 : 1;
