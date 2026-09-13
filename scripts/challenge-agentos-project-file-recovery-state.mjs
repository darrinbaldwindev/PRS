// Offline adversarial probe of AgentOS project-file prepared/lock recovery state.
// Uses immutable AgentOS Git bytes and temporary fixtures only.
// Execution-produced evidence only; does not certify physical Windows semantics.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-project-file-recovery-state.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');
const modulePath = 'runtime/project-file-writer.mjs';
const exactSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
const checkedOut = resolve(repo, modulePath);
if (readFileSync(checkedOut, 'utf8') !== exactSource) throw new Error('checked-out module does not match exact Git object');
const module = await import(`${pathToFileURL(checkedOut).href}?exact-recovery-state=${ref}`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

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
  return { project_id: 'agentos', mission_id: `mission-${id}`, task_id: `task-${id}`, worker_id: 'prs-recovery-state-worker' };
}
function preparedArtifact(artifacts) {
  return [...artifacts.values()].find((artifact) => artifact.artifact_kind === 'project.file.write.prepared');
}
function receiptArtifact(artifacts) {
  return [...artifacts.values()].find((artifact) => artifact.artifact_kind === 'project.file.write.receipt');
}
async function fixture(prefix) {
  const root = await fs.mkdtemp(path.join(tmpdir(), prefix));
  const target = path.join(root, 'fixture.txt');
  return { root, target, cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}
async function createPrepared(f, p, id) {
  await fs.writeFile(f.target, 'old');
  const args = {
    task: task(id), targetPath: f.target, content: 'new',
    expectedPreimageSha256: sha256(Buffer.from('old')), idempotencyKey: `idem-${id}`,
  };
  const interrupted = await module.createProjectFileWriter({
    approvedRoots: [f.root], persistence: p.api,
    hooks: { beforePublish: async () => { throw new Error('interrupt-before-publish'); } },
  });
  await interrupted.execute(args).then(() => { throw new Error('expected interruption'); }, () => undefined);
  const prepared = preparedArtifact(p.artifacts);
  if (!prepared) throw new Error('prepared artifact missing');
  return { args, prepared };
}

const evidence = {
  schema: 'prs.agentos-project-file-recovery-state-probe.v1', exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`), module: modulePath,
  module_sha256: sha256(exactSource), captured_at: new Date().toISOString(), cases: [],
  assurance_certified: false, production_promotion_allowed: false, physical_windows_exercised: false,
};
async function run(id, fn) {
  try { const result = await fn(); evidence.cases.push({ id, ...result, status: result.pass ? 'pass' : 'defect_reproduced' }); }
  catch (error) { evidence.cases.push({ id, status: 'probe_error', error: error.name, message: error.message }); }
}

await run('prepared-temp-content-tamper-rejected', async () => {
  const f = await fixture('prs-recovery-temp-content-');
  try {
    const p = persistenceHarness();
    const { args, prepared } = await createPrepared(f, p, 'temp-content');
    await fs.writeFile(prepared.prepared_temp_path, 'tampered');
    const resumed = await module.createProjectFileWriter({ approvedRoots: [f.root], persistence: p.api });
    let code = null; let recoveryRequired = false;
    try { await resumed.execute(args); } catch (error) { code = error.code; recoveryRequired = error.recovery_required === true; }
    return { observed_error: code, recovery_required: recoveryRequired, target_preserved: await fs.readFile(f.target, 'utf8') === 'old', success_receipt: Boolean(receiptArtifact(p.artifacts)), pass: code === 'PROJECT_FILE_RECOVERY_STATE_MISMATCH' && recoveryRequired && await fs.readFile(f.target, 'utf8') === 'old' && !receiptArtifact(p.artifacts) };
  } finally { await f.cleanup(); }
});

await run('prepared-temp-same-content-different-identity-rejected', async () => {
  const f = await fixture('prs-recovery-temp-identity-');
  try {
    const p = persistenceHarness();
    const { args, prepared } = await createPrepared(f, p, 'temp-identity');
    const replacement = path.join(f.root, 'replacement.tmp');
    await fs.writeFile(replacement, 'new');
    await fs.rename(replacement, prepared.prepared_temp_path);
    const resumed = await module.createProjectFileWriter({ approvedRoots: [f.root], persistence: p.api });
    let code = null;
    try { await resumed.execute(args); } catch (error) { code = error.code; }
    return { observed_error: code, target_preserved: await fs.readFile(f.target, 'utf8') === 'old', success_receipt: Boolean(receiptArtifact(p.artifacts)), pass: code === 'PROJECT_FILE_RECOVERY_STATE_MISMATCH' && await fs.readFile(f.target, 'utf8') === 'old' && !receiptArtifact(p.artifacts) };
  } finally { await f.cleanup(); }
});

await run('missing-lock-owner-cannot-be-auto-taken-over', async () => {
  const f = await fixture('prs-lock-owner-missing-');
  try {
    const p = persistenceHarness();
    await fs.writeFile(f.target, 'old');
    const lock = `${f.target}.agentos-write-lock`;
    await fs.mkdir(lock);
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.root], persistence: p.api, reconcileAbandonedLock: async () => ({ status: 'ABANDONED', evidence_id: 'evidence-missing-owner' }) });
    let code = null;
    try { await writer.execute({ task: task('missing-owner'), targetPath: f.target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('old')), idempotencyKey: 'idem-missing-owner' }); } catch (error) { code = error.code; }
    return { observed_error: code, target_preserved: await fs.readFile(f.target, 'utf8') === 'old', lock_still_exists: Boolean(await fs.stat(lock).catch(() => null)), pass: code === 'PROJECT_FILE_LOCK_RECOVERY_REQUIRED' && await fs.readFile(f.target, 'utf8') === 'old' && Boolean(await fs.stat(lock).catch(() => null)) };
  } finally { await f.cleanup(); }
});

await run('corrupt-lock-owner-cannot-be-auto-taken-over', async () => {
  const f = await fixture('prs-lock-owner-corrupt-');
  try {
    const p = persistenceHarness();
    await fs.writeFile(f.target, 'old');
    const lock = `${f.target}.agentos-write-lock`;
    await fs.mkdir(lock); await fs.writeFile(path.join(lock, 'owner.json'), '{not-json');
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.root], persistence: p.api, reconcileAbandonedLock: async () => ({ status: 'ABANDONED', evidence_id: 'evidence-corrupt-owner' }) });
    let code = null;
    try { await writer.execute({ task: task('corrupt-owner'), targetPath: f.target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('old')), idempotencyKey: 'idem-corrupt-owner' }); } catch (error) { code = error.code; }
    return { observed_error: code, target_preserved: await fs.readFile(f.target, 'utf8') === 'old', pass: code === 'PROJECT_FILE_LOCK_RECOVERY_REQUIRED' && await fs.readFile(f.target, 'utf8') === 'old' };
  } finally { await f.cleanup(); }
});

await run('foreign-live-lock-decision-prevents-takeover', async () => {
  const f = await fixture('prs-lock-live-');
  try {
    const p = persistenceHarness();
    await fs.writeFile(f.target, 'old');
    const lock = `${f.target}.agentos-write-lock`;
    await fs.mkdir(lock);
    await fs.writeFile(path.join(lock, 'owner.json'), JSON.stringify({ lock_id: 'foreign-lock', pid: process.pid + 100000, worker_id: 'foreign-worker', intent_hash: 'foreign-intent' }));
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.root], persistence: p.api, reconcileAbandonedLock: async () => ({ status: 'LIVE', evidence_id: 'evidence-live' }) });
    let code = null; let retryable = false;
    try { await writer.execute({ task: task('foreign-live'), targetPath: f.target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('old')), idempotencyKey: 'idem-foreign-live' }); } catch (error) { code = error.code; retryable = error.retryable === true; }
    return { observed_error: code, retryable, target_preserved: await fs.readFile(f.target, 'utf8') === 'old', pass: code === 'PROJECT_FILE_LIVE_CONTENTION' && retryable && await fs.readFile(f.target, 'utf8') === 'old' };
  } finally { await f.cleanup(); }
});

await run('lock-owner-change-during-abandoned-decision-prevents-takeover', async () => {
  const f = await fixture('prs-lock-owner-race-');
  try {
    const p = persistenceHarness();
    await fs.writeFile(f.target, 'old');
    const lock = `${f.target}.agentos-write-lock`;
    const ownerPath = path.join(lock, 'owner.json');
    await fs.mkdir(lock);
    await fs.writeFile(ownerPath, JSON.stringify({ lock_id: 'old-lock', pid: process.pid + 100000, worker_id: 'old-worker', intent_hash: 'old-intent' }));
    const writer = await module.createProjectFileWriter({
      approvedRoots: [f.root], persistence: p.api,
      reconcileAbandonedLock: async () => {
        await fs.writeFile(ownerPath, JSON.stringify({ lock_id: 'new-lock', pid: process.pid + 100001, worker_id: 'new-worker', intent_hash: 'new-intent' }));
        return { status: 'ABANDONED', evidence_id: 'evidence-old-lock' };
      },
    });
    let code = null;
    try { await writer.execute({ task: task('owner-race'), targetPath: f.target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('old')), idempotencyKey: 'idem-owner-race' }); } catch (error) { code = error.code; }
    const owner = JSON.parse(await fs.readFile(ownerPath, 'utf8'));
    return { observed_error: code, surviving_lock_id: owner.lock_id, target_preserved: await fs.readFile(f.target, 'utf8') === 'old', pass: code === 'PROJECT_FILE_LOCK_RECOVERY_REQUIRED' && owner.lock_id === 'new-lock' && await fs.readFile(f.target, 'utf8') === 'old' };
  } finally { await f.cleanup(); }
});

evidence.status = evidence.cases.some((c) => c.status === 'probe_error') ? 'INSUFFICIENT_EVIDENCE' : evidence.cases.every((c) => c.status === 'pass') ? 'NEGATIVE_CASES_PASS' : 'DEFECT_REPRODUCED';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.status === 'NEGATIVE_CASES_PASS' ? 0 : 1;
