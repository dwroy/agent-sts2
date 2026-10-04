/**
 * Fix batch K (notes/fix-queue.md "From fix batch J"): pure bugs and Dai's potion rule. One describe per fix; boards are
 * synthetic or logged fixtures (tests/logged-states/batch-k, out of the rollout-live / potion-mc sweeps), never the
 * refreshing knowledge files.
 */

import { afterEach, describe, expect, it } from "vitest";

import { recoverRoute } from "../src/brain/llm/deepseek.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { modelPotion, type CardModel } from "../src/reflex/card-model.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { rolloutDecision, type EnemyTable, type FightMeta } from "../src/reflex/rollout.js";
import { solveTap, solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/reflex/turn-solver.js";
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
    // As logged (a Block Potion, modelled) code's line was clear here: it played it (combat/plan), nothing asked. (Not
    // asserted: which lines are clear reads the refreshing move model.)
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
  const strengthPotion = () => modelPotion("STRENGTH_POTION", "力量药水", 0, [])!;
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
    const iron = modelPotion("HEART_OF_IRON", "铁心药水", 0, [])!;
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

describe("3. Stable Serum in the rollout: cards drawn mid-turn that the line cannot play stay in hand too (they went to the discard pile)", () => {
  const META: FightMeta = { act: 1, t: 1, asc: 9, kind: "hallway", enc: "X", deck: { n: 10, atk: 0, skl: 10, pow: 0, junk: 0, dmg: 0, blk: 50, up: 0 }, relics: 1, max_en: 3 };
  const HIT: EnemyTable = { moves: { HIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  // 0-cost attacks of 20: a turn's damage is 20 per one in hand.
  const big = (i: number) => card(i, "BIG", { cost: 0, damage: 20, damageBase: 20 });

  it("a 3-energy draw-2 card, then the Serum: the 2 cards drawn at 0 energy start turn 2 with the 5 drawn (7 x 20), not in the discard pile (5 x 20)", () => {
    const serum = modelPotion("STABLE_SERUM", "稳定血清", 0, [])!;
    const drawer = card(0, "DRAWER", { type: "Skill", cost: 3, target: "self", validTargets: [], draw: 2 });
    const solver: SolverInput = { hand: [drawer, serum], player: player({ energy: 3, drawable: 20 }), enemies: [enemy({ hp: 1000, maxHp: 1000 })], fightKind: "monster", turn: 1 };
    const plans = solveTurn(solver).plans;
    const line = plans.find((plan) => plan.steps.length === 2 && plan.steps.some((step) => step.cardId === "DRAWER") && plan.steps.some((step) => step.cardId.startsWith("POTION:STABLE_SERUM")))!;
    expect(line.outcome.cardsDrawn).toBe(2);
    expect(line.outcome.energyLeft).toBe(0);
    const dry = plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "DRAWER")!;
    const run = (plan: Plan) => {
      let t = 0;
      return rolloutDecision({
        solver,
        plans: [plan],
        enemies: [{ index: 0, id: "X", move: "HIT", strength: 0, powers: {} }],
        tables: { X: HIT },
        piles: { draw: Array.from({ length: 20 }, (_, i) => big(10 + i)), discard: [], handBase: solver.hand.map(() => null) },
        meta: META,
        playerPowers: {},
        potions: 1,
        mm: {},
        model: null,
        gates: null,
        options: { budgetMs: 1e9, seed: 1, horizon: 2, samples: 2, now: () => (t += 0.01) },
      }).lines[0]!;
    };
    expect(run(dry).perTurn[0]!.dmg.mean).toBe(100);
    expect(run(line).perTurn[0]!.dmg.mean).toBe(140);
  });
});

describe("4. Attack-counting relics count every play of an Attack: a replay (Soldier's Stew), a duplicate (Duplicator) and a Hellraiser autoplay, as the relics' own counters did in the logs (attacks_played_this_turn counts the card once and no autoplay)", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
    solveTap.onSolve = null;
  });

  it("Shuriken: two Strikes with Replay 1 are 4 Attacks (6 + 6 + 6, then 7 with the Strength), not 2", () => {
    const replayed = (i: number) => card(i, "STRIKE_IRONCLAD", { damage: 6, damageBase: 6, replay: 1 });
    const input: SolverInput = { hand: [replayed(0), replayed(1)], player: player({ energy: 2, shuriken: { every: 3, strength: 1, count: 0 } }), enemies: [enemy()], fightKind: "monster", turn: 1 };
    const both = solveTurn(input).plans.find((plan) => plan.steps.length === 2)!.outcome;
    expect(both).toMatchObject({ damageDealt: 25, strengthGained: 1 });
  });

  it("Kusarigama: a duplicated Attack counts twice (Duplicator, then two Attacks: the 3rd play hits for 6)", () => {
    const duplicator = modelPotion("DUPLICATOR", "复制药水", 0, [])!;
    const hand = [duplicator, card(0, "HIT_A", { damage: 5 }), card(1, "HIT_B", { damage: 5 })];
    const input: SolverInput = { hand, player: player({ energy: 2, kusarigama: { every: 3, damage: 6, count: 0 } }), enemies: [enemy()], fightKind: "monster", turn: 1 };
    const line = solveTurn(input).plans.find((plan) => plan.steps.map((step) => step.cardId).join(">") === "POTION:DUPLICATOR:0>HIT_A>HIT_B")!;
    // 5 + 5 (duplicated) + 5, and Kusarigama's 6 on the 3rd play.
    expect(line.outcome.damageDealt).toBe(21);
  });

  it("the logged DHGT F33 T1 board with the Shuriken's counter at 2 (a Hellraiser Strike played at the turn's start, attacks_played_this_turn 0): the solver's count is the relic's", () => {
    rolloutLiveOptions.enabled = false;
    const fx = logged("batch-j/dhgt-f33-t1-shuriken");
    const run = fx.state["run"] as Raw;
    run["relics"] = (run["relics"] as Raw[]).map((relic) => (relic["relic_id"] === "SHURIKEN" ? { ...relic, stack: 2 } : relic));
    expect(((fx.state["combat"] as Raw)["player"] as Raw)["attacks_played_this_turn"]).toBe(0);
    const inputs: SolverInput[] = [];
    solveTap.onSolve = (input) => inputs.push(input);
    planCombatTurn(loggedEnv(fx));
    solveTap.onSolve = null;
    expect(inputs[0]!.player.shuriken).toEqual({ every: 3, strength: 1, count: 2 });
  }, 30_000);
});

