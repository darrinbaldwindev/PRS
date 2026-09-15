// Independent PRS challenge for AgentOS retained-claim recovery evidence reconciliation.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-remote-delivery-recovery-evidence.mjs REPO EXACT_SHA');
const repo=resolve(repoArg);
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
if(git('rev-parse',`${ref}^{commit}`)!==ref) throw new Error('exact AgentOS commit required');
const path='runtime/remote-delivery-recovery-evidence.mjs';
const exact=execFileSync('git',['-C',repo,'show',`${ref}:${path}`],{encoding:'utf8'});
if(readFileSync(resolve(repo,path),'utf8')!==exact) throw new Error(`${path} checkout mismatch`);
const mod=await import(`${pathToFileURL(resolve(repo,path)).href}?prs=${ref}-${Date.now()}`);
const claim={delivery_id:'delivery:1',request_id:'request:1',host_id:'host:1',claimed_at:'2026-09-13T02:00:00.000Z',state:'CLAIMED'};
const receipt=(overrides={})=>({delivery_id:'delivery:1',request_id:'request:1',host_id:'host:1',mission_id:'mission:1',task_id:'task:1',wake_trace_id:'wake:1',worker_id:'agentos:windows-powershell-worker',status:'AWAITING_GREEN',budget_status:'RECONCILED',code_identity:'exact-head',created_at:'2026-09-13T02:00:02.000Z',...overrides});
const cases=[];
function run(id,fn){try{const out=fn();cases.push({id,...out,status:out.pass?'pass':'defect_reproduced'});}catch(e){cases.push({id,pass:false,status:'probe_error',message:e.message,code:e.code??null});}}

run('missing-receipt-never-replays',()=>{const out=mod.reconcileRemoteDeliveryRecoveryEvidence({claim,receipts:[]});return{pass:out.disposition==='RECOVERY_EVIDENCE_MISSING'&&out.recovery_required===true&&out.replay_allowed===false,disposition:out.disposition};});
run('conflicting-identity-never-replays',()=>{const out=mod.reconcileRemoteDeliveryRecoveryEvidence({claim,receipts:[receipt({host_id:'host:other'})]});return{pass:out.disposition==='RECOVERY_CORRELATION_CONFLICT'&&out.replay_allowed===false,disposition:out.disposition};});
run('multiple-receipts-remain-ambiguous',()=>{const out=mod.reconcileRemoteDeliveryRecoveryEvidence({claim,receipts:[receipt(),receipt({created_at:'2026-09-13T02:00:03.000Z'})]});return{pass:out.disposition==='RECOVERY_EVIDENCE_AMBIGUOUS'&&out.receipt_count===2&&out.replay_allowed===false,disposition:out.disposition,count:out.receipt_count};});
run('one-correlated-receipt-preserves-identity-and-never-replays',()=>{const out=mod.reconcileRemoteDeliveryRecoveryEvidence({claim,receipts:[receipt()]});return{pass:out.disposition==='CORRELATED_DURABLE_RECEIPT_PRESENT'&&out.replay_allowed===false&&out.receipt.task_id==='task:1'&&out.receipt.wake_trace_id==='wake:1'&&out.receipt.code_identity==='exact-head',disposition:out.disposition,receipt:out.receipt};});
run('all-terminal-or-intermediate-receipt-statuses-remain-non-replay-evidence',()=>{const statuses=['AWAITING_GREEN','GREEN_BLOCKED','COMPLETED','FAILED','BLOCKED'];const observed=statuses.map(status=>mod.reconcileRemoteDeliveryRecoveryEvidence({claim,receipts:[receipt({status})]}));return{pass:observed.every((out,i)=>out.receipt.status===statuses[i]&&out.replay_allowed===false),statuses};});
run('invalid-receipt-fails-closed',()=>{let threw=false;try{mod.reconcileRemoteDeliveryRecoveryEvidence({claim,receipts:[receipt({status:'SUCCESS'})]});}catch(e){threw=/REMOTE_RECEIPT_STATUS_INVALID/.test(e.message);}return{pass:threw};});

const evidence={schema:'prs.agentos-remote-delivery-recovery-evidence.v1',exact_head:ref,source_tree:git('rev-parse',`${ref}^{tree}`),cases,claim_mutation_exercised:false,claim_release_exercised:false,automatic_replay_authorized:false,real_powershell_process_exercised:false,local_wake_execution_exercised:false,scheduler_execution_exercised:false,owner_windows_laptop_exercised:false,assurance_certified:false,production_promotion_allowed:false};
evidence.pass=cases.length===6&&cases.every(x=>x.pass===true);
evidence.status=evidence.pass?'REMOTE_DELIVERY_RECOVERY_EVIDENCE_PASS':'REMOTE_DELIVERY_RECOVERY_EVIDENCE_FAIL';
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.pass?0:1;
