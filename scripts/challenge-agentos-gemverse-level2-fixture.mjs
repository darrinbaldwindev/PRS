// Cross-repo software acceptance probe for the bounded GemVerse Level-2 fixture.
// Mutates only an ephemeral GitHub Actions checkout; no production repository write.
// This proves the exact AgentOS project-file writer can satisfy the fixture contract
// at the software primitive level. It does NOT prove scheduler/local-wake pickup,
// physical Windows/NTFS behavior, or overall AgentOS Level 2 completion.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path, { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [agentRepoArg, agentRef, gemRepoArg, gemRef] = process.argv.slice(2);
if (!agentRepoArg || !gemRepoArg || !/^[a-f0-9]{40}$/.test(agentRef ?? '') || !/^[a-f0-9]{40}$/.test(gemRef ?? '')) {
  throw new Error('usage: node scripts/challenge-agentos-gemverse-level2-fixture.mjs AGENTOS_REPO AGENTOS_SHA GEMVERSE_REPO GEMVERSE_SHA');
}

const agentRepo = resolve(agentRepoArg);
const gemRepo = resolve(gemRepoArg);
const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git(agentRepo, 'rev-parse', `${agentRef}^{commit}`) !== agentRef) throw new Error('exact AgentOS commit required');
if (git(gemRepo, 'rev-parse', `${gemRef}^{commit}`) !== gemRef) throw new Error('exact GemVerse commit required');

const writerPath = 'runtime/project-file-writer.mjs';
const exactWriterSource = execFileSync('git', ['-C', agentRepo, 'show', `${agentRef}:${writerPath}`], { encoding: 'utf8' });
const checkedOutWriter = resolve(agentRepo, writerPath);
if (readFileSync(checkedOutWriter, 'utf8') !== exactWriterSource) throw new Error('checked-out AgentOS writer does not match exact Git object');
const writerModule = await import(`${pathToFileURL(checkedOutWriter).href}?gemverse-fixture=${agentRef}`);

const fixtureRel = 'fixtures/level2/gemverse-worker-acceptance.txt';
const fixtureRoot = resolve(gemRepo, 'fixtures/level2');
const targetPath = resolve(gemRepo, fixtureRel);
const expectedInitial = 'mission=agentos-level2\nproject=gemverse\nstate=INITIAL\ncounter=0\nnote=non-production-fixture\n';
const expectedTarget = 'mission=agentos-level2\nproject=gemverse\nstate=VERIFIED_EDIT\ncounter=1\nnote=non-production-fixture\n';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const expectedPreimageSha256 = sha256(Buffer.from(expectedInitial));
const expectedPostimageSha256 = sha256(Buffer.from(expectedTarget));

const exactFixture = execFileSync('git', ['-C', gemRepo, 'show', `${gemRef}:${fixtureRel}`], { encoding: 'utf8' });
if (exactFixture !== expectedInitial) throw new Error('GemVerse exact fixture does not match authorised initial content');
if (readFileSync(targetPath, 'utf8') !== exactFixture) throw new Error('checked-out GemVerse fixture does not match exact Git object');

function persistenceHarness() {
  const artifacts = new Map();
  return {
    artifacts,
    api: {
      get: async (type, id) => type === 'artifact' ? artifacts.get(id) ?? null : null,
      create: async (type, input) => {
        if (type !== 'artifact') throw new Error('unexpected persistence type');
        if (artifacts.has(input.id)) throw new Error('duplicate artifact');
        artifacts.set(input.id, structuredClone(input));
        return structuredClone(input);
      },
    },
  };
}

