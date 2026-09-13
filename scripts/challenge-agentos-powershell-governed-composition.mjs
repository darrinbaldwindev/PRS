// Independent PRS challenge for AgentOS full governed PowerShell composition.
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-powershell-governed-composition.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
if(git('rev-parse',`${ref}^{commit}`)!==ref) throw new Error('exact AgentOS commit required');
for (const path of ['runtime/governed-execution-boundary.mjs','runtime/governed-execution-canonical-adapters.mjs','runtime/execution-risk-policy.mjs']) {
  const exact=execFileSync('git',['-C',repo,'show',`${ref}:${path}`],{encoding:'utf8'});
  if(readFileSync(resolve(repo,path),'utf8')!==exact) throw new Error(`${path} checkout mismatch`);
}
const stamp=`?prs=${ref}-${Date.now()}`;
const boundaryMod=await import(`${pathToFileURL(resolve(repo,'runtime/governed-execution-boundary.mjs')).href}${stamp}`);
const adapterMod=await import(`${pathToFileURL(resolve(repo,'runtime/governed-execution-canonical-adapters.mjs')).href}${stamp}`);
const consentMod=await import(`${pathToFileURL(resolve(repo,'runtime/worker-consent-gate.mjs')).href}${stamp}`);
const riskMod=await import(`${pathToFileURL(resolve(repo,'runtime/execution-risk-policy.mjs')).href}${stamp}`);
const budgetMod=await import(`${pathToFileURL(resolve(repo,'runtime/mission-budget.mjs')).href}${stamp}`);
const toolPolicyMod=await import(`${pathToFileURL(resolve(repo,'runtime/tool-policy.mjs')).href}${stamp}`);
const humanGateMod=await import(`${pathToFileURL(resolve(repo,'runtime/overseer-human-gate.mjs')).href}${stamp}`);
const authorityMod=await import(`${pathToFileURL(resolve(repo,'src/dispatch/authority.mjs')).href}${stamp}`);

const actor={actor_id:'agentos:overseer'};
const task=()=>({delivery_id:'delivery:1',request_id:'request:1',project_id:'agentos-local',mission_id:'mission:1',task_id:'task:1',wake_trace_id:'wake:1',issuer:'agentos:overseer',authority:{granted_capabilities:['shell.powershell.dev.execute']},required_capabilities:['shell.powershell.dev.execute'],execution:{adapter:'windows-powershell',operation:'test.run',cwd:'C:/agentos/AgentOS'}});
const result=()=>({success:true,operation:'test.run',cwd:'C:\\agentos\\AgentOS',exit_code:0,started_at:'2026-09-13T02:10:00.000Z',finished_at:'2026-09-13T02:10:01.000Z',duration_ms:1000,stdout:'ok\n',stderr:'',timed_out:false,truncated:false,resolved_executables:{pwsh:{path:'C:\\Program Files\\PowerShell\\7\\pwsh.exe',version:'7.5.2'}}});
const cases=[];
async function run(id,fn){try{const out=await fn();cases.push({id,...out,status:out.pass?'pass':'defect_reproduced'});}catch(e){cases.push({id,pass:false,status:'probe_error',message:e.message,code:e.code??null});}}

async function fixture({consent='PRE_AUTHORIZED',eligible=true,authorized=true,riskLevel='A2',approvalRequired=false,approve=false,recordReceipt=async()=>({persisted:true}),verify=async()=>({passed:true,evidence:['prs']})}={}){
  const dir=await mkdtemp(join(tmpdir(),'prs-governed-'));
  const budget=await budgetMod.createMissionBudget({filePath:join(dir,'budget.sqlite')});
  const human=humanGateMod.createHumanGate();
  if(approve){human.request({missionId:'mission:1',reason:'prs'});human.resolve({missionId:'mission:1',decision:'approved'});}
  const boundary=boundaryMod.createGovernedExecutionBoundary({
    context:adapterMod.createCanonicalContextGate({canonicalContext:{missions:[{id:'mission:1'}],decisions:[]}}),
    authority:adapterMod.createCanonicalAuthorityGate({authorityPolicy:authorityMod.createAuthorityPolicy({issuers:['agentos:overseer'],capabilities:['shell.powershell.dev.execute']})}),
    consent:consentMod.createWorkerConsentGate({async resolveConsent(){return{state:consent,confirmed:false,reason:'prs'};}}),
    capability:adapterMod.createCanonicalPowerShellCapabilityGate({hostIdentity:{host_id:'host:1'},runtimeExecutionEnabled:authorized,async evaluatePickup(){return{pickup_eligible:eligible,execution_authorized:authorized,disposition:eligible&&authorized?'ELIGIBLE':'BLOCKED'};}}),
    policy:adapterMod.createCanonicalToolPolicyGate({toolPolicy:toolPolicyMod.createToolPolicy({allow:['test.run']})}),
    risk:riskMod.createExecutionRiskPolicy({async classify(){return{level:riskLevel,approvalRequired,reason:'prs risk',evidence:['prs:risk']};}}),
    budget,
    approval:adapterMod.createCanonicalHumanApprovalGate({humanGate:human}),
    receipts:adapterMod.createCanonicalPowerShellReceiptGate({hostId:'host:1',workerId:'agentos:windows-powershell-worker',codeIdentity:ref,async resolveBudgetStatus({reservation}){return reservation.status;},recordReceipt}),
    verification:adapterMod.createCanonicalVerificationGate({verificationRouter:{async selectVerifier(){return{id:'verifier:prs'};}},async runVerifier(input){return verify(input);}}),
  });
  return{boundary,budget,dir,async cleanup(){budget.close();await rm(dir,{recursive:true,force:true});}};
}

