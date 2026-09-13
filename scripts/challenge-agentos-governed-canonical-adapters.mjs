// Independent immutable PRS challenge for AgentOS governed execution canonical adapters.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-governed-canonical-adapters.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding:'utf8', stdio:['ignore','pipe','pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact AgentOS commit required');

const modulePath = 'runtime/governed-execution-canonical-adapters.mjs';
const exact = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding:'utf8' });
if (readFileSync(resolve(repo, modulePath), 'utf8') !== exact) throw new Error(`${modulePath} checkout does not match exact Git object`);

const mod = await import(`${pathToFileURL(resolve(repo, modulePath)).href}?prs=${ref}-${Date.now()}`);
const authorityMod = await import(`${pathToFileURL(resolve(repo, 'src/dispatch/authority.mjs')).href}?prs=${ref}-${Date.now()}`);
const toolPolicyMod = await import(`${pathToFileURL(resolve(repo, 'runtime/tool-policy.mjs')).href}?prs=${ref}-${Date.now()}`);
const humanGateMod = await import(`${pathToFileURL(resolve(repo, 'runtime/overseer-human-gate.mjs')).href}?prs=${ref}-${Date.now()}`);

const actor = Object.freeze({ actor_id:'agentos:overseer' });
const baseTask = () => ({
  project_id:'agentos-local',
  mission_id:'mission:powershell',
  task_id:'task:powershell',
  issuer:'agentos:overseer',
  authority:{ granted_capabilities:['shell.powershell.dev.execute'] },
  execution:{ operation:'test.run' },
});
const cases=[];
async function run(id, fn){ try { const out=await fn(); cases.push({id,...out,status:out.pass?'pass':'defect_reproduced'}); } catch(e){ cases.push({id,pass:false,status:'probe_error',message:e.message,code:e.code??null}); } }

await run('context-unknown-mission-fails-closed', async()=>{
  const gate=mod.createCanonicalContextGate({canonicalContext:{missions:[{id:'mission:powershell'}],decisions:[]}});
  let invoked=0, message=null;
  try { await gate.assertValid({actorContext:actor,task:{...baseTask(),mission_id:'mission:missing'}}); invoked++; } catch(e){ message=e.message; }
  return {pass:invoked===0 && /unknown mission/.test(message??''),invoked,message};
});

await run('authority-untrusted-issuer-fails-closed', async()=>{
  const gate=mod.createCanonicalAuthorityGate({authorityPolicy:authorityMod.createAuthorityPolicy({issuers:['agentos:overseer'],capabilities:['shell.powershell.dev.execute']})});
  let invoked=0, message=null;
  try { await gate.assertAllowed({actorContext:actor,task:{...baseTask(),issuer:'unknown:issuer'}}); invoked++; } catch(e){ message=e.message; }
  return {pass:invoked===0 && /untrusted issuer/.test(message??''),invoked,message};
});

await run('tool-policy-missing-identity-fails-closed', async()=>{
  const gate=mod.createCanonicalToolPolicyGate({toolPolicy:toolPolicyMod.createToolPolicy({allow:['test.run']})});
  let code=null;
  try { await gate.assertAllowed({actorContext:actor,task:{...baseTask(),execution:{}}}); } catch(e){ code=e.code; }
  return {pass:code==='EXECUTION_TOOL_IDENTITY_REQUIRED',code};
});

await run('tool-policy-denial-fails-closed', async()=>{
  const gate=mod.createCanonicalToolPolicyGate({toolPolicy:toolPolicyMod.createToolPolicy({allow:['test.run']})});
  let code=null;
  try { await gate.assertAllowed({actorContext:actor,task:{...baseTask(),execution:{operation:'service.list'}}}); } catch(e){ code=e.code; }
  return {pass:code==='TOOL_POLICY_DENIED',code};
});

