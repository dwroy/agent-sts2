/**
 * The thieves' escape in the rollout (THIEF_FACTS: rollout.ts RolloutInput.escapes, thief.ts escapeInput). An enemy
 * whose Escape / Flee resolves leaves the fight: no kill, nothing comes back, and with nobody left the fight is over
 * (RPC6X61N9FQ0 F20 T5: the reward screen right after the Hopper's Escape). Its last Flutter stripped, the Hopper is
 * stunned and its Escape cancelled (XMY29WWQDC1Y F19: STUNNED on T5, Escape on T6). A Gremlin Merc's loot goes to the
 * Fat Gremlin it spawns, which flees the turn after (JF8NMA78VE0Y F9). Without the input the rollout is as before: the
 * Hopper stays, doing nothing (the move model's Escape -> Escape at 0 damage). Hand-made boards, fixed seeds.
 */

import { describe, expect, it } from "vitest";

import type { CardModel } from "../src/strategy/card-model.js";
import { rolloutDecision, simulateFight, type EnemyTable, type FightMeta, type RolloutInput } from "../src/strategy/rollout.js";
import { escapeInput, type Thief } from "../src/strategy/thief.js";
import { solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0,
    energyGain: 0, draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  };
}
const strike = (i: number, damage = 6, targets = [0]) => card(i, "STRIKE", { damage, validTargets: targets });
const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });

const META: FightMeta = { act: 2, t: 5, asc: 8, kind: "hallway", enc: "THIEVING_HOPPER", deck: { n: 10, atk: 5, skl: 5, pow: 0, junk: 0, dmg: 30, blk: 25, up: 0 }, relics: 1, max_en: 3 };

/** The Hopper's fixed chain (move model: Thievery > Flutter > Hat Trick > Nab > Escape, Escape > Escape). */
const HOPPER: EnemyTable = {
  moves: {
    THIEVERY_MOVE: { damage: 17, hits: 1, strength: 0, block: 0 },
    FLUTTER_MOVE: { damage: 0, hits: 1, strength: 0, block: 0, selfPowers: { FLUTTER_POWER: 5 } },
    HAT_TRICK_MOVE: { damage: 21, hits: 1, strength: 0, block: 0 },
    NAB_MOVE: { damage: 14, hits: 1, strength: 0, block: 0 },
    ESCAPE_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 },
  },
  next: { THIEVERY_MOVE: { FLUTTER_MOVE: 1 }, FLUTTER_MOVE: { HAT_TRICK_MOVE: 1 }, HAT_TRICK_MOVE: { NAB_MOVE: 1 }, NAB_MOVE: { ESCAPE_MOVE: 1 }, ESCAPE_MOVE: { ESCAPE_MOVE: 1 } },
};
const FAT: EnemyTable = { moves: { SPAWNED_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 }, FLEE_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { SPAWNED_MOVE: { FLEE_MOVE: 1 } } };
const SNEAKY: EnemyTable = { moves: { SPAWNED_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 }, TACKLE_MOVE: { damage: 9, hits: 1, strength: 0, block: 0 } }, next: { SPAWNED_MOVE: { TACKLE_MOVE: 1 }, TACKLE_MOVE: { TACKLE_MOVE: 1 } } };
const MERC: EnemyTable = { moves: { GIMME_MOVE: { damage: 8, hits: 2, strength: 0, block: 0 }, DOUBLE_SMASH_MOVE: { damage: 7, hits: 2, strength: 0, block: 0 } }, next: { GIMME_MOVE: { DOUBLE_SMASH_MOVE: 1 }, DOUBLE_SMASH_MOVE: { GIMME_MOVE: 1 } } };
const DB = {
  THIEVING_HOPPER: { moves: { ESCAPE_MOVE: { intents: { Escape: 51 } }, NAB_MOVE: { intents: { Attack: 82 } } } },
  FAT_GREMLIN: { moves: { FLEE_MOVE: { intents: { Escape: 66 } }, SPAWNED_MOVE: { intents: { Stun: 84 } } } },
};

const PLAYER: PlayerSim = { hp: 50, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };

