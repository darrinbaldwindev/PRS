// Independent immutable PRS probe for AgentOS partial-install recovery.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, unlink } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref, expected] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '') || !['defect', 'pass'].includes(expected)) {
  throw new Error('usage: node scripts/challenge-agentos-install-recovery.mjs REPO EXACT_SHA defect|pass');
}

const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact AgentOS commit required');

const modulePath = 'scripts/install-local.mjs';
const exactSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
if (readFileSync(resolve(repo, modulePath), 'utf8') !== exactSource) {
  throw new Error(`${modulePath} checkout does not match exact Git object`);
}

const mod = await import(`${pathToFileURL(resolve(repo, modulePath)).href}?prs=${ref}-${Date.now()}`);
const root = await mkdtemp(join(tmpdir(), 'prs-agentos-install-recovery-'));
let rejection = null;
let configRecreated = false;
let statePreserved = false;

try {
  const first = await mod.installLocal({ root });
  const stateBefore = await readFile(first.statePath, 'utf8');
  await unlink(first.configPath);

  try {
    await mod.installLocal({ root });
  } catch (error) {
    rejection = { name: error.name, message: error.message, code: error.code ?? null };
  }

  try {
    await readFile(first.configPath, 'utf8');
    configRecreated = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  statePreserved = await readFile(first.statePath, 'utf8') === stateBefore;
} finally {
  await rm(root, { recursive: true, force: true });
}

const failClosed = rejection?.message?.includes(
  'LOCAL_INSTALL_INCOMPLETE: canonical state exists but config is missing',
) === true && configRecreated === false && statePreserved === true;
const defectReproduced = rejection === null && configRecreated === true && statePreserved === true;
const expectationMet = expected === 'pass' ? failClosed : defectReproduced;

const evidence = {
  schema: 'prs.agentos-install-recovery.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  module: modulePath,
  module_sha256: createHash('sha256').update(exactSource).digest('hex'),
  expected,
  status: failClosed ? 'INSTALL_RECOVERY_PASS' : defectReproduced ? 'INSTALL_RECOVERY_DEFECT_REPRODUCED' : 'INSTALL_RECOVERY_PROBE_ERROR',
  expectation_met: expectationMet,
  case: {
    id: 'canonical-state-present-config-missing',
    rejection,
    config_recreated: configRecreated,
    state_preserved: statePreserved,
  },
  production_install_mutated: false,
  scheduler_exercised: false,
  powershell_exercised: false,
  owner_windows_laptop_exercised: false,
  assurance_certified: false,
  production_promotion_allowed: false,
  overall_agentos_green: false,
};

console.log(JSON.stringify(evidence, null, 2));
process.exitCode = expectationMet ? 0 : 1;
