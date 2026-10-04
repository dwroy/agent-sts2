/** C48LLXBGKXQ9 F19 T8 and F33 attempt 1 T1, ledger silent-0002. Fixed metadata and boards. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps, solveTurn } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";

const knowledge = makeKnowledge({ cards: [
  { id: "KNIFE_TRAP", type: "Skill", cost: 2 },
  { id: "SHIV", type: "Attack", cost: 0, damage: 4, keywords: ["Exhaust"] },
] }, "cache");
const trap = (count: number, upgraded = false, data = knowledge) => modelHandCard({
  index: 0, card_id: "KNIFE_TRAP", energy_cost: 2, upgraded, playable: true,
  requires_target: true, target_type: "AnyEnemy", valid_target_indices: [0],
  dynamic_values: [{ name: "CalculatedShivs", base_value: 0, current_value: count }],
}, 0, data);

it("six immediate Shivs cross 19 block and kill the 5-HP Tunneler, without six hand actions", () => {
  const solver = board().solver;
  solver.hand = [trap(6), card(1, "NEUTRALIZE", { cost: 0, damage: 0 })];
  solver.player.energy = 2;
  solver.enemies = [{ ...solver.enemies[0]!, hp: 5, maxHp: 40, block: 19 }];
  const plan = solveTurn(solver).plans.find((p) => p.steps[0]?.cardId === "KNIFE_TRAP")!;
  expect(plan.outcome.winsFight).toBe(true);
  expect(plan.outcome.damageDealt).toBe(5); // HP damage excludes the 19 absorbed by block.
  expect(plan.steps.map((step) => step.cardId)).toEqual(["KNIFE_TRAP"]);
  expect(plan.outcome.lasting).toBe(0);
});

it("an empty exhaust replay has zero damage and zero lasting value", () => {
  expect(trap(0)).toMatchObject({ known: true, flatValue: 0, damage: null });
  const solver = board().solver;
  solver.hand = [trap(0)];
  const plan = replaySteps(solver, [{ cardIndex: 0, cardId: "KNIFE_TRAP", name: "KNIFE_TRAP", upgraded: false, target: 0, targetName: "Boss" }])!;
  expect(plan.outcome.damageDealt).toBe(0);
  expect(plan.outcome.lasting).toBe(0);
});

it("reuses attack processing for immediate plays and does not invent unobserved upgrades or missing Shiv damage", () => {
  const solver = board().solver;
  solver.hand = [trap(6), card(1, "STRIKE", { damage: 1 })];
  solver.player = { ...solver.player, energy: 3, rage: 2, shuriken: { every: 3, strength: 1, count: 0 } };
  solver.enemies[0]!.hp = 100;
  const plan = solveTurn(solver).plans.find((p) => p.steps.map((s) => s.cardId).join() === "KNIFE_TRAP,STRIKE")!;
  expect(plan.outcome.blockGained).toBe(14);
  expect(plan.outcome.damageDealt).toBe(30); // 4+4+4, then 5+5+5; Strike is 1+2.
  expect(trap(6, true)).toMatchObject({ known: false, flatValue: 0 });
  expect(trap(6, false, makeKnowledge({ cards: [{ id: "KNIFE_TRAP", type: "Skill" }] }, "cache")))
    .toMatchObject({ known: false, flatValue: 0 });
});