await run('human-approval-missing-pending-denied-fail-closed', async()=>{
  const human=humanGateMod.createHumanGate();
  const gate=mod.createCanonicalHumanApprovalGate({humanGate:human});
  const codes=[];
  try { await gate.assertApproved({actorContext:actor,task:baseTask(),riskDecision:{approvalRequired:true},reservation:{}}); } catch(e){ codes.push(e.code); }
  human.request({missionId:'mission:powershell',reason:'risk'});
  try { await gate.assertApproved({actorContext:actor,task:baseTask(),riskDecision:{approvalRequired:true},reservation:{}}); } catch(e){ codes.push(e.code); }
  human.resolve({missionId:'mission:powershell',decision:'denied'});
  try { await gate.assertApproved({actorContext:actor,task:baseTask(),riskDecision:{approvalRequired:true},reservation:{}}); } catch(e){ codes.push(e.code); }
  return {pass:JSON.stringify(codes)===JSON.stringify(['HUMAN_APPROVAL_RECORD_REQUIRED','HUMAN_APPROVAL_PENDING','HUMAN_APPROVAL_DENIED']),codes};
});

await run('human-approval-explicit-approved-only', async()=>{
  const human=humanGateMod.createHumanGate();
  human.request({missionId:'mission:powershell',reason:'risk'});
  human.resolve({missionId:'mission:powershell',decision:'approved'});
  const gate=mod.createCanonicalHumanApprovalGate({humanGate:human});
  const out=await gate.assertApproved({actorContext:actor,task:baseTask(),riskDecision:{approvalRequired:true},reservation:{}});
  return {pass:out.status==='resolved' && out.decision==='approved',decision:out.decision};
});

await run('verification-no-verifier-fails-closed', async()=>{
  const gate=mod.createCanonicalVerificationGate({verificationRouter:{async selectVerifier(){return null;}},runVerifier:async()=>({passed:true})});
  let code=null, runnerCalls=0;
  const guarded=mod.createCanonicalVerificationGate({verificationRouter:{async selectVerifier(){return null;}},runVerifier:async()=>{runnerCalls++; return {passed:true};}});
  try { await guarded.verify({actorContext:actor,task:baseTask(),result:{},receipt:{receipt_id:'r1'}}); } catch(e){ code=e.code; }
  return {pass:code==='EXECUTION_VERIFIER_REQUIRED' && runnerCalls===0,code,runnerCalls};
});

await run('verification-malformed-result-fails-closed', async()=>{
  const gate=mod.createCanonicalVerificationGate({verificationRouter:{async selectVerifier(){return {id:'verifier:1'};}},runVerifier:async()=>({status:'ok'})});
  let code=null;
  try { await gate.verify({actorContext:actor,task:baseTask(),result:{},receipt:{receipt_id:'r1'}}); } catch(e){ code=e.code; }
  return {pass:code==='EXECUTION_VERIFICATION_RESULT_INVALID',code};
});

await run('verification-preserves-independent-verifier-identity', async()=>{
  const calls=[];
  const gate=mod.createCanonicalVerificationGate({verificationRouter:{async selectVerifier(){calls.push('select'); return {id:'verifier:independent'};}},runVerifier:async({verifier})=>{calls.push(verifier.id); return {passed:true,evidence:['independent']};}});
  const out=await gate.verify({actorContext:actor,task:baseTask(),result:{workerId:'worker:powershell'},receipt:{receipt_id:'r1'}});
  return {pass:out.passed===true && out.verifier_id==='verifier:independent' && calls.join(',')==='select,verifier:independent',calls,verifier_id:out.verifier_id};
});

const evidence={
  schema:'prs.agentos-governed-canonical-adapters.v1',
  exact_head:ref,
  source_tree:git('rev-parse',`${ref}^{tree}`),
  cases,
  powershell_process_execution_exercised:false,
  local_wake_execution_exercised:false,
  scheduler_execution_exercised:false,
  owner_windows_laptop_exercised:false,
  assurance_certified:false,
  production_promotion_allowed:false,
};
evidence.pass=cases.length===9 && cases.every(x=>x.pass===true);
evidence.status=evidence.pass?'GOVERNED_CANONICAL_ADAPTERS_PASS':'GOVERNED_CANONICAL_ADAPTERS_FAIL';
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.pass?0:1;
