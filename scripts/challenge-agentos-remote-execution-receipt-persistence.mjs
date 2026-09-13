// Independent PRS challenge for AgentOS canonical remote execution receipt persistence adapter.
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-remote-execution-receipt-persistence.mjs REPO EXACT_SHA');
const repo=resolve(repoArg);
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
if(git('rev-parse',`${ref}^{commit}`)!==ref) throw new Error('exact AgentOS commit required');
for(const path of ['runtime/remote-execution-receipt-persistence.mjs','runtime/local-persistence.mjs']){const exact=execFileSync('git',['-C',repo,'show',`${ref}:${path}`],{encoding:'utf8'});if(readFileSync(resolve(repo,path),'utf8')!==exact) throw new Error(`${path} checkout mismatch`);}
const q=`?prs=${ref}-${Date.now()}`;
const adapterMod=await import(`${pathToFileURL(resolve(repo,'runtime/remote-execution-receipt-persistence.mjs')).href}${q}`);
const persistenceMod=await import(`${pathToFileURL(resolve(repo,'runtime/local-persistence.mjs')).href}${q}`);
const receipt=(overrides={})=>({delivery_id:'delivery:1',request_id:'request:1',host_id:'host:1',mission_id:'mission:1',task_id:'task:1',wake_trace_id:'wake:1',worker_id:'agentos:windows-powershell-worker',status:'AWAITING_GREEN',budget_status:'RECONCILED',code_identity:'exact-head',evidence:['prs'],created_at:'2026-09-13T02:40:00.000Z',...overrides});
const cases=[];
async function run(id,fn){try{const out=await fn();cases.push({id,...out,status:out.pass?'pass':'defect_reproduced'});}catch(e){cases.push({id,pass:false,status:'probe_error',message:e.message,code:e.code??null});}}
async function withAdapter(fn){const root=await mkdtemp(join(tmpdir(),'prs-remote-receipt-'));try{const persistence=await persistenceMod.createLocalPersistence({filePath:join(root,'state.json')});const adapter=adapterMod.createRemoteExecutionReceiptPersistence({persistence});return await fn({adapter,persistence});}finally{await rm(root,{recursive:true,force:true});}}

await run('canonical-artifact-shape',()=>withAdapter(async({adapter,persistence})=>{const r=receipt();const entity=await adapter.record({receipt:r});const stored=await persistence.get('artifact','remote-receipt:delivery:1');return{pass:entity.id==='remote-receipt:delivery:1'&&entity.artifactType==='remote.execution.receipt'&&stored.payload.delivery_id==='delivery:1',id:entity.id,type:entity.artifactType};}));
await run('delivery-listing-is-correlated',()=>withAdapter(async({adapter,persistence})=>{await adapter.record({receipt:receipt()});await persistence.create('artifact',{id:'remote-receipt:other',artifactType:'remote.execution.receipt',payload:receipt({delivery_id:'other',request_id:'other'})});const found=await adapter.listForDelivery('delivery:1');return{pass:found.length===1&&found[0].delivery_id==='delivery:1'&&found[0].request_id==='request:1',count:found.length};}));
await run('duplicate-id-never-overwrites-first-receipt',()=>withAdapter(async({adapter,persistence})=>{await adapter.record({receipt:receipt()});let duplicateFailed=false;try{await adapter.record({receipt:receipt({status:'COMPLETED'})});}catch(e){duplicateFailed=/Duplicate artifact id/.test(e.message);}const stored=await persistence.get('artifact','remote-receipt:delivery:1');return{pass:duplicateFailed&&stored.payload.status==='AWAITING_GREEN',duplicateFailed,status:stored.payload.status};}));
await run('missing-correlation-identifiers-fail-before-write',()=>withAdapter(async({adapter,persistence})=>{let failed=0;for(const broken of [receipt({delivery_id:''}),receipt({request_id:''}),receipt({host_id:''})]){try{await adapter.record({receipt:broken});}catch{failed++;}}const artifacts=await persistence.list('artifact');return{pass:failed===3&&artifacts.length===0,failed,artifacts:artifacts.length};}));

const evidence={schema:'prs.agentos-remote-execution-receipt-persistence.v1',exact_head:ref,source_tree:git('rev-parse',`${ref}^{tree}`),cases,new_persistence_system_created:false,receipt_overwrite_allowed:false,real_powershell_process_exercised:false,local_wake_execution_exercised:false,scheduler_execution_exercised:false,owner_windows_laptop_exercised:false,assurance_certified:false,production_promotion_allowed:false};
evidence.pass=cases.length===4&&cases.every(x=>x.pass===true);
evidence.status=evidence.pass?'REMOTE_EXECUTION_RECEIPT_PERSISTENCE_PASS':'REMOTE_EXECUTION_RECEIPT_PERSISTENCE_FAIL';
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.pass?0:1;