function hopperThief(hp: number, turnsLeft: number, flutter = 0): Thief {
  return { index: 0, id: "THIEVING_HOPPER", name: "偷窃草蜢", hp, maxHp: 84, block: 0, cards: ["岩石铠甲"], turnsLeft, flutter };
}

/** A Hopper board on its `move` (Escape: its last turn), the hand given; `escapes`: THIEF_FACTS on. */
function hopperBoard(hand: CardModel[], hp: number, move: string, opts: { flutter?: number; escapes?: boolean; draw?: CardModel[] } = {}): RolloutInput {
  const enemy: EnemySim = { index: 0, name: "偷窃草蜢", hp, maxHp: 84, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, flutter: opts.flutter ?? 0, attacks: [] };
  const solver: SolverInput = { hand, player: PLAYER, enemies: [enemy], fightKind: "monster", turn: 5 };
  const draw = opts.draw ?? [strike(10), strike(11), strike(12), strike(13), strike(14), defend(15), defend(16), defend(17), strike(18), strike(19)];
  return {
    solver,
    plans: solveTurn(solver).plans,
    enemies: [{ index: 0, id: "THIEVING_HOPPER", move, strength: 0, powers: opts.flutter ? { FLUTTER_POWER: opts.flutter } : {} }],
    tables: { THIEVING_HOPPER: HOPPER },
    piles: { draw, discard: [], handBase: hand },
    meta: META,
    playerPowers: {},
    potions: 0,
    mm: {},
    model: null,
    gates: null,
    options: { budgetMs: 1e9, seed: 3, now: () => 0, samples: 4, horizon: 3 },
    ...(opts.escapes ? { escapes: escapeInput([hopperThief(hp, move === "ESCAPE_MOVE" ? 1 : 2, opts.flutter ?? 0)], DB) } : {}),
  };
}

const lineOf = (input: RolloutInput, test: (plan: Plan) => boolean): Plan => input.plans.find(test)!;

describe("escape moves from the monster DB", () => {
  it("the moves whose intent is Escape, the carriers by index, the Merc's heir", () => {
    const merc: Thief = { index: 0, id: "GREMLIN_MERC", name: "地精佣兵", hp: 30, maxHp: 52, block: 0, gold: 40, turnsLeft: null, flutter: 0, stealsPerAttack: 20 };
    expect(escapeInput([merc], DB)).toEqual({ moves: { THIEVING_HOPPER: ["ESCAPE_MOVE"], FAT_GREMLIN: ["FLEE_MOVE"] }, carriers: { 0: "GREMLIN_MERC@0" }, heirs: { GREMLIN_MERC: "FAT_GREMLIN" } });
    // A DB without their intents still has the two the logs are about.
    expect(escapeInput([], {}).moves).toEqual({ THIEVING_HOPPER: ["ESCAPE_MOVE"], FAT_GREMLIN: ["FLEE_MOVE"] });
  });
});