function findArtifact(artifacts, kind) {
  return [...artifacts.values()].find((artifact) => artifact.artifact_kind === kind) ?? null;
}
function artifactsOfKind(artifacts, kind) {
  return [...artifacts.values()].filter((artifact) => artifact.artifact_kind === kind);
}
function fixtureTask(suffix, worker = 'prs-cross-repo-software-probe') {
  return {
    project_id: 'gemverse',
    mission_id: 'agentos-level2-gemverse-fixture',
    task_id: `gemverse-level2-fixture-${suffix}`,
    worker_id: worker,
  };
}
function fixtureArgs(suffix, worker) {
  return {
    task: fixtureTask(suffix, worker),
    targetPath,
    content: expectedTarget,
    expectedPreimageSha256,
    idempotencyKey: `gemverse-level2-fixture-${suffix}`,
  };
}
async function resetFixture() {
  await fs.writeFile(targetPath, expectedInitial);
  await fs.rm(`${targetPath}.agentos-write-lock`, { recursive: true, force: true });
  const entries = await fs.readdir(path.dirname(targetPath));
  const prefix = `.${path.basename(targetPath)}.agentos-`;
  await Promise.all(entries.filter((name) => name.startsWith(prefix) && name.endsWith('.tmp')).map((name) => fs.rm(path.join(path.dirname(targetPath), name), { force: true })));
}
function currentDiffEvidence() {
  const statusLines = git(gemRepo, 'status', '--short').split('\n').filter(Boolean);
  const diff = execFileSync('git', ['-C', gemRepo, 'diff', '--', fixtureRel], { encoding: 'utf8' });
  const changedBodyLines = diff.split('\n').filter((line) => (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---'));
  const expectedRemoved = ['-state=INITIAL', '-counter=0'];
  const expectedAdded = ['+state=VERIFIED_EDIT', '+counter=1'];
  return {
    statusLines,
    diff,
    onlyFixtureChanged: statusLines.length === 1 && statusLines[0].endsWith(fixtureRel),
    exactDiff: expectedRemoved.every((line) => changedBodyLines.includes(line)) && expectedAdded.every((line) => changedBodyLines.includes(line)) && changedBodyLines.length === 4,
  };
}

const cases = [];
async function runCase(id, fn) {
  try {
    const result = await fn();
    cases.push({ id, ...result, status: result.pass ? 'pass' : 'fail' });
  } catch (error) {
    cases.push({ id, pass: false, status: 'probe_error', error: error.name, message: error.message });
  }
}

// Case 1: exact bounded mutation + deterministic replay.
await runCase('bounded-mutation-and-replay', async () => {
  await resetFixture();
  const persistence = persistenceHarness();
  const writer = await writerModule.createProjectFileWriter({ approvedRoots: [fixtureRoot], persistence: persistence.api });
  const args = fixtureArgs('mutation-001');
  const first = await writer.execute(args);
  const afterFirst = await fs.readFile(targetPath, 'utf8');
  const second = await writer.execute(args);
  const afterReplay = await fs.readFile(targetPath, 'utf8');
  const receipt = findArtifact(persistence.artifacts, 'project.file.write.receipt');
  const prepared = findArtifact(persistence.artifacts, 'project.file.write.prepared');
  const diffEvidence = currentDiffEvidence();
  const counterOccurrences = afterReplay.split('\n').filter((line) => line === 'counter=1').length;
  const pass = Boolean(receipt)
    && afterFirst === expectedTarget
    && afterReplay === expectedTarget
    && first?.replayed !== true
    && second?.replayed === true
    && counterOccurrences === 1
    && diffEvidence.onlyFixtureChanged
    && diffEvidence.exactDiff
    && sha256(Buffer.from(afterReplay)) === expectedPostimageSha256;
  return {
    receipt_id: receipt?.id ?? null,
    prepared_id: prepared?.id ?? null,
    first_replayed: first?.replayed === true,
    replay_replayed: second?.replayed === true,
    replay_counter_occurrences: counterOccurrences,
    observed_postimage_sha256: sha256(Buffer.from(afterReplay)),
    repository_status: diffEvidence.statusLines,
    diff: diffEvidence.diff,
    only_authorised_fixture_changed: diffEvidence.onlyFixtureChanged,
    exact_two_line_semantic_diff: diffEvidence.exactDiff,
    pass,
  };
});

// Case 2: injected interruption before publish, then explicit governed RESUME.
await runCase('interruption-recovery-and-replay', async () => {
  await resetFixture();
  const persistence = persistenceHarness();
  const args = fixtureArgs('recovery-001', 'prs-cross-repo-recovery-probe');
  const interrupted = await writerModule.createProjectFileWriter({
    approvedRoots: [fixtureRoot],
    persistence: persistence.api,
    hooks: { beforePublish: async () => { throw new Error('injected-fixture-interruption-before-publish'); } },
  });
  let interruptionObserved = false;
  try { await interrupted.execute(args); }
  catch (error) { interruptionObserved = error.message === 'injected-fixture-interruption-before-publish'; }
  const afterInterruption = await fs.readFile(targetPath, 'utf8');
  const prepared = findArtifact(persistence.artifacts, 'project.file.write.prepared');
  const receiptBeforeRecovery = findArtifact(persistence.artifacts, 'project.file.write.receipt');

  const recoveredWriter = await writerModule.createProjectFileWriter({
    approvedRoots: [fixtureRoot],
    persistence: persistence.api,
    reconcilePreparedWrite: async ({ prepared: observedPrepared, current, target, intent }) => ({
      status: 'RESUME',
      evidence_id: 'gemverse-level2-recovery-decision-001',
      prepared_id: observedPrepared.id,
      current_hash: current.hash,
      target,
      intent_hash: sha256(JSON.stringify(intent)),
    }),
  });
  const recovered = await recoveredWriter.execute(args);
  const afterRecovery = await fs.readFile(targetPath, 'utf8');
  const replay = await recoveredWriter.execute(args);
  const afterReplay = await fs.readFile(targetPath, 'utf8');
  const receipt = findArtifact(persistence.artifacts, 'project.file.write.receipt');
  const diffEvidence = currentDiffEvidence();
  const counterOccurrences = afterReplay.split('\n').filter((line) => line === 'counter=1').length;
  const pass = interruptionObserved
    && afterInterruption === expectedInitial
    && Boolean(prepared)
    && !receiptBeforeRecovery
    && recovered?.recovered === true
    && recovered?.replayed === true
    && receipt?.recovery_evidence_id === 'gemverse-level2-recovery-decision-001'
    && afterRecovery === expectedTarget
    && replay?.replayed === true
    && afterReplay === expectedTarget
    && counterOccurrences === 1
    && diffEvidence.onlyFixtureChanged
    && diffEvidence.exactDiff;
  return {
    interruption_observed: interruptionObserved,
    complete_initial_state_after_interruption: afterInterruption === expectedInitial,
    prepared_id: prepared?.id ?? null,
    receipt_before_recovery: Boolean(receiptBeforeRecovery),
    recovered: recovered?.recovered === true,
    recovery_replayed: recovered?.replayed === true,
    recovery_evidence_id: receipt?.recovery_evidence_id ?? null,
    replay_replayed: replay?.replayed === true,
    replay_counter_occurrences: counterOccurrences,
    target_matches_after_recovery: afterRecovery === expectedTarget,
    only_authorised_fixture_changed: diffEvidence.onlyFixtureChanged,
    exact_two_line_semantic_diff: diffEvidence.exactDiff,
    pass,
  };
});

// Case 3: two writers contend for the same fixture. The second must not publish
// while the first owns the canonical per-target lock; unsafe last-writer-wins is forbidden.
await runCase('concurrent-writers-conflict-without-last-writer-wins', async () => {
  await resetFixture();
  const persistence = persistenceHarness();
  let releaseFirst;
  let signalFirstLocked;
  const firstMayFinish = new Promise((resolvePromise) => { releaseFirst = resolvePromise; });
  const firstLocked = new Promise((resolvePromise) => { signalFirstLocked = resolvePromise; });
  const writerOne = await writerModule.createProjectFileWriter({
    approvedRoots: [fixtureRoot],
    persistence: persistence.api,
    hooks: {
      afterLockAcquired: async () => {
        signalFirstLocked();
        await firstMayFinish;
      },
    },
  });
  const writerTwo = await writerModule.createProjectFileWriter({ approvedRoots: [fixtureRoot], persistence: persistence.api });
  const argsOne = fixtureArgs('concurrency-001-a', 'prs-cross-repo-concurrency-a');
  const argsTwo = fixtureArgs('concurrency-001-b', 'prs-cross-repo-concurrency-b');
  const firstPromise = writerOne.execute(argsOne);
  await firstLocked;
  let secondError = null;
  let secondRetryable = false;
  try { await writerTwo.execute(argsTwo); }
  catch (error) { secondError = error.code; secondRetryable = error.retryable === true; }
  const duringContention = await fs.readFile(targetPath, 'utf8');
  releaseFirst();
  const first = await firstPromise;
  const finalContent = await fs.readFile(targetPath, 'utf8');
  const receipts = artifactsOfKind(persistence.artifacts, 'project.file.write.receipt');
  const diffEvidence = currentDiffEvidence();
  const counterOccurrences = finalContent.split('\n').filter((line) => line === 'counter=1').length;
  const pass = secondError === 'PROJECT_FILE_LIVE_CONTENTION'
    && secondRetryable
    && duringContention === expectedInitial
    && first?.success === true
    && finalContent === expectedTarget
    && receipts.length === 1
    && counterOccurrences === 1
    && diffEvidence.onlyFixtureChanged
    && diffEvidence.exactDiff;
  return {
    second_error: secondError,
    second_retryable: secondRetryable,
    target_remained_initial_while_first_lock_held: duringContention === expectedInitial,
    first_writer_success: first?.success === true,
    successful_receipt_count: receipts.length,
    replay_counter_occurrences: counterOccurrences,
    target_matches_final: finalContent === expectedTarget,
    only_authorised_fixture_changed: diffEvidence.onlyFixtureChanged,
    exact_two_line_semantic_diff: diffEvidence.exactDiff,
    pass,
  };
});

const finalContent = await fs.readFile(targetPath, 'utf8');
const evidence = {
  schema: 'prs.agentos-gemverse-level2-fixture-probe.v2',
  agentos_exact_head: agentRef,
  agentos_source_tree: git(agentRepo, 'rev-parse', `${agentRef}^{tree}`),
  agentos_writer_sha256: sha256(exactWriterSource),
  gemverse_exact_head: gemRef,
  gemverse_source_tree: git(gemRepo, 'rev-parse', `${gemRef}^{tree}`),
  fixture_path: fixtureRel,
  approved_root: 'fixtures/level2/',
  preimage_sha256: expectedPreimageSha256,
  expected_postimage_sha256: expectedPostimageSha256,
  observed_final_postimage_sha256: sha256(Buffer.from(finalContent)),
  cases,
  physical_windows_exercised: false,
  scheduler_or_local_wake_exercised: false,
  production_repository_mutated: false,
  assurance_certified: false,
  production_promotion_allowed: false,
};
evidence.pass = cases.length === 3 && cases.every((item) => item.pass === true) && finalContent === expectedTarget;
evidence.status = evidence.pass ? 'SOFTWARE_FIXTURE_RECOVERY_CONCURRENCY_PASS' : 'SOFTWARE_FIXTURE_FAIL';

console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.pass ? 0 : 1;
