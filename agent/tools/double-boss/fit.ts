/** Fixed-log resource sensitivity, with whole runs held out in time order. No game or model calls. */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeKnowledge } from "../../src/knowledge/index.js";
import { setKnowledgeCharacter } from "../../src/knowledge/files.js";
import { doubleBossSource } from "../../src/knowledge/double-boss.js";
import { parseGameState } from "../../src/hand/mod/schema.js";
import { modelPotion } from "../../src/reflex/card-model.js";
import { rolloutLiveOptions } from "../../src/reflex/rollout-live.js";
import { bossLinesOptions } from "../../src/sim/boss-lines.js";
import { redealInput, runBossSim } from "../../src/sim/boss-sim.js";
import { boardOf } from "../boss-sim/backtest-board.js";
import { loadMonsterDb, loadMoveModel } from "../../src/sim/boss-start.js";
import type { RolloutInput } from "../../src/reflex/rollout.js";

const scratch = process.argv[2]!;
const samples = Number(process.argv[3] ?? 32);
setKnowledgeCharacter("silent");
doubleBossSource.enabled = false;
rolloutLiveOptions.enabled = false;
bossLinesOptions.enabled = false;
const knowledge = makeKnowledge(JSON.parse(readFileSync("../data/game-data.json", "utf8")).collections, "cache");
const db = loadMonsterDb();
const mm = loadMoveModel();
const runs = ["JMH5C51RLN4E", "9TG1RP5LFAAK", "ZVYUL2YP3518", "TDLBRNA0R05B"];
const grid = [1, 8, 17, 25, 40, 50, 60, 70, 84];
const rows: Record<string, unknown>[] = [];
const inputs: Record<string, RolloutInput> = {};
for (const run of runs) {
  const name = readdirSync(scratch).filter((f) => f.startsWith(`${run}-F49-start-`))
    .filter((f) => JSON.parse(readFileSync(join(scratch, f), "utf8")).state.combat?.hand?.length > 0)
    .sort((a,b) => Number(a.split("-").at(-1)!.split(".")[0]) - Number(b.split("-").at(-1)!.split(".")[0]))[0]!;
  const raw = JSON.parse(readFileSync(join(scratch, name), "utf8")).state;
  const state = parseGameState(raw);
  const enc = raw.combat.enemies.map((e: { enemy_id: string }) => e.enemy_id).sort().join("+");
  const board = boardOf(state, knowledge, enc, db.monsters, mm);
  const input = redealInput(board.input, { fresh: true });
  inputs[run] = input;
  const targets = input.solver.enemies.map((e) => e.index);
  // JMH5C51RLN4E F48 T3 states lines 243373->243374: belt consumed, poison 0->6.
  // TDLBRNA0R05B F49 T1 lines 270397->270398 independently supports the same amount.
  const poison = modelPotion("POISON_POTION", "毒药水", 0, targets, { enemyTargets: targets, strength: 0, weak: false, observedPoison: 6 });
  if (!poison) throw new Error("no observed poison model");
  for (const hp of grid.filter((h) => h <= input.solver.player.maxHp)) {
    for (const held of [false, true]) {
      const solver = { ...input.solver, hand: held ? [poison] : [], player: { ...input.solver.player, hp } };
      const line = runBossSim({ ...input, solver, piles: { ...input.piles, handBase: solver.hand.map(() => null) }, randomPotions: [] }, [null], { samples, seed: 7, potionHold: 0 }).lines[0]!;
      const row = { run, set: runs.indexOf(run) < 2 ? "tune" : "validation", enc, hp, poison: held, samples: line.samples, wins: line.wins, deaths: line.deaths, capped: line.capped, win: line.winProb, loss: line.hpLoss.mean, outcomes: line.outcomes.map((o) => ({ won:o.won, died:o.died, loss:o.hpLoss, drunk:o.drunk })) };
      rows.push(row);
      writeFileSync(join(scratch, "sensitivity.json"), JSON.stringify(rows, null, 2));
      console.log(JSON.stringify({ ...row, outcomes: undefined }));
    }
  }
}
writeFileSync(join(scratch, "f49-inputs.json"), JSON.stringify(inputs));
