// Independent immutable PRS challenge for AgentOS worker consent gate.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, ref] = process.argv.slice(2);
if (!repoArg || !/^[a-f0-9]{40}$/.test(ref ?? '')) throw new Error('usage: node scripts/challenge-agentos-worker-consent-gate.mjs REPO EXACT_SHA');
const repo = resolve(repoArg);
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (git('rev-parse', `${ref}^{commit}`) !== ref) throw new Error('exact AgentOS commit required');
const modulePath = 'runtime/worker-consent-gate.mjs';
const exact = execFileSync('git', ['-C', repo, 'show', `${ref}:${modulePath}`], { encoding: 'utf8' });
if (readFileSync(resolve(repo, modulePath), 'utf8') !== exact) throw new Error(`${modulePath} checkout does not match exact Git object`);
const mod = await import(`${pathToFileURL(resolve(repo, modulePath)).href}?prs=${ref}-${Date.now()}`);

const actor = Object.freeze({ actor_id:'agentos:overseer', project_id:'agentos-local' });
const makeTask = () => Object.freeze({ task_id:'task-prs-consent', mission_id:'mission-prs-consent', project_id:'agentos-local', required_capabilities:Object.freeze(['shell.powershell.repo.read']), scope:Object.freeze(['local-runtime']), execution:Object.freeze({ adapter:'windows-powershell', operation:'repo.status' }) });
const cases=[];
async function run(id, fn){ try { const o=await fn(); cases.push({id,...o,status:o.pass?'pass':'defect_reproduced'}); } catch(e){ cases.push({id,pass:false,status:'probe_error',message:e.message,code:e.code??null}); } }
function registry(){ const records=[]; return { records, api:{ record:async (entry)=>{records.push(entry); return {intervention_id:`prs-${records.length}`};} } }; }

await run('pre-authorized-no-broadening', async()=>{ const t=makeTask(); const snap=JSON.stringify(t); const r=registry(); const gate=mod.createWorkerConsentGate({ resolveConsent:async()=>({state:mod.WORKER_CONSENT_STATES.PRE_AUTHORIZED,decision_id:'pre'}), interventions:r.api }); const out=await gate.assertAllowed({actorContext:actor,task:t}); return { pass:out.state==='PRE_AUTHORIZED' && r.records.length===0 && JSON.stringify(t)===snap && t.required_capabilities[0]==='shell.powershell.repo.read' && t.scope[0]==='local-runtime', intervention_count:r.records.length }; });
await run('confirmation-required-zero-downstream', async()=>{ const r=registry(); let downstream=0; const gate=mod.createWorkerConsentGate({ resolveConsent:async()=>({state:mod.WORKER_CONSENT_STATES.CONFIRMATION_REQUIRED,confirmed:false,required_authority:'owner'}), interventions:r.api }); let code=null; try { await gate.assertAllowed({actorContext:actor,task:makeTask()}); downstream+=1; } catch(e){ code=e.code; } return { pass:code==='WORKER_CONSENT_CONFIRMATION_REQUIRED' && downstream===0 && r.records.length===1, code, downstream, intervention_count:r.records.length }; });
await run('confirmed-consent-does-not-broaden', async()=>{ const t=makeTask(); const snap=JSON.stringify(t); const gate=mod.createWorkerConsentGate({ resolveConsent:async()=>({state:mod.WORKER_CONSENT_STATES.CONFIRMATION_REQUIRED,confirmed:true}) }); const out=await gate.assertAllowed({actorContext:actor,task:t}); return { pass:out.confirmed===true && JSON.stringify(t)===snap && t.required_capabilities.length===1 && t.scope.length===1 }; });
await run('prohibited-confirmation-cannot-override', async()=>{ const r=registry(); let downstream=0; const gate=mod.createWorkerConsentGate({ resolveConsent:async()=>({state:mod.WORKER_CONSENT_STATES.PROHIBITED,confirmed:true}), interventions:r.api }); let code=null; try { await gate.assertAllowed({actorContext:actor,task:makeTask()}); downstream+=1; } catch(e){ code=e.code; } return { pass:code==='WORKER_CONSENT_PROHIBITED' && downstream===0 && r.records.length===1, code, downstream, intervention_count:r.records.length }; });
await run('malformed-decisions-fail-closed', async()=>{ const gate=mod.createWorkerConsentGate({ resolveConsent:async()=>({state:'ALLOW'}) }); let code=null; try { await gate.assertAllowed({actorContext:actor,task:makeTask()}); } catch(e){ code=e.code; } return { pass:code==='WORKER_CONSENT_STATE_INVALID', code }; });
await run('missing-registry-does-not-weaken-deny', async()=>{ const gate=mod.createWorkerConsentGate({ resolveConsent:async()=>({state:mod.WORKER_CONSENT_STATES.PROHIBITED}) }); let code=null; try { await gate.assertAllowed({actorContext:actor,task:makeTask()}); } catch(e){ code=e.code; } return { pass:code==='WORKER_CONSENT_PROHIBITED', code }; });

const evidence={schema:'prs.agentos-worker-consent-gate.v1',exact_head:ref,source_tree:git('rev-parse',`${ref}^{tree}`),cases,powershell_process_execution_exercised:false,local_wake_execution_exercised:false,scheduler_execution_exercised:false,owner_windows_laptop_exercised:false,assurance_certified:false,production_promotion_allowed:false};
evidence.pass=cases.length===6 && cases.every(x=>x.pass===true);
evidence.status=evidence.pass?'WORKER_CONSENT_GATE_PASS':'WORKER_CONSENT_GATE_FAIL';
console.log(JSON.stringify(evidence,null,2));
process.exitCode=evidence.pass?0:1;
