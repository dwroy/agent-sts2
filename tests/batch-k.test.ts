/**
 * Fix batch K (notes/fix-queue.md "From fix batch J"): pure bugs and Dai's potion rule. One describe per fix; boards are
 * synthetic or logged fixtures (tests/logged-states/batch-k, out of the rollout-live / potion-mc sweeps), never the
 * refreshing knowledge files.
 */

import { afterEach, describe, expect, it } from "vitest";

import { planCombatTurn } from "../src/screens/combat-plan.js";
import { modelPotion, type CardModel } from "../src/strategy/card-model.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { solveTap, solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv, type Logged } from "./logged.js";

type Raw = Record<string, unknown>;

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index,
    key: `c${index}`,
    cardId,
    name: cardId,
    type: "Attack",
    upgraded: false,
    cost: 1,
    xCost: false,
    playable: true,
    target: "single",
    validTargets: [0],
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: "",
    ...overrides,
  };
}
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });

/** A logged board with `potionId` in potion slot `slot` (usable, no target). */
function withPotion(fx: Logged, slot: number, potionId: string, name: string, description: string): Logged {
  const run = fx.state["run"] as Raw;
  run["potions"] = (run["potions"] as Raw[]).map((potion) =>
    potion["index"] === slot
      ? { ...potion, potion_id: potionId, name, description, rarity: "Uncommon", occupied: true, usage: "CombatOnly", target_type: "AnyPlayer", requires_target: false, valid_target_indices: [], can_use: true, can_discard: true }
      : potion,
  );
  return fx;
}

