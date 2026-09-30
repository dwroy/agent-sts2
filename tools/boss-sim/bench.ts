/**
 * Timing of the whole boss fight simulator (src/sim/boss-sim.ts) on logged boss fights (tools/boss-sim/extract.py):
 * one sample, N samples serial, N samples on the worker pool, and several lines at once (B2 compares a turn's
 * candidate lines). Offline; nothing written but the JSON printed.
 *
 * Usage: npx tsx tools/boss-sim/bench.ts [--fights 8] [--workers 24] [--samples 100,300] [--lines 6] [--start t1]
 */
import { readFileSync } from "node:fs";

import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState } from "../../src/mod/schema.js";
import { BossSimPool, fightSample, runBossSim, sampleSeed, slimInput } from "../../src/sim/boss-sim.js";
import type { MoveModelData } from "../../src/strategy/rollout.js";
import type { MonsterMoves } from "../../src/strategy/rollout-live.js";
import { boardOf } from "./backtest-board.js";

const arg = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
};
const nFights = Number(arg("fights", "8"));
const workers = Number(arg("workers", "24"));
const sizes = arg("samples", "100,300").split(",").map(Number);
const nLines = Number(arg("lines", "6"));
const start = arg("start", "t1");

const knowledge = makeKnowledge((JSON.parse(readFileSync(".cache/game-data.json", "utf8")) as { collections: never }).collections, "cache");
const mm = JSON.parse(readFileSync("src/knowledge/move-model.json", "utf8")) as MoveModelData;
const db = (JSON.parse(readFileSync("src/knowledge/monster-db.json", "utf8")) as { monsters: MonsterMoves }).monsters;
const rows = readFileSync(arg("in", "experiments/boss-sim/raw/fights.jsonl"), "utf8").split("\n").filter((l) => l.trim() !== "");
// Spread over the file (every boss, both early and late runs).
const picked = Array.from({ length: nFights }, (_, k) => JSON.parse(rows[Math.floor((k * rows.length) / nFights)]!) as { key: string; encounter: string; t1: { state: Record<string, unknown> }; t5?: { state: Record<string, unknown> } });

const pool = new BossSimPool(workers);
// Warm the pool (worker start-up and module loading are paid once per pool).
const warmStarted = performance.now();
{
  const first = picked[0]!;
  const board = boardOf(parseGameState((start === "t5" && first.t5 ? first.t5 : first.t1).state), knowledge, first.encounter, db, mm);
  await pool.run(board.input, [board.plans[0]!], { samples: workers, seed: 1 });
}
const warmMs = Math.round(performance.now() - warmStarted);
const out: Record<string, unknown>[] = [];
for (const row of picked) {
  const point = start === "t5" && row.t5 ? row.t5 : row.t1;
  const board = boardOf(parseGameState(point.state), knowledge, row.encounter, db, mm);
  const line = board.plans[0]!;
  const slim = slimInput(board.input);
  let t = performance.now();
  const one = fightSample(slim, line, sampleSeed(1, 0));
  const oneMs = performance.now() - t;
  const entry: Record<string, unknown> = { key: row.key, enc: row.encounter, oneSampleMs: Math.round(oneMs * 10) / 10, oneSampleTurns: one.turns };
  for (const n of sizes) {
    t = performance.now();
    const serial = runBossSim(board.input, [line], { samples: n, seed: 1 });
    entry[`serial${n}Ms`] = Math.round(performance.now() - t);
    t = performance.now();
    const parallel = await pool.run(board.input, [line], { samples: n, seed: 1 });
    entry[`pool${n}Ms`] = Math.round(performance.now() - t);
    entry[`same${n}`] = JSON.stringify(parallel.lines[0]!.outcomes) === JSON.stringify(serial.lines[0]!.outcomes);
    entry[`meanTurns${n}`] = serial.lines[0]!.turns.mean;
  }
  const lines = board.plans.slice(0, nLines);
  const n = sizes[sizes.length - 1]!;
  t = performance.now();
  await pool.run(board.input, lines, { samples: n, seed: 1 });
  entry["lines"] = lines.length;
  entry[`poolLinesx${n}Ms`] = Math.round(performance.now() - t);
  out.push(entry);
  console.error(JSON.stringify(entry));
}
await pool.close();
const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const summary: Record<string, unknown> = { workers, warmMs, fights: out.length, oneSampleMsMedian: med(out.map((e) => e["oneSampleMs"] as number)) };
for (const key of Object.keys(out[0] ?? {}).filter((k) => /Ms$/.test(k) && k !== "oneSampleMs")) {
  const xs = out.map((e) => e[key] as number);
  summary[key] = { median: med(xs), max: Math.max(...xs) };
}
summary["allSame"] = out.every((e) => sizes.every((n) => e[`same${n}`] === true));
console.log(JSON.stringify({ summary, fights: out }, null, 1));
