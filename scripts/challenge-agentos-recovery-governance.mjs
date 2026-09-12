// Offline adversarial probe of AgentOS project-file recovery governance.
// Reads immutable AgentOS Git bytes and in-memory artifacts only.
// Execution-produced evidence only; does not grant or certify recovery authority.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-recovery-governance.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');
const modulePath = 'runtime/project-file-recovery-governance.mjs';
const exactSource = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
const checkedOut = resolve(repo, modulePath);
if (readFileSync(checkedOut, 'utf8') !== exactSource) throw new Error('checked-out module does not match exact Git object');
const module = await import(`${pathToFileURL(checkedOut).href}?exact-recovery-governance=${ref}`);

const NOW = Date.parse('2026-09-12T08:00:00.000Z');
const intent = Object.freeze({ project_id:'agentos', mission_id:'mission-rg', task_id:'task-rg', worker_id:'worker-rg', path:'/fixture/target.txt' });
const intentHash = 'intent-hash-rg';
const keyHash = 'key-hash-rg';

function harness(records=[]) {
  const artifacts = new Map(records.map((r)=>[r.id, structuredClone(r)]));
  return { api: { get: async (type,id)=> type==='artifact' ? artifacts.get(id) ?? null : null } };
}
function authority(overrides={}) {
  return { id:'authority-1', artifact_kind:'approval.receipt', disposition:'ALLOW_RECOVERY', project_id:intent.project_id, mission_id:intent.mission_id, task_id:intent.task_id, worker_id:intent.worker_id, target_path:intent.path, intent_hash:intentHash, recovery_decision_id:'decision-1', ...overrides };
}
function decision(overrides={}) {
  return { id:'decision-1', artifact_kind:'project.file.write.recovery-decision', status:'RESUME', decision_kind:'PREPARED_WRITE', issued_at:'2026-09-12T07:59:00.000Z', expires_at:'2026-09-12T08:05:00.000Z', authority_artifact_id:'authority-1', project_id:intent.project_id, mission_id:intent.mission_id, task_id:intent.task_id, worker_id:intent.worker_id, target_path:intent.path, intent_hash:intentHash, idempotency_key_sha256:keyHash, prepared_id:'prepared-1', ...overrides };
}
const expected = { status:'RESUME', kind:'PREPARED_WRITE', intent, intentHash, idempotencyKeySha256:keyHash, preparedId:'prepared-1' };
const evidence = { schema:'prs.agentos-recovery-governance-probe.v1', exact_head:ref, source_tree:git('rev-parse',`${ref}^{tree}`), module:modulePath, module_sha256:createHash('sha256').update(exactSource).digest('hex'), captured_at:new Date().toISOString(), cases:[], assurance_certified:false, production_promotion_allowed:false };

async function run(id, fn) {
  try { const result = await fn(); evidence.cases.push({id,...result,status:result.pass?'pass':'defect_reproduced'}); }
  catch(error){ evidence.cases.push({id,status:'probe_error',error:error.name,message:error.message}); }
}
async function rejectedCode(records, expectedValue=expected, now=NOW) {
  const g = module.createProjectFileRecoveryGovernance({ persistence:harness(records).api, now:()=>now });
  try { await g.loadDecision('decision-1', expectedValue); return null; } catch(e){ return e.code; }
}

await run('fresh-exact-decision-with-correlated-approval-is-accepted', async()=>{
  const g = module.createProjectFileRecoveryGovernance({ persistence:harness([authority(),decision()]).api, now:()=>NOW });
  const loaded = await g.loadDecision('decision-1', expected);
  return { loaded_id:loaded.id, pass:loaded.id==='decision-1' };
});

await run('unknown-evidence-fails-closed', async()=>{
  const g = module.createProjectFileRecoveryGovernance({ persistence:harness([authority()]).api, now:()=>NOW });
  let code=null; try{ await g.loadDecision('decision-1', expected); }catch(e){code=e.code;}
  return {observed_error:code,pass:code==='PROJECT_FILE_RECOVERY_EVIDENCE_UNKNOWN'};
});

await run('stale-future-expired-decision-fail-closed', async()=>{
  const variants=[
    decision({issued_at:'2026-09-12T07:30:00.000Z',expires_at:'2026-09-12T07:45:00.000Z'}),
    decision({issued_at:'2026-09-12T08:01:00.000Z'}),
    decision({expires_at:'2026-09-12T07:59:30.000Z'}),
  ];
  const codes=[]; for(const d of variants) codes.push(await rejectedCode([authority(),d]));
  return {observed_errors:codes,pass:codes.every((c)=>c==='PROJECT_FILE_RECOVERY_DECISION_STALE')};
});

