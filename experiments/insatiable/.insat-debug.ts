// scratch debug (not committed)
import { readFileSync, openSync, readSync } from "node:fs";
import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { simulateFight, type RolloutInput, type RolloutResult } from "../src/strategy/rollout.js";
import { rolloutLiveOptions, rolloutTap } from "../src/strategy/rollout-live.js";
import { solveTap } from "../src/strategy/turn-solver.js";
const off = Number(process.argv[2]); const lineIdx = Number(process.argv[3] ?? 0); const nS = Number(process.argv[4] ?? 8);
const config = loadConfig(process.env);
const knowledge = makeKnowledge(JSON.parse(readFileSync(".cache/game-data.json", "utf8")).collections, "cache");
const fd = openSync("logs/states.jsonl", "r");
const buf = Buffer.alloc(1 << 20); const n = readSync(fd, buf, 0, buf.length, off);
const raw = JSON.parse(buf.subarray(0, buf.subarray(0, n).indexOf(10)).toString("utf8")).state;
const state = parseGameState(raw);
const env = { state, knowledge, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory("COMBAT"), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", shopDiscardPotions: [] } as any;
let tapped: { input: RolloutInput; result: RolloutResult } | null = null;
rolloutTap.onRollout = (input, result) => { tapped = { input, result }; };
rolloutLiveOptions.now = () => 0; potionMcOptions.now = () => 0;
planCombatTurn(env);
const { input, result } = tapped!;
const line = result.lines[lineIdx]!;
console.log("line", line.plan.steps.map((s) => s.cardId).join(","), "wins", line.wins, "deaths", line.deaths, "samples", line.samples, "seed", input.options?.seed);
for (let j = 0; j < nS; j += 1) {
  const turns: string[] = [];
  solveTap.onSolve = (si, res) => {
    const best = res.plans[0];
    const pit = si.enemies.map((e) => e.sandpit).join("/");
    turns.push(`  [pit ${pit} hp ${si.player.hp} blk ${si.player.block} en ${si.player.energy} boss ${si.enemies.map((e) => e.hp).join("/")} atk ${si.enemies.map((e) => e.attacks.map((a) => a.damage + "x" + a.hits).join("+")).join("|")}] hand ${si.hand.map((c) => `${c.cardId}(${c.cost}${c.playable === false ? ",X" : ""})`).join(" ")} -> ${best ? best.steps.map((s) => s.cardId).join(",") : "NONE"} | dies ${best?.outcome.dies} hpAfter ${best?.outcome.hpAfter} pitAfter ${best?.outcome.sandpitAfter} win ${best?.outcome.winsFight} trunc ${res.truncated} nodes ${res.nodes} nplans ${res.plans.length}`);
  };
  const { records } = simulateFight(input, line.plan, input.options?.horizon ?? 5, (input.options?.seed ?? 1) * 7919 + 1 + j, false);
  solveTap.onSolve = null;
  console.log(`sample ${j}: ${records.map((r) => (r.won ? "W" : r.died ? "D" : ".") + `(-${r.loss})`).join(" ")}`);
  for (const t of turns) console.log(t);
}
