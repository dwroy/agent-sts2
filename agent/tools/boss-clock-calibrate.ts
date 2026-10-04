/**
 * Boss-clock calibration against logged boss fights.
 *
 * Input: a JSONL file, one line per boss fight: {key, outcome, turns, entry_hp, realised, state}, where
 * `state` is the first logged combat state of the fight (deck, relics, boss id, ascension) and
 * `realised` the damage a turn actually dealt (HP removed / turns). Prints, per fight and per boss, the
 * old clock (need, estimate) and the new one, the raw estimate at the fight's real length, and the
 * scale that makes the median realised/estimate 1.
 *
 * Usage: npx tsx tools/boss-clock-calibrate.ts fights.jsonl [--old tools/_old-boss-clock.ts]
 */
import { readFileSync } from "node:fs";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { bossClock, bossProfile, calibrated, deckProfileForBoss, ESTIMATE_BASE, ESTIMATE_SLOPE, mechanicFactor, rawDeckDamage } from "../src/strategy/boss-clock.js";
import { fromRoot } from "../src/core/paths.js";

interface Fight {
  key: string;
  outcome: string;
  turns: number;
  entry_hp: number;
  realised: number;
  state: Record<string, unknown>;
}

const file = process.argv[2];
if (!file) throw new Error("usage: boss-clock-calibrate.ts fights.jsonl [--old module]");
const oldPath = process.argv.includes("--old") ? process.argv[process.argv.indexOf("--old") + 1] : undefined;
const old = oldPath ? ((await import(new URL(`../${oldPath}`, import.meta.url).href)) as typeof import("../src/strategy/boss-clock.js")) : null;
const knowledge = makeKnowledge(JSON.parse(readFileSync(fromRoot("data/game-data.json"), "utf8")).collections, "cache");
const fights = readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Fight);

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length === 0 ? NaN : sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

interface Row {
  key: string;
  boss: string;
  outcome: string;
  turns: number;
  realised: number;
  rawAtTurns: number;
  oldNeed: number | null;
  oldDeck: number | null;
  newNeed: number;
  newDeck: number;
  newTurns: number;
  newHp: number;
  rawAtNew: number;
  mech: number;
  entry: number;
}
const rows: Row[] = [];
for (const fight of fights) {
  const state = parseGameState(fight.state);
  const clock = bossClock(state, knowledge, fight.entry_hp);
  const deck = deckProfileForBoss(state, knowledge);
  if (!clock || !deck) continue;
  const bossId = String((fight.state["run"] as Record<string, unknown>)["boss_id"]);
  // Raw estimate (no calibration) at the fight's real length, and the boss mechanic's share at that length.
  const rawAtTurns = rawDeckDamage(deck, bossId, fight.turns);
  const mech = mechanicFactor(bossProfile(bossId)?.id ?? "", deck, fight.turns);
  let oldNeed: number | null = null;
  let oldDeck: number | null = null;
  if (old) {
    const need = old.bossNeed(bossId) as { perTurn: number } | null;
    oldNeed = need?.perTurn ?? null;
    oldDeck = old.deckDamagePerTurn(state, knowledge);
  }
  rows.push({ key: fight.key, boss: clock.boss, outcome: fight.outcome, turns: fight.turns, realised: fight.realised, rawAtTurns, oldNeed, oldDeck, newNeed: clock.need, newDeck: clock.deck, newTurns: clock.fightTurns, newHp: clock.hp, rawAtNew: rawDeckDamage(deck, bossId, clock.fightTurns), mech, entry: fight.entry_hp });
}

const fit = rows.filter((row) => row.boss !== "TEST_SUBJECT" && row.outcome !== "?" && row.rawAtTurns > 0);
// Least absolute deviation fit of realised / mechanic = base + slope x raw.
let best = { error: Infinity, base: 0, slope: 1 };
for (let base = 0; base <= 20; base += 0.5) {
  for (let slope = 0.5; slope <= 2; slope += 0.02) {
    const error = fit.reduce((sum, row) => sum + Math.abs(row.realised / row.mech - (base + slope * row.rawAtTurns)), 0);
    if (error < best.error) best = { error, base, slope };
  }
}
console.log(`fights ${rows.length}, fitted on ${fit.length}; LAD fit realised = ${best.base} + ${best.slope.toFixed(2)} x raw (in use: ${ESTIMATE_BASE} + ${ESTIMATE_SLOPE})`);
const err = (estimate: (row: Row) => number | null) => {
  const ratios = fit.map((row) => {
    const value = estimate(row);
    return value && value > 0 ? row.realised / value : null;
  }).filter((value): value is number => value !== null);
  return { bias: median(ratios), absErr: median(ratios.map((ratio) => Math.abs(Math.log(ratio)))) };
};
const oldErr = err((row) => row.oldDeck);
const newErr = err((row) => calibrated(row.rawAtTurns) * row.mech);
console.log(`old estimate: median realised/estimate ${oldErr.bias.toFixed(2)}, median |log error| ${oldErr.absErr.toFixed(2)}`);
console.log(`new estimate: median realised/estimate ${newErr.bias.toFixed(2)}, median |log error| ${newErr.absErr.toFixed(2)}`);
const flags = (short: (row: Row) => boolean | null) => {
  const known = fit.filter((row) => short(row) !== null);
  const deaths = known.filter((row) => row.outcome === "died");
  const wins = known.filter((row) => row.outcome === "won");
  return `deaths flagged short ${deaths.filter((row) => short(row)).length}/${deaths.length}, wins read enough ${wins.filter((row) => !short(row)).length}/${wins.length}`;
};
console.log(`old clock at boss entry: ${flags((row) => (row.oldDeck === null || row.oldNeed === null ? null : row.oldDeck < row.oldNeed))}`);
console.log(`new clock at boss entry: ${flags((row) => row.newDeck < row.newNeed)}`);
console.log("\nper boss (A8 fights): realised dmg/turn | old need, old estimate | new need, new estimate (at the expected length) | new fight turns | wins");
const bosses = [...new Set(rows.map((row) => row.boss))].sort();
for (const boss of bosses) {
  const group = rows.filter((row) => row.boss === boss);
  const f = (values: (number | null)[]) => {
    const kept = values.filter((value): value is number => value !== null);
    return kept.length ? median(kept).toFixed(1) : "-";
  };
  console.log(
    `${boss.padEnd(20)} n=${String(group.length).padStart(2)} realised ${f(group.map((row) => row.realised))} | old need ${f(group.map((row) => row.oldNeed))} est ${f(group.map((row) => row.oldDeck))} | new need ${f(group.map((row) => row.newNeed))} est ${f(group.map((row) => row.newDeck))} (at real length ${f(group.map((row) => calibrated(row.rawAtTurns) * row.mech))}) | turns ${f(group.map((row) => row.newTurns))} real ${f(group.map((row) => row.turns))} | won ${group.filter((row) => row.outcome === "won").length}`,
  );
}
if (process.argv.includes("--rows")) {
  for (const row of rows) console.log(JSON.stringify(row));
}
