// Offline adversarial probe of immutable Git objects. No worker/transport calls.
// Execution-produced evidence only; never independent PRS certification.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const [repoArg, ref, suite] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '') || !['bridge', 'autonomy'].includes(suite)) {
  throw new Error('usage: node scripts/challenge-agentos.mjs REPO EXACT_SHA bridge|autonomy');
}
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], {encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact commit required');
const path = suite === 'bridge' ? 'runtime/remote-upstream-reconciliation.mjs' : 'src/governance/autonomy.mjs';
const evidence = {schema:'prs.offline-adversarial-probe.v1', exact_head:ref, source_tree:git('rev-parse', `${ref}^{tree}`), module:path,
  captured_at:new Date().toISOString(), suite, cases:[], assurance_certified:false, production_promotion_allowed:false};
try {
  const source = execFileSync('git', ['-C', repo, 'show', `${ref}:${path}`], {encoding:'utf8', stdio:['ignore','pipe','pipe']});
  evidence.module_sha256 = createHash('sha256').update(source).digest('hex');
  const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const check = (id, fn) => {
    try {
      const observed = fn();
      evidence.cases.push({id, observed_grant:observed, expected_grant:false, status:observed === false ? 'pass' : 'defect_reproduced'});
    } catch (error) {
      evidence.cases.push({id,status:'probe_error',error:error.name});
    }
  };
  if (suite === 'autonomy') {
    evidence.positive_control = module.effectiveAuthority({autonomy:module.createAutonomyPolicy({level:4}),authorised:true,capabilityGranted:true,inScope:true,withinBudget:true}).allowed === true;
    for (const field of ['authorised','capabilityGranted','inScope','withinBudget']) {
      for (const value of ['false',1,{},[]]) {
        check(`${field}:${JSON.stringify(value)}`, () => module.effectiveAuthority({autonomy:module.createAutonomyPolicy({level:4}),
          authorised:true,capabilityGranted:true,inScope:true,withinBudget:true,[field]:value}).allowed);
      }
    }
    for (const value of [null,0,'','false']) check(`production:${JSON.stringify(value)}`, () => module.effectiveAuthority({
      autonomy:module.createAutonomyPolicy({level:4}),authorised:true,capabilityGranted:true,inScope:true,withinBudget:true,production:value}).allowed);
  } else {
    function packet() {
      const assignment={delivery_id:'A',request_id:'R',project_id:'P',mission_id:'M',task_id:'T',actor_id:'owner',issuer:'overseer'};
      const receipt={...assignment,schema_version:1,status:'COMPLETED',wake_trace_id:'W',host_id:'H',worker_id:'worker',code_identity:'a'.repeat(40),config_identity:'config',
        claimed_at:'2026-09-09T00:00:00Z',started_at:'2026-09-09T00:00:01Z',completed_at:'2026-09-09T00:00:02Z',budget_reservation_id:'budget',budget_status:'RECONCILED',
        green_disposition:'pass',evidence:['claim-only']};
      return {assignment,receipt,response:{status:'COMPLETED',mission_id:'M',wake_trace_id:'W',source_agent:'worker',green_disposition:'pass'},
        green:{task_id:'T',wake_trace_id:'W',disposition:'pass'},executionEvents:[{eventType:'agentos.manual-wake.completed',taskId:'T',missionId:'M',wakeTraceId:'W'}]};
    }
    evidence.positive_control = module.reconcileRemoteExecution(packet()).reportable_completed === true;
    const mutate = (id, change) => check(id, () => {const data=packet();change(data);return module.reconcileRemoteExecution(data).reportable_completed;});
    mutate('green-missing-task', d => {delete d.green.task_id;});
    mutate('green-empty-task', d => {d.green.task_id='';});
    for (const field of ['host_id','worker_id','code_identity','config_identity','wake_trace_id']) mutate(`expected-${field}-mismatch`,d=>{d.assignment[field]='independent-other';});
    mutate('duplicate-other-wake',d=>{d.executionEvents.push({...d.executionEvents[0],wakeTraceId:'other'});});
    mutate('missing-receipt',d=>{d.receipt=null;});
    mutate('green-fail',d=>{d.green.disposition='fail';});
    mutate('budget-unknown',d=>{d.receipt.budget_status='UNKNOWN';});
    mutate('missing-final-result',d=>{d.response=null;});
  }
  evidence.status = !evidence.positive_control || evidence.cases.some(c=>c.status==='probe_error') ? 'INSUFFICIENT_EVIDENCE' :
    evidence.cases.every(c=>c.status==='pass') ? 'NEGATIVE_CASES_PASS' : 'DEFECT_REPRODUCED';
} catch (error) {
  evidence.status='INSUFFICIENT_EVIDENCE';evidence.error=error.name;
}
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.status==='NEGATIVE_CASES_PASS'?0:1;
