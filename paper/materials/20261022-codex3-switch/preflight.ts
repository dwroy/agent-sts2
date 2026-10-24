import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkCodex } from '../../../agent/src/brain/engines/codex.js';
import { codexChildEnv, codexKeyCheck, withCodexKeys } from '../../../learner/lib/engines.js';
import { resolveCodexBin } from '../../../agent/src/core/config.js';
async function main() {
  const root=process.cwd(), base=join(root,'ops/codex-ops/accounts/codex3');
  const bin=resolveCodexBin(process.env), results=[];
  for (const role of ['learner','brain']) {
    const home=join(base,role), env={...process.env,LEARNER_CODEX_HOME:home,CODEX_HOME:home};
    const check=await checkCodex({bin,home},'gpt-6.1-sol','xhigh',{stateDir:join(root,'paper/materials/20261022-codex3-switch/check',role)});
    const request=withCodexKeys({engine:'codex',cwd:root,projectRoot:root,tools:['Read','Write','Edit','Bash'],model:'gpt-6.1-sol',effort:'xhigh',serviceTier:'default'},env);
    const key_check=await codexKeyCheck(bin,request,codexChildEnv(env,bin));
    results.push({role,home,check,key_check});
  }
  writeFileSync(join(root,'paper/materials/20261022-codex3-switch/codex3-precheck.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results));
  if(results.some(r=>!r.check.ok || !r.key_check.ok)) process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
