// Offline adversarial boundary probe of AgentOS Level-2 project-file mutation semantics.
// Reads immutable AgentOS Git bytes and uses only temporary fixtures.
// Execution-produced evidence only; this does not certify physical Windows semantics.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-project-file-boundaries.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');
const modulePath = 'runtime/project-file-writer.mjs';
const exactSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
const checkedOutPath = resolve(repo, modulePath);
if (readFileSync(checkedOutPath, 'utf8') !== exactSource) throw new Error('checked-out module does not match exact Git object');
const module = await import(`${pathToFileURL(checkedOutPath).href}?exact-boundaries=${ref}`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const evidence = {
  schema: 'prs.agentos-project-file-boundary-probe.v1', exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`), module: modulePath,
  module_sha256: sha256(exactSource), captured_at: new Date().toISOString(), cases: [],
  assurance_certified: false, production_promotion_allowed: false, physical_windows_exercised: false,
};

function persistenceHarness() {
  const artifacts = new Map();
  return { artifacts, api: {
    get: async (type, id) => type === 'artifact' ? artifacts.get(id) ?? null : null,
    create: async (type, input) => {
      if (type !== 'artifact') throw new Error('unexpected type');
      if (artifacts.has(input.id)) throw new Error('duplicate');
      artifacts.set(input.id, structuredClone(input));
      return structuredClone(input);
    },
  } };
}
const task = (id) => ({ project_id: 'agentos', mission_id: `mission-${id}`, task_id: `task-${id}`, worker_id: 'prs-boundary-worker' });
async function run(id, fn) {
  try { const result = await fn(); evidence.cases.push({ id, ...result, status: result.pass ? 'pass' : 'defect_reproduced' }); }
  catch (error) { evidence.cases.push({ id, status: 'probe_error', error: error.name, message: error.message }); }
}
async function roots(prefix) {
  const base = await fs.mkdtemp(path.join(tmpdir(), prefix));
  const approved = path.join(base, 'approved');
  const outside = path.join(base, 'outside');
  await fs.mkdir(approved); await fs.mkdir(outside);
  return { base, approved, outside, cleanup: () => fs.rm(base, { recursive: true, force: true }) };
}
function receipt(artifacts) { return [...artifacts.values()].find((a) => a.artifact_kind === 'project.file.write.receipt'); }

await run('explicit-target-outside-approved-root', async () => {
  const f = await roots('prs-boundary-outside-');
  try {
    const p = persistenceHarness();
    const target = path.join(f.outside, 'outside.txt');
    await fs.writeFile(target, 'outside');
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.approved], persistence: p.api });
    let code = null; try { await writer.execute({ task: task('outside'), targetPath: target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('outside')), idempotencyKey: 'outside' }); } catch (e) { code = e.code; }
    return { observed_error: code, outside_preserved: await fs.readFile(target, 'utf8') === 'outside', success_receipt: Boolean(receipt(p.artifacts)), pass: code === 'PROJECT_FILE_TARGET_OUTSIDE_APPROVED_ROOT' && await fs.readFile(target, 'utf8') === 'outside' && !receipt(p.artifacts) };
  } finally { await f.cleanup(); }
});

await run('symlink-inside-approved-root-to-outside-target-fails-closed', async () => {
  const f = await roots('prs-boundary-symlink-');
  try {
    const p = persistenceHarness();
    const outsideTarget = path.join(f.outside, 'outside.txt');
    const link = path.join(f.approved, 'linked.txt');
    await fs.writeFile(outsideTarget, 'outside');
    await fs.symlink(outsideTarget, link);
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.approved], persistence: p.api });
    let code = null; try { await writer.execute({ task: task('symlink'), targetPath: link, content: 'new', expectedPreimageSha256: sha256(Buffer.from('outside')), idempotencyKey: 'symlink' }); } catch (e) { code = e.code; }
    return { observed_error: code, outside_preserved: await fs.readFile(outsideTarget, 'utf8') === 'outside', success_receipt: Boolean(receipt(p.artifacts)), pass: code === 'PROJECT_FILE_TARGET_OUTSIDE_APPROVED_ROOT' && await fs.readFile(outsideTarget, 'utf8') === 'outside' && !receipt(p.artifacts) };
  } finally { await f.cleanup(); }
});

await run('stale-preimage-never-overwrites-current-target', async () => {
  const f = await roots('prs-boundary-stale-');
  try {
    const p = persistenceHarness();
    const target = path.join(f.approved, 'fixture.txt'); await fs.writeFile(target, 'current');
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.approved], persistence: p.api });
    let code = null; try { await writer.execute({ task: task('stale'), targetPath: target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('stale')), idempotencyKey: 'stale' }); } catch (e) { code = e.code; }
    return { observed_error: code, current_preserved: await fs.readFile(target, 'utf8') === 'current', success_receipt: Boolean(receipt(p.artifacts)), pass: code === 'PROJECT_FILE_VERSION_CONFLICT' && await fs.readFile(target, 'utf8') === 'current' && !receipt(p.artifacts) };
  } finally { await f.cleanup(); }
});

await run('same-idempotency-key-different-intent-conflicts', async () => {
  const f = await roots('prs-boundary-idem-');
  try {
    const p = persistenceHarness(); const target = path.join(f.approved, 'fixture.txt');
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.approved], persistence: p.api });
    await writer.execute({ task: task('idem'), targetPath: target, content: 'one', idempotencyKey: 'same-key' });
    let code = null; try { await writer.execute({ task: task('idem'), targetPath: target, content: 'two', expectedPreimageSha256: sha256(Buffer.from('one')), idempotencyKey: 'same-key' }); } catch (e) { code = e.code; }
    return { observed_error: code, first_content_preserved: await fs.readFile(target, 'utf8') === 'one', pass: code === 'PROJECT_FILE_IDEMPOTENCY_CONFLICT' && await fs.readFile(target, 'utf8') === 'one' };
  } finally { await f.cleanup(); }
});

await run('target-already-postimage-without-correlated-receipt-requires-reconciliation', async () => {
  const f = await roots('prs-boundary-reconcile-');
  try {
    const p = persistenceHarness(); const target = path.join(f.approved, 'fixture.txt'); await fs.writeFile(target, 'desired');
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.approved], persistence: p.api });
    let code = null; try { await writer.execute({ task: task('reconcile'), targetPath: target, content: 'desired', expectedPreimageSha256: sha256(Buffer.from('desired')), idempotencyKey: 'reconcile' }); } catch (e) { code = e.code; }
    return { observed_error: code, content_preserved: await fs.readFile(target, 'utf8') === 'desired', success_receipt: Boolean(receipt(p.artifacts)), pass: code === 'PROJECT_FILE_RECONCILIATION_REQUIRED' && await fs.readFile(target, 'utf8') === 'desired' && !receipt(p.artifacts) };
  } finally { await f.cleanup(); }
});

evidence.status = evidence.cases.some((c) => c.status === 'probe_error') ? 'INSUFFICIENT_EVIDENCE' : evidence.cases.every((c) => c.status === 'pass') ? 'NEGATIVE_CASES_PASS' : 'DEFECT_REPRODUCED';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.status === 'NEGATIVE_CASES_PASS' ? 0 : 1;
