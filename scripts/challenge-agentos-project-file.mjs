// Offline adversarial probe of AgentOS Level-2 project-file mutation semantics.
// Reads an immutable AgentOS Git object and mutates temporary fixture files only.
// Execution-produced evidence only; this is not independent PRS certification by itself.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readFileSync, rename, rm, writeFile } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-project-file.mjs REPO EXACT_SHA');
}
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');

const modulePath = 'runtime/project-file-writer.mjs';
const source = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const checkedOutPath = resolve(repo, modulePath);
const checkedOutSource = readFileSync(checkedOutPath, 'utf8');
if (checkedOutSource !== source) throw new Error('checked-out module does not match exact Git object');
const module = await import(`${pathToFileURL(checkedOutPath).href}?exact=${ref}`);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const evidence = {
  schema: 'prs.agentos-project-file-probe.v1',
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

function task(id) {
  return { project_id: 'agentos', mission_id: `mission-${id}`, task_id: `task-${id}`, worker_id: 'prs-fixture-worker' };
}

async function fixture(prefix) {
  const root = await fs.mkdtemp(path.join(tmpdir(), prefix));
  return { root, target: path.join(root, 'fixture.txt'), cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}

function successfulReceipt(artifacts) {
  return [...artifacts.values()].find((artifact) => artifact.artifact_kind === 'project.file.write.receipt');
}

async function runCase(id, fn) {
  try {
    const observed = await fn();
    evidence.cases.push({ id, ...observed, status: observed.pass ? 'pass' : 'defect_reproduced' });
  } catch (error) {
    evidence.cases.push({ id, status: 'probe_error', error: error.name, message: error.message });
  }
}

await runCase('positive-bounded-write-and-replay', async () => {
  const f = await fixture('prs-agentos-project-file-positive-');
  try {
    const p = persistenceHarness();
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.root], persistence: p.api });
    const args = { task: task('positive'), targetPath: f.target, content: 'new', idempotencyKey: 'idem-positive' };
    const first = await writer.execute(args);
    const second = await writer.execute(args);
    const pass = first.success === true && first.replayed === false && second.replayed === true && await fs.readFile(f.target, 'utf8') === 'new' && Boolean(successfulReceipt(p.artifacts));
    return { expected: 'one mutation + deterministic replay', observed_replayed: second.replayed, pass };
  } finally { await f.cleanup(); }
});

await runCase('normal-existing-target-external-mutation', async () => {
  const f = await fixture('prs-agentos-project-file-normal-');
  try {
    const p = persistenceHarness();
    await fs.writeFile(f.target, 'old');
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.root], persistence: p.api, hooks: { beforePublish: async () => fs.writeFile(f.target, 'external') } });
    let code = null;
    try {
      await writer.execute({ task: task('normal'), targetPath: f.target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('old')), idempotencyKey: 'idem-normal' });
    } catch (error) { code = error.code; }
    const final = await fs.readFile(f.target, 'utf8');
    return { expected_error: 'PROJECT_FILE_EXTERNAL_MUTATION', observed_error: code, external_preserved: final === 'external', success_receipt: Boolean(successfulReceipt(p.artifacts)), pass: code === 'PROJECT_FILE_EXTERNAL_MUTATION' && final === 'external' && !successfulReceipt(p.artifacts) };
  } finally { await f.cleanup(); }
});

await runCase('normal-absent-target-external-creation', async () => {
  const f = await fixture('prs-agentos-project-file-absent-');
  try {
    const p = persistenceHarness();
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.root], persistence: p.api, hooks: { beforePublish: async () => fs.writeFile(f.target, 'external') } });
    let code = null;
    try {
      await writer.execute({ task: task('absent'), targetPath: f.target, content: 'new', idempotencyKey: 'idem-absent' });
    } catch (error) { code = error.code; }
    const final = await fs.readFile(f.target, 'utf8');
    return { expected_error: 'PROJECT_FILE_EXTERNAL_MUTATION', observed_error: code, external_preserved: final === 'external', success_receipt: Boolean(successfulReceipt(p.artifacts)), pass: code === 'PROJECT_FILE_EXTERNAL_MUTATION' && final === 'external' && !successfulReceipt(p.artifacts) };
  } finally { await f.cleanup(); }
});

await runCase('normal-same-content-different-identity', async () => {
  const f = await fixture('prs-agentos-project-file-identity-');
  try {
    const p = persistenceHarness();
    await fs.writeFile(f.target, 'old');
    const writer = await module.createProjectFileWriter({
      approvedRoots: [f.root], persistence: p.api,
      hooks: { beforePublish: async () => { const replacement = path.join(f.root, 'replacement.tmp'); await fs.writeFile(replacement, 'old'); await fs.rename(replacement, f.target); } },
    });
    let code = null;
    try {
      await writer.execute({ task: task('identity'), targetPath: f.target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('old')), idempotencyKey: 'idem-identity' });
    } catch (error) { code = error.code; }
    const final = await fs.readFile(f.target, 'utf8');
    return { expected_error: 'PROJECT_FILE_EXTERNAL_MUTATION', observed_error: code, same_content_preserved: final === 'old', success_receipt: Boolean(successfulReceipt(p.artifacts)), pass: code === 'PROJECT_FILE_EXTERNAL_MUTATION' && final === 'old' && !successfulReceipt(p.artifacts) };
  } finally { await f.cleanup(); }
});

async function recoveryCase(id, replacementContent, replaceIdentity) {
  const f = await fixture(`prs-agentos-project-file-${id}-`);
  try {
    const p = persistenceHarness();
    await fs.writeFile(f.target, 'old');
    const args = { task: task(id), targetPath: f.target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('old')), idempotencyKey: `idem-${id}` };
    const interrupted = await module.createProjectFileWriter({ approvedRoots: [f.root], persistence: p.api, hooks: { beforePublish: async () => { throw new Error('interrupt-before-publish'); } } });
    try { await interrupted.execute(args); } catch {}
    const resumed = await module.createProjectFileWriter({
      approvedRoots: [f.root], persistence: p.api,
      reconcilePreparedWrite: async () => ({ status: 'RESUME', evidence_id: `evidence-${id}` }),
      hooks: { beforeRecoveryPublish: async () => {
        if (replaceIdentity) {
          const replacement = path.join(f.root, 'replacement.tmp');
          await fs.writeFile(replacement, replacementContent);
          await fs.rename(replacement, f.target);
        } else {
          await fs.writeFile(f.target, replacementContent);
        }
      } },
    });
    let code = null;
    try { await resumed.execute(args); } catch (error) { code = error.code; }
    const final = await fs.readFile(f.target, 'utf8');
    return { expected_error: 'PROJECT_FILE_EXTERNAL_MUTATION', observed_error: code, external_preserved: final === replacementContent, success_receipt: Boolean(successfulReceipt(p.artifacts)), pass: code === 'PROJECT_FILE_EXTERNAL_MUTATION' && final === replacementContent && !successfulReceipt(p.artifacts) };
  } finally { await f.cleanup(); }
}

await runCase('recovery-different-content-external-mutation', () => recoveryCase('recovery-content', 'external', false));
await runCase('recovery-same-content-different-identity', () => recoveryCase('recovery-identity', 'old', true));

evidence.status = evidence.cases.some((item) => item.status === 'probe_error') ? 'INSUFFICIENT_EVIDENCE'
  : evidence.cases.every((item) => item.status === 'pass') ? 'NEGATIVE_CASES_PASS' : 'DEFECT_REPRODUCED';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.status === 'NEGATIVE_CASES_PASS' ? 0 : 1;
