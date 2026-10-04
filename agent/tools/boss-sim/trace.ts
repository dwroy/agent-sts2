/**
 * One logged boss fight, one simulated sample, turn by turn beside what happened (debugging the backtest's biases).
 * Usage: npx tsx tools/boss-sim/trace.ts KEY [--start t1|t5] [--seed N] [--in experiments/boss-sim/raw/fights.jsonl]
 */
import { readFileSync } from "node:fs";

import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState } from "../../src/hand/mod/schema.js";
import { sampleSeed, slimInput } from "../../src/sim/boss-sim.js";
import { simulateFight, type MoveModelData } from "../../src/reflex/rollout.js";
import { solveTap } from "../../src/reflex/turn-solver.js";
import type { MonsterMoves } from "../../src/reflex/rollout-live.js";
import { boardOf } from "./backtest-board.js";
import { fromRoot } from "../../src/core/paths.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../../src/knowledge/files.js";

const arg = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
};
const key = process.argv[2]!;
const start = arg("start", "t1");
const seed = Number(arg("seed", "1"));
const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: never }).collections, "cache");
const mm = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "move-model.json"), "utf8")) as MoveModelData;
const db = (JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "monster-db.json"), "utf8")) as { monsters: MonsterMoves }).monsters;
const row = readFileSync(arg("in", fromRoot("experiments/boss-sim/raw/fights.jsonl")), "utf8").split("\n").map((l) => (l.includes(`"key": "${key}"`) ? JSON.parse(l) : null)).find((r) => r);
if (!row) throw new Error(`no fight ${key}`);
const point = start === "t5" ? row.t5 : row.t1;
const board = boardOf(parseGameState(point.state), knowledge, row.encounter, db, mm);
console.log(`${key} ${row.encounter} A${row.asc} actual ${row.outcome} in ${row.turns} turns, ${point.hp} -> ${row.end_hp}; draw ${board.input.piles.draw.length} discard ${board.input.piles.discard.length} hand ${board.solver.hand.map((c) => c.cardId + (c.upgraded ? "+" : "")).join(" ")}`);
console.log("tables:", Object.entries(board.input.tables).map(([id, t]) => `${id}: ${Object.entries(t.moves).map(([m, v]) => `${m.replace("_MOVE", "")} ${v.damage}x${v.hits}${v.strength ? ` +${v.strength}str` : ""}${v.block ? ` ${v.block}blk` : ""}${v.selfPowers ? " " + JSON.stringify(v.selfPowers) : ""}${v.playerPowers ? " " + JSON.stringify(v.playerPowers) : ""}`).join("; ")}`).join("\n  "));
const solves: string[] = [];
solveTap.onSolve = (input, result) => {
  solves.push(`hand[${input.player.energy}e str${input.player.strengthNow ?? 0}]: ${input.hand.map((c) => `${c.cardId}${c.upgraded ? "+" : ""}(${c.cost}${c.damage !== null ? `/${c.damage}x${c.hits}` : ""}${c.block ? `/b${c.block}` : ""})`).join(" ")} || ${result.plans.slice(0, 3).map((p) => `[${p.steps.map((s) => s.cardId.replace("_IRONCLAD", "")).join(",")} d${p.outcome.damageDealt} l${p.outcome.hpLoss} s${p.score.toFixed(1)}]`).join(" ")} | enemies ${input.enemies.map((e) => `${e.name} ${e.hp} b${e.block}${e.slippery ? ` slip${e.slippery}` : ""} atk${e.attacks.map((a) => `${a.damage}x${a.hits}`).join("+")}`).join("; ")}`);
};
const traj = simulateFight(slimInput(board.input), board.plans[0]!, 30, sampleSeed(seed, 0));
let hp = board.solver.player.hp;
traj.records.forEach((r, i) => {
  hp -= r.loss;
  const enemies = r.snap.E.filter((e) => e[5]).map((e) => `${e[1]} ${e[2]}/${e[3]} blk${e[4]} ${String(e[8] ?? "").replace("_MOVE", "")} int${e[7]} str${e[9]["STRENGTH_POWER"] ?? 0}`).join(" | ");
  if (i > 0) console.log(`   ${solves[i - 1] ?? ""}`);
  console.log(`T${i + 1}: loss ${r.loss} (enemy ${r.enemyPart}) dmg ${r.dmg} hp->${hp}${r.won ? " WON" : ""}${r.died ? " DIED" : ""}  ${enemies}`);
});
