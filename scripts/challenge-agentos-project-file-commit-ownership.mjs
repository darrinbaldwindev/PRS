// Offline adversarial probe for continuous ownership through AgentOS project-file commit.
// Reads an exact immutable AgentOS Git object and mutates temporary fixture files only.
// A persisted success receipt is not sufficient if lock ownership can be lost before commit release.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-project-file-commit-ownership.mjs REPO EXACT_SHA');
}
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');

const modulePath = 'runtime/project-file-writer.mjs';
const source = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const checkedOutPath = resolve(repo, modulePath);
if (readFileSync(checkedOutPath, 'utf8') !== source) throw new Error('checked-out module does not match exact Git object');
const module = await import(`${pathToFileURL(checkedOutPath).href}?commit-ownership=${ref}`);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const evidence = {
  schema: 'prs.agentos-project-file-commit-ownership.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  module: modulePath,
  module_sha256: sha256(source),
  captured_at: new Date().toISOString(),
  cases: [],
  assurance_certified: false,
  production_promotion_allowed: false,
};

function persistenceHarness() {
  const artifacts = new Map();
  return {
    artifacts,
    api: {
      get: async (type, id) => type === 'artifact' ? artifacts.get(id) ?? null : null,
      create: async (type, input) => {
        if (type !== 'artifact') throw new Error('unexpected type');
        if (artifacts.has(input.id)) throw new Error('duplicate');
        artifacts.set(input.id, structuredClone(input));
        return structuredClone(input);
      },
    },
  };
}

const successfulReceipt = (artifacts) => [...artifacts.values()].find((artifact) => artifact.artifact_kind === 'project.file.write.receipt');
const task = (suffix) => ({ project_id: 'agentos', mission_id: `commit-owner-${suffix}`, task_id: `task-${suffix}`, worker_id: 'prs-commit-owner-probe' });

async function fixture(prefix) {
  const root = await fs.mkdtemp(path.join(tmpdir(), prefix));
  return { root, target: path.join(root, 'fixture.txt'), cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}

async function replaceValidatedLockWithSuccessor(lock, suffix) {
  const predecessor = `${lock}.predecessor-${suffix}`;
  await fs.rename(lock, predecessor);
  await fs.mkdir(lock);
  const successor = { lock_id: `successor-${suffix}`, intent_hash: `successor-intent-${suffix}`, worker_id: `successor-worker-${suffix}`, pid: process.pid };
  await fs.writeFile(path.join(lock, 'owner.json'), JSON.stringify(successor));
  return { predecessor, successor };
}

async function runCase(id, fn) {
  try {
    const observed = await fn();
    evidence.cases.push({ id, ...observed, status: observed.defect_reproduced ? 'defect_reproduced' : observed.pass ? 'pass' : 'unexpected' });
  } catch (error) {
    evidence.cases.push({ id, status: 'probe_error', error: error.name, message: error.message, code: error.code ?? null });
  }
}

await runCase('normal-publish-receipt-before-ownership-release', async () => {
  if (process.platform === 'win32') return { pass: true, skipped: 'POSIX lock-directory race probe; Windows handle semantics require hosted/physical Windows evidence' };
  const f = await fixture('prs-commit-owner-normal-');
  try {
    const persistence = persistenceHarness();
    let replacement = null;
    const writer = await module.createProjectFileWriter({
      approvedRoots: [f.root],
      persistence: persistence.api,
      hooks: {
        afterLockValidation: async ({ lock, reason }) => {
          if (reason === 'release' && replacement === null) replacement = await replaceValidatedLockWithSuccessor(lock, 'normal');
        },
      },
    });
    let code = null;
    try {
      await writer.execute({ task: task('normal'), targetPath: f.target, content: 'new-normal', idempotencyKey: 'commit-owner-normal' });
    } catch (error) { code = error.code ?? error.message; }
    const receipt = successfulReceipt(persistence.artifacts);
    const target = await fs.readFile(f.target, 'utf8');
    const lock = `${f.target}.agentos-write-lock`;
    const successor = JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8'));
    const defect = code === 'PROJECT_FILE_LOCK_RECOVERY_REQUIRED' && target === 'new-normal' && Boolean(receipt) && successor.lock_id === replacement?.successor.lock_id;
    return {
      expected: 'continuous ownership must span publish + receipt + commit release',
      observed_error: code,
      target_mutated: target === 'new-normal',
      success_receipt_persisted: Boolean(receipt),
      successor_lock_survived: successor.lock_id === replacement?.successor.lock_id,
      defect_reproduced: defect,
      pass: !defect,
    };
  } finally { await f.cleanup(); }
});

await runCase('recovery-publish-receipt-before-ownership-release', async () => {
  if (process.platform === 'win32') return { pass: true, skipped: 'POSIX lock-directory race probe; Windows handle semantics require hosted/physical Windows evidence' };
  const f = await fixture('prs-commit-owner-recovery-');
  try {
    await fs.writeFile(f.target, 'old');
    const persistence = persistenceHarness();
    const args = {
      task: task('recovery'),
      targetPath: f.target,
      content: 'new-recovery',
      expectedPreimageSha256: sha256(Buffer.from('old')),
      idempotencyKey: 'commit-owner-recovery',
    };
    const interrupted = await module.createProjectFileWriter({
      approvedRoots: [f.root],
      persistence: persistence.api,
      hooks: { beforePublish: async () => { throw new Error('interrupt-after-prepared-before-publish'); } },
    });
    try { await interrupted.execute(args); } catch {}
    if (successfulReceipt(persistence.artifacts)) throw new Error('interrupted setup unexpectedly produced receipt');

    let replacement = null;
    const resumed = await module.createProjectFileWriter({
      approvedRoots: [f.root],
      persistence: persistence.api,
      reconcilePreparedWrite: async () => ({ status: 'RESUME', evidence_id: 'prs-bounded-recovery-authority' }),
      hooks: {
        afterLockValidation: async ({ lock, reason }) => {
          if (reason === 'release' && replacement === null) replacement = await replaceValidatedLockWithSuccessor(lock, 'recovery');
        },
      },
    });
    let code = null;
    try { await resumed.execute(args); } catch (error) { code = error.code ?? error.message; }
    const receipt = successfulReceipt(persistence.artifacts);
    const target = await fs.readFile(f.target, 'utf8');
    const lock = `${f.target}.agentos-write-lock`;
    const successor = JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8'));
    const defect = code === 'PROJECT_FILE_LOCK_RECOVERY_REQUIRED' && target === 'new-recovery' && Boolean(receipt) && successor.lock_id === replacement?.successor.lock_id;
    return {
      expected: 'recovery ownership must span recovery publish + receipt + commit release',
      observed_error: code,
      target_mutated: target === 'new-recovery',
      success_receipt_persisted: Boolean(receipt),
      successor_lock_survived: successor.lock_id === replacement?.successor.lock_id,
      defect_reproduced: defect,
      pass: !defect,
    };
  } finally { await f.cleanup(); }
});

const defects = evidence.cases.filter((item) => item.status === 'defect_reproduced');
const errors = evidence.cases.filter((item) => item.status === 'probe_error' || item.status === 'unexpected');
evidence.status = errors.length ? 'INSUFFICIENT_EVIDENCE' : defects.length ? 'DEFECT_REPRODUCED' : 'NEGATIVE_CASES_PASS';
evidence.defect_count = defects.length;
console.log(JSON.stringify(evidence, null, 2));
// A reproduced defect is successful assurance execution: CI should fail only for probe errors/unexpected behavior.
process.exitCode = errors.length ? 1 : 0;