await run('correlation-and-prepared-id-mismatches-fail-closed', async()=>{
  const changes=[{project_id:'other-project'},{mission_id:'other-mission'},{task_id:'other-task'},{worker_id:'other-worker'},{target_path:'/other.txt'},{intent_hash:'other-intent'},{idempotency_key_sha256:'other-key'},{prepared_id:'other-prepared'}];
  const codes=[]; for(const change of changes) codes.push(await rejectedCode([authority(),decision(change)]));
  return {observed_errors:codes,pass:codes.every((c)=>c==='PROJECT_FILE_RECOVERY_CORRELATION_MISMATCH')};
});

await run('wrong-decision-status-or-kind-fails-closed', async()=>{
  const codes=[];
  codes.push(await rejectedCode([authority(),decision({status:'ABANDONED'})]));
  codes.push(await rejectedCode([authority(),decision({decision_kind:'ABANDONED_LOCK'})]));
  return {observed_errors:codes,pass:codes.every((c)=>c==='PROJECT_FILE_RECOVERY_DECISION_MISMATCH')};
});

await run('missing-or-untrusted-authority-fails-closed', async()=>{
  const noAuthority = await rejectedCode([decision()]);
  const untrusted = await rejectedCode([authority({artifact_kind:'untrusted.claim'}),decision()]);
  return {observed_errors:[noAuthority,untrusted],pass:noAuthority==='PROJECT_FILE_RECOVERY_AUTHORITY_UNPROVEN'&&untrusted==='PROJECT_FILE_RECOVERY_AUTHORITY_UNPROVEN'};
});

await run('authority-correlation-disposition-and-decision-binding-fail-closed', async()=>{
  const variants=[authority({disposition:'DENY'}),authority({recovery_decision_id:'other-decision'}),authority({project_id:'other-project'}),authority({mission_id:'other-mission'}),authority({task_id:'other-task'}),authority({worker_id:'other-worker'}),authority({target_path:'/other.txt'}),authority({intent_hash:'other-intent'})];
  const codes=[]; for(const a of variants) codes.push(await rejectedCode([a,decision()]));
  return {observed_errors:codes,pass:codes.every((c)=>c==='PROJECT_FILE_RECOVERY_AUTHORITY_MISMATCH')};
});

await run('green-or-prs-disposition-cannot-grant-recovery-authority', async()=>{
  const codes=[];
  for(const kind of ['green.disposition','prs.disposition']) codes.push(await rejectedCode([authority({artifact_kind:kind}),decision()]));
  return {observed_errors:codes,pass:codes.every((c)=>c==='PROJECT_FILE_RECOVERY_AUTHORITY_UNPROVEN')};
});

await run('decision-replay-under-different-expected-intent-fails-closed', async()=>{
  const code=await rejectedCode([authority(),decision()],{...expected,intentHash:'new-intent-hash'});
  return {observed_error:code,pass:code==='PROJECT_FILE_RECOVERY_CORRELATION_MISMATCH'};
});

await run('abandoned-lock-requires-exact-lock-correlation-and-authority', async()=>{
  const lockDecision=decision({status:'ABANDONED',decision_kind:'ABANDONED_LOCK',prepared_id:undefined,lock_id:'lock-1'});
  delete lockDecision.prepared_id;
  const lockAuthority=authority();
  const g=module.createProjectFileRecoveryGovernance({persistence:harness([lockAuthority,lockDecision]).api,now:()=>NOW});
  const fn=g.abandonedLock({evidenceId:'decision-1',intentHash,idempotencyKeySha256:keyHash});
  const ok=await fn({owner:{lock_id:'lock-1'},intent});
  const mismatchFn=g.abandonedLock({evidenceId:'decision-1',intentHash,idempotencyKeySha256:keyHash});
  let mismatch=null; try{await mismatchFn({owner:{lock_id:'other-lock'},intent});}catch(e){mismatch=e.code;}
  return {accepted_status:ok.status,mismatch_error:mismatch,pass:ok.status==='ABANDONED'&&mismatch==='PROJECT_FILE_RECOVERY_CORRELATION_MISMATCH'};
});

evidence.status=evidence.cases.some((c)=>c.status==='probe_error')?'INSUFFICIENT_EVIDENCE':evidence.cases.every((c)=>c.status==='pass')?'NEGATIVE_CASES_PASS':'DEFECT_REPRODUCED';
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.status==='NEGATIVE_CASES_PASS'?0:1;
