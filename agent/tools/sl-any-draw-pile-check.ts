/**
 * Calibration of SL_JUDGE_ANY_DRAW's draw-pile cards (docs/sl.md §2.3): the superset board puts every card of the draw pile
 * into the hand as combat-plan pileCardNow models it from the pile's line (the line's numbers, the board's Strength, Weak
 * and Dexterity, the line's cost). The bound is sound only if those numbers are never below the card's once drawn. Read-only
 * over the logs: for every two successive combat frames of a turn (logs/states.jsonl through the log DB) where a card came
 * into the hand that the earlier frame's draw pile held (same id, same upgrade), the drawn card as the hand shows it
 * (card-model modelHandCard on the later frame) against the pile's model (on the later frame's Strength, Weak and
 * Dexterity): damage, hits, block, cost. A hand number above the pile's (or a cost below) is a violation; it is harmless only
 * when the bound already counts that card as not exact (anyDrawInexact, an enchantment, numbers differing from the deck's, a
 * relic changing its numbers), since then no line may live past the draw.
 *
 * Usage: npx tsx tools/sl-any-draw-pile-check.ts [--scope sl|all] [--shard i/n] [--out experiments/sl-any-draw]
 * Output: <out>/pile-check[-<shard>].jsonl, one row per drawn card compared; a count on stdout.
 */
import { execFileSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { pileCardCost, pileCardInexact, pileCardNow, pileEntries, vambraceArmed } from "../src/screens/combat-plan.js";
import { loadSlElites } from "../src/sl/elites.js";
import { randomTargets } from "../src/sl/random-target.js";
import { modelHandCard } from "../src/strategy/card-model.js";
import { asArray, asRecord, bool, num, str } from "../src/util/json.js";
import { fromRoot } from "../src/core/paths.js";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1]! : fallback;
}
const outDir = arg("out", fromRoot("experiments/sl-any-draw"));
const scope = arg("scope", "sl") as "all" | "sl";
const [shardAt, shardOf] = arg("shard", "0/1").split("/").map(Number) as [number, number];
type Row = Record<string, unknown>;

