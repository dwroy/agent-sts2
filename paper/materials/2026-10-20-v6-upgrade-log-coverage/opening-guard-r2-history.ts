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
import { cardUpgrade, setCardUpgradesForTests } from "../../../agent/src/knowledge/card-upgrades.js";
import { resolveV6Completion } from "../../../agent/src/sim/v6-completion.js";
import { SerialDeckRunner } from "../../../agent/src/sim/build-sim-pool.js";

const root = "/home/dw/Projects/agent-sts2", live = process.cwd();
const out = new URL("./opening-guard-r2-history.json", import.meta.url);
const digest = (raw: string | Buffer) => createHash("sha256").update(raw).digest("hex");
globalThis.fetch = async () => { throw new Error("offline_benchmark_network_forbidden"); };
process.env.V6_BUILD = "shadow";
const report: any = { started_at: new Date().toISOString(), no_network: true, no_game_actions: true, stages: [],
  limitations: ["One frozen F8 reward board, all 17 R2 combination history metrics, current formal R2 cards.",
    "Uniform direction weights; no frozen V6 brain answer or chosen route exists for this pre-V6 board.",
    "Retrospective current frozen history cutoff; not a leakage-free estimate of historical decisions.",
    "Serial nice19 CPU measurements; no model/Jev request or live mutation."] };
const save = () => writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
async function main() {
  setKnowledgeCharacter("silent");
  const raw = readFileSync(new URL("./f8-card-1.json", import.meta.url));
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
  const r = ready.request, prepare = r.prepare;
  let prepCalls = 0, prepMs = 0;
  r.prepare = (...args) => { const t = performance.now(); const p = prepare(...args); prepMs += performance.now()-t; prepCalls++; return p; };
  report.scope = { run_id: context.situation.runId, character: r.character, ascension: r.ascension, floor: state.run?.floor,
    seed: r.seed, model: r.modelVersion, directions: r.directions.map(d => ({ id: d.id, combos: d.combos.map(c => c.id) })),
    targets: r.targets, route_steps: context.situation.route?.steps };
  report.preparation = r.targets.map(t => { const p = r.prepare(t, r.baseline.state, r.baseline);
    return { target: t.id, prepared: !!p, labels: p?.labels }; });
  save();
  const t = r.targets.find(t => t.kind === "chain" && !t.unknown)!;
  report.rows=[];
  const after = JSON.parse(readFileSync(`${live}/knowledge/common/card-upgrades.json`, "utf8"));
  const before = JSON.parse(readFileSync(new URL("./before-card-upgrades.json", import.meta.url), "utf8"));
  for (const variant of ["before", "after"]) {
  setCardUpgradesForTests(variant === "before" ? before : after);
  // Each variant needs a fresh factory: prepare caches both successful and rejected states.
  const variantContext = await v6ProjectionInputs(`${live}/knowledge`)(env, "pick");
  if (!variantContext) throw new Error("variant_context_unavailable");
  const variantReady = variantContext.factory.create(variantContext.situation);
  if (variantReady.status !== "ready") throw new Error(`variant_factory_${variantReady.status}`);
  const r = variantReady.request;
  for(const d of r.directions) {
    const completion=resolveV6Completion({direction:d,options:[r.baseline,...r.options],target:t,samples:20,seed:r.seed,phase:"pick",deadline:performance.now()+30000},r.completionSources);
    for(const c of completion?.combinations ?? []) for(const o of [r.baseline,...r.options]) {
      const p=c.availability[o.id]; if(p===null || p===undefined || p<.05) continue;
      const rows=[];
      for(const branch of ["samples","general"] as const) for(let i=0;i<c[branch].length;i++) {
        const state=c[branch][i]!.states[o.id]; let prepared=null,error=null;
        try {if(state) prepared=r.prepare(t,state,o);} catch(e){error=String(e);}
        rows.push({branch,i,sample_hash:state && digest(JSON.stringify(state)),state:!!state,prepared:!!prepared,error,max_hp:state?.maxHp,resources:state?.combatResources,relics:state?.relics,
          added_unknown:state?.cards.filter(x=>!knowledge.card(x.id)), upgraded_unknown:state?.cards.filter(x=>x.upgraded&&!cardUpgrade(x.id)), guard_unknown: state && (()=>{ const held=[...o.state.cards]; return state.cards.filter(c=>{ const at=held.findIndex(h=>h.id===c.id && h.upgraded===c.upgraded); if(at>=0){held.splice(at,1);return false;} return !knowledge.card(c.id) || c.upgraded&&!cardUpgrade(c.id); }); })()});
      }
      report.rows.push({variant,direction:d.id,combo:c.id,option:o.id,p,rows});
    }
  }
  }
  report.summary = ["before", "after"].map(variant => {
    const rows = report.rows.filter((r: any) => r.variant === variant).flatMap((r: any) => r.rows);
    return {variant, branches: Object.fromEntries(["samples", "general"].map(branch => {
      const subset = rows.filter((r: any) => r.branch === branch);
      return [branch, {total: subset.length, prepared: subset.filter((r: any) => r.prepared).length,
        errors: subset.filter((r: any) => r.error).length,
        sample_hashes: digest(JSON.stringify(subset.map((r: any) => r.sample_hash)))}];
    }))};
  });
  save(); process.stdout.write(JSON.stringify(report.summary)+"\n");
  report.ended_at = new Date().toISOString(); save();
}
main().catch(error => { report.error = String(error); save(); process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
