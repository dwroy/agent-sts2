/**
 * B3: the synthetic boss start (src/sim/boss-start.ts, built from the run alone) against the logged pre-fight start
 * (the turn-1 frame through the live planner, boss-sim redealInput fresh) on the same logged boss fights: what differs
 * in our side (HP, block, energy, powers, the draw, the potions) and the boss's (parts, HP, powers, first move).
 * Offline; prints a summary and writes --out (JSONL, one line per fight).
 *
 * Usage: npx tsx tools/boss-sim/synthetic-check.ts [--set val] [--limit N] [--out experiments/boss-sim-build/raw/synthetic-check.jsonl]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState } from "../../src/mod/schema.js";
import { redealInput } from "../../src/sim/boss-sim.js";
import { loadMonsterDb, loadMoveModel, syntheticBossStart } from "../../src/sim/boss-start.js";
import type { RolloutInput } from "../../src/strategy/rollout.js";
import type { MonsterMoves } from "../../src/strategy/rollout-live.js";
import { boardOf } from "./backtest-board.js";
import { preFightState } from "./pre-fight.js";
import { fromRoot } from "../../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const set = arg("set", "val");
const limit = Number(arg("limit", "0"));
const outPath = arg("out", fromRoot("experiments/boss-sim-build/raw/synthetic-check.jsonl"));

/** The numbers of a start that the simulation reads. */
function digest(input: RolloutInput) {
  const s = input.solver;
  const p = s.player;
  return {
    hp: p.hp,
    block: p.block,
    energy: p.energy,
    strength: p.strengthNow ?? 0,
    powers: Object.fromEntries(Object.entries(input.playerPowers).filter(([, v]) => v !== 0).sort()),
    drawFirst: input.options?.drawFirst ?? 0,
    deck: input.piles.draw.length + input.piles.discard.length,
    potions: s.hand.filter((c) => c.type === "Potion").map((c) => c.cardId).sort(),
    relicEnergy: input.relicEnergy?.length ?? 0,
    enemies: s.enemies.map((e) => ({ i: e.index, name: e.name, hp: e.hp, maxHp: e.maxHp, block: e.block, vuln: e.vulnerable, weak: e.weak, artifact: e.artifact, asleep: e.asleep ?? 0, slippery: e.slippery ?? 0, minion: e.minion ?? false, attacks: e.attacks.map((a) => `${a.damage}x${a.hits}`).join("+") })),
    moves: input.enemies.map((e) => `${e.id}:${e.move}`),
    enemyPowers: input.enemies.map((e) => Object.fromEntries(Object.entries(e.powers ?? {}).sort())),
  };
}

async function main(): Promise<void> {
  const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: never }).collections, "cache");
  const db = loadMonsterDb();
  const mm = loadMoveModel();
  const keys = new Set((JSON.parse(readFileSync(fromRoot("experiments/boss-sim/split.json"), "utf8")) as Record<string, string[]>)[set]);
  const rows = readFileSync(fromRoot("experiments/boss-sim/raw/fights.jsonl"), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as { key: string; encounter: string; entry_hp: number; asc: number; t1: { state: Record<string, unknown> } });
  const out: string[] = [];
  const diffs: Record<string, number> = {};
  const examples: Record<string, string[]> = {};
  const ms: number[] = [];
  let n = 0;
  for (const row of rows) {
    if (!keys.has(row.key)) continue;
    if (limit && n >= limit) break;
    n += 1;
    const state = parseGameState(row.t1.state);
    let logged;
    try {
      logged = digest(redealInput(boardOf(state, knowledge, row.encounter, db.monsters as MonsterMoves, mm).input, { fresh: true, hp: row.entry_hp }));
    } catch {
      continue;
    }
    const t = performance.now();
    let synth;
    try {
      synth = syntheticBossStart(preFightState(row.t1.state), knowledge, String(state.run?.boss_id ?? ""), row.entry_hp, { db, mm });
    } catch (error) {
      out.push(JSON.stringify({ key: row.key, enc: row.encounter, error: String(error).slice(0, 300) }));
      diffs["error"] = (diffs["error"] ?? 0) + 1;
      continue;
    }
    ms.push(performance.now() - t);
    const mine = digest(synth.input);
    const differ: string[] = [];
    for (const field of Object.keys(logged) as (keyof typeof logged)[]) {
      const a = JSON.stringify(logged[field]);
      const b = JSON.stringify(mine[field]);
      if (a === b) continue;
      differ.push(field);
      diffs[field] = (diffs[field] ?? 0) + 1;
      (examples[field] ??= []).length < 6 && examples[field]!.push(`${row.key} ${row.encounter}: logged ${a.slice(0, 260)} | synthetic ${b.slice(0, 260)} | relics applied ${synth.relics.applied.join(",")}`);
    }
    out.push(JSON.stringify({ key: row.key, enc: row.encounter, asc: row.asc, differ, logged, synthetic: mine, applied: synth.relics.applied, unmodelled: synth.relics.unmodelled }));
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, out.join("\n") + "\n");
  ms.sort((a, b) => a - b);
  console.log(`${n} fights (${set}); synthetic start ms median ${ms[Math.floor(ms.length / 2)]?.toFixed(0)} max ${ms[ms.length - 1]?.toFixed(0)}`);
  console.log("fields differing (fights):", JSON.stringify(diffs));
  for (const [field, list] of Object.entries(examples)) console.log(`\n## ${field}\n${list.join("\n")}`);
}

await main();
