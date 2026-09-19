// Independent immutable PRS probe for AgentOS local-doctor path drift.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-doctor-path-drift.mjs REPO EXACT_SHA');
}

const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact AgentOS commit required');

const doctorPath = 'scripts/doctor-local.mjs';
const installPath = 'scripts/install-local.mjs';
const doctorSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${doctorPath}`], { encoding: 'utf8' });
const installSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${installPath}`], { encoding: 'utf8' });
if (readFileSync(resolve(repo, doctorPath), 'utf8') !== doctorSource) {
  throw new Error(`${doctorPath} checkout does not match exact Git object`);
}
if (readFileSync(resolve(repo, installPath), 'utf8') !== installSource) {
  throw new Error(`${installPath} checkout does not match exact Git object`);
}

const doctor = await import(`${pathToFileURL(resolve(repo, doctorPath)).href}?prs=${ref}-${Date.now()}`);
const installer = await import(`${pathToFileURL(resolve(repo, installPath)).href}?prs=${ref}-${Date.now()}`);
const root = await mkdtemp(join(tmpdir(), 'prs-agentos-doctor-path-drift-'));

let result;
try {
  const installed = await installer.installLocal({ root });
  const config = JSON.parse(await readFile(installed.configPath, 'utf8'));
  config.stateFile = '../borrowed-state.json';
  config.workspaceRoot = '../borrowed-workspace';
  await writeFile(installed.configPath, `${JSON.stringify(config, null, 2)}\n`);
  result = await doctor.doctorLocal({ root });
} finally {
  await rm(root, { recursive: true, force: true });
}

const stateFileCheck = result.checks?.find(({ name }) => name === 'state-file-config');
const workspaceRootCheck = result.checks?.find(({ name }) => name === 'workspace-root-config');
const expectationMet = result.status === 'FAILED'
  && stateFileCheck?.status === 'FAIL'
  && workspaceRootCheck?.status === 'FAIL';

const evidence = {
  schema: 'prs.agentos-doctor-path-drift.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  modules: {
    doctor: doctorPath,
    doctor_sha256: createHash('sha256').update(doctorSource).digest('hex'),
    installer: installPath,
    installer_sha256: createHash('sha256').update(installSource).digest('hex'),
  },
  status: expectationMet ? 'DOCTOR_PATH_DRIFT_PASS' : 'DOCTOR_PATH_DRIFT_PROBE_ERROR',
  expectation_met: expectationMet,
  case: {
    id: 'state-and-workspace-path-drift',
    doctor_status: result.status,
    failed_checks: result.failedChecks,
    state_file_check: stateFileCheck ?? null,
    workspace_root_check: workspaceRootCheck ?? null,
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