describe("the Hopper's Escape in the rollout", () => {
  it("an Escape that resolves ends the fight on that enemy turn, the card gone; before THIEF_FACTS it stayed", () => {
    const hand = [defend(0), defend(1), defend(2)];
    const on = hopperBoard(hand, 40, "ESCAPE_MOVE", { escapes: true });
    const line = lineOf(on, (plan) => plan.steps.length > 0 && plan.steps.every((step) => step.cardId === "DEFEND"));
    const after = simulateFight(on, line, 4, 11, false).records;
    expect(after).toHaveLength(1);
    expect(after[0]!.won).toBe(true);
    expect(after[0]!.died).toBe(false);
    expect(after[0]!.thieves).toEqual({ "THIEVING_HOPPER@0": "gone" });
    expect(after[0]!.gone).toEqual([0]);
    const off = hopperBoard(hand, 40, "ESCAPE_MOVE");
    const before = simulateFight(off, lineOf(off, (plan) => plan.steps.length > 0 && plan.steps.every((step) => step.cardId === "DEFEND")), 4, 11, false).records;
    expect(before[0]!.won).toBe(false);
    expect(before[0]!.thieves).toBeUndefined();
    // It stays at 40 HP doing nothing until the policy kills it on a later turn.
    expect(before.length).toBeGreaterThan(1);
  });

  it("a line that kills it on its last turn: the card back", () => {
    const on = hopperBoard([strike(0, 20), strike(1, 20)], 30, "ESCAPE_MOVE", { escapes: true });
    const kill = lineOf(on, (plan) => plan.outcome.winsFight);
    const records = simulateFight(on, kill, 4, 11, false).records;
    expect(records[0]!.won).toBe(true);
    expect(records[0]!.thieves).toEqual({ "THIEVING_HOPPER@0": "back" });
  });

  it("its last Flutter stripped on the Escape turn: stunned, it stays a turn more (killed then: the card back)", () => {
    // Flutter 2: two Strike hits strip it (each hit halved, one stack each).
    const on = hopperBoard([strike(0), strike(1), defend(2)], 40, "ESCAPE_MOVE", { flutter: 2, escapes: true, draw: Array.from({ length: 10 }, (_, i) => strike(10 + i, 15)) });
    const strip = lineOf(on, (plan) => plan.steps.filter((step) => step.cardId === "STRIKE").length === 2);
    expect(strip.outcome.enemyHpAfter[0]!.flutter).toBe(0);
    const records = simulateFight(on, strip, 4, 11, false).records;
    expect(records[0]!.won).toBe(false);
    expect(records[0]!.thieves).toEqual({ "THIEVING_HOPPER@0": "open" });
    // Next turn five 15-damage Strikes: it dies before its Escape comes again.
    expect(records[1]!.won).toBe(true);
    expect(records[1]!.thieves).toEqual({ "THIEVING_HOPPER@0": "back" });
    // One Strike leaves a stack: the Escape resolves.
    const one = lineOf(on, (plan) => plan.steps.filter((step) => step.cardId === "STRIKE").length === 1);
    expect(simulateFight(on, one, 4, 11, false).records[0]!.thieves).toEqual({ "THIEVING_HOPPER@0": "gone" });
  });

  it("each line's samples: back or gone, its rollout over within the horizon either way", () => {
    const on = hopperBoard([strike(0), defend(1), defend(2)], 40, "NAB_MOVE", { escapes: true });
    const result = rolloutDecision(on);
    for (const line of result.lines) {
      const counts = line.thieves!["THIEVING_HOPPER@0"]!;
      expect(counts.back + counts.gone).toBe(line.samples);
      expect(line.wins).toBe(line.samples);
    }
    // THIEF_FACTS off: no counts, and samples the policy did not kill it in are not over.
    const off = rolloutDecision(hopperBoard([strike(0), defend(1), defend(2)], 40, "NAB_MOVE"));
    expect(off.lines.every((line) => line.thieves === undefined)).toBe(true);
  });
});

