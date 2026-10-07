/** Retrospective fixed-input check; never turns counterfactual samples into actual wins. */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeKnowledge } from "../../src/knowledge/index.js";
import { setKnowledgeCharacter } from "../../src/knowledge/files.js";
import { loadDoubleBossModel } from "../../src/knowledge/double-boss.js";
import { parseGameState } from "../../src/hand/mod/schema.js";
import { rolloutLiveOptions } from "../../src/reflex/rollout-live.js";
import { bossLinesOptions } from "../../src/sim/boss-lines.js";
import { redealInput, runBossSim } from "../../src/sim/boss-sim.js";
import { withDoubleBossStart } from "../../src/sim/double-boss-start.js";
import { boardOf } from "../boss-sim/backtest-board.js";
import { loadMonsterDb, loadMoveModel } from "../../src/sim/boss-start.js";

const scratch = process.argv[2]!;
const samples = Number(process.argv[3] ?? 32);
setKnowledgeCharacter("silent");
rolloutLiveOptions.enabled = false;
bossLinesOptions.enabled = false;
const knowledge = makeKnowledge(JSON.parse(readFileSync("../data/game-data.json", "utf8")).collections, "cache");
const db = loadMonsterDb();
const mm = loadMoveModel();
const rows = [];
const production = loadDoubleBossModel()!;
const fit = JSON.parse(readFileSync(join(scratch,"fit-summary.json"),"utf8"));
const temporal = { ...production, value:{ ...production.value,hp:fit.train.hp },potionHp:{ POISON_POTION:fit.train.poisonHp },
  secondBosses:[{ boss:"AEONGLASS",count:1 },{ boss:"QUEEN",count:1 }],evidence:production.evidence.slice(0,2) };
for (const run of ["JMH5C51RLN4E", "9TG1RP5LFAAK", "ZVYUL2YP3518", "TDLBRNA0R05B"]) {
  const name = readdirSync(scratch).filter((f) => f.startsWith(`${run}-F48-start-`))
    .filter((f) => JSON.parse(readFileSync(join(scratch, f), "utf8")).state.combat?.hand?.length > 0)
    .sort((a,b) => Number(a.split("-").at(-1)!.split(".")[0]) - Number(b.split("-").at(-1)!.split(".")[0]))[0]!;
  const raw = JSON.parse(readFileSync(join(scratch, name), "utf8")).state;
  const state = parseGameState(raw);
  const enc = raw.combat.enemies.map((e: { enemy_id: string }) => e.enemy_id).sort().join("+");
  const board = boardOf(state, knowledge, enc, db.monsters, mm);
  const input = withDoubleBossStart(state, knowledge, redealInput(board.input, { fresh: true }), temporal);
  if (!input.continuation) throw new Error("missing observed sequence");
  for (const variant of input.continuation.variants) {
    const belt = input.continuation.potions.map((p) => p.key);
    if (belt.some((p) => p.includes("POISON_POTION")) && !variant.input.solver.hand.some((p) => p.cardId.includes("POISON_POTION"))) throw new Error("poison missing in second input");
  }
  const baseline = runBossSim({ ...input, continuation: undefined, solver: { ...input.solver, continuationValue: undefined, hand: input.solver.hand.map((c) => c.type === "Potion" ? { ...c,potionCost:0 } : c) } }, [null], { samples, seed:7,potionHold:0 }).lines[0]!;
  const continuous = runBossSim(input, [null], { samples, seed:7 }).lines[0]!;
  const row = { run, set: rows.length < 2 ? "tune" : "validation", firstOnly: { wins:baseline.wins,deaths:baseline.deaths,win:baseline.winProb }, continuous: { wins:continuous.wins,deaths:continuous.deaths,capped:continuous.capped,win:continuous.winProb,sequence:continuous.sequence }, resources:continuous.outcomes.map((o) => o.sequence), variants:input.continuation.variants.map((v) => ({ boss:v.boss,count:v.count,potions:v.input.solver.hand.map((p) => p.cardId) })) };
  rows.push(row);
  writeFileSync(join(scratch,"continuous-validation.json"),JSON.stringify(rows,null,2));
  console.log(JSON.stringify({ ...row,resources:undefined }));
}