function query(sql: string): Row[] {
  const out = execFileSync(fromRoot("data/logdb-venv/bin/python"), [fromRoot("agent/tools/logdb/query.py"), "--no-sync", "--json", "--max-rows", "2000000", "--timeout", "300", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  const data = JSON.parse(out) as { columns: string[]; rows: unknown[][]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.rows.map((row) => Object.fromEntries(data.columns.map((column, i) => [column, row[i]])));
}
const fd = openSync(fromRoot("logs/states.jsonl"), "r");
function stateAt(off: number, len: number): GameState {
  const buffer = Buffer.alloc(len);
  readSync(fd, buffer, 0, len, off);
  return parseGameState((JSON.parse(buffer.toString("utf8")) as Row)["state"] as Record<string, unknown>);
}
const knowledge = makeKnowledge((JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")) as { collections: Record<string, unknown[]> }).collections, "cache");

const power = (state: GameState, id: string) =>
  asArray(asRecord(asRecord(state.raw["combat"])["player"])["powers"]).map(asRecord).filter((p) => str(p["power_id"]) === id).reduce((sum, p) => sum + num(p["amount"]), 0);
const handKeys = (state: GameState) => asArray(asRecord(state.raw["combat"])["hand"]).map(asRecord).map((card) => `${str(card["card_id"])}${bool(card["upgraded"]) ? "+" : ""}`);

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `pile-check${shardOf > 1 ? `-${shardAt}` : ""}.jsonl`);
  writeFileSync(out, "");
  const listedIds = new Set(loadSlElites().elites.flatMap((elite) => elite.enemy_ids));
  const fights = query(`SELECT run_id, floor, room, ascension, monsters FROM fights ORDER BY first_ts`).filter((fight) => {
    const listed = String(fight["room"]) === "boss" || ((fight["monsters"] as string[] | null) ?? []).some((id) => listedIds.has(id));
    return scope === "all" || (listed && Number(fight["ascension"]) >= 8);
  });
  let compared = 0;
  let violations = 0;
  let unflagged = 0;
  fights.forEach((fight, index) => {
    if (index % shardOf !== shardAt) return;
    const run = String(fight["run_id"]);
    const floor = Number(fight["floor"]);
    const frames = query(`SELECT off, len, turn FROM state_index WHERE run_id = '${run}' AND floor = ${floor} AND screen = 'COMBAT' AND turn IS NOT NULL ORDER BY off`);
    let prev: GameState | null = null;
    let prevTurn: number | null = null;
    for (const frame of frames) {
      const state = stateAt(Number(frame["off"]), Number(frame["len"]));
      const turn = Number(frame["turn"]);
      if (prev && prevTurn === turn && asRecord(state.raw["combat"])["hand"]) {
        const before = handKeys(prev);
        const gained: Record<string, unknown>[] = [];
        for (const card of asArray(asRecord(state.raw["combat"])["hand"]).map(asRecord)) {
          const key = `${str(card["card_id"])}${bool(card["upgraded"]) ? "+" : ""}`;
          const at = before.indexOf(key);
          if (at >= 0) before.splice(at, 1);
          else gained.push(card);
        }
        // Vigor and Pen Nib are in the hand's shown damage, never in the pile's: those frames are left out. So are the
        // draws of a Snecko Oil drunk between the frames (its own draw, its costs random: a random potion, which the bound
        // refuses while it is held).
        const snecko = asArray(asRecord(prev.run?.raw)["potions"]).some((slot) => str(asRecord(slot)["potion_id"]) === "SNECKO_OIL") && !asArray(asRecord(state.run?.raw)["potions"]).some((slot) => str(asRecord(slot)["potion_id"]) === "SNECKO_OIL");
        if (snecko) {
          prev = state;
          prevTurn = turn;
          continue;
        }
        if (gained.length > 0 && power(state, "VIGOR_POWER") === 0 && !asArray(asRecord(state.run?.raw)["relics"]).some((relic) => str(asRecord(relic)["relic_id"]) === "PEN_NIB")) {
          const ctx = { enemyTargets: [], strength: power(state, "STRENGTH_POWER"), weak: power(state, "WEAK_POWER") > 0 };
          const entries = pileEntries(prev, knowledge, "draw", ctx);
          const after = pileEntries(state, knowledge, "draw", ctx);
          const relicIds = asArray(asRecord(state.run?.raw)["relics"]).map((relic) => str(asRecord(relic)["relic_id"]));
          // The solver's conventions the bound follows: Unmovable / Vambrace armed, every Block card doubled as the hand
          // shows it (combat-plan anyDrawBound); Free Attack shows Attacks at 0 (the planner pays the real cost and the
          // solver makes them free); Stomp's and Evil Eye's own numbers are worked out in the solver.
          const player = asRecord(asRecord(state.raw["combat"])["player"]);
          const armed = (power(state, "UNMOVABLE_POWER") > 0 && num(player["block"]) === 0) || vambraceArmed(relicIds, asArray(asRecord(state.raw["combat"])["hand"]), power(state, "DEXTERITY_POWER"));
          for (const card of gained) {
            const upgraded = bool(card["upgraded"]);
            const entry = entries.find((e) => e.card.cardId === str(card["card_id"]) && e.card.upgraded === upgraded);
            if (!entry || !entry.card.playable) continue;
            // Drawn: one fewer of that line in the pile afterwards (not a card put into the hand some other way).
            const left = after.filter((e) => e.line === entry.line).reduce((sum, e) => sum + e.count, 0);
            if (left >= entry.count) continue;
            if (["STOMP", "EVIL_EYE", "BODY_SLAM"].includes(entry.card.cardId)) continue;
            const pool = pileCardNow(entry, { ...ctx, dexterity: power(state, "DEXTERITY_POWER") });
            const block = armed && pool.card.block > 0 ? pool.card.block * 2 : pool.card.block;
            const cost = pileCardCost(entry, knowledge, relicIds);
            const hand = modelHandCard(card, 0, knowledge);
            const freeAttack = power(state, "FREE_ATTACK_POWER") > 0 && hand.type === "Attack";
            const worse: string[] = [];
            if (hand.damage !== null && hand.damage > 0 && (pool.card.damage ?? -1) < hand.damage) worse.push(`damage ${pool.card.damage} < ${hand.damage}`);
            if (hand.damage !== null && pool.card.hits < hand.hits) worse.push(`hits ${pool.card.hits} < ${hand.hits}`);
            if (block < hand.block) worse.push(`block ${block} < ${hand.block}`);
            if (!hand.xCost && hand.cost >= 0 && cost > hand.cost && !freeAttack) worse.push(`cost ${cost} > ${hand.cost}`);
            // The bound's own reasons (combat-plan pileCardInexact), and its board-wide ones for a card's numbers.
            const both = relicIds.includes("VAMBRACE") && power(state, "UNMOVABLE_POWER") > 0;
            const doubler = (relicIds.includes("VAMBRACE") || power(state, "UNMOVABLE_POWER") > 0) && (!armed || both) && block > 0 ? "Vambrace / Unmovable may double it" : null;
            const flagged = pileCardInexact(entry, pool, randomTargets(prev), relicIds, knowledge) ?? doubler;
            compared += 1;
            if (worse.length > 0) {
              violations += 1;
              if (!flagged) unflagged += 1;
              writeFileSync(out, `${JSON.stringify({ run, floor, turn, card: entry.card.name, line: entry.line.slice(0, 80), hand: str(card["resolved_rules_text"]).slice(0, 80), worse, flagged })}\n`, { flag: "a" });
            }
          }
        }
      }
      prev = state;
      prevTurn = turn;
    }
  });
  closeSync(fd);
  console.log(`compared ${compared} drawn cards; the pile's model below the hand's: ${violations} (not counted as inexact: ${unflagged}); wrote ${out}`);
}

main();