describe("the Gremlin Merc's gold", () => {
  /** A Merc at `hp` carrying 40 gold, its spawns as the monster DB has them (Fat Gremlin 15, Sneaky Gremlin 13). */
  function mercBoard(hand: CardModel[], hp: number, escapes: boolean, orders = false): RolloutInput {
    const enemy: EnemySim = { index: 0, name: "地精佣兵", hp, maxHp: 52, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, spawnsOnDeath: "1 x 胖地精 (~15 HP) + 1 x 卑鄙地精 (~13 HP)", attacks: [{ damage: 7, hits: 2 }] };
    const solver: SolverInput = { hand, player: PLAYER, enemies: [enemy], fightKind: "monster", turn: 3 };
    const merc: Thief = { index: 0, id: "GREMLIN_MERC", name: "地精佣兵", hp, maxHp: 52, block: 0, gold: 40, turnsLeft: null, flutter: 0, stealsPerAttack: 20 };
    return {
      solver,
      plans: solveTurn(solver).plans,
      enemies: [{ index: 0, id: "GREMLIN_MERC", move: "DOUBLE_SMASH_MOVE", strength: 0, powers: { SURPRISE_POWER: 1, THIEVERY_POWER: 20 } }],
      tables: { GREMLIN_MERC: MERC, FAT_GREMLIN: FAT, SNEAKY_GREMLIN: SNEAKY },
      spawns: { GREMLIN_MERC: [{ id: "FAT_GREMLIN", name: "胖地精", hp: 15, count: 1, move: "SPAWNED_MOVE" }, { id: "SNEAKY_GREMLIN", name: "卑鄙地精", hp: 13, count: 1, move: "SPAWNED_MOVE" }] },
      piles: { draw: [defend(10), defend(11), defend(12), defend(13), defend(14), defend(15)], discard: [], handBase: hand },
      meta: { ...META, enc: "GREMLIN_MERC", t: 3 },
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 5, now: () => 0, samples: 2, horizon: 4, ...(orders ? { orders: [] } : {}) },
      ...(escapes ? { escapes: escapeInput([merc], DB) } : {}),
    };
  }

  it("killed, its gold goes with the Fat Gremlin it spawns, which flees the turn after: gone when it is not killed", () => {
    const input = mercBoard([strike(0, 10), strike(1, 10), defend(2)], 20, true);
    const kill = lineOf(input, (plan) => plan.outcome.kills.length > 0);
    // Turn 0: the Merc dies, the gremlins come (their spawn turn: no attack); the gold is open with the Fat Gremlin.
    // A deck of Defends: nobody kills it, and it flees at the end of the next turn with the gold.
    const records = simulateFight(input, kill, 4, 7, false).records;
    expect(records[0]!.thieves).toEqual({ "GREMLIN_MERC@0": "open" });
    expect(records[1]!.thieves).toEqual({ "GREMLIN_MERC@0": "gone" });
    expect(records[1]!.gone).toEqual([1]);
    // The Sneaky Gremlin is still there: the fight goes on.
    expect(records[1]!.won).toBe(false);
  });

  it("the Merc alive: its gold open; THIEF_FACTS off: no counts, the Fat Gremlin stays", () => {
    const input = mercBoard([defend(0), defend(1), defend(2)], 40, true);
    expect(simulateFight(input, input.plans[0]!, 2, 7, false).records[0]!.thieves).toEqual({ "GREMLIN_MERC@0": "open" });
    const off = mercBoard([strike(0, 10), strike(1, 10), defend(2)], 20, false);
    const records = simulateFight(off, lineOf(off, (plan) => plan.outcome.kills.length > 0), 4, 7, false).records;
    expect(records.every((record) => record.thieves === undefined && record.gone === undefined)).toBe(true);
  });
});

describe("kill orders with an enemy that leaves", () => {
  it("a Fat Gremlin that fled is not dead: its order's first target counts no kill", () => {
    const sneaky: EnemySim = { index: 0, name: "卑鄙地精", hp: 13, maxHp: 13, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 9, hits: 1 }] };
    const fat: EnemySim = { index: 1, name: "胖地精", hp: 15, maxHp: 15, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] };
    const hand = [defend(0), defend(1), defend(2)];
    const solver: SolverInput = { hand, player: PLAYER, enemies: [sneaky, fat], fightKind: "monster", turn: 4 };
    const thief: Thief = { index: 1, id: "FAT_GREMLIN", name: "胖地精", hp: 15, maxHp: 15, block: 0, gold: 40, turnsLeft: 1, flutter: 0 };
    const orders = [
      { key: "FAT_GREMLIN>SNEAKY_GREMLIN", label: "胖地精 > 卑鄙地精", groups: [[1], [0]] },
      { key: "SNEAKY_GREMLIN>FAT_GREMLIN", label: "卑鄙地精 > 胖地精", groups: [[0], [1]] },
    ];
    const plans = solveTurn(solver).plans;
    const input: RolloutInput = {
      solver,
      plans,
      enemies: [
        { index: 0, id: "SNEAKY_GREMLIN", move: "TACKLE_MOVE", strength: 0, powers: {} },
        { index: 1, id: "FAT_GREMLIN", move: "FLEE_MOVE", strength: 0, powers: { HEIST_POWER: 40 } },
      ],
      tables: { FAT_GREMLIN: FAT, SNEAKY_GREMLIN: SNEAKY },
      piles: { draw: Array.from({ length: 10 }, (_, i) => strike(10 + i, 6, [0, 1])), discard: [], handBase: hand },
      meta: { ...META, enc: "FAT_GREMLIN+SNEAKY_GREMLIN", t: 4 },
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 9, now: () => 0, samples: 2, horizon: 3, include: plans.slice(0, 1), orders },
      escapes: escapeInput([thief], DB),
    };
    const line = rolloutDecision(input).lines.find((entry) => entry.plan === plans[0])!;
    const fatFirst = line.orders.find((entry) => entry.order.key === "FAT_GREMLIN>SNEAKY_GREMLIN")!;
    expect(fatFirst.firstDown).toBe(0);
    expect(fatFirst.thieves).toEqual({ "FAT_GREMLIN@1": { back: 0, gone: 2 } });
    // The Sneaky Gremlin is killed on a later turn: that order's first target is dead.
    const sneakyFirst = line.orders.find((entry) => entry.order.key === "SNEAKY_GREMLIN>FAT_GREMLIN")!;
    expect(sneakyFirst.firstDown).toBe(2);
  });
});

