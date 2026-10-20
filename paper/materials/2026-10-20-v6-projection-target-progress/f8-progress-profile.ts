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
import { SerialDeckRunner, BuildSimPool } from "../../../agent/src/sim/build-sim-pool.js";

const root = "/home/dw/Projects/agent-sts2", live = process.cwd();
const out = new URL("./f8-progress-profile.json", import.meta.url);
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
  const runner = process.env.PROFILE_POOL === "2" ? new BuildSimPool(2) : new SerialDeckRunner();
  report.runner = process.env.PROFILE_POOL === "2" ? "BuildSimPool(2)" : "SerialDeckRunner";
  const engine = new V6ProjectionEngine(runner);
  for (const [name, phase, idle] of [["cold_pick", "pick", false], ["hot_pick", "pick", false],
    ["act_start", "act", false], ["after_act_pick", "pick", false],
    ...Array.from({length:4},(_,i)=>[`idle_${i+1}`,"pick",true]), ["after_idle_pick", "pick", false]] as const) {
    const stage:any={name,phase,idle,supply_ms:0,prepare_ms:0,runner_ms:0}; report.stages.push(stage);save();
    const before=performance.now();
    const q={...r,phase,options:phase==="act"||idle?[]:r.options,
      completionSources:r.completionSources.map(source=>({...source,resolve:(c:any)=>{const at=performance.now();const v=source.resolve(c);stage.supply_ms+=performance.now()-at;return v;}})),
      prepare:(...args:Parameters<typeof r.prepare>)=>{const at=performance.now();const v=r.prepare(...args);stage.prepare_ms+=performance.now()-at;return v;}};
    const run=runner.run.bind(runner);
    runner.run=async req=>{const at=performance.now();const v=await run(req);stage.runner_ms+=performance.now()-at;return v;};
    const table=idle?await engine.precompute(q):await engine.evaluate(q);
    runner.run=run;
    stage.wall_ms=performance.now()-before;stage.telemetry=table.telemetry;stage.rankings=table.rankings;
    stage.coverage=["current","future","chain"].map(kind=>{const ids=new Set(r.targets.filter(t=>t.kind===kind).map(t=>t.id));const entries=table.entries.filter(e=>ids.has(e.target_id));return {kind,total:entries.length,known:entries.filter(e=>kind==="chain"?e.joint_win:e.win).length};});
    stage.known=table.entries.filter(e=>e.win||e.joint_win);stage.direction_pairs=table.pick_direction_comparisons;
    stage.reasons=Object.fromEntries([...new Set(table.combinations.flatMap(c=>c.unknown_reasons))].map(reason=>[reason,table.combinations.filter(c=>c.unknown_reasons.includes(reason)).length]));
    stage.formation={known:table.combinations.filter(c=>c.entry.availability.take!==null).length,eligible:table.combinations.filter(c=>(c.entry.availability.take??0)>=.05).length,total:table.combinations.length};
    save();process.stdout.write(JSON.stringify({name,wall_ms:stage.wall_ms,coverage:stage.coverage,telemetry:stage.telemetry})+"\n");
  }
  await runner.close?.();
  report.ended_at=new Date().toISOString();save();
}
main().catch(error=>{report.error=String(error);save();process.stderr.write(String(error)+"\n");process.exitCode=1;});
