/** 9YBKCNBFP0X5 A4 F48 attempt 6 T5-T9; learner ledger silent-0086 / silent-0087. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { boardRolloutInput } from "../src/reflex/rollout-live.js";
import { rolloutDecision, simulateFight } from "../src/reflex/rollout.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { board } from "./boss-sim-fixture.js";
import { bossBoard, state } from "./sl-support.js";

const knowledge = makeKnowledge({ cards: [{ id: "NOXIOUS_FUMES", type: "Power", cost: 1 }] }, "cache");
const fumes = modelHandCard({ card_id: "NOXIOUS_FUMES", upgraded: true, energy_cost: 1, playable: true,
  target_type: "Self", rules_text: "在你的回合开始时，给予所有敌人3层中毒。",
  dynamic_values: [{ name: "PoisonPerTurn", base_value: 3, current_value: 3 }] }, 0, knowledge);

function bonus(character = "SILENT", skull = true): number | undefined {
  const raw = bossBoard({ relics: skull ? ["SNECKO_SKULL"] : [], playerPowers: [] });
  (raw["run"] as Record<string, unknown>)["character_id"] = character;
  // Empty explicit databases keep this adapter check independent of all generated knowledge.
  return boardRolloutInput(state(raw), knowledge, board().solver, 4, {}, {}).fumesPoisonBonus;
}

function scenario(alreadyUp = false) {
  const input = board({ bossHp: 500 });
  input.solver.enemies[0]!.attacks = [];
  input.solver.enemies.push({ ...input.solver.enemies[0]!, index: 1, name: "Second enemy" });
  input.enemies.push({ ...input.enemies[0]!, index: 1 });
  input.solver.hand = alreadyUp ? [] : [fumes];
  input.playerPowers = alreadyUp ? { NOXIOUS_FUMES_POWER: 3 } : {};
  if (alreadyUp) for (const enemy of input.solver.enemies) enemy.poison = 4;
  input.fumesPoisonBonus = bonus();
  input.piles = { handBase: input.solver.hand, draw: [], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  input.options = { handSize: 0, horizon: 5, samples: 1, now: () => 0, budgetMs: 1e9 };
  const plan = replaySteps(input.solver, alreadyUp ? [] : [{ cardIndex: 0, cardId: "NOXIOUS_FUMES", name: "毒雾+", upgraded: true, target: null }])!;
  input.plans = [plan];
  return { input, plan };
}

it("Skull and three Fumes layers reproduce four-seven-ten-thirteen poison without inflating the power", () => {
  const { input, plan } = scenario();
  expect(input.fumesPoisonBonus).toBe(1);
  const records = simulateFight(input, plan, 5, 1, false).records;
  expect(records.map((r) => r.dmg)).toEqual([0, 8, 14, 20, 26]);
  expect(records.slice(1).map((r) => r.snap.E.map((e) => e[9]["POISON_POWER"]))).toEqual([[3, 3], [6, 6], [9, 9], [12, 12]]);
  expect(records.map((r) => r.snap.pw["NOXIOUS_FUMES_POWER"])).toEqual([3, 3, 3, 3, 3]);
  expect(rolloutDecision(input).lines[0]!.perTurn.map((t) => t.dmg.mean)).toEqual([8, 14, 20, 26]);
});

it("already active Fumes retain the observed bonus; missing Skull, no Fumes and Ironclad keep prior behavior", () => {
  const { input, plan } = scenario(true);
  expect(simulateFight(input, plan, 4, 1, false).records.map((r) => r.dmg)).toEqual([8, 14, 20, 26]);
  expect(bonus("SILENT", false)).toBeUndefined();
  expect(bonus("IRONCLAD")).toBeUndefined();
  const fresh = scenario();
  delete fresh.input.fumesPoisonBonus;
  expect(simulateFight(fresh.input, fresh.plan, 5, 1, false).records.map((r) => r.dmg)).toEqual([0, 6, 10, 14, 18]);
  const none = scenario(true);
  none.input.playerPowers = {};
  for (const enemy of none.input.solver.enemies) enemy.poison = 0;
  const emptyPlan = replaySteps(none.input.solver, [])!;
  expect(simulateFight(none.input, emptyPlan, 3, 1, false).records.map((r) => r.dmg)).toEqual([0, 0, 0]);
});
