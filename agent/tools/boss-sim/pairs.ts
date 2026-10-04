/**
 * B3's paired deck comparison on logged boss fights (docs/boss-sim.md B1.5 §6): from the pre-fight start (the turn-1
 * state's deck shuffled, the hand empty, the entry HP; boss-sim redealInput fresh), the actual deck against the same
 * deck less one card or plus one card, every variant on the same seeds (compareLines). Variants per fight:
 *   - less the only AoE attack (target all) when the deck has exactly one: expected to hurt most against The Kin;
 *   - less the attack dealing the most, less the card blocking the most;
 *   - plus a Strike (a basic card: about no change or a little worse), plus a copy of the card blocking the most.
 * Offline; writes --out only.
 *
 * Usage: npx tsx tools/boss-sim/pairs.ts [--fights KEY,KEY] [--n 8] [--samples 600] [--set val] [--out experiments/boss-sim/raw/pairs.jsonl]
 */
import { readFileSync, writeFileSync } from "node:fs";

import { makeKnowledge } from "../../src/knowledge/index.js";
import { parseGameState } from "../../src/hand/mod/schema.js";
import { BossSimPool, compareLines, redealInput, runBestOrder } from "../../src/sim/boss-sim.js";
import type { CardModel } from "../../src/reflex/card-model.js";
import { offHandCardModel } from "../../src/reflex/card-model.js";
import type { MoveModelData, RolloutInput } from "../../src/reflex/rollout.js";
import type { MonsterMoves } from "../../src/reflex/rollout-live.js";
import { boardOf } from "./backtest-board.js";
import { fromRoot } from "../../src/core/paths.js";
import { KNOWLEDGE_DIR, knowledgeFile } from "../../src/knowledge/files.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}

const samples = Number(arg("samples", "600"));
const n = Number(arg("n", "8"));
const set = arg("set", "val");
const only = arg("fights", "").split(",").filter((k) => k);
const outPath = arg("out", fromRoot("experiments/boss-sim/raw/pairs.jsonl"));

const label = (c: CardModel) => `${c.name || c.cardId}${c.upgraded ? "+" : ""}`;
const dealt = (c: CardModel) => (c.type === "Attack" && c.damage !== null ? c.damage * Math.max(1, c.hits) * (c.target === "all" ? 2 : 1) : 0);

/** The pre-fight input with the draw pile changed: `drop` (one copy, by index in the pile) out, `add` in. */
function variant(pre: RolloutInput, drop: number | null, add: CardModel | null): RolloutInput {
  const draw = pre.piles.draw.filter((_, i) => i !== drop);
  if (add) draw.push({ ...add, index: 990 });
  return { ...pre, piles: { ...pre.piles, draw } };
}

async function main(): Promise<void> {
  const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: never }).collections, "cache");
  const mm = JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "move-model.json"), "utf8")) as MoveModelData;
  const db = (JSON.parse(readFileSync(knowledgeFile(KNOWLEDGE_DIR, "monster-db.json"), "utf8")) as { monsters: MonsterMoves }).monsters;
  const keys = new Set((JSON.parse(readFileSync(fromRoot("experiments/boss-sim/split.json"), "utf8")) as Record<string, string[]>)[set]);
  const rows = readFileSync(fromRoot("experiments/boss-sim/raw/fights.jsonl"), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as { key: string; encounter: string; entry_hp: number; outcome: string; t1: { state: unknown } });
  // Kin fights first (the AoE check), then one fight per other boss.
  const picked = only.length > 0 ? rows.filter((r) => only.includes(r.key)) : [];
  if (picked.length === 0) {
    const seen = new Set<string>();
    for (const r of [...rows.filter((r) => r.encounter.includes("KIN_PRIEST")), ...rows]) {
      if (!keys.has(r.key) || picked.includes(r)) continue;
      if (seen.has(r.encounter) && !r.encounter.includes("KIN_PRIEST")) continue;
      if (r.encounter.includes("KIN_PRIEST") && picked.filter((p) => p.encounter.includes("KIN_PRIEST")).length >= 3) continue;
      seen.add(r.encounter);
      picked.push(r);
    }
  }
  const pool = new BossSimPool();
  const out: string[] = [];
  try {
    for (const row of picked.slice(0, only.length > 0 ? picked.length : n)) {
      const board = boardOf(parseGameState(row.t1.state), knowledge, row.encounter, db, mm);
      const pre = redealInput(board.input, { fresh: true, hp: row.entry_hp });
      const draw = pre.piles.draw;
      const aoe = draw.map((c, i) => [c, i] as const).filter(([c]) => c.type === "Attack" && c.target === "all" && (c.damage ?? 0) > 0);
      const topAttack = draw.map((c, i) => [c, i] as const).filter(([c]) => dealt(c) > 0).sort((a, b) => dealt(b[0]) - dealt(a[0]))[0];
      const topBlock = draw.map((c, i) => [c, i] as const).filter(([c]) => c.block > 0 && c.type !== "Attack").sort((a, b) => b[0].block - a[0].block)[0];
      const strike = offHandCardModel(null, draw.find((c) => c.cardId.startsWith("STRIKE"))?.cardId ?? "STRIKE_IRONCLAD", false, 990, knowledge);
      const variants: { name: string; input: RolloutInput }[] = [{ name: "actual deck", input: pre }];
      if (aoe.length === 1) variants.push({ name: `- ${label(aoe[0]![0])} (the only AoE attack)`, input: variant(pre, aoe[0]![1], null) });
      if (topAttack) variants.push({ name: `- ${label(topAttack[0])} (the attack dealing most)`, input: variant(pre, topAttack[1], null) });
      if (topBlock) variants.push({ name: `- ${label(topBlock[0])} (the card blocking most)`, input: variant(pre, topBlock[1], null) });
      variants.push({ name: `+ ${label(strike)}`, input: variant(pre, null, strike) });
      if (topBlock) variants.push({ name: `+ ${label(topBlock[0])} (a copy of the card blocking most)`, input: variant(pre, null, topBlock[0]) });
      const results = [];
      // Each deck under its best kill order (runBestOrder), all on the same seeds.
      for (const v of variants) results.push((await runBestOrder((i, l, o) => pool.run(i, l, o), v.input, [null], { samples, seed: 5 })).lines[0]!);
      const base = results[0]!;
      const record = {
        key: row.key,
        enc: row.encounter,
        entryHp: row.entry_hp,
        actual: row.outcome,
        deck: draw.length,
        variants: variants.map((v, i) => {
          const d = compareLines(results[i]!, base);
          return { name: v.name, win: Math.round(results[i]!.winProb * 1000) / 1000, hpLoss: results[i]!.hpLoss.mean, winDiff: d.winDiff, winSe: d.winSe, hpLossDiff: d.hpLossDiff, hpLossSe: d.hpLossSe };
        }),
      };
      out.push(JSON.stringify(record));
      console.error(`${row.key} ${row.encounter} (${row.outcome}): ${record.variants.map((v) => `${v.name} ${v.win} (${v.winDiff >= 0 ? "+" : ""}${v.winDiff} +/- ${v.winSe})`).join("; ")}`);
    }
  } finally {
    await pool.close();
  }
  writeFileSync(outPath, out.join("\n") + "\n");
}

await main();
