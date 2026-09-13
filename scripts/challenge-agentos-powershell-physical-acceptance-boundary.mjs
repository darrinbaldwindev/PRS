// Independent PRS challenge for the supervised AgentOS physical-Windows PowerShell acceptance boundary.
// This probe never runs a real PowerShell process and never claims owner-laptop acceptance.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/u.test(ref ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-powershell-physical-acceptance-boundary.mjs REPO EXACT_SHA');
}
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact AgentOS commit required');

const modulePath = 'runtime/windows-powershell-physical-acceptance.mjs';
const exact = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
if (readFileSync(resolve(repo, modulePath), 'utf8') !== exact) throw new Error(`${modulePath} checkout mismatch`);

const mod = await import(`${pathToFileURL(resolve(repo, modulePath)).href}?prs=${ref}-${Date.now()}`);
const HEAD = ref;
const cases = [];

async function run(id, fn) {
  try {
    const result = await fn();
    cases.push({ id, ...result, status: result.pass ? 'pass' : 'defect_reproduced' });
  } catch (error) {
    cases.push({ id, pass: false, status: 'probe_error', code: error?.code ?? null, message: error?.message ?? String(error) });
  }
}

async function blockedCase(id, options, expectedCode) {
  await run(id, async () => {
    let adapterCreations = 0;
    let code = null;
    try {
      await mod.runWindowsPowerShellPhysicalAcceptance({
        root: repo,
        expectedHead: HEAD,
        platform: 'win32',
        acknowledgePhysicalRun: true,
        headResolver: async () => HEAD,
        dirtyResolver: async () => false,
        adapterFactory() { adapterCreations += 1; return {}; },
        ...options,
      });
    } catch (error) {
      code = error?.code ?? null;
    }
    return { pass: code === expectedCode && adapterCreations === 0, code, adapter_creations: adapterCreations };
  });
}

await run('non-windows-blocks-before-adapter', async () => {
  let adapterCreations = 0;
  let code = null;
  try {
    await mod.runWindowsPowerShellPhysicalAcceptance({
      root: repo, expectedHead: HEAD, platform: 'linux', acknowledgePhysicalRun: true,
      adapterFactory() { adapterCreations += 1; return {}; },
    });
  } catch (error) { code = error?.code ?? null; }
  return { pass: code === 'PHYSICAL_ACCEPTANCE_WINDOWS_REQUIRED' && adapterCreations === 0, code, adapter_creations: adapterCreations };
});

await run('owner-ack-required-before-adapter', async () => {
  let adapterCreations = 0;
  let code = null;
  try {
    await mod.runWindowsPowerShellPhysicalAcceptance({
      root: repo, expectedHead: HEAD, platform: 'win32',
      adapterFactory() { adapterCreations += 1; return {}; },
    });
  } catch (error) { code = error?.code ?? null; }
  return { pass: code === 'PHYSICAL_ACCEPTANCE_OWNER_ACK_REQUIRED' && adapterCreations === 0, code, adapter_creations: adapterCreations };
});

await blockedCase('head-mismatch-blocks-before-adapter', {
  headResolver: async () => '0000000000000000000000000000000000000000',
}, 'PHYSICAL_ACCEPTANCE_HEAD_MISMATCH');

await blockedCase('dirty-tree-blocks-before-adapter', {
  dirtyResolver: async () => true,
}, 'PHYSICAL_ACCEPTANCE_TRACKED_TREE_DIRTY');

await blockedCase('dev-execution-needs-second-ack', {
  includeDevExecution: true,
  acknowledgeDevExecution: false,
}, 'PHYSICAL_ACCEPTANCE_DEV_ACK_REQUIRED');

await run('simulated-clean-windows-run-preserves-safe-boundaries', async () => {
  const invoked = [];
  const adapterFactory = () => ({
    describe(operation) {
      return { operation, capability: operation === 'test.run' ? 'shell.powershell.dev.execute' : 'shell.powershell.repo.read', elevated: false, interactive: false };
    },
    async execute({ operation }) {
      invoked.push(operation);
      return { operation, success: true, elevated: false, interactive: false, timed_out: false, truncated: false, exit_code: 0, stdout: 'ok', stderr: '', resolved_executables: {} };
    },
  });
  const times = [new Date('2026-09-13T08:00:00.000Z'), new Date('2026-09-13T08:00:01.000Z')];
  const evidence = await mod.runWindowsPowerShellPhysicalAcceptance({
    root: repo, expectedHead: HEAD, platform: 'win32', acknowledgePhysicalRun: true,
    headResolver: async () => HEAD, dirtyResolver: async () => false, adapterFactory,
    now: () => times.shift(),
  });
  return {
    pass: evidence.pass === true &&
      evidence.disposition === 'PHYSICAL_POWERSHELL_ACCEPTANCE_PASS' &&
      evidence.local_wake_execution_enabled === false &&
      evidence.scheduler_execution_enabled === false &&
      evidence.production_autonomy_enabled === false &&
      evidence.owner_supervision_required === true &&
      evidence.include_dev_execution === false &&
      JSON.stringify(invoked) === JSON.stringify([...mod.PHYSICAL_ACCEPTANCE_READ_OPERATIONS]),
    invoked,
    disposition: evidence.disposition,
  };
});

const evidence = {
  schema: 'prs.agentos-powershell-physical-acceptance-boundary.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  cases,
  real_powershell_process_exercised: false,
  owner_windows_laptop_exercised: false,
  local_wake_execution_exercised: false,
  scheduler_execution_exercised: false,
  assurance_certified: false,
  production_promotion_allowed: false,
};
evidence.pass = cases.length === 6 && cases.every((entry) => entry.pass === true);
evidence.status = evidence.pass ? 'POWERSHELL_PHYSICAL_ACCEPTANCE_BOUNDARY_PASS' : 'POWERSHELL_PHYSICAL_ACCEPTANCE_BOUNDARY_FAIL';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.pass ? 0 : 1;
