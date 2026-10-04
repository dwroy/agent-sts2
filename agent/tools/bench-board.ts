/**
 * The planner's compute cost on exported boards (tools/combat-latency-replay.ts --export), with every clock frozen so the
 * work is the same on every tree: the rollout runs its whole schedule, the random potions their samples, and B2 runs
 * --b2-samples samples a line in this thread (bossLinesOptions.serial). Uses only APIs v4 7956ec2 (the V4.5 start) has, so
 * the same file runs on a git archive of an older commit to compare (a regression in the solver, the rollout or the
 * whole-fight simulator shows as ms a board).
 *
 * Usage: nice -n 10 npx tsx tools/bench-board.ts --boards DIR [--match a6-T1] [--b2-samples 10] [--repeat 2] [--out FILE]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv, type SlEnv } from "../src/project/types.js";
import { planCombatTurn, thiefTrace } from "../src/screens/combat-plan.js";
import { bossLinesOptions, type BossLineSim } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const dir = arg("boards", "");
const match = arg("match", "");
const b2Samples = Number(arg("b2-samples", "10"));
const repeat = Number(arg("repeat", "1"));
const out = arg("out", "");
const knowledge = makeKnowledge((JSON.parse(readFileSync(arg("game-data", fromRoot("data/game-data.json")), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

rolloutLiveOptions.enabled = true;
rolloutLiveOptions.now = () => 0;
potionMcOptions.now = () => 0;
bossLinesOptions.now = () => 0;
bossLinesOptions.enabled = b2Samples > 0;
bossLinesOptions.serial = true;
bossLinesOptions.samples = b2Samples;
thiefTrace.enabled = true;

const rows: string[] = [];
for (const name of readdirSync(dir).filter((f) => f.endsWith(".json") && f.includes(match)).sort()) {
  const board = JSON.parse(readFileSync(join(dir, name), "utf8")) as { sl: SlEnv | null; state: Record<string, unknown> };
  const sl = board.sl ? { ...board.sl, ...(board.sl.compute ? { compute: { ...board.sl.compute, bossSimSamples: b2Samples } } : {}) } : undefined;
  let best: { ms: number; rollout: number; b2: number; mc: number; b2Sims: number; b2Turns: number; b2Nodes: number; b2Win: number | null; kind: string } | null = null;
  for (let k = 0; k < repeat; k += 1) {
    const state = parseGameState(board.state);
    const env = {
      state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto",
      characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], jevContext: "v1", buildDecider: "deepseek",
      ...(sl ? { sl } : {}), thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
      mechMoveRules: (config as unknown as Record<string, unknown>)["mechMoveRules"], mechDeathMove: (config as unknown as Record<string, unknown>)["mechDeathMove"], sandpitStart: (config as unknown as Record<string, unknown>)["sandpitStart"],
    } as unknown as DecisionEnv;
    let sim: BossLineSim | null = null;
    bossLinesOptions.onSim = (s) => {
      sim = s;
    };
    // The planner's clocks are frozen; this one is the wall clock (B2's cost: the run with --b2-samples 0 less this one).
    thiefTrace.last = null;
    const t0 = performance.now();
    const decision = planCombatTurn(env);
    const ms = performance.now() - t0;
    const trace = thiefTrace.last as { rollout?: { available: boolean } | null; mcShown?: { ms: number }[] } | null;
    const done = sim as BossLineSim | null;
    const sims = done && done.available ? done.run.samples * done.byPlan.size * (done.run.orders + 1) : 0;
    // B2's simulated turns and solver nodes (the lines' best orders only: the other orders' samples are not kept).
    const lines = done && done.available ? done.run.lines : [];
    const b2Turns = lines.reduce((sum, line) => sum + line.policyTurns, 0);
    const b2Nodes = lines.reduce((sum, line) => sum + line.policyNodes, 0);
    const b2Win = lines.length > 0 ? Math.round(Math.max(...lines.map((line) => line.winProb)) * 1000) / 1000 : null;
    const row = { ms: Math.round(ms), rollout: trace?.rollout?.available ? 1 : 0, b2: sims > 0 ? 1 : 0, mc: (trace?.mcShown ?? []).length, b2Sims: sims, b2Turns, b2Nodes, b2Win, kind: decision?.kind ?? "none" };
    if (!best || row.ms < best.ms) best = row;
  }
  rows.push(JSON.stringify({ board: name, ...best }));
  console.log(`${name} ${best!.kind} ${best!.ms} ms (rollout ${best!.rollout ? "yes" : "no"}, b2 sims ${best!.b2Sims}, b2 best-order turns ${best!.b2Turns} nodes ${best!.b2Nodes} best win ${best!.b2Win}, random potions ${best!.mc})`);
}
if (out) writeFileSync(out, rows.join("\n") + "\n");
