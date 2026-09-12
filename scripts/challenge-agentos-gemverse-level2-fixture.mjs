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

const persistence = persistenceHarness();
const writer = await writerModule.createProjectFileWriter({ approvedRoots: [fixtureRoot], persistence: persistence.api });
const task = {
  project_id: 'gemverse',
  mission_id: 'agentos-level2-gemverse-fixture',
  task_id: 'gemverse-level2-fixture-mutation-001',
  worker_id: 'prs-cross-repo-software-probe',
};
const args = {
  task,
  targetPath,
  content: expectedTarget,
  expectedPreimageSha256: sha256(Buffer.from(expectedInitial)),
  idempotencyKey: 'gemverse-level2-fixture-mutation-001',
};

const first = await writer.execute(args);
const afterFirst = await fs.readFile(targetPath, 'utf8');
const second = await writer.execute(args);
const afterReplay = await fs.readFile(targetPath, 'utf8');

const receipt = [...persistence.artifacts.values()].find((artifact) => artifact.artifact_kind === 'project.file.write.receipt');
const prepared = [...persistence.artifacts.values()].find((artifact) => artifact.artifact_kind === 'project.file.write.prepared');
const statusLines = git(gemRepo, 'status', '--short').split('\n').filter(Boolean);
const diff = execFileSync('git', ['-C', gemRepo, 'diff', '--', fixtureRel], { encoding: 'utf8' });
const expectedRemoved = ['-state=INITIAL', '-counter=0'];
const expectedAdded = ['+state=VERIFIED_EDIT', '+counter=1'];
const changedBodyLines = diff.split('\n').filter((line) => (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---'));
const onlyFixtureChanged = statusLines.length === 1 && statusLines[0].endsWith(fixtureRel);
const exactDiff = expectedRemoved.every((line) => changedBodyLines.includes(line)) && expectedAdded.every((line) => changedBodyLines.includes(line)) && changedBodyLines.length === 4;
const counterOccurrences = afterReplay.split('\n').filter((line) => line === 'counter=1').length;

const evidence = {
  schema: 'prs.agentos-gemverse-level2-fixture-probe.v1',
  agentos_exact_head: agentRef,
  agentos_source_tree: git(agentRepo, 'rev-parse', `${agentRef}^{tree}`),
  agentos_writer_sha256: sha256(exactWriterSource),
  gemverse_exact_head: gemRef,
  gemverse_source_tree: git(gemRepo, 'rev-parse', `${gemRef}^{tree}`),
  fixture_path: fixtureRel,
  approved_root: 'fixtures/level2/',
  task,
  idempotency_key: args.idempotencyKey,
  preimage_sha256: sha256(Buffer.from(expectedInitial)),
  expected_postimage_sha256: sha256(Buffer.from(expectedTarget)),
  observed_postimage_sha256: sha256(Buffer.from(afterReplay)),
  receipt_id: receipt?.id ?? null,
  prepared_id: prepared?.id ?? null,
  first_replayed: first?.replayed === true,
  replay_replayed: second?.replayed === true,
  target_matches_after_first: afterFirst === expectedTarget,
  target_matches_after_replay: afterReplay === expectedTarget,
  replay_counter_occurrences: counterOccurrences,
  repository_status: statusLines,
  diff,
  only_authorised_fixture_changed: onlyFixtureChanged,
  exact_two_line_semantic_diff: exactDiff,
  success_receipt_present: Boolean(receipt),
  physical_windows_exercised: false,
  scheduler_or_local_wake_exercised: false,
  production_repository_mutated: false,
  assurance_certified: false,
  production_promotion_allowed: false,
};

evidence.pass = Boolean(receipt)
  && afterFirst === expectedTarget
  && afterReplay === expectedTarget
  && second?.replayed === true
  && counterOccurrences === 1
  && onlyFixtureChanged
  && exactDiff
  && evidence.observed_postimage_sha256 === evidence.expected_postimage_sha256;
evidence.status = evidence.pass ? 'SOFTWARE_FIXTURE_PASS' : 'SOFTWARE_FIXTURE_FAIL';

console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.pass ? 0 : 1;