describe("5. recoverRoute: a negated or asked route mention is not the decision (\"don't keep the route\" read as keep); the last clear decision is", () => {
  const KEYS = ["keep", "p1", "p2"];

  it("negations and questions are passed over; the last decision stands", () => {
    expect(recoverRoute(["Switch the route to p2: the elite while HP is up. Don't keep the route."], KEYS)?.route).toBe("p2");
    expect(recoverRoute(["route: p1 looks greedy. We should not keep the safe route here, so route: p2"], KEYS)?.route).toBe("p2");
    expect(recoverRoute(["switch the route to p1 instead of keeping the route"], KEYS)?.route).toBe("p1");
    expect(recoverRoute(["Keep the route? The shop matters more. Switch the route to p2."], KEYS)?.route).toBe("p2");
    expect(recoverRoute(["There is no need to keep the route; route: p1."], KEYS)?.route).toBe("p1");
    // Only negated or asked mentions: nothing recovered (not "keep").
    expect(recoverRoute(["I won't keep the route."], KEYS)).toBeNull();
    expect(recoverRoute(["Should we keep the route?"], KEYS)).toBeNull();
    // Plain decisions as before.
    expect(recoverRoute(["Decision: HEAL (o0). Route: keep."], KEYS)?.route).toBe("keep");
    expect(recoverRoute(["Final: card0, keep route."], KEYS)?.route).toBe("keep");
    expect(recoverRoute(['keep route for now... no: switch the route to p2, the elite while HP is up. {"route": "p2"}'], KEYS)?.route).toBe("p2");
  });
});
