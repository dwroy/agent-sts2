/** Fixed engineering question from first-tune resources; no model call or natural-effect claim. */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
const { values } = parseArgs({ options: { source:{type:"string"}, fights:{type:"string"}, catalog:{type:"string"}, out:{type:"string"} } });
if (!values.source || !values.fights || !values.catalog || !values.out || process.env.CHARACTER !== "silent") throw Error("Explicit frozen source/tune/catalog required");
const root=resolve(values.source), moduleOf=(p:string)=>import(pathToFileURL(resolve(root,"agent/src",p)).href);
const [{makeKnowledge},{parseGameState},{buildRunBrief},{createScreenMemory},{loadConfig},{withBossSim},{SerialDeckRunner}]=await Promise.all([
  moduleOf("knowledge/index.ts"),moduleOf("hand/mod/schema.ts"),moduleOf("memory/run-brief.ts"),moduleOf("memory/types.ts"),
  moduleOf("core/config.ts"),moduleOf("sim/build-sim-facts.ts"),moduleOf("sim/build-sim-pool.ts")]);
const fights=readFileSync(values.fights,"utf8").trim().split("\n").map(line=>JSON.parse(line));
const fight=fights.find(row=>row.key==="9TG1RP5LFAAK:33:1:7456072841");
if (!fight || fight.attempt!==1) throw Error("First-tune witness missing");
const raw=structuredClone(fight.t1.state);
// A controlled, fixed skip question with the logged pre-fight deck/HP; this was not a natural build decision.
raw.screen="CARD_REWARD";raw.turn=null;delete raw.combat;raw.run.floor=32;
raw.reward={card_options:[]};
const state=parseGameState(raw), knowledge=makeKnowledge(JSON.parse(readFileSync(values.catalog,"utf8")).collections,"cache");
const config=loadConfig({MODE:"replay"});
const env={state,knowledge,brief:buildRunBrief(state,knowledge),thresholds:config.thresholds,
  screenMemory:createScreenMemory(state.screen),runStart:"auto",characterPreference:null,allowFtueModals:false,
  strictJev:true,combatPlanner:"turn",shopDiscardPotions:[],buildDecider:"deepseek",requiredBossEvaluation:false};
const decision={kind:"ask",label:"reward/card",state:{facts:{act_boss_clock:{boss:"KAISER_CRAB"}}},
  questions:{pick:{type:"choice",instructions:"固定工程回放：跳过，不调用模型。",criteria:{skip:JSON.stringify({skip:true})}}},
  deepseek:{question:"pick",options:()=>[{key:"skip",intent:{action:"skip_reward_cards"},summary:{skip:true}}]}};
const result=await withBossSim(decision,env,{runner:new SerialDeckRunner(),samples:32,seed:7,deadlineMs:1e9});
const facts=result.decision.state?.facts?.act_boss_sim;
if (!facts || typeof facts!=="object" || !result.record?.base) throw Error("No numerical act_boss_sim: "+JSON.stringify(result.record));
writeFileSync(values.out,JSON.stringify({schema:"issue83-fixed-B3-question-replay-v1",source:root,
  scope:"controlled skip question from first-tune entry resources; not an original natural build question or validation sample",
  tune_key:fight.key,source_state_sha256:fight.source.t1_sha256,samples:32,seed:7,jev_calls:0,
  act_boss_sim:facts,criteria:result.decision.questions.pick.criteria,record:result.record},null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({base:result.record.base,samples:result.record.samples}));
