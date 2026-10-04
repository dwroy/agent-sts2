/** Y6GM2CHWJBEY F17 T2/T3/T7, T082DRCUHRRD F33 T4/T9 and F48 T5/T10; ledger silent-0008/0010/0011/0027. */
import { expect, it } from "vitest";
import { makeKnowledge } from "../src/knowledge/index.js";
import { modelHandCard } from "../src/reflex/card-model.js";
import { replaySteps } from "../src/reflex/turn-solver.js";
import { simulateFight } from "../src/reflex/rollout.js";
import { board } from "./boss-sim-fixture.js";

const ids = ["DEADLY_POISON", "BUBBLE_BUBBLE", "BOUNCING_FLASK", "OUTBREAK", "NOXIOUS_FUMES", "ACCELERANT"];
const knowledge = makeKnowledge({ cards: ids.map((id) => ({ id, type: ["NOXIOUS_FUMES", "ACCELERANT"].includes(id) ? "Power" : "Skill", cost: 1 })) }, "cache");
const model = (id: string, vars: Record<string, number>, target = "AnyEnemy", text = "") => modelHandCard({
  card_id: id, playable: true, energy_cost: 1, target_type: target, requires_target: target === "AnyEnemy", valid_target_indices: [0],
  dynamic_values: Object.entries(vars).map(([name, value]) => ({ name, base_value: value, current_value: value })),
  rules_text: text, resolved_rules_text: text,
}, 0, knowledge);
const step = (cardId: string, target?: number) => ({ cardIndex: 0, cardId, name: cardId, upgraded: false, target });

it("Deadly Poison contributes its five HP loss and carries four poison stacks onward", () => {
  const input = board().solver;
  input.enemies[0]!.hp = 51;
  input.hand = [model("DEADLY_POISON", { PoisonPower: 5 })];
  const plan = replaySteps(input, [step("DEADLY_POISON", 0)])!;
  expect(plan.outcome.damageDealt).toBe(5);
  expect(plan.outcome.enemyHpAfter[0]).toMatchObject({ hp: 46, poison: 4 });
  expect(plan.outcome.lasting).toBe(0);
  // LRN0HPZ0FZS1 F37 T2 / silent-0025: an Artifact application consumes the stack without adding poison.
  input.enemies[0]!.artifact = 1;
  expect(replaySteps(input, [step("DEADLY_POISON", 0)])!.outcome.enemyHpAfter[0]).toMatchObject({ hp: 51, artifact: 0 });
});

it("Bubble Bubble is an empty effect without existing poison, and adds nine when poison is present", () => {
  const input = board().solver;
  input.hand = [model("BUBBLE_BUBBLE", { PoisonPower: 9 }, "AnyEnemy", "如果敌方拥有中毒，则给予9层中毒。")];
  const empty = replaySteps(input, [step("BUBBLE_BUBBLE", 0)])!;
  expect(empty.outcome).toMatchObject({ damageDealt: 0, lasting: 0 });
  input.enemies[0]!.poison = 3;
  expect(replaySteps(input, [step("BUBBLE_BUBBLE", 0)])!.outcome.enemyHpAfter[0]).toMatchObject({ hp: 108, poison: 11 });
});

it("the observed three single-target Flask applications total nine poison", () => {
  const input = board().solver;
  input.hand = [model("BOUNCING_FLASK", { PoisonPower: 3, Repeat: 3 }, "RandomEnemy")];
  const plan = replaySteps(input, [step("BOUNCING_FLASK")])!;
  expect(plan.outcome.damageDealt).toBe(9);
  expect(plan.outcome.enemyHpAfter[0]!.poison).toBe(8);
});

it("Outbreak adds the observed twelve, triggers existing poison immediately, and retains its decremented stacks", () => {
  const input = board().solver;
  input.enemies[0]!.poison = 2;
  input.hand = [model("OUTBREAK", { PoisonPower: 12 }, "AllEnemies", "给予所有敌人12层中毒。立即触发中毒。")];
  const plan = replaySteps(input, [step("OUTBREAK")])!;
  expect(plan.outcome.damageDealt).toBe(27); // Immediate 14, then 13 before the enemy attack.
  expect(plan.outcome.enemyHpAfter[0]!.poison).toBe(12);
});

it("poison kills cancel both enemy attacks, while a phase kill is kept distinct from a fight win", () => {
  const input = board().solver;
  input.hand = [];
  const enemy = { ...input.enemies[0]!, hp: 14, poison: 18, attacks: [{ damage: 10, hits: 1 }] };
  input.enemies = [enemy, { ...enemy, index: 1, name: "Second" }];
  expect(replaySteps(input, [])!.outcome).toMatchObject({ winsFight: true, hpLoss: 0 });
  input.enemies = [{ ...enemy, revives: true }];
  expect(replaySteps(input, [])!.outcome).toMatchObject({ winsFight: false, hpLoss: 0 });
});

it("Noxious Fumes begins next turn, and Accelerant adds the observed extra poison triggers", () => {
  const input = board({ bossHp: 500 });
  input.solver.enemies[0]!.attacks = [];
  input.solver.hand = [model("NOXIOUS_FUMES", { PoisonPerTurn: 2 }, "Self")];
  const plan = replaySteps(input.solver, [step("NOXIOUS_FUMES")])!;
  input.plans = [plan];
  input.piles = { handBase: input.solver.hand, draw: [], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  expect(simulateFight(input, plan, 4, 1, false).records.map((r) => r.dmg)).toEqual([0, 2, 3, 4]);
  const turn = board().solver;
  turn.hand = [];
  turn.player.poisonExtraTriggers = 2;
  turn.enemies[0]!.poison = 18;
  const triggered = replaySteps(turn, [])!;
  expect(triggered.outcome.damageDealt).toBe(51); // 18 + 17 + 16, not 18 x 3.
  expect(triggered.outcome.enemyHpAfter[0]!.poison).toBe(15);
  turn.enemies[0]!.intangible = true;
  turn.enemies[0]!.poison = 9;
  const capped = replaySteps(turn, [])!;
  expect(capped.outcome.damageDealt).toBe(3);
  expect(capped.outcome.enemyHpAfter[0]!.poison).toBe(6);
});

it("poison retains the observed five-four-three-two sequence across rollout turns", () => {
  const input = board({ bossHp: 51 });
  input.options = { handSize: 0 }; // Isolate persistence from drawing and replaying the poison card.
  input.solver.enemies[0]!.attacks = [];
  input.solver.hand = [model("DEADLY_POISON", { PoisonPower: 5 })];
  const plan = replaySteps(input.solver, [step("DEADLY_POISON", 0)])!;
  input.plans = [plan];
  input.piles = { handBase: input.solver.hand, draw: [], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  expect(simulateFight(input, plan, 4, 1, false).records.map((r) => r.dmg)).toEqual([5, 4, 3, 2]);
});

it("the next phase clears old poison and only receives the new Fumes application", () => {
  const input = board({ bossHp: 100 });
  Object.assign(input.solver.enemies[0]!, { hp: 7, poison: 22, revives: true, attacks: [] });
  input.solver.hand = [];
  input.solver.player.poisonExtraTriggers = 2;
  input.playerPowers = { NOXIOUS_FUMES_POWER: 2, ACCELERANT_POWER: 2 };
  const plan = replaySteps(input.solver, [])!;
  input.plans = [plan];
  input.piles = { handBase: [], draw: [], discard: [] };
  input.tables = { TEST_BOSS: { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } } };
  expect(simulateFight(input, plan, 2, 1, false).records.map((r) => r.dmg)).toEqual([7, 3]);
});
