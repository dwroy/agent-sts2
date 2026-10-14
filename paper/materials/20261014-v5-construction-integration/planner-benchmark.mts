import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { deepStrictEqual } from "node:assert";
import { forecastConstruction as before } from "./planner-baseline.mts";
import { forecastConstruction as after, prepareOpportunities, applyBuildAction } from "/home/dw/Projects/agent-sts2/.worktrees/v5-construction-integration-20261014/agent/src/construction/planner.ts";
const root="/home/dw/Projects/agent-sts2", out="/home/dw/Projects/agent-sts2/paper/materials/20261014-v5-construction-integration";
const templatesRaw=readFileSync(root+"/knowledge/characters/silent/construction-templates.json");
const modelRaw=readFileSync(root+"/knowledge/characters/silent/construction-opportunities.json");
const templates=JSON.parse(templatesRaw.toString()).templates, model=JSON.parse(modelRaw.toString());
const sha=(b)=>createHash("sha256").update(b).digest("hex");
const results=[];
for (const floor of [2,4,6]) {
 const frameRaw=readFileSync(root+`/paper/materials/20261013-v5-dpr-health/F${floor}-frame.json`);
 const frame=JSON.parse(frameRaw.toString()).state, run=frame.run;
 const state={cards:run.deck.map(c=>({id:c.card_id,upgraded:c.upgraded})),relics:run.relics.map(r=>r.relic_id),hp:run.current_hp,maxHp:run.max_hp,gold:run.gold,floor,cap:null};
 const states=[state, ...frame.reward.card_options.map(c=>applyBuildAction(state,{kind:"add",card:{id:c.card_id,upgraded:c.upgraded},price:0})),applyBuildAction(state,{kind:"remove",index:0,price:0}),applyBuildAction(state,{kind:"upgrade",index:0,price:0})].filter(Boolean);
 const context={model,steps:[{floor:floor+1,kind:"fight"},{floor:floor+1,kind:"reward"},{floor:floor+3,kind:"shop"},{floor:16,kind:"rest"},{floor:17,kind:"fight"}],act:1,ascension:10,currentRun:frame.run_id,asOf:"2026-10-13T19:00:00Z"};
 const prepared=prepareOpportunities(context), inputs=states.flatMap(state=>templates.map(core=>({...context,state,core,samples:128})));
 const start=performance.now(), old=inputs.map(before), middle=performance.now(), current=inputs.map(i=>after({...i,prepared})),end=performance.now();
 deepStrictEqual(current,old);
 results.push({floor,frameSha:sha(frameRaw),forecasts:inputs.length,baselineMs:middle-start,currentMs:end-middle,equal:true,outputSha:sha(JSON.stringify(current))});
}
writeFileSync(out+"/planner-benchmark.json",JSON.stringify({at:new Date().toISOString(),baseline:"f99d9d0ea2cff14c827c3ac7f689d8048675d8e1",templatesSha:sha(templatesRaw),modelSha:sha(modelRaw),results,limitation:"Fixed current-model engineering probe with explicit route; not historical execution timing, B3 throughput, calibration or win-rate evidence."},null,2)+"\n");
