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
const out = new URL("./projection-benchmark.json", import.meta.url);
const digest = (raw: string | Buffer) => createHash("sha256").update(raw).digest("hex");
globalThis.fetch = async () => { throw new Error("offline_benchmark_network_forbidden"); };
process.env.V6_BUILD = "shadow";
const report: any = { started_at: new Date().toISOString(), no_network: true, no_game_actions: true, stages: [],
  limitations: ["One frozen F8 reward board, existing 1/17 history metrics, formal R2 cards; current main Strangle and stock-note source.",
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
  const runner = new SerialDeckRunner(), run = runner.run.bind(runner);
  let diagnostics: any[] = [];
  runner.run = async req => { const t = performance.now(), result = await run(req);
    const outcomes = result.outcomes.flat(2).filter(Boolean);
    diagnostics.push({ deadline_ms: req.deadlineMs, elapsed_ms: performance.now()-t, n: outcomes.length,
      capped: outcomes.filter(x => x!.capped).length, timeUp: outcomes.filter(x => x!.timeUp).length,
      terminal: outcomes.filter(x => x!.won || x!.died).length,
      sequence: outcomes.filter(x => x!.sequence).map(x => x!.sequence).slice(0,2),
      seed: req.seed, samples: req.samples, decks: req.decks.length, stripes: req.stripes?.slice(0,4),
      opening: req.base.enemies.map(x => ({id:x.id, hp:x.hp})) }); return result; };
  const engine = new V6ProjectionEngine(runner);
  for (const stage of ["cold_pick_5s", "hot_pick_5s", "act_all_60s", "after_act_pick_5s"]) {
    const act = stage === "act_all_60s", idle = stage.startsWith("idle_");
    const req = { ...r, phase: act ? "act" as const : "pick" as const,
      ...(act ? { options: [] } : {}),
      config: { ...r.config, budgets: { ...r.config.budgets, pick_ms: 5000, act_ms: 60000 } } };
    diagnostics = []; prepCalls = 0; prepMs = 0; started = performance.now();
    const table = idle ? await engine.precompute(req) : await engine.evaluate(req);
    const reasons: Record<string, number> = {};
    for (const row of table.combinations) for (const reason of new Set(row.unknown_reasons)) reasons[reason] = (reasons[reason] ?? 0) + 1;
    const item = { stage, diagnostics, prepCalls, prepMs, elapsed_ms: performance.now() - started, telemetry: table.telemetry,
      formation_known: table.combinations.filter(x => x.entry.availability.take !== null).length,
      formation_at_least_5_percent: table.combinations.filter(x => (x.entry.availability.take ?? -1) >= .05).length,
      known_direction_entries: table.entries.filter(x => x.win).length, total_direction_entries: table.entries.length,
      reasons };
    report.stages.push(item); save(); process.stdout.write(JSON.stringify({stage,elapsed_ms:item.elapsed_ms,simulations:table.telemetry.simulations,cache_hits:table.telemetry.cache_hits,formation_known:item.formation_known,formation_at_least_5_percent:item.formation_at_least_5_percent,known_direction_entries:item.known_direction_entries,total_direction_entries:item.total_direction_entries,reasons}) + "\n");
  }
  report.ended_at = new Date().toISOString(); save();
}
main().catch(error => { report.error = String(error); save(); process.stderr.write(String(error) + "\n"); process.exitCode = 1; });
