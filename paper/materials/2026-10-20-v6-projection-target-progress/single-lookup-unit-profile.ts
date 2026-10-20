import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { makeKnowledge } from "../../../agent/src/knowledge/index.js";
import { setKnowledgeCharacter } from "../../../agent/src/knowledge/files.js";
import { loadConfig } from "../../../agent/src/core/config.js";
import { parseGameState } from "../../../agent/src/hand/mod/schema.js";
import { buildRunBrief } from "../../../agent/src/memory/run-brief.js";
import { createScreenMemory } from "../../../agent/src/memory/types.js";
import { v6ProjectionInputs } from "../../../agent/src/v6/projection-input.js";
import { v6FormationTableSource } from "../../../agent/src/sim/v6-formation-table.js";
import { continuousBossResult } from "../../../agent/src/sim/continuous-boss-result.js";
import { slimInput } from "../../../agent/src/sim/boss-sim.js";
import { V6ProjectionEngine } from "../../../agent/src/sim/v6-projection.js";
import { SerialDeckRunner, BuildSimPool } from "../../../agent/src/sim/build-sim-pool.js";

const root = "/home/dw/Projects/agent-sts2", live = "/home/dw/Projects/agent-sts2/.worktrees/v6-projection-target-progress-20261020";
const out = new URL("./single-lookup-unit-profile.json", import.meta.url);
const digest = (raw: string | Buffer) => createHash("sha256").update(raw).digest("hex");
globalThis.fetch = async () => { throw new Error("offline_benchmark_network_forbidden"); };
process.env.V6_BUILD = "shadow";
const report: any = { started_at: new Date().toISOString(), no_network: true, no_game_actions: true, stages: [],
  limitations: ["One frozen F8 reward board, current 17/17 history metrics, formal R2 cards; current main Strangle and stock-note source.",
    "Uniform direction weights; no frozen V6 brain answer or chosen route exists for this pre-V6 board.",
    "Retrospective current frozen history cutoff; not a leakage-free estimate of historical decisions.",
    "BuildSimPool(2) nice19 CPU measurements; no model/Jev request or live mutation."] };
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
  const appearancePath = `${root}/ops/codex-ops/v6-refresh/silent/refresh-gvw5soon/appearance.json`;
  const appearanceBytes = readFileSync(appearancePath), appearance = JSON.parse(appearanceBytes.toString());
  report.appearance = { path: appearancePath, bytes: appearanceBytes.length, sha256: digest(appearanceBytes), cutoff: appearance.cutoff };
  r.completionSources = [v6FormationTableSource({ character: r.character, ascension: r.ascension, signature: digest(appearanceBytes),
    table: appearance, excludeRun: context.situation.runId, asOf: context.situation.asOf })];
  report.limitations.push("Standalone frozen appearance table from the same W8 refresh; other history/metrics are R400. Not a production package publication.");
  report.scope = { seed: r.seed, targets: r.targets, options: [r.baseline, ...r.options].map(o => ({id:o.id,card:o.card})),
    directions: r.directions.map(d => ({id:d.id, combos:d.combos.map(c=>c.id)})) };
  save();
  report.limitations.push("Diagnostic W_k is timed even when P<5%; production keeps its threshold. Single skip option and one named combo, not a performance guarantee for all directions.");
  const runner = new BuildSimPool(2);
  try {
    const d = r.directions.find(d => d.id === "P")!;
    for (const target of [r.targets.find(t => t.kind === "current" && !t.unknown)!, r.targets.find(t => t.kind === "chain" && !t.unknown)!]) {
      const stage: any = { target: target.id, combo: "P-toxin-footwork", samples: 20, unbounded_computation_budget: true, supply_mc_ms: 0, incomplete_case_ms: 0 };
      report.stages.push(stage); save();
      let at = performance.now();
      const set = r.completionSources[0]!.resolve({ direction: d, target, options: [r.baseline, r.options[0]!], samples: 20, seed: r.seed, phase: "pick", combinationIds: [stage.combo], deadline: Infinity })!;
      const c = set.combinations[0]!;
      stage.formation_lookup_ms = performance.now() - at; stage.actual_p = c.availability; stage.reasons = c.unknownReasons;
      const completed = c.samples[0]!.states[r.baseline.id];
      at = performance.now();
      const prepared = completed && r.prepare(target, completed, r.baseline);
      const take = c.samples[0]!.states[r.options[0]!.id];
      const other = take && r.prepare(target, take, r.options[0]!);
      stage.preparation_ms = performance.now() - at;
      if (!prepared) { stage.preparation_unknown = true; save(); continue; }
      stage.prepared_sha256 = digest(JSON.stringify(slimInput(prepared.input)));
      stage.in_combo_option_shared_input = !!other && JSON.stringify(slimInput(other.input)) === JSON.stringify(slimInput(prepared.input));
      at = performance.now();
      const result = await runner.run({ base: prepared.input, decks: [prepared.input], orders: [null], samples: 20, seed: r.seed, deadlineMs: 86400000, diagnostics: true });
      stage.completed_deck_ms = performance.now() - at;
      const outcomes = result.outcomes[0]?.[0] ?? [];
      at = performance.now();
      stage.first_wins = outcomes.filter(o => o?.sequence?.firstWon ?? o?.won).length;
      stage.second_played = outcomes.filter(o => typeof o?.sequence?.secondWon === "boolean").length;
      stage.terminal_n = outcomes.filter(o => o && !o.capped && !o.timeUp && (o.won || o.died)).length;
      stage.timed_out = result.timedOut;
      stage.relay = target.kind === "chain" ? continuousBossResult(outcomes.filter(Boolean) as any, 20, true, true) : null;
      stage.w_k = target.kind === "chain" ? stage.relay.joint.value : stage.terminal_n === 20 ? outcomes.filter(o => o?.won).length / 20 : null;
      const p = c.availability[r.baseline.id], pTake = c.availability[r.options[0]!.id];
      stage.product = p == null || stage.w_k == null ? null : p * stage.w_k;
      stage.paired_delta = p == null || pTake == null || stage.w_k == null ? null : (pTake - p) * stage.w_k;
      stage.aggregate_pairing_ms = performance.now() - at;
      save(); process.stdout.write(JSON.stringify(stage) + "\n");
    }
  } finally { await runner.close(); }
  report.ended_at = new Date().toISOString(); save();
}
main().catch(error=>{report.error=error instanceof Error ? error.stack : String(error);save();process.stderr.write(String(error)+"\n");process.exitCode=1;});
