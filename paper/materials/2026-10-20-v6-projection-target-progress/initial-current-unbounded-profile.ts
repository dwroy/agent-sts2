import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { makeKnowledge } from "../../../agent/src/knowledge/index.js";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.js";
import { loadConfig } from "../../../agent/src/core/config.js";
import { parseGameState } from "../../../agent/src/hand/mod/schema.js";
import { buildRunBrief } from "../../../agent/src/memory/run-brief.js";
import { createScreenMemory } from "../../../agent/src/memory/types.js";
import { v6ProjectionInputs } from "../../../agent/src/v6/projection-input.js";
import { V6ProjectionEngine } from "../../../agent/src/sim/v6-projection.js";
import { SerialDeckRunner } from "../../../agent/src/sim/build-sim-pool.js";

const root = "/home/dw/Projects/agent-sts2", live = process.cwd();
const out = new URL("./unbounded-profile.json", import.meta.url);
const digest = (raw: string | Buffer) => createHash("sha256").update(raw).digest("hex");
globalThis.fetch = async () => { throw new Error("offline_benchmark_network_forbidden"); };
process.env.V6_BUILD = "shadow";
const report: any = { started_at: new Date().toISOString(), no_network: true, no_game_actions: true, stages: [],
  limitations: ["One frozen F8 reward board, current 17/17 history metrics, formal R2 cards; current main Strangle and stock-note source.",
    "Uniform direction weights; no frozen V6 brain answer or chosen route exists for this pre-V6 board.",
    "Retrospective current frozen history cutoff; not a leakage-free estimate of historical decisions.",
    "Serial nice19 CPU measurements; no model/Jev request or live mutation."] };
