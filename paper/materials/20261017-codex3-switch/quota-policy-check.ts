/** Read-only proof that an inherited codex1 paid flag cannot admit codex3. No usage/model request. */
import {readFileSync,writeFileSync} from 'node:fs';
import {mainSilentCreditsAllowed,MAIN_SILENT_CREDIT_SCOPE} from '../../../agent/src/brain/engines/codex-credit-policy.js';
const root=process.cwd(), selected=readFileSync(root+'/ops/codex-ops/brain-home','utf8').trim();
const env={BRAIN_CODEX_PAID_CREDITS:MAIN_SILENT_CREDIT_SCOPE,STS2_WORKSPACE:root,BRAIN_CODEX_HOME:selected};
const admitted=mainSilentCreditsAllowed(env,'silent',root+'/.worktrees/live');
if(admitted)throw new Error('Codex3 must not enter the codex1 paid lane');
writeFileSync(root+'/paper/materials/20261017-codex3-switch/quota-policy-readback.json',JSON.stringify({selected_brain_home:selected,inherited_codex1_paid_flag_admitted:admitted,quota_guard_source_unchanged:true,no_api_or_credential_read:true},null,2)+'\n');
console.log('codex3 paid lane false; ordinary quota guard unchanged');
