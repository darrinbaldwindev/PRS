// Independent PRS challenge for AgentOS governed execution replay/claim guard.
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-governed-execution-claim-guard.mjs REPO EXACT_SHA');
const repo=resolve(repoArg);
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
if(git('rev-parse',`${ref}^{commit}`)!==ref) throw new Error('exact AgentOS commit required');
for (const path of ['runtime/governed-execution-claim-guard.mjs','runtime/remote-delivery-claim-store.mjs','runtime/remote-delivery-recovery.mjs']) {
  const exact=execFileSync('git',['-C',repo,'show',`${ref}:${path}`],{encoding:'utf8'});
  if(readFileSync(resolve(repo,path),'utf8')!==exact) throw new Error(`${path} checkout mismatch`);
}
const q=`?prs=${ref}-${Date.now()}`;
const guardMod=await import(`${pathToFileURL(resolve(repo,'runtime/governed-execution-claim-guard.mjs')).href}${q}`);
const claimMod=await import(`${pathToFileURL(resolve(repo,'runtime/remote-delivery-claim-store.mjs')).href}${q}`);
const actor={actor_id:'agentos:overseer'};
const task={delivery_id:'delivery:prs:1',request_id:'request:prs:1',task_id:'task:prs:1'};
const cases=[];
async function run(id,fn){try{const out=await fn();cases.push({id,...out,status:out.pass?'pass':'defect_reproduced'});}catch(e){cases.push({id,pass:false,status:'probe_error',message:e.message,code:e.code??null});}}
async function withRoot(fn){const root=await mkdtemp(join(tmpdir(),'prs-claim-guard-'));try{return await fn(root);}finally{await rm(root,{recursive:true,force:true});}}

await run('replay-zero-second-invoke',()=>withRoot(async root=>{const now=()=>new Date('2026-09-13T02:30:00.000Z');const claims=await claimMod.createRemoteDeliveryClaimStore({root,now});const guard=guardMod.createGovernedExecutionClaimGuard({boundary:{async execute({invoke}){return invoke();}},claims,hostId:'host:prs',recoveryOptions:{now}});let invokes=0;await guard.execute({actorContext:actor,task,async invoke(){invokes++;return{ok:true};}});let code=null;try{await guard.execute({actorContext:actor,task,async invoke(){invokes++;return{};}});}catch(e){code=e.code;}return{pass:invokes===1&&code==='GOVERNED_EXECUTION_DUPLICATE_DELIVERY',invokes,code};}));

await run('concurrent-race-exactly-one-boundary',()=>withRoot(async root=>{const now=()=>new Date('2026-09-13T02:30:00.000Z');const claims=await claimMod.createRemoteDeliveryClaimStore({root,now});let boundaryCalls=0,invokes=0;let release;const wait=new Promise(r=>{release=r;});const guard=guardMod.createGovernedExecutionClaimGuard({boundary:{async execute({invoke}){boundaryCalls++;await wait;return invoke();}},claims,hostId:'host:prs',recoveryOptions:{now}});const attempts=Array.from({length:12},()=>guard.execute({actorContext:actor,task,async invoke(){invokes++;return{ok:true};}}).then(()=>({ok:true}),e=>({ok:false,code:e.code})));await new Promise(r=>setTimeout(r,25));release();const results=await Promise.all(attempts);return{pass:results.filter(x=>x.ok).length===1&&results.filter(x=>x.code==='GOVERNED_EXECUTION_DUPLICATE_DELIVERY').length===11&&boundaryCalls===1&&invokes===1,boundaryCalls,invokes};}));

await run('correlation-mismatch-zero-boundary',()=>withRoot(async root=>{const now=()=>new Date('2026-09-13T02:30:00.000Z');const claims=await claimMod.createRemoteDeliveryClaimStore({root,now});await claims.claim({deliveryId:task.delivery_id,requestId:'request:other',hostId:'host:prs'});let boundaryCalls=0;const guard=guardMod.createGovernedExecutionClaimGuard({boundary:{async execute(){boundaryCalls++;return{};}},claims,hostId:'host:prs',recoveryOptions:{now}});let code=null;try{await guard.execute({actorContext:actor,task,async invoke(){return{};}});}catch(e){code=e.code;}return{pass:code==='GOVERNED_EXECUTION_CLAIM_CORRELATION_MISMATCH'&&boundaryCalls===0,code,boundaryCalls};}));

await run('stale-claim-never-auto-reclaims',()=>withRoot(async root=>{const claimNow=()=>new Date('2026-09-13T02:00:00.000Z');const recoveryNow=()=>new Date('2026-09-13T02:30:01.000Z');const writer=await claimMod.createRemoteDeliveryClaimStore({root,now:claimNow});await writer.claim({deliveryId:task.delivery_id,requestId:task.request_id,hostId:'host:prs'});const claims=await claimMod.createRemoteDeliveryClaimStore({root,now:recoveryNow});let boundaryCalls=0;const guard=guardMod.createGovernedExecutionClaimGuard({boundary:{async execute(){boundaryCalls++;return{};}},claims,hostId:'host:prs',recoveryOptions:{now:recoveryNow,staleAfterMs:15*60*1000}});let code=null,reclaim=null;try{await guard.execute({actorContext:actor,task,async invoke(){return{};}});}catch(e){code=e.code;reclaim=e.details?.reclaim_allowed;}return{pass:code==='GOVERNED_EXECUTION_RECOVERY_REQUIRED'&&reclaim===false&&boundaryCalls===0,code,reclaim,boundaryCalls};}));

await run('crash-after-side-effect-retains-claim-and-blocks-replay',()=>withRoot(async root=>{const now=()=>new Date('2026-09-13T02:30:00.000Z');const claims=await claimMod.createRemoteDeliveryClaimStore({root,now});let invokes=0;const guard=guardMod.createGovernedExecutionClaimGuard({boundary:{async execute({invoke}){await invoke();const e=new Error('CRASH_AFTER_SIDE_EFFECT');e.code='CRASH_AFTER_SIDE_EFFECT';throw e;}},claims,hostId:'host:prs',recoveryOptions:{now}});let firstCode=null,retained=null,replaySafe=null;try{await guard.execute({actorContext:actor,task,async invoke(){invokes++;return{side_effect:true};}});}catch(e){firstCode=e.code;retained=e.claim_retained;replaySafe=e.replay_safe_to_invoke;}let replayCode=null;try{await guard.execute({actorContext:actor,task,async invoke(){invokes++;return{};}});}catch(e){replayCode=e.code;}return{pass:firstCode==='CRASH_AFTER_SIDE_EFFECT'&&retained===true&&replaySafe===false&&replayCode==='GOVERNED_EXECUTION_DUPLICATE_DELIVERY'&&invokes===1,firstCode,retained,replaySafe,replayCode,invokes};}));

const evidence={schema:'prs.agentos-governed-execution-claim-guard.v1',exact_head:ref,source_tree:git('rev-parse',`${ref}^{tree}`),cases,real_powershell_process_exercised:false,local_wake_execution_exercised:false,scheduler_execution_exercised:false,claim_reclaim_exercised:false,correlated_recovery_resolution_exercised:false,owner_windows_laptop_exercised:false,assurance_certified:false,production_promotion_allowed:false};
evidence.pass=cases.length===5&&cases.every(x=>x.pass===true);
evidence.status=evidence.pass?'GOVERNED_EXECUTION_CLAIM_GUARD_PASS':'GOVERNED_EXECUTION_CLAIM_GUARD_FAIL';
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.pass?0:1;
