// Hosted-Windows-only adversarial probe for exact AgentOS Level-2 process boundaries.
// Exercises separate-process project-file contention and PowerShell timeout child-tree cleanup
// using temporary files/processes only. Assurance evidence only; not owner-laptop acceptance.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function waitForFile(file, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(file)) return;
    await sleep(50);
  }
  throw new Error(`TIMEOUT_WAITING_FOR_FILE:${file}`);
}

async function waitForProcessExit(pid, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processAlive(pid)) return true;
    await sleep(100);
  }
  return !processAlive(pid);
}

async function removeTreeEventually(dir, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  let lastCode = null;
  while (Date.now() < deadline) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      return { removed: true, last_error_code: null };
    } catch (error) {
      lastCode = error.code ?? error.message;
      await sleep(150);
    }
  }
  return { removed: false, last_error_code: lastCode };
}

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

function task(id, worker = 'prs-windows-process-probe') {
  return { project_id: 'agentos', mission_id: `windows-process-${id}`, task_id: `windows-process-${id}`, worker_id: worker };
}

async function loadExactModule(repo, ref, modulePath, query) {
  const exactSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
  const checkedOutPath = resolve(repo, modulePath);
  const checkoutSource = readFileSync(checkedOutPath, 'utf8');
  const exactBytes = checkoutSource === exactSource;
  const eolTranslationOnly = !exactBytes && checkoutSource.replaceAll('\r\n', '\n') === exactSource;
  if (!exactBytes && !eolTranslationOnly) throw new Error(`checked-out ${modulePath} does not match exact Git object`);
  const module = await import(`${pathToFileURL(checkedOutPath).href}?${query}=${ref}-${Date.now()}`);
  return { module, exactSource, exactBytes, eolTranslationOnly, checkedOutPath };
}

if (process.argv[2] === '--writer-child') {
  const [repoArg, ref, approvedRoot, target, readyFile, releaseFile] = process.argv.slice(3);
  const repo = resolve(repoArg);
  const { module } = await loadExactModule(repo, ref, 'runtime/project-file-writer.mjs', 'separate-process-child');
  const persistence = persistenceHarness();
  const writer = await module.createProjectFileWriter({
    approvedRoots: [approvedRoot],
    persistence: persistence.api,
    hooks: {
      afterLockAcquired: async () => {
        await fs.writeFile(readyFile, String(process.pid), 'utf8');
        await waitForFile(releaseFile, 20_000);
      },
    },
  });
  try {
    const result = await writer.execute({
      task: task('holder', `holder-${process.pid}`),
      targetPath: target,
      content: 'new',
      expectedPreimageSha256: sha256(Buffer.from('old')),
      idempotencyKey: 'separate-process-holder',
    });
    process.stdout.write(`${JSON.stringify({ ok: true, result })}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, code: error.code ?? null, message: error.message })}\n`);
    process.exitCode = 1;
  }
  process.exit();
}

const [repoArg, ref] = process.argv.slice(2);
if (process.platform !== 'win32') throw new Error('WINDOWS_HOST_REQUIRED');
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-windows-process-boundaries.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');

const writerLoaded = await loadExactModule(repo, ref, 'runtime/project-file-writer.mjs', 'separate-process-main');
const psLoaded = await loadExactModule(repo, ref, 'runtime/windows-powershell-adapter.mjs', 'process-tree-main');

const cases = [];
async function runCase(id, fn) {
  try { const result = await fn(); cases.push({ id, ...result, status: result.pass ? 'pass' : 'defect_reproduced' }); }
  catch (error) { cases.push({ id, pass: false, status: 'probe_error', error: error.name, code: error.code ?? null, message: error.message }); }
}

