import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadRunPlan, type RunPlan } from "../../.worktrees/integrator50-preflight-20261023-1940/agent/src/memory/run-plan.ts";
import { currentRunPlan } from "../../.worktrees/integrator50-preflight-20261023-1940/agent/src/memory/run-plan-merge.ts";
import { createScreenMemory } from "../../.worktrees/integrator50-preflight-20261023-1940/agent/src/memory/types.ts";
const file=fileURLToPath(new URL("./future-only.jsonl",import.meta.url));
const future: RunPlan={runId:"FIXED-ROLLBACK-ONLY",act:1,floor:9,hpPct:1,trigger:"review",archetype:"格式方向",want:[],avoid:[],remove:[],blockTarget:0,elites:"normal",rest:"auto",bossPrep:"未知",summary:"未来层假设",endgame:{core:"F9未来假设",gaps:"未知",scaling_damage:"未知",sustainable_defense:"未知",resources:"未知",win_condition:"未知",checkpoint:""}};
writeFileSync(file,JSON.stringify({plan:future})+"\n");
const memory=createScreenMemory();
// Exact restore sequence introduced at loop.ts:840 followed by loop.ts:1165.
memory.runPlan=loadRunPlan(file,future.runId,2);
const bounded=memory.runPlan;
const reloaded=currentRunPlan(memory,file,future.runId);
const other=createScreenMemory();other.runPlan=loadRunPlan(file,"OTHER-RUN",2);
const control=currentRunPlan(other,file,"OTHER-RUN");
const result={schema:"issue50-fixed-rollback-probe-v1",current_floor:2,only_logged_plan_floor:9,bounded_restore:bounded,subsequent_currentRunPlan_floor:reloaded?.floor??null,subsequent_memory_floor:memory.runPlan?.floor??null,other_run_control:control,observed_contract_violation:bounded===null&&reloaded?.floor===9,production_or_model_calls:0};
console.log(JSON.stringify(result,null,2));
if(!result.observed_contract_violation||control!==null)process.exitCode=1;
