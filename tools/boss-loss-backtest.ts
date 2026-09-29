/**
 * Backtest of the boss clock's HP loss a turn (and so its survivable turns) on logged boss fights.
 *
 * Input: the fight rows of tools/build-boss-damage.py --fights (key, boss, ascension, outcome, turns,
 * entry_hp, final_hp, loss_per_turn). For each fight at the ascensions asked for, the old figure (the
 * hand-set A8 constant, BOSSES[boss].lossPerTurn) and the new one (bossLossPerTurn: the boss's own damage
 * at the fight's ascension from the monster DB times the logged unblocked share) against the realised
 * (entry - final) / turns, and the survivable turns each predicts (entry / loss) against the real ones
 * (the death turn; for a win, entry / realised loss).
 *
 * Usage: npx tsx tools/boss-loss-backtest.ts fights.jsonl [--asc 8,9] [--rows]
 */
import { readFileSync } from "node:fs";

import { BOSSES, bossLossPerTurn } from "../src/strategy/boss-clock.js";

interface Fight {
  key: string;
  boss: string;
  ascension: number;
  outcome: string;
  turns: number;
  entry_hp: number;
  final_hp: number;
  loss_per_turn: number;
}

const file = process.argv[2];
if (!file) throw new Error("usage: boss-loss-backtest.ts fights.jsonl [--asc 8,9] [--rows]");
const ascArg = process.argv.includes("--asc") ? process.argv[process.argv.indexOf("--asc") + 1]! : "8,9";
const ascensions = ascArg.split(",").map(Number);
const fights = readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Fight).filter((fight) => ascensions.includes(fight.ascension) && BOSSES[fight.boss]);

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length === 0 ? NaN : sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

interface Row {
  fight: Fight;
  oldLoss: number;
  newLoss: number;
  newSource: string;
  realSurvive: number;
  oldSurvive: number;
  newSurvive: number;
}
const rows: Row[] = fights.map((fight) => {
  const profile = BOSSES[fight.boss]!;
  const loss = bossLossPerTurn({ ...profile, id: fight.boss }, fight.ascension);
  const realSurvive = fight.outcome === "died" ? fight.turns : fight.loss_per_turn > 0 ? fight.entry_hp / fight.loss_per_turn : Infinity;
  return {
    fight,
    oldLoss: profile.lossPerTurn,
    newLoss: loss.value,
    newSource: loss.source,
    realSurvive,
    oldSurvive: Math.max(1, Math.floor(fight.entry_hp / Math.max(1, profile.lossPerTurn))),
    newSurvive: Math.max(1, Math.floor(fight.entry_hp / Math.max(1, loss.value))),
  };
});

const report = (label: string, group: Row[]) => {
  const scored = group.filter((row) => row.fight.loss_per_turn > 0);
  const logErr = (pick: (row: Row) => number) => median(scored.map((row) => Math.abs(Math.log(row.fight.loss_per_turn / pick(row)))));
  const bias = (pick: (row: Row) => number) => median(scored.map((row) => Math.log(row.fight.loss_per_turn / pick(row))));
  const finite = group.filter((row) => Number.isFinite(row.realSurvive));
  const turnErr = (pick: (row: Row) => number) => median(finite.map((row) => pick(row) - row.realSurvive));
  const turnAbs = (pick: (row: Row) => number) => median(finite.map((row) => Math.abs(pick(row) - row.realSurvive)));
  const deaths = group.filter((row) => row.fight.outcome === "died");
  const deathErr = (pick: (row: Row) => number) => median(deaths.map((row) => pick(row) - row.realSurvive));
  console.log(
    `${label.padEnd(24)} n=${String(group.length).padStart(3)} (deaths ${String(deaths.length).padStart(2)}) | loss/turn median |log err| old ${logErr((row) => row.oldLoss).toFixed(2)} new ${logErr((row) => row.newLoss).toFixed(2)}` +
      ` (median log(real/pred) old ${bias((row) => row.oldLoss).toFixed(2)} new ${bias((row) => row.newLoss).toFixed(2)})` +
      ` | survivable turns pred-real median old ${turnErr((row) => row.oldSurvive).toFixed(1)} new ${turnErr((row) => row.newSurvive).toFixed(1)}, |err| old ${turnAbs((row) => row.oldSurvive).toFixed(1)} new ${turnAbs((row) => row.newSurvive).toFixed(1)}` +
      (deaths.length > 0 ? ` | deaths pred-real old ${deathErr((row) => row.oldSurvive).toFixed(1)} new ${deathErr((row) => row.newSurvive).toFixed(1)}` : ""),
  );
};

for (const asc of ascensions) report(`A${asc} all bosses`, rows.filter((row) => row.fight.ascension === asc));
report(`A${ascArg} all bosses`, rows);
console.log("");
for (const boss of [...new Set(rows.map((row) => row.fight.boss))].sort()) {
  const group = rows.filter((row) => row.fight.boss === boss);
  const real = median(group.map((row) => row.fight.loss_per_turn));
  const sample = group[0]!;
  console.log(`${boss.padEnd(20)} n=${String(group.length).padStart(2)} real loss/turn median ${real.toFixed(1)} | old ${sample.oldLoss} | new ${group.map((row) => `A${row.fight.ascension} ${row.newLoss.toFixed(1)}`).filter((v, i, a) => a.indexOf(v) === i).join(", ")} (${sample.newSource})`);
}
if (process.argv.includes("--rows")) for (const row of rows) console.log(JSON.stringify({ key: row.fight.key, boss: row.fight.boss, asc: row.fight.ascension, outcome: row.fight.outcome, turns: row.fight.turns, entry: row.fight.entry_hp, real: row.fight.loss_per_turn, old: row.oldLoss, new: Number(row.newLoss.toFixed(2)), survive: { real: Number(row.realSurvive.toFixed(1)), old: row.oldSurvive, new: row.newSurvive } }));
