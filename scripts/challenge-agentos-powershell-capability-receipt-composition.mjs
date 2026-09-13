// Independent PRS challenge for AgentOS PowerShell capability + receipt composition.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-powershell-capability-receipt-composition.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact AgentOS commit required');
const modulePath='runtime/governed-execution-canonical-adapters.mjs';
const exact=execFileSync('git',['-C',repo,'show',`${ref}:${modulePath}`],{encoding:'utf8'});
if (readFileSync(resolve(repo,modulePath),'utf8')!==exact) throw new Error(`${modulePath} checkout mismatch`);
const mod=await import(`${pathToFileURL(resolve(repo,modulePath)).href}?prs=${ref}-${Date.now()}`);
const actor={actor_id:'agentos:overseer'};
const task=()=>({delivery_id:'delivery:1',request_id:'request:1',project_id:'agentos-local',mission_id:'mission:1',task_id:'task:1',wake_trace_id:'wake:1',issuer:'agentos:overseer',authority:{granted_capabilities:['shell.powershell.dev.execute']},required_capabilities:['shell.powershell.dev.execute'],execution:{adapter:'windows-powershell',operation:'test.run',cwd:'C:/agentos/AgentOS'}});
const result=()=>({success:true,operation:'test.run',cwd:'C:\\agentos\\AgentOS',exit_code:0,started_at:'2026-09-13T01:00:00.000Z',finished_at:'2026-09-13T01:00:01.000Z',duration_ms:1000,stdout:'ok\n',stderr:'',timed_out:false,truncated:false,resolved_executables:{}});
const cases=[];
async function run(id,fn){try{const out=await fn();cases.push({id,...out,status:out.pass?'pass':'defect_reproduced'});}catch(e){cases.push({id,pass:false,status:'probe_error',message:e.message,code:e.code??null});}}

await run('capability-pickup-denial-fails-closed',async()=>{let code=null;const gate=mod.createCanonicalPowerShellCapabilityGate({hostIdentity:{host_id:'host:1'},async evaluatePickup(){return{pickup_eligible:false,execution_authorized:false,disposition:'HOST_MISMATCH'};}});try{await gate.assertExecutionEligible({actorContext:actor,task:task()});}catch(e){code=e.code;}return{pass:code==='POWERSHELL_CAPABILITY_NOT_ELIGIBLE',code};});
await run('capability-runtime-disabled-fails-closed',async()=>{let code=null;const gate=mod.createCanonicalPowerShellCapabilityGate({hostIdentity:{host_id:'host:1'},runtimeExecutionEnabled:false,async evaluatePickup(){return{pickup_eligible:true,execution_authorized:false,disposition:'POWERSHELL_RUNTIME_EXECUTION_NOT_WIRED'};}});try{await gate.assertExecutionEligible({actorContext:actor,task:task()});}catch(e){code=e.code;}return{pass:code==='POWERSHELL_CAPABILITY_EXECUTION_NOT_AUTHORIZED',code};});
await run('capability-explicit-authorized-passes-only-capability-gate',async()=>{let calls=0;const gate=mod.createCanonicalPowerShellCapabilityGate({hostIdentity:{host_id:'host:1'},runtimeExecutionEnabled:true,async evaluatePickup(input){calls++;return{pickup_eligible:true,execution_authorized:input.runtimeExecutionEnabled===true,disposition:'ELIGIBLE_FOR_BOUNDED_POWERSHELL_EXECUTION'};}});const out=await gate.assertExecutionEligible({actorContext:actor,task:task()});return{pass:calls===1&&out.execution_authorized===true,calls};});
await run('receipt-budget-status-required-before-persistence',async()=>{let persistCalls=0,code=null;const gate=mod.createCanonicalPowerShellReceiptGate({hostId:'host:1',workerId:'agentos:windows-powershell-worker',codeIdentity:'exact-head',async resolveBudgetStatus(){return null;},async recordReceipt(){persistCalls++;return true;}});try{await gate.record({actorContext:actor,task:task(),result:result(),reservation:{reservation_id:'r1'},riskDecision:{approvalRequired:false}});}catch(e){code=e.code;}return{pass:code==='EXECUTION_BUDGET_STATUS_REQUIRED'&&persistCalls===0,code,persistCalls};});
await run('receipt-persistence-failure-fails-closed',async()=>{let code=null,persistCalls=0;const gate=mod.createCanonicalPowerShellReceiptGate({hostId:'host:1',workerId:'agentos:windows-powershell-worker',codeIdentity:'exact-head',async resolveBudgetStatus(){return'RESERVED';},async recordReceipt(){persistCalls++;return null;}});try{await gate.record({actorContext:actor,task:task(),result:result(),reservation:{reservation_id:'r1'},riskDecision:{approvalRequired:false}});}catch(e){code=e.code;}return{pass:code==='EXECUTION_RECEIPT_PERSISTENCE_REQUIRED'&&persistCalls===1,code,persistCalls};});
await run('receipt-is-intermediate-and-correlated',async()=>{const persisted=[];const gate=mod.createCanonicalPowerShellReceiptGate({hostId:'host:1',workerId:'agentos:windows-powershell-worker',codeIdentity:'exact-head',createdAt:'2026-09-13T01:00:02.000Z',async resolveBudgetStatus(){return'RESERVED';},async recordReceipt({receipt}){persisted.push(receipt);return{persisted:true};}});const receipt=await gate.record({actorContext:actor,task:task(),result:result(),reservation:{reservation_id:'r1'},riskDecision:{approvalRequired:false}});return{pass:receipt.status==='AWAITING_GREEN'&&receipt.task_id==='task:1'&&receipt.wake_trace_id==='wake:1'&&persisted.length===1,status:receipt.status,task_id:receipt.task_id,wake_trace_id:receipt.wake_trace_id};});

const evidence={schema:'prs.agentos-powershell-capability-receipt-composition.v1',exact_head:ref,source_tree:git('rev-parse',`${ref}^{tree}`),cases,powershell_process_execution_exercised:false,local_wake_execution_exercised:false,scheduler_execution_exercised:false,owner_windows_laptop_exercised:false,risk_gate_assured:false,assurance_certified:false,production_promotion_allowed:false};
evidence.pass=cases.length===6&&cases.every(x=>x.pass===true);
evidence.status=evidence.pass?'POWERSHELL_CAPABILITY_RECEIPT_COMPOSITION_PASS':'POWERSHELL_CAPABILITY_RECEIPT_COMPOSITION_FAIL';
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.pass?0:1;