describe("1a. Dai: a potion is a 0-cost one-shot card. An unsimulated potion is always an option (it was one only under T1: the cheapest potion-free option losing 12% of HP)", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
  });

  it("the logged RTF3 F17 T1 board, code's own line on it: with Entropic Brew in the empty slot Jev is asked, the Brew an option with no numbers", () => {
    rolloutLiveOptions.enabled = false;
    // As logged (a Block Potion, modelled): code's line is clear, nothing to ask.
    const plain = planCombatTurn(loggedEnv(logged("batch-k/rtf3-f17-t1-plan")));
    expect(plain?.kind).toBe("act");
    expect(plain?.kind === "act" ? plain.label : "").toBe("combat/plan");
    const brew = withPotion(logged("batch-k/rtf3-f17-t1-plan"), 1, "ENTROPIC_BREW", "混沌药水", "在所有空药水栏位中获得随机药水。");
    const decision = planCombatTurn(loggedEnv(brew));
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind} ${decision?.kind === "act" ? decision.label : ""}`);
    expect(decision.label).toBe("combat/plan-choice+potion");
    const question = decision.questions["plan"]!;
    const criteria = question.type === "choice" ? question.criteria : {};
    const option = JSON.parse(String(criteria["p1"])) as Raw;
    expect(String(option["plays"])).toMatch(/^drink 混沌药水 first: /);
    expect(String(option["offered"])).toMatch(/^always: every potion that can be drunk is an option/);
    expect(option["hp_lost"]).toBeUndefined();
    expect(option["damage_dealt"]).toBeUndefined();
    expect(decision.resolve({ plan: { type: "choice", choice: "p1", probabilities: { p1: 0.5 }, confidence: 0.5, raw: {} } }).intent).toEqual({ action: "use_potion", option_index: 1 });
  }, 30_000);
});

describe("1b. Dai: no potion cost in the solver's score. A potion's lasting value (Strength, flat, Plating) counted 25% in hallway fights (POTION_LASTING, \"worth more saved for an elite or the boss\")", () => {
  const strengthPotion = () => modelPotion("STRENGTH_POTION", "力量药水", 0, [], 0)!;
  // The same effect as a 0-cost card that exhausts (a one-shot card).
  const strengthCard = () => card(5, "ONE_SHOT_STRENGTH", { type: "Skill", cost: 0, target: "self", validTargets: [], strength: 2, exhausts: true });
  const lastingOf = (extra: CardModel, fightKind: SolverInput["fightKind"]) => {
    const input: SolverInput = { hand: [card(0, "STRIKE", { damage: 6 }), extra], player: player(), enemies: [enemy()], fightKind, turn: 1 };
    return solveTurn(input).plans.find((plan) => plan.steps.some((step) => step.cardId === extra.cardId))!.outcome.lasting;
  };

  it("Strength Potion in a hallway fight: the same lasting value as in a boss fight and as the same effect on a 0-cost one-shot card", () => {
    const card = lastingOf(strengthCard(), "monster");
    expect(card).toBeGreaterThan(0);
    expect(lastingOf(strengthPotion(), "monster")).toBeCloseTo(card);
    expect(lastingOf(strengthPotion(), "unknown")).toBeCloseTo(card);
    expect(lastingOf(strengthPotion(), "boss")).toBeCloseTo(lastingOf(strengthCard(), "boss"));
  });

  it("Heart of Iron's Plating in a hallway fight: valued like Plating from a card", () => {
    const iron = modelPotion("HEART_OF_IRON", "铁心药水", 0, [], 0)!;
    const armor = card(6, "ONE_SHOT_PLATING", { type: "Skill", cost: 0, target: "self", validTargets: [], plating: 7, special: "plating", exhausts: true });
    const hit: EnemySim = enemy({ attacks: [{ damage: 10, hits: 1 }] });
    const lasting = (extra: CardModel) =>
      solveTurn({ hand: [extra], player: player(), enemies: [hit], fightKind: "monster", turn: 1, laterIncoming: [10, 10, 10, 10] }).plans.find((plan) => plan.steps.length === 1)!.outcome.lasting;
    expect(lasting(armor)).toBeGreaterThan(0);
    expect(lasting(iron)).toBeCloseTo(lasting(armor));
  });
});

describe("2. DHGT6Z3Q7VAP F33 T2 (Kaiser Crab, Surrounded): Jev's line lost 20 as logged; the replay read -29 because the fixture had no facing (a fresh screen memory: the start-of-fight facing, the Rocket)", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
    solveTap.onSolve = null;
  });

  it("the fixture carries the facing the run had (T1's last target, Dismantle -> the Crusher): Twin Strike -> Crusher, Molten Fist -> Rocket, Stone Armor loses 20 (30 / 1.5 + floor(3 x 1.5) - 4 Plating)", () => {
    rolloutLiveOptions.enabled = false;
    const fx = logged("batch-j/dhgt-f33-t2-wheel");
    expect(fx.screenMemory?.facing).toBe(0);
    const inputs: SolverInput[] = [];
    solveTap.onSolve = (input) => inputs.push(input);
    planCombatTurn(loggedEnv(fx));
    solveTap.onSolve = null;
    const input = inputs[0]!;
    expect(input.player.facing).toBe(0);
    const JEV = "TWIN_STRIKE>0,MOLTEN_FIST>1,STONE_ARMOR>null";
    const line = solveTurn(input).plans.find((plan) => plan.steps.map((step) => `${step.cardId}>${step.target}`).join(",") === JEV)!;
    expect(line).toBeDefined();
    expect(line.outcome.hpLoss).toBe(20);
    // Replayed without it (the start-of-fight facing, the Rocket): the Rocket's 30 read as a front hit, -29.
    const { screenMemory: _facing, ...fresh } = fx;
    const freshInputs: SolverInput[] = [];
    solveTap.onSolve = (entry) => freshInputs.push(entry);
    planCombatTurn(loggedEnv(fresh));
    solveTap.onSolve = null;
    expect(freshInputs[0]!.player.facing).toBe(1);
    expect(solveTurn(freshInputs[0]!).plans.find((plan) => plan.steps.map((step) => `${step.cardId}>${step.target}`).join(",") === JEV)!.outcome.hpLoss).toBe(29);
  }, 30_000);
});