describe("THIEF_COST: the loot as a cost in the rollout's value (escapes.lootHp)", () => {
  const TAG = "THIEVING_HOPPER@0";
  const withLoot = (input: RolloutInput, hp: number): RolloutInput => ({ ...input, escapes: { ...input.escapes!, lootHp: { [TAG]: hp } } });

  it("each line pays the loot's HP in the samples it is lost in; every other number as without the cost", () => {
    const base = hopperBoard([strike(0), defend(1), defend(2)], 40, "NAB_MOVE", { escapes: true });
    const plain = rolloutDecision(base);
    const costed = rolloutDecision(withLoot(base, 12));
    expect(plain.lines.every((line) => line.thiefCost === undefined && line.thiefLost === undefined)).toBe(true);
    costed.lines.forEach((line, i) => {
      const was = plain.lines[i]!;
      expect(line.plan).toBe(was.plan);
      expect([line.hpLoss, line.wins, line.deaths, line.potionCost]).toEqual([was.hpLoss, was.wins, was.deaths, was.potionCost]);
      // Over within the horizon (the Escape on T5): lost = gone, the rest came back.
      expect(line.thiefLost![TAG]).toBe(line.thieves![TAG]!.gone);
      expect(line.thiefCost).toBeCloseTo((12 * line.thieves![TAG]!.gone) / line.samples, 9);
      expect(line.value).toBeCloseTo(was.value - line.thiefCost!, 9);
    });
  });

  it("a 1-turn estimate: only an escape this turn pays (a thief with turns left is not lost yet)", () => {
    const oneTurn = (input: RolloutInput): RolloutInput => withLoot({ ...input, options: { ...input.options, horizon: 1 } }, 12);
    const nab = rolloutDecision(oneTurn(hopperBoard([strike(0), defend(1), defend(2)], 40, "NAB_MOVE", { escapes: true })));
    expect(nab.lines.every((line) => line.thiefCost === 0)).toBe(true);
    const escape = rolloutDecision(oneTurn(hopperBoard([strike(0), defend(1), defend(2)], 40, "ESCAPE_MOVE", { escapes: true })));
    expect(escape.lines.every((line) => line.thiefCost === 12 && line.thiefLost![TAG] === 1)).toBe(true);
  });

  it("a sample that dies pays nothing for the loot (no later for it), as for a potion", () => {
    // Its Hat Trick 21 into 5 HP and no block in hand: every line dies this turn.
    const board = hopperBoard([strike(0), strike(1)], 60, "HAT_TRICK_MOVE", { escapes: true });
    const solver = { ...board.solver, player: { ...PLAYER, hp: 5 }, enemies: board.solver.enemies.map((enemy) => ({ ...enemy, attacks: [{ damage: 21, hits: 1 }] })) };
    const dying = withLoot({ ...board, solver, plans: solveTurn(solver).plans }, 12);
    const result = rolloutDecision(dying);
    expect(result.lines.length).toBeGreaterThan(0);
    for (const line of result.lines) {
      expect(line.deaths).toBe(line.samples);
      expect(line.thiefCost).toBe(0);
    }
  });
});
