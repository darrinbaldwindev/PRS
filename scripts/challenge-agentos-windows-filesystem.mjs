// Hosted-Windows-only adversarial probe for exact AgentOS project-file writer.
// Exercises NTFS junction containment and open-handle publish behavior using
// temporary files only. It is assurance evidence, not owner-laptop acceptance.
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (process.platform !== 'win32') throw new Error('WINDOWS_HOST_REQUIRED');
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-windows-filesystem.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');
const modulePath = 'runtime/project-file-writer.mjs';
const exactSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
const checkedOutPath = resolve(repo, modulePath);
const checkoutSource = readFileSync(checkedOutPath, 'utf8');
const exactBytes = checkoutSource === exactSource;
const eolTranslationOnly = !exactBytes && checkoutSource.replaceAll('\r\n', '\n') === exactSource;
if (!exactBytes && !eolTranslationOnly) throw new Error('checked-out module does not match exact Git object');
const module = await import(`${pathToFileURL(checkedOutPath).href}?windows-fs=${ref}`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function persistenceHarness() {
  const artifacts = new Map();
  return { artifacts, api: {
    get: async (type, id) => type === 'artifact' ? artifacts.get(id) ?? null : null,
    create: async (type, input) => {
      if (type !== 'artifact') throw new Error('unexpected type');
      if (artifacts.has(input.id)) throw new Error('duplicate artifact');
      artifacts.set(input.id, structuredClone(input));
      return structuredClone(input);
    },
  } };
}
function receipt(artifacts) { return [...artifacts.values()].find((a) => a.artifact_kind === 'project.file.write.receipt') ?? null; }
function task(id) { return { project_id: 'agentos', mission_id: `windows-fs-${id}`, task_id: `windows-fs-${id}`, worker_id: 'prs-windows-filesystem-probe' }; }
async function tempRoots(prefix) {
  const base = await fs.mkdtemp(path.join(tmpdir(), prefix));
  const approved = path.join(base, 'approved');
  const outside = path.join(base, 'outside');
  await fs.mkdir(approved); await fs.mkdir(outside);
  return { base, approved, outside, cleanup: () => fs.rm(base, { recursive: true, force: true }) };
}

const cases = [];
async function runCase(id, fn) {
  try { const result = await fn(); cases.push({ id, ...result, status: result.pass ? 'pass' : 'fail' }); }
  catch (error) { cases.push({ id, pass: false, status: 'probe_error', error: error.name, code: error.code ?? null, message: error.message }); }
}

await runCase('ntfs-junction-inside-approved-root-to-outside-fails-closed', async () => {
  const f = await tempRoots('prs-win-junction-');
  try {
    const outsideTarget = path.join(f.outside, 'outside.txt');
    await fs.writeFile(outsideTarget, 'outside', 'utf8');
    const junction = path.join(f.approved, 'escape');
    execFileSync('cmd.exe', ['/d', '/s', '/c', `mklink /J "${junction}" "${f.outside}"`], { encoding: 'utf8' });
    const targetThroughJunction = path.join(junction, 'outside.txt');
    const persistence = persistenceHarness();
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.approved], persistence: persistence.api });
    let observedError = null;
    try {
      await writer.execute({ task: task('junction'), targetPath: targetThroughJunction, content: 'mutated', expectedPreimageSha256: sha256(Buffer.from('outside')), idempotencyKey: 'windows-junction-escape' });
    } catch (error) { observedError = error.code ?? error.message; }
    const preserved = await fs.readFile(outsideTarget, 'utf8') === 'outside';
    return {
      observed_error: observedError,
      outside_preserved: preserved,
      success_receipt: Boolean(receipt(persistence.artifacts)),
      pass: observedError === 'PROJECT_FILE_TARGET_OUTSIDE_APPROVED_ROOT' && preserved && !receipt(persistence.artifacts),
    };
  } finally { await f.cleanup(); }
});

await runCase('open-target-handle-never-produces-unsafe-success', async () => {
  const f = await tempRoots('prs-win-open-handle-');
  try {
    const target = path.join(f.approved, 'fixture.txt');
    await fs.writeFile(target, 'old', 'utf8');
    const persistence = persistenceHarness();
    const writer = await module.createProjectFileWriter({ approvedRoots: [f.approved], persistence: persistence.api });
    const held = await fs.open(target, 'r');
    let result = null;
    let observedError = null;
    try {
      result = await writer.execute({ task: task('open-handle'), targetPath: target, content: 'new', expectedPreimageSha256: sha256(Buffer.from('old')), idempotencyKey: `windows-open-handle-${randomUUID()}` });
    } catch (error) { observedError = error.code ?? error.message; }
    finally { await held.close(); }
    const final = await fs.readFile(target, 'utf8');
    const successReceipt = receipt(persistence.artifacts);
    const safeSuccess = result?.success === true && final === 'new' && Boolean(successReceipt);
    const safeFailure = !result && final === 'old' && !successReceipt;
    return {
      observed_error: observedError,
      writer_success: result?.success === true,
      final_content: final,
      success_receipt: Boolean(successReceipt),
      behavior: safeSuccess ? 'OPEN_HANDLE_PUBLISH_SUPPORTED' : safeFailure ? 'OPEN_HANDLE_FAIL_CLOSED' : 'UNSAFE_OR_INCONSISTENT',
      pass: safeSuccess || safeFailure,
    };
  } finally { await f.cleanup(); }
});

const evidence = {
  schema: 'prs.agentos-windows-filesystem-probe.v1',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  module: modulePath,
  module_sha256: sha256(exactSource),
  module_checkout_exact_bytes: exactBytes,
  module_checkout_eol_translation_only: eolTranslationOnly,
  platform: process.platform,
  cases,
  hosted_windows_runner_exercised: true,
  owner_windows_laptop_exercised: false,
  production_repository_mutated: false,
  assurance_certified: false,
  production_promotion_allowed: false,
};
evidence.pass = cases.length === 2 && cases.every((item) => item.pass === true);
evidence.status = evidence.pass ? 'HOSTED_WINDOWS_FILESYSTEM_NEGATIVE_CASES_PASS' : 'HOSTED_WINDOWS_FILESYSTEM_DEFECT_OR_INSUFFICIENT_EVIDENCE';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.pass ? 0 : 1;