await run('success-requires-receipt-verification-budget',async()=>{const f=await fixture();let invokes=0;try{const out=await f.boundary.execute({actorContext:actor,task:task(),actualUnits:1,async invoke(){invokes++;return result();}});return{pass:invokes===1&&out.status==='VERIFIED'&&out.receipt.status==='AWAITING_GREEN'&&out.verification.passed===true&&out.budget.status==='RECONCILED'&&out.receipt.task_id==='task:1'&&out.receipt.wake_trace_id==='wake:1',invokes,status:out.status,receipt_status:out.receipt.status,budget_status:out.budget.status};}finally{await f.cleanup();}});
await run('prohibited-consent-zero-invoke',async()=>{const f=await fixture({consent:'PROHIBITED'});let invokes=0,code=null;try{try{await f.boundary.execute({actorContext:actor,task:task(),async invoke(){invokes++;return result();}});}catch(e){code=e.code;}return{pass:code==='WORKER_CONSENT_PROHIBITED'&&invokes===0,code,invokes};}finally{await f.cleanup();}});
await run('capability-denial-zero-invoke',async()=>{const f=await fixture({eligible:false,authorized:false});let invokes=0,code=null;try{try{await f.boundary.execute({actorContext:actor,task:task(),async invoke(){invokes++;return result();}});}catch(e){code=e.code;}return{pass:code==='POWERSHELL_CAPABILITY_NOT_ELIGIBLE'&&invokes===0,code,invokes};}finally{await f.cleanup();}});
await run('a4-without-approval-zero-invoke',async()=>{const f=await fixture({riskLevel:'A4',approvalRequired:true,approve:false});let invokes=0,code=null;try{try{await f.boundary.execute({actorContext:actor,task:task(),async invoke(){invokes++;return result();}});}catch(e){code=e.code;}return{pass:code==='HUMAN_APPROVAL_RECORD_REQUIRED'&&invokes===0,code,invokes};}finally{await f.cleanup();}});
await run('receipt-failure-after-invoke-never-verified',async()=>{const f=await fixture({recordReceipt:async()=>null});let invokes=0,code=null;try{try{await f.boundary.execute({actorContext:actor,task:task(),actualUnits:1,async invoke(){invokes++;return result();}});}catch(e){code=e.code;}return{pass:code==='EXECUTION_RECEIPT_PERSISTENCE_REQUIRED'&&invokes===1,code,invokes};}finally{await f.cleanup();}});
await run('verification-failure-after-invoke-never-verified',async()=>{const f=await fixture({verify:async()=>({passed:false,evidence:['prs:rejected']})});let invokes=0,code=null,receiptStatus=null;try{try{await f.boundary.execute({actorContext:actor,task:task(),actualUnits:1,async invoke(){invokes++;return result();}});}catch(e){code=e.code;receiptStatus=e.receipt?.status??null;}return{pass:code==='EXECUTION_VERIFICATION_FAILED'&&receiptStatus==='AWAITING_GREEN'&&invokes===1,code,receiptStatus,invokes};}finally{await f.cleanup();}});

const evidence={schema:'prs.agentos-powershell-governed-composition.v1',exact_head:ref,source_tree:git('rev-parse',`${ref}^{tree}`),cases,real_powershell_process_exercised:false,local_wake_execution_exercised:false,scheduler_execution_exercised:false,operation_risk_mapping_exercised:false,replay_recovery_exercised:false,owner_windows_laptop_exercised:false,assurance_certified:false,production_promotion_allowed:false};
evidence.pass=cases.length===6&&cases.every(x=>x.pass===true);
evidence.status=evidence.pass?'POWERSHELL_GOVERNED_COMPOSITION_PASS':'POWERSHELL_GOVERNED_COMPOSITION_FAIL';
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.pass?0:1;
