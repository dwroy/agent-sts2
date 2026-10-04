/**
 * B2's line comparison on logged boss-fight states (docs/boss-sim.md B1.5 §5): at `--n` mid-fight turns Jev planned
 * (tools/boss-sim/choices.py; a spread over the bosses, one turn per fight, turns 2-8 of the chosen split side), the
 * board rebuilt as the live planner built it, and every candidate line (the solver's first `--top` plus the line Jev
 * chose, found by its text, and the sim's own policy line) played to the fight's end by the whole-fight simulator,
 * each under its best kill order (runBestOrder), all lines on the same seeds. Per
 * turn: each line's win rate and HP loss, the paired differences to the best line (compareLines), and where Jev's line
 * ranks. Offline: logs/states.jsonl read by offset (read-only); writes --out only.
 *
 * Usage: npx tsx tools/boss-sim/lines.ts [--n 30] [--top 5] [--samples 300] [--set val] [--out experiments/boss-sim/raw/lines.jsonl]
 */
import { readFileSync, writeFileSync } from "node:fs";

import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState } from "../../src/mod/schema.js";
import { describePlan } from "../../src/screens/combat-plan.js";
import { BossSimPool, compareLines, runBestOrder, type BossSimLineResult } from "../../src/sim/boss-sim.js";
import type { MoveModelData } from "../../src/strategy/rollout.js";
import type { MonsterMoves } from "../../src/strategy/rollout-live.js";
import type { Plan } from "../../src/strategy/turn-solver.js";
import { boardOf, readAt } from "./backtest-board.js";
import { fromRoot } from "../../src/core/paths.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../../src/knowledge/files.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const n = Number(arg("n", "30"));
const top = Number(arg("top", "5"));
const samples = Number(arg("samples", "300"));
const set = arg("set", "val");
const outPath = arg("out", fromRoot("experiments/boss-sim/raw/lines.jsonl"));

interface ChoiceRow {
  key: string;
  enc: string;
  turn: number;
  s_off: number;
  s_len: number;
  choice: string;
  lines: Record<string, { hp_lost: number; plays: string }>;
}

/** A stable pseudo-random order (FNV-1a of the fight and turn), so the pick does not depend on file order. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** Better first: win rate, then less HP lost. */
function better(a: BossSimLineResult, b: BossSimLineResult): number {
  return b.winProb - a.winProb || a.hpLoss.mean - b.hpLoss.mean;
}

async function main(): Promise<void> {
  const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: never }).collections, "cache");
  const mm = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "move-model.json"), "utf8")) as MoveModelData;
  const db = (JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "monster-db.json"), "utf8")) as { monsters: MonsterMoves }).monsters;
  const keys = new Set((JSON.parse(readFileSync(fromRoot("experiments/boss-sim/split.json"), "utf8")) as Record<string, string[]>)[set]);
  const byBoss = new Map<string, ChoiceRow[]>();
  const seenFight = new Set<string>();
  const rows = readFileSync(fromRoot("experiments/boss-sim/raw/choices.jsonl"), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as ChoiceRow);
  rows.sort((a, b) => hash(`${a.key}:${a.turn}`) - hash(`${b.key}:${b.turn}`));
  for (const row of rows) {
    if (!keys.has(row.key) || row.turn < 2 || row.turn > 8 || Object.keys(row.lines).length < 3 || seenFight.has(row.key)) continue;
    seenFight.add(row.key);
    const boss = row.enc.split("+")[0]!;
    byBoss.set(boss, [...(byBoss.get(boss) ?? []), row]);
  }
  // Round-robin over the bosses, so every boss with a candidate turn is in.
  const queue: ChoiceRow[] = [];
  const lists = [...byBoss.values()];
  for (let k = 0; queue.length < rows.length && lists.some((l) => l.length > k); k += 1) for (const list of lists) if (list[k]) queue.push(list[k]!);
  const pool = new BossSimPool();
  const out: string[] = [];
  let done = 0;
  try {
    for (const row of queue) {
      if (done >= n) break;
      let board: ReturnType<typeof boardOf>;
      try {
        board = boardOf(parseGameState((JSON.parse(readAt(fromRoot("logs/states.jsonl"), row.s_off, row.s_len)) as { state: unknown }).state), knowledge, row.enc, db, mm);
      } catch {
        continue;
      }
      const hp = board.solver.player.hp;
      const chosen = row.lines[row.choice];
      const jevAt = chosen ? board.plans.findIndex((p) => describePlan(p, hp)["plays"] === chosen.plays) : -1;
      if (jevAt < 0) continue;
      const picks = [...new Set([...board.plans.slice(0, top).map((_, i) => i), jevAt])];
      const lines: (Plan | null)[] = [...picks.map((i) => board.plans[i]!), null];
      const started = performance.now();
      // Each line under its best kill order (runBestOrder: the solver's own targets and every order), same seeds.
      const res = await runBestOrder((i, l, o) => pool.run(i, l, o), board.input, lines, { samples, seed: 11 });
      const elapsedMs = Math.round(performance.now() - started);
      const evaluated = res.lines.slice(0, picks.length);
      const ranked = evaluated.slice().sort(better);
      const best = ranked[0]!;
      const jev = evaluated[picks.indexOf(jevAt)]!;
      const policy = res.lines[picks.length]!;
      const vsBest = compareLines(jev, best);
      const record = {
        key: row.key,
        enc: row.enc,
        turn: row.turn,
        hp,
        incoming: board.solver.enemies.reduce((sum, e) => sum + (e.hp > 0 ? e.attacks.reduce((s, a) => s + a.damage * a.hits, 0) : 0), 0),
        lines: picks.map((codeRank, i) => ({
          codeRank: codeRank + 1,
          jev: codeRank === jevAt,
          plays: describePlan(board.plans[codeRank]!, hp)["plays"],
          turnLoss: board.plans[codeRank]!.outcome.hpLoss,
          turnDmg: board.plans[codeRank]!.outcome.damageDealt,
          win: Math.round(evaluated[i]!.winProb * 1000) / 1000,
          hpLoss: evaluated[i]!.hpLoss.mean,
          hpLossWonMedian: evaluated[i]!.hpLossWon?.median ?? null,
        })),
        policy: { win: Math.round(policy.winProb * 1000) / 1000, hpLoss: policy.hpLoss.mean },
        bestCodeRank: picks[evaluated.indexOf(best)]! + 1,
        jevCodeRank: jevAt + 1,
        jevSimRank: ranked.indexOf(jev) + 1,
        jevVsBest: vsBest,
        jevTied: jev === best || (Math.abs(vsBest.winDiff) <= 2 * vsBest.winSe && Math.abs(vsBest.hpLossDiff) <= 2 * Math.max(vsBest.hpLossSe, 0.5)),
        orders: res.byOrder.length,
        ms: elapsedMs,
      };
      out.push(JSON.stringify(record));
      done += 1;
      console.error(`${done}/${n} ${row.key} T${row.turn} ${row.enc}: jev code#${jevAt + 1} sim#${record.jevSimRank}/${picks.length} win ${jev.winProb.toFixed(2)} vs best ${best.winProb.toFixed(2)} (${vsBest.winDiff.toFixed(3)} +/- ${vsBest.winSe.toFixed(3)}) ${elapsedMs} ms`);
    }
  } finally {
    await pool.close();
  }
  writeFileSync(outPath, out.join("\n") + "\n");
}

await main();
