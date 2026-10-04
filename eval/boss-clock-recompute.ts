/**
 * Recomputes the act boss clock (agent/src/sim/boss-clock.ts `bossClock`, unchanged) on logged boss fights, for
 * eval/calibration.py (docs/eval.md "calibration"). The clock is not logged as data: DeepSeek's facts carry
 * it, and deepseek-reasoning.jsonl keeps only the question text. So it is rebuilt from each boss fight's first
 * combat state (deck, relics, boss id, ascension) with the HP the fight was actually entered with, as
 * agent/tools/boss-clock-calibrate.ts does. The code and the knowledge data (monster-db.json, boss-damage.json) are the
 * ones in this tree, not the ones the run played with.
 *
 * Input (stdin): JSONL {key, entry_hp, turns?, state}, `state` the raw game state of a states.jsonl line.
 * Output (stdout): JSONL, one line per input line in order: {key, boss, ascension, entry_hp, deck, need, gap, hp,
 * fight_turns, survivable_turns, loss_per_turn, loss_note, deck_at_turns} or {key, error}. `deck` is the clock's
 * estimate of the deck's damage a turn (at the clock's own fight length); `deck_at_turns` the same estimate at the
 * fight's real length (`turns`), when given.
 *
 * Usage: npx tsx eval/boss-clock-recompute.ts [game-data.json] < fights.jsonl   (default data/game-data.json)
 */
import { readFileSync } from "node:fs";

import { makeKnowledge } from "../agent/src/knowledge/index.js";
import { parseGameState } from "../agent/src/hand/mod/schema.js";
import { bossClock, deckEstimate, deckProfileForBoss } from "../agent/src/sim/boss-clock.js";
import { fromRoot } from "../agent/src/core/paths.js";

interface Input {
  key: string;
  entry_hp: number;
  turns?: number | null;
  state: Record<string, unknown>;
}

const path = process.argv[2] ?? fromRoot("data/game-data.json");
// The knowledge cache ({mod_version, fetched_at, collections}) or bare collections (agent/tests/logged-states/game-data.json).
const file = JSON.parse(readFileSync(path, "utf8")) as { collections?: Record<string, unknown[]> };
const knowledge = makeKnowledge(file.collections ?? (file as Record<string, unknown[]>), "cache");
if (knowledge.stats.cards === 0) {
  console.error(`boss-clock-recompute: no cards in ${path}`);
  process.exit(1);
}

const round = (value: number, digits = 2): number => Math.round(value * 10 ** digits) / 10 ** digits;

const lines = readFileSync(0, "utf8").split("\n").filter((line) => line.trim() !== "");
const out: string[] = [];
for (const line of lines) {
  let input: Input;
  try {
    input = JSON.parse(line) as Input;
  } catch {
    out.push(JSON.stringify({ key: null, error: "unparsable input line" }));
    continue;
  }
  try {
    const state = parseGameState(input.state);
    const clock = bossClock(state, knowledge, input.entry_hp);
    if (!clock) {
      out.push(JSON.stringify({ key: input.key, error: "no clock for this boss id" }));
      continue;
    }
    const bossId = String((input.state["run"] as Record<string, unknown> | undefined)?.["boss_id"] ?? "");
    const deck = deckProfileForBoss(state, knowledge);
    const turns = typeof input.turns === "number" && input.turns > 0 ? input.turns : null;
    out.push(
      JSON.stringify({
        key: input.key,
        boss: clock.boss,
        ascension: clock.ascension,
        entry_hp: clock.entryHp,
        deck: round(clock.deck),
        need: clock.need,
        gap: clock.gap,
        hp: clock.hp,
        fight_turns: clock.fightTurns,
        survivable_turns: clock.survivableTurns,
        loss_per_turn: clock.lossPerTurn,
        loss_note: clock.lossNote,
        deck_at_turns: deck && turns ? round(deckEstimate(deck, bossId, turns)) : null,
      }),
    );
  } catch (error) {
    out.push(JSON.stringify({ key: input.key, error: String(error).slice(0, 300) }));
  }
}
process.stdout.write(out.length > 0 ? `${out.join("\n")}\n` : "");