await runCase('separate-process-same-target-contention-never-takes-over-live-owner', async () => {
  const base = await fs.mkdtemp(path.join(tmpdir(), 'prs-win-separate-process-'));
  const approved = path.join(base, 'approved');
  const target = path.join(approved, 'fixture.txt');
  const ready = path.join(base, 'holder.ready');
  const release = path.join(base, 'holder.release');
  await fs.mkdir(approved);
  await fs.writeFile(target, 'old', 'utf8');
  let holder;
  try {
    holder = spawn(process.execPath, [resolve(process.argv[1]), '--writer-child', repo, ref, approved, target, ready, release], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let holderStdout = '';
    let holderStderr = '';
    holder.stdout.on('data', (d) => { holderStdout += String(d); });
    holder.stderr.on('data', (d) => { holderStderr += String(d); });
    await waitForFile(ready, 10_000);
    const holderPid = Number.parseInt(await fs.readFile(ready, 'utf8'), 10);
    const persistence = persistenceHarness();
    let reconcileCalls = 0;
    const contender = await writerLoaded.module.createProjectFileWriter({
      approvedRoots: [approved],
      persistence: persistence.api,
      reconcileAbandonedLock: async ({ owner }) => {
        reconcileCalls += 1;
        return { status: processAlive(Number(owner?.pid)) ? 'LIVE' : 'UNKNOWN' };
      },
    });
    let contenderError = null;
    try {
      await contender.execute({
        task: task('contender'),
        targetPath: target,
        content: 'other',
        expectedPreimageSha256: sha256(Buffer.from('old')),
        idempotencyKey: 'separate-process-contender',
      });
    } catch (error) { contenderError = error.code ?? error.message; }
    const beforeRelease = await fs.readFile(target, 'utf8');
    await fs.writeFile(release, 'go', 'utf8');
    const holderExit = await new Promise((resolveExit) => holder.once('exit', (code, signal) => resolveExit({ code, signal })));
    const final = await fs.readFile(target, 'utf8');
    const successReceipt = [...persistence.artifacts.values()].some((a) => a.artifact_kind === 'project.file.write.receipt');
    return {
      holder_pid: holderPid,
      holder_was_alive_during_contention: true,
      reconcile_calls: reconcileCalls,
      contender_error: contenderError,
      target_preserved_while_lock_held: beforeRelease === 'old',
      contender_success_receipt: successReceipt,
      holder_exit: holderExit,
      holder_stdout: holderStdout.trim(),
      holder_stderr: holderStderr.trim(),
      final_content: final,
      pass: contenderError === 'PROJECT_FILE_LIVE_CONTENTION' && reconcileCalls === 1 && beforeRelease === 'old' && !successReceipt && holderExit.code === 0 && final === 'new',
    };
  } finally {
    if (holder && processAlive(holder.pid)) {
      try { execFileSync('taskkill.exe', ['/PID', String(holder.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {}
    }
    await removeTreeEventually(base);
  }
});

await runCase('powershell-timeout-terminates-descendant-process-tree', async () => {
  const base = await fs.mkdtemp(path.join(tmpdir(), 'prs-win-powershell-tree-'));
  const pidFile = path.join(base, 'descendant.pid');
  let descendantPid = null;
  const spawner = `import { spawn } from 'node:child_process';\nimport { writeFileSync } from 'node:fs';\nconst child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 300000)'], { detached: true, stdio: 'ignore', windowsHide: true });\nwriteFileSync(${JSON.stringify(pidFile)}, String(child.pid));\nchild.unref();\nsetTimeout(() => {}, 300000);\n`;
  await fs.writeFile(path.join(base, 'spawn-descendant.mjs'), spawner, 'utf8');
  await fs.writeFile(path.join(base, 'package.json'), JSON.stringify({ private: true, scripts: { test: 'node spawn-descendant.mjs' } }), 'utf8');
  const adapter = psLoaded.module.createWindowsPowerShellAdapter({ allowedRoots: [base], timeoutMs: 5000, maxBuffer: 1_048_576 });
  const result = await adapter.execute({ operation: 'test.run', cwd: base });
  await waitForFile(pidFile, 5_000);
  descendantPid = Number.parseInt(await fs.readFile(pidFile, 'utf8'), 10);
  await sleep(700);
  const descendantAliveAfterAdapterReturn = processAlive(descendantPid);
  let cleanupAttempted = false;
  let descendantExitedAfterCleanup = !descendantAliveAfterAdapterReturn;
  if (descendantAliveAfterAdapterReturn) {
    cleanupAttempted = true;
    try { execFileSync('taskkill.exe', ['/PID', String(descendantPid), '/T', '/F'], { stdio: 'ignore' }); } catch {}
    descendantExitedAfterCleanup = await waitForProcessExit(descendantPid, 5_000);
  }
  const cleanup = await removeTreeEventually(base, 5_000);
  return {
    adapter_success: result.success,
    adapter_timed_out: result.timed_out,
    adapter_exit_code: result.exit_code,
    descendant_pid: descendantPid,
    descendant_alive_after_adapter_return: descendantAliveAfterAdapterReturn,
    cleanup_attempted: cleanupAttempted,
    descendant_exited_after_cleanup: descendantExitedAfterCleanup,
    temp_tree_removed_after_cleanup: cleanup.removed,
    temp_tree_cleanup_error: cleanup.last_error_code,
    pass: result.success === false && result.timed_out === true && descendantAliveAfterAdapterReturn === false,
  };
});

const evidence = {
  schema: 'prs.agentos-windows-process-boundary-probe.v2',
  exact_head: ref,
  source_tree: git('rev-parse', `${ref}^{tree}`),
  writer_sha256: sha256(writerLoaded.exactSource),
  powershell_adapter_sha256: sha256(psLoaded.exactSource),
  writer_checkout_eol_translation_only: writerLoaded.eolTranslationOnly,
  powershell_checkout_eol_translation_only: psLoaded.eolTranslationOnly,
  platform: process.platform,
  cases,
  hosted_windows_runner_exercised: true,
  owner_windows_laptop_exercised: false,
  scheduler_or_local_wake_exercised: false,
  production_repository_mutated: false,
  assurance_certified: false,
  production_promotion_allowed: false,
};
evidence.pass = cases.length === 2 && cases.every((item) => item.pass === true);
evidence.status = evidence.pass ? 'HOSTED_WINDOWS_PROCESS_BOUNDARIES_PASS' : 'HOSTED_WINDOWS_PROCESS_DEFECT_OR_INSUFFICIENT_EVIDENCE';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.pass ? 0 : 1;
