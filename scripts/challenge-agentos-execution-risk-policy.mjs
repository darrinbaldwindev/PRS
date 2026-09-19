// Independent PRS challenge for AgentOS provider-neutral execution risk contract.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-execution-risk-policy.mjs REPO EXACT_SHA');
const repo=resolve(repoArg);
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
if(git('rev-parse',`${ref}^{commit}`)!==ref) throw new Error('exact AgentOS commit required');
const modulePath='runtime/execution-risk-policy.mjs';
const exact=execFileSync('git',['-C',repo,'show',`${ref}:${modulePath}`],{encoding:'utf8'});
if(readFileSync(resolve(repo,modulePath),'utf8')!==exact) throw new Error(`${modulePath} checkout mismatch`);
const mod=await import(`${pathToFileURL(resolve(repo,modulePath)).href}?prs=${ref}-${Date.now()}`);
const actor={actor_id:'agentos:overseer'};
const task={project_id:'agentos-local',mission_id:'mission:1',task_id:'task:1'};
const capabilityEvaluation={pickup_eligible:true,execution_authorized:true};
const cases=[];
async function run(id,fn){try{const out=await fn();cases.push({id,...out,status:out.pass?'pass':'defect_reproduced'});}catch(e){cases.push({id,pass:false,status:'probe_error',message:e.message,code:e.code??null});}}

await run('levels-fixed-a0-a4',async()=>({pass:JSON.stringify(mod.EXECUTION_RISK_LEVELS)===JSON.stringify(['A0','A1','A2','A3','A4']),levels:mod.EXECUTION_RISK_LEVELS}));
await run('missing-classification-fails-closed',async()=>{let code=null;const p=mod.createExecutionRiskPolicy({async classify(){return null;}});try{await p.evaluate({actorContext:actor,task,capabilityEvaluation});}catch(e){code=e.code;}return{pass:code==='EXECUTION_RISK_DECISION_REQUIRED',code};});
await run('unknown-level-fails-closed',async()=>{let code=null;const p=mod.createExecutionRiskPolicy({async classify(){return{level:'A9',approvalRequired:true,reason:'bad'};}});try{await p.evaluate({actorContext:actor,task,capabilityEvaluation});}catch(e){code=e.code;}return{pass:code==='EXECUTION_RISK_LEVEL_UNKNOWN',code};});
await run('malformed-approval-flag-fails-closed',async()=>{let code=null;const p=mod.createExecutionRiskPolicy({async classify(){return{level:'A3',approvalRequired:'yes',reason:'bad'};}});try{await p.evaluate({actorContext:actor,task,capabilityEvaluation});}catch(e){code=e.code;}return{pass:code==='EXECUTION_RISK_APPROVAL_REQUIRED_INVALID',code};});
await run('a4-cannot-suppress-approval',async()=>{let code=null;const p=mod.createExecutionRiskPolicy({async classify(){return{level:'A4',approvalRequired:false,reason:'critical'};}});try{await p.evaluate({actorContext:actor,task,capabilityEvaluation});}catch(e){code=e.code;}return{pass:code==='EXECUTION_RISK_A4_APPROVAL_REQUIRED',code};});
await run('a4-explicit-approval-preserved',async()=>{const p=mod.createExecutionRiskPolicy({async classify(){return{level:'A4',approvalRequired:true,reason:'critical owner approval',evidence:['policy:test']};}});const out=await p.evaluate({actorContext:actor,task,capabilityEvaluation});return{pass:out.level==='A4'&&out.approvalRequired===true&&out.reason==='critical owner approval',decision:out};});
await run('classifier-receives-bounded-context',async()=>{let seen=null;const p=mod.createExecutionRiskPolicy({async classify(input){seen=input;return{level:'A2',approvalRequired:false,reason:'bounded'};}});await p.evaluate({actorContext:actor,task,capabilityEvaluation});return{pass:seen?.actorContext===actor&&seen?.task===task&&seen?.capabilityEvaluation===capabilityEvaluation};});

const evidence={schema:'prs.agentos-execution-risk-policy.v1',exact_head:ref,source_tree:git('rev-parse',`${ref}^{tree}`),cases,operation_risk_mapping_exercised:false,powershell_process_execution_exercised:false,local_wake_execution_exercised:false,scheduler_execution_exercised:false,owner_windows_laptop_exercised:false,assurance_certified:false,production_promotion_allowed:false};
evidence.pass=cases.length===7&&cases.every(x=>x.pass===true);
evidence.status=evidence.pass?'EXECUTION_RISK_CONTRACT_PASS':'EXECUTION_RISK_CONTRACT_FAIL';
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.pass?0:1;
