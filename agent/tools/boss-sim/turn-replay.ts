/**
 * One-turn replay of the whole-fight simulator's policy (docs/boss-sim.md B1.5): at every logged boss-fight turn Jev
 * planned (the first plan choice of the turn, tools/boss-sim/choices.py), the board as the live planner built it, and
 * the one turn the sim's policy plays from it (simulateFight with no line, maxTurns 1) under each policy setting given,
 * beside the solver's best line and Jev's chosen line played by the sim's mechanics. The report compares them with the
 * turn the log shows (HP lost, damage dealt): where the whole fight's per-turn leak comes from, free of compounding.
 * Offline: reads the choices file, logs/states.jsonl by offset (read-only) and the committed knowledge; writes only
 * --out-dir.
 *
 * Usage: npx tsx tools/boss-sim/turn-replay.ts [--in experiments/boss-sim/raw/choices.jsonl] [--out-dir experiments/boss-sim/raw/replay]
 *          [--shard I --shards N] [--samples 8] [--configs "d0.5;d1;d0.5,h1.5;d0.5,t1"] [--limit N]
 * A config: comma-separated d<damageScale>, h<hpScale>, t<threat> (defaults 1, 1, 0).
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState } from "../../src/hand/mod/schema.js";
import { describePlan } from "../../src/reflex/combat-plan.js";
import { redealInput, runBossSim, type BossSimLineResult } from "../../src/sim/boss-sim.js";
import type { MoveModelData } from "../../src/reflex/rollout.js";
import type { MonsterMoves } from "../../src/reflex/rollout-live.js";
import { boardOf, queenOrder, readAt } from "./backtest-board.js";
import { fromRoot } from "../../src/core/paths.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../../src/knowledge/files.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

export interface PolicyConfig {
  name: string;
  damageScale: number;
  hpScale: number;
  threat: number;
}

export function parseConfigs(text: string): PolicyConfig[] {
  return text.split(";").filter((c) => c.trim() !== "").map((c) => {
    const cfg: PolicyConfig = { name: c.trim(), damageScale: 1, hpScale: 1, threat: 0 };
    for (const part of c.split(",")) {
      const v = Number(part.slice(1));
      if (part.startsWith("d")) cfg.damageScale = v;
      else if (part.startsWith("h")) cfg.hpScale = v;
      else if (part.startsWith("t")) cfg.threat = v;
    }
    return cfg;
  });
}

const inPath = arg("in", fromRoot("experiments/boss-sim/raw/choices.jsonl"));
const outDir = arg("out-dir", fromRoot("experiments/boss-sim/raw/replay"));
const shard = Number(arg("shard", "0"));
const shards = Number(arg("shards", "1"));
const samples = Number(arg("samples", "8"));
const limit = Number(arg("limit", "0"));
const configs = parseConfigs(arg("configs", "d0.5;d1"));
const redeal = process.argv.includes("--redeal");

const r1 = (x: number) => Math.round(x * 10) / 10;
const turn0 = (line: BossSimLineResult) => ({
  loss: r1(line.outcomes.reduce((sum, o) => sum + (o.lossByTurn[0] ?? 0), 0) / line.outcomes.length),
  dmg: r1(line.outcomes.reduce((sum, o) => sum + (o.dmgByTurn[0] ?? 0), 0) / line.outcomes.length),
  died: line.deaths,
});

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `replay-${shard}.jsonl`);
  writeFileSync(out, "");
  const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: never }).collections, "cache");
  const mm = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "move-model.json"), "utf8")) as MoveModelData;
  const db = (JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "monster-db.json"), "utf8")) as { monsters: MonsterMoves }).monsters;
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const line of readFileSync(inPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as Record<string, unknown>;
    const id = `${row["key"]}:${row["turn"]}`;
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(row);
  }
  let done = 0;
  for (let index = 0; index < rows.length; index += 1) {
    if (index % shards !== shard) continue;
    if (limit && done >= limit) break;
    done += 1;
    const row = rows[index] as { key: string; enc: string; turn: number; s_off: number; s_len: number; choice: string; lines: Record<string, { hp_lost: number; damage_dealt?: number; plays: string }> };
    const base = { key: row.key, enc: row.enc, turn: row.turn };
    try {
      const state = parseGameState((JSON.parse(readAt(fromRoot("logs/states.jsonl"), row.s_off, row.s_len)) as { state: unknown }).state);
      const board = boardOf(state, knowledge, row.enc, db, mm);
      const hp = board.solver.player.hp;
      const chosen = row.lines[row.choice];
      const jevAt = chosen ? board.plans.findIndex((p) => describePlan(p, hp)["plays"] === chosen.plays) : -1;
      const order = queenOrder(board.input);
      const record: Record<string, unknown> = {
        ...base,
        hp,
        incoming: board.solver.enemies.reduce((sum, e) => sum + (e.hp > 0 ? e.attacks.reduce((s, a) => s + a.damage * a.hits, 0) : 0), 0),
        plan1Pred: { loss: board.plans[0]!.outcome.hpLoss, dmg: board.plans[0]!.outcome.damageDealt },
        jevPred: chosen ? { loss: chosen.hp_lost, dmg: chosen.damage_dealt ?? null } : null,
        jevAt,
      };
      const fixed = [board.plans[0]!, ...(jevAt >= 0 ? [board.plans[jevAt]!] : [])];
      const res = runBossSim(board.input, fixed, { samples, maxTurns: 1, seed: 7 + index, order });
      record["plan1Sim"] = turn0(res.lines[0]!);
      if (jevAt >= 0) record["jevSim"] = turn0(res.lines[1]!);
      const policy: Record<string, unknown> = {};
      for (const cfg of configs) {
        const one = runBossSim(board.input, [null], { samples, maxTurns: 1, seed: 7 + index, order, damageScale: cfg.damageScale, hpScale: cfg.hpScale, threat: cfg.threat });
        policy[cfg.name] = turn0(one.lines[0]!);
        // --redeal: the same, the hand dealt again from the pile (how the whole fight's later turns get theirs).
        if (redeal) {
          const again = runBossSim(redealInput(board.input), [null], { samples: samples * 2, maxTurns: 1, seed: 7 + index, order, damageScale: cfg.damageScale, hpScale: cfg.hpScale, threat: cfg.threat });
          policy[`${cfg.name}/redeal`] = turn0(again.lines[0]!);
        }
      }
      record["hand"] = board.solver.hand.filter((c) => c.type !== "Potion").length;
      record["energy"] = board.solver.player.energy;
      record["piles"] = board.piles;
      record["policy"] = policy;
      appendFileSync(out, JSON.stringify(record) + "\n");
    } catch (error) {
      appendFileSync(out, JSON.stringify({ ...base, error: String(error).slice(0, 300) }) + "\n");
    }
  }
  console.error(`turn-replay shard ${shard}/${shards}: ${done} turns -> ${out}`);
}

await main();