const save = () => writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
async function main() {
  setKnowledgeCharacter("silent");
  const raw = readFileSync(`${root}/paper/materials/2026-10-20-v6-upgrade-log-coverage/f8-card-1.json`);
  report.input = { file: "card-1.json", sha256: digest(raw) };
  for (const file of ["v6-history.json", "build-cores.json"]) {
    const bytes = readFileSync(`${live}/knowledge/characters/silent/${file}`);
    report[file] = { bytes: bytes.length, sha256: digest(bytes) };
  }
  const cached = JSON.parse(readFileSync(`${root}/data/game-data.json`, "utf8"));
  const knowledge = makeKnowledge(cached.collections, "cache", { modVersion: cached.mod_version, fetchedAt: cached.fetched_at });
  const state = parseGameState(JSON.parse(raw.toString()).state), config = loadConfig({} as any);
  const env: any = { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto",
    characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", buildDecider: "deepseek", oneshot: "off",
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [] };
  const input = v6ProjectionInputs(`${live}/knowledge`);
  let started = performance.now();
  const context = await input(env, "pick"); report.snapshot_ms = performance.now() - started;
  if (!context) throw new Error("context_unavailable");
  started = performance.now();
  const ready = context.factory.create(context.situation); report.factory_ms = performance.now() - started;
  if (ready.status !== "ready") throw new Error(`factory_${ready.status}`);
  const r = ready.request;
  report.scope = { seed: r.seed, targets: r.targets, options: [r.baseline, ...r.options].map(o => ({id:o.id,card:o.card})),
    directions: r.directions.map(d => ({id:d.id, combos:d.combos.map(c=>c.id)})) };
  save();
  const options = [r.baseline, ...r.options.slice(0,1)];
  for (const target of [r.targets.find(t=>t.kind === "current" && !t.unknown)!, r.targets.find(t=>t.kind === "chain" && !t.unknown)!]) {
    const stage: any = { target: target.id, unbounded: true, supply_ms:0, prepare_ms:0, fights:[], pairing_aggregate_ms:0 };
    report.stages.push(stage); save();
    const supplied = r.directions.map(direction => {
      const start = performance.now();
      const set = r.completionSources[0]!.resolve({ direction, options, target, samples:20, seed:r.seed, phase:"pick", deadline:Infinity })!;
      stage.supply_ms += performance.now()-start;
      return {direction,set};
    });
    stage.formation = supplied.flatMap(({direction,set}) => set.combinations.map(c => ({direction:direction.id, combo:c.id, p:c.availability, reasons:c.unknownReasons})));
    const selected = supplied.flatMap(({direction,set}) => set.combinations.map(c=>({direction,set,c})))
      .filter(({c}) => options.every(o => (c.availability[o.id]??0)>=.05 && (c.availability[o.id]??1)<1))
      .sort((a,b)=>b.c.availability[r.baseline.id]!-a.c.availability[r.baseline.id]!)[0];
    if (!selected) throw Error("no_eligible_unit");
    stage.direction=selected.direction.id; stage.combo=selected.c.id; stage.availability=selected.c.availability; save();
    const prepared = new Map<string,string>();
    const single = { ...r, directions:[{...selected.direction, combos:selected.direction.combos.filter(c=>c.id===selected.c.id)}],
      targets:[target], baseline:options[0]!, options:options.slice(1), weights:{[selected.direction.id]:1},
      config:{...r.config,budgets:{...r.config.budgets,pick_ms:86400000}},
      completionSources:[{...r.completionSources[0]!, resolve:()=>({...selected.set, combinations:[selected.c]})}],
      prepare:(t:any,s:any,o:any)=>{const at=performance.now();const p=r.prepare(t,s,o);stage.prepare_ms+=performance.now()-at;
        if(p)prepared.set(JSON.stringify(p.input), selected.c.samples.some(x=>JSON.stringify(x.states[o.id])===JSON.stringify(s))?"W_k":"W_0");return p;} };
    const runner = new SerialDeckRunner(), run=runner.run.bind(runner);
    runner.run=async req=>{const at=performance.now(), outcomes:any[]=[], all:any[]=[];
      for(let i=0;i<req.decks.length;i++){
        const t=performance.now(), input={...req.base,...req.decks[i]}, result=await run({...req,base:input,decks:[input],stripes:[req.stripes?.[i]??null]});
        outcomes.push(result.outcomes[0]); all.push(result);
        stage.fights.push({branch:prepared.get(JSON.stringify(input))??"unclassified",relay:target.kind==="chain",ms:performance.now()-t,
          n:result.outcomes.flat(2).filter(Boolean).length,terminal:result.outcomes.flat(2).filter(o=>o&&(o.won||o.died)&&!o.timeUp&&!o.capped).length});save();
      }
      return {...all[0],outcomes,timedOut:all.some(x=>x.timedOut),elapsedMs:performance.now()-at};};
    const engine=new V6ProjectionEngine(runner), aggregate=(engine as any).aggregate.bind(engine);
    (engine as any).aggregate=(...args:any[])=>{const t=performance.now();const v=aggregate(...args);stage.pairing_aggregate_ms+=performance.now()-t;return v;};
    const at=performance.now(), table=await engine.evaluate(single);
    stage.total_engine_ms=performance.now()-at;stage.telemetry=table.telemetry;stage.entries=table.entries;
    stage.combinations=table.combinations.map(x=>({id:x.combination_id,entry:x.entry,completed:x.completed_win,general:x.general_win,completed_joint:x.completed_joint_win,general_joint:x.general_joint_win,reasons:x.unknown_reasons}));
    save();process.stdout.write(JSON.stringify({target:target.id,combo:stage.combo,supply_ms:stage.supply_ms,prepare_ms:stage.prepare_ms,fights:stage.fights,pairing_ms:stage.pairing_aggregate_ms,total_ms:stage.total_engine_ms,entries:stage.entries})+"\n");
  }
  report.ended_at=new Date().toISOString();save();
}
main().catch(error=>{report.error=String(error);save();process.stderr.write(String(error)+"\n");process.exitCode=1;});
