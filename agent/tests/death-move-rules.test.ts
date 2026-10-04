/**
 * MECH_DEATH_MOVE (docs/mechanics-learning.md §9): the learned "an ally's death changes a survivor's move" rules, from the
 * monster DB's `observed.ally_deaths` counts (here: the 2026-10-03 build's, copied as fixed data) to the turn solver, the
 * rollout and the whole-fight simulation. Fixed data and hand-made boards only: no knowledge file is read.
 */

import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { DEATH_RULE_MIN_N, deathRuleOf, deathRules, type AllyDeathObserved } from "../src/knowledge/mechanics.js";
import { applyDeathRules, deathOnlyMoves, describePlan, mechDeathOn } from "../src/reflex/combat-plan.js";
import type { CardModel } from "../src/reflex/card-model.js";
import { deathAllowed, simulateFight, type EnemyTable, type FightMeta, type RolloutInput } from "../src/reflex/rollout.js";
import { deathMoved, diedForGood, solveTurn, type DeathMove, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/reflex/turn-solver.js";

/** The Queen beside the Torch Head Amalgam, as the 2026-10-03 build counted it (6,575 fights; trimmed to the fields read). */
const QUEEN: AllyDeathObserved = {
  n: 22, fights: 21, move_before: { BURN_BRIGHT_FOR_ME_MOVE: 21, YOU_ARE_MINE_MOVE: 1 }, move_changed: 21, changed_to: { ENRAGE_MOVE: 21 },
  by_move: { BURN_BRIGHT_FOR_ME_MOVE: { n: 21, changed_to: { ENRAGE_MOVE: 21 } }, YOU_ARE_MINE_MOVE: { n: 1, changed_to: {} } },
  changed_evidence: ["88HNFZ9K5LZ5 F48 T6", "4JVP9LTXYY9D F48 T5", "BDAKNTSWKU5F F48 T4"], attack_changed: 0, co_deaths: 0,
  end_move: { ENRAGE_MOVE: 21, YOU_ARE_MINE_MOVE: 1 }, next_n: 22, next_move: { OFF_WITH_YOUR_HEAD_MOVE: 22 },
  next_after: { ENRAGE_MOVE: { OFF_WITH_YOUR_HEAD_MOVE: 21 }, YOU_ARE_MINE_MOVE: { OFF_WITH_YOUR_HEAD_MOVE: 1 } },
  next_evidence: ["88HNFZ9K5LZ5 F48 T6"],
  alive: { turns: 205, moves: { BURN_BRIGHT_FOR_ME_MOVE: 129, PUPPET_STRINGS_MOVE: 38, YOU_ARE_MINE_MOVE: 38 }, next: { YOU_ARE_MINE_MOVE: { BURN_BRIGHT_FOR_ME_MOVE: 37 } } },
  dead: { turns: 59, moves: { OFF_WITH_YOUR_HEAD_MOVE: 32, EXECUTION_MOVE: 16, ENRAGE_MOVE: 11 } },
};
/** The Living Shield beside the Turret Operator: Smash after it dies, Shield Slam every turn beside it. */
const SHIELD: AllyDeathObserved = {
  n: 5, fights: 5, by_move: { SHIELD_SLAM_MOVE: { n: 5, changed_to: {} } }, move_changed: 0, end_move: { SHIELD_SLAM_MOVE: 5 }, next_n: 5,
  next_move: { SMASH_MOVE: 5 }, next_after: { SHIELD_SLAM_MOVE: { SMASH_MOVE: 5 } },
  alive: { turns: 155, moves: { SHIELD_SLAM_MOVE: 155 }, next: { SHIELD_SLAM_MOVE: { SHIELD_SLAM_MOVE: 81 } } }, dead: { turns: 6, moves: { SMASH_MOVE: 6 } },
};
/** A Twig Slime (M) after a small one dies: its own cycle (Pokey Pounce 93 of 96, the same beside a living one). */
const SLIME: AllyDeathObserved = {
  n: 97, fights: 97, by_move: { CLUMP_MOVE: { n: 97, changed_to: {} } }, move_changed: 0, next_n: 96, next_move: { POKEY_POUNCE_MOVE: 93, CLUMP_MOVE: 3 },
  next_after: { CLUMP_MOVE: { POKEY_POUNCE_MOVE: 93, CLUMP_MOVE: 3 } },
  alive: { turns: 165, moves: { CLUMP_MOVE: 80, POKEY_POUNCE_MOVE: 85 }, next: { CLUMP_MOVE: { POKEY_POUNCE_MOVE: 50, CLUMP_MOVE: 6 } } },
};
/** The Living Fog after a Gas Bomb dies: Bloat, never beside a living bomb, but what its move table says anyway. */
const FOG: AllyDeathObserved = {
  n: 78, fights: 51, by_move: { SUPER_GAS_BLAST_MOVE: { n: 78, changed_to: {} } }, move_changed: 0, next_n: 62, next_move: { BLOAT_MOVE: 62 },
  next_after: { SUPER_GAS_BLAST_MOVE: { BLOAT_MOVE: 62 } }, alive: { turns: 113, moves: { SUPER_GAS_BLAST_MOVE: 113 }, next: {} }, dead: { turns: 67, moves: { BLOAT_MOVE: 66, SUPER_GAS_BLAST_MOVE: 1 } },
};
/** The move tables' successors (monster DB `moves.<move>.next`, the 2026-10-03 build). */
const QUEEN_MOVES = {
  BURN_BRIGHT_FOR_ME_MOVE: { next: { BURN_BRIGHT_FOR_ME_MOVE: 80, OFF_WITH_YOUR_HEAD_MOVE: 20 } }, ENRAGE_MOVE: { next: { OFF_WITH_YOUR_HEAD_MOVE: 10 } },
  YOU_ARE_MINE_MOVE: { next: { BURN_BRIGHT_FOR_ME_MOVE: 31, OFF_WITH_YOUR_HEAD_MOVE: 1 } },
};
const SHIELD_MOVES = { SHIELD_SLAM_MOVE: { next: { SHIELD_SLAM_MOVE: 82, SMASH_MOVE: 6 } }, SMASH_MOVE: { next: { SMASH_MOVE: 1 } } };
const FOG_MOVES = { SUPER_GAS_BLAST_MOVE: { next: { BLOAT_MOVE: 70 } }, BLOAT_MOVE: { next: { SUPER_GAS_BLAST_MOVE: 114 } } };
/** The Corpse Slug's Ravenous: stunned when another dies (the solver's hand-written rule, not a move rule). */
const SLUG: AllyDeathObserved = { n: 392, fights: 255, by_move: { GOOP_MOVE: { n: 117, changed_to: { STUNNED: 117 } } }, move_changed: 389, next_n: 0 };

describe("the death rules from monster-db.json `observed.ally_deaths`", () => {
  it("the Queen: Enrage at once from Burn Bright For Me, Off With Your Head next; the death's own and the living ally's moves", () => {
    const rule = deathRuleOf("QUEEN", "TORCH_HEAD_AMALGAM", QUEEN, QUEEN_MOVES)!;
    expect(rule.now).toEqual({ BURN_BRIGHT_FOR_ME_MOVE: { move: "ENRAGE_MOVE", changed: 21, n: 21 } });
    expect(rule.next).toEqual({ move: "OFF_WITH_YOUR_HEAD_MOVE", count: 22, n: 22, after: ["ENRAGE_MOVE", "YOU_ARE_MINE_MOVE"] });
    expect(rule.exclusive).toEqual(["ENRAGE_MOVE", "OFF_WITH_YOUR_HEAD_MOVE"]);
    expect(rule.aliveOnly).toEqual(["BURN_BRIGHT_FOR_ME_MOVE", "PUPPET_STRINGS_MOVE", "YOU_ARE_MINE_MOVE"]);
    // You Are Mine changed on 1 death only: no same-turn rule from it (n < 3).
    expect(DEATH_RULE_MIN_N).toBe(3);
  });

  it("the Living Shield: a next-turn rule against its own cycle beside the ally (Shield Slam 81/81); too few turns after for aliveOnly", () => {
    const rule = deathRuleOf("LIVING_SHIELD", "TURRET_OPERATOR", SHIELD, SHIELD_MOVES)!;
    expect(rule.now).toEqual({});
    expect(rule.next).toEqual({ move: "SMASH_MOVE", count: 5, n: 5, after: ["SHIELD_SLAM_MOVE"] });
    expect(rule.exclusive).toEqual(["SMASH_MOVE"]);
    expect(rule.aliveOnly).toEqual([]);
  });

  it("found but not applied: the Living Fog's Bloat is what its move table gives after Super Gas Blast (70 of 70)", () => {
    expect(deathRuleOf("LIVING_FOG", "GAS_BOMB", FOG, FOG_MOVES)).toBeNull();
    // Its move table not knowing the end move: applied.
    expect(deathRuleOf("LIVING_FOG", "GAS_BOMB", FOG, {})!.next).toMatchObject({ move: "BLOAT_MOVE", count: 62, n: 62 });
    // The Queen's next turn is new information after You Are Mine only (Enrage -> Off With Your Head is the table's): applied.
    expect(deathRuleOf("QUEEN", "TORCH_HEAD_AMALGAM", QUEEN, { ...QUEEN_MOVES, YOU_ARE_MINE_MOVE: { next: { OFF_WITH_YOUR_HEAD_MOVE: 5 } } })!.next).toBeNull();
  });

  it("no rule: a survivor's own cycle, a stun (Ravenous), too few deaths, under 90%", () => {
    expect(deathRuleOf("TWIG_SLIME_M", "TWIG_SLIME_S", SLIME)).toBeNull();
    expect(deathRuleOf("CORPSE_SLUG", "CORPSE_SLUG", SLUG)).toBeNull();
    expect(deathRuleOf("QUEEN", "X", { ...QUEEN, by_move: { BURN_BRIGHT_FOR_ME_MOVE: { n: 2, changed_to: { ENRAGE_MOVE: 2 } } }, next_n: 2, next_move: { OFF_WITH_YOUR_HEAD_MOVE: 2 } })).toBeNull();
    expect(deathRuleOf("QUEEN", "X", { ...QUEEN, by_move: { BURN_BRIGHT_FOR_ME_MOVE: { n: 10, changed_to: { ENRAGE_MOVE: 8 } } }, next_n: 10, next_move: { OFF_WITH_YOUR_HEAD_MOVE: 8, EXECUTION_MOVE: 2 } })).toBeNull();
    expect(deathRuleOf("QUEEN", "X", undefined)).toBeNull();
  });

  it("by survivor, from the monsters' observed blocks; none without them", () => {
    const rules = deathRules({ QUEEN: { observed: { ally_deaths: { TORCH_HEAD_AMALGAM: QUEEN } }, moves: QUEEN_MOVES }, TWIG_SLIME_M: { observed: { ally_deaths: { TWIG_SLIME_S: SLIME } } }, LIVING_FOG: { observed: { ally_deaths: { GAS_BOMB: FOG } }, moves: FOG_MOVES }, CULTIST: {} });
    expect([...rules.keys()]).toEqual(["QUEEN"]);
    expect(deathRules({ QUEEN: { observed: {} } }).size).toBe(0);
    expect(deathRules(null).size).toBe(0);
  });
});

describe("MECH_DEATH_MOVE", () => {
  it("on by default; off; an unreadable value is a warning and on; it needs MECH_RULES", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).mechDeathMove).toBe(true);
    expect(loadConfig({ MECH_DEATH_MOVE: "off" } as unknown as NodeJS.ProcessEnv).mechDeathMove).toBe(false);
    const bad = loadConfig({ MECH_DEATH_MOVE: "maybe" } as unknown as NodeJS.ProcessEnv);
    expect(bad.mechDeathMove).toBe(true);
    expect(bad.warnings.some((warning) => warning.startsWith("MECH_DEATH_MOVE"))).toBe(true);
    expect(mechDeathOn({})).toBe(true);
    expect(mechDeathOn({ mechDeathMove: false })).toBe(false);
    expect(mechDeathOn({ mechRules: false })).toBe(false);
  });
});

// ---------------------------------------------------------------- boards

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0, 1],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0,
    energyGain: 0, draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  };
}
const strike = (i: number, damage = 12) => card(i, "STRIKE", { damage });
const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });
const PLAYER: PlayerSim = { hp: 60, maxHp: 85, block: 0, energy: 3, weak: false, vulnerable: true, intangible: false, strengthNow: 0 };

/** The Queen's learned rule on the board (applyDeathRules' output for her showing `move`, the Amalgam at index 0). */
function queenRule(move: string): DeathMove {
  const now = move === "BURN_BRIGHT_FOR_ME_MOVE" ? "ENRAGE_MOVE" : null;
  const end = now ?? move;
  const next = ["ENRAGE_MOVE", "YOU_ARE_MINE_MOVE"].includes(end) ? "OFF_WITH_YOUR_HEAD_MOVE" : null;
  return {
    ally: 0, allyId: "TORCH_HEAD_AMALGAM", allyName: "火炬头聚合体", move: now, moveName: now, attacks: [], next, nextName: next ? "将头砍下" : null, nextAttack: next ? 35 : null,
    ...(now ? { nowCounts: [21, 21] as [number, number] } : {}), ...(next ? { nextCounts: [22, 22] as [number, number] } : {}),
    rule: {
      now: { BURN_BRIGHT_FOR_ME_MOVE: "ENRAGE_MOVE" }, next: "OFF_WITH_YOUR_HEAD_MOVE", after: ["ENRAGE_MOVE", "YOU_ARE_MINE_MOVE"],
      exclusive: ["ENRAGE_MOVE", "OFF_WITH_YOUR_HEAD_MOVE"], aliveOnly: ["BURN_BRIGHT_FOR_ME_MOVE", "PUPPET_STRINGS_MOVE", "YOU_ARE_MINE_MOVE"],
    },
  };
}

function amalgam(hp: number): EnemySim {
  return { index: 0, name: "火炬头聚合体", hp, maxHp: 211, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, minion: true, attacks: [{ damage: 24, hits: 1 }] };
}

function queen(rule: DeathMove | null): EnemySim {
  return { index: 1, name: "女王", hp: 356, maxHp: 419, block: 20, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...(rule ? { moveOnDeath: [rule] } : {}) };
}

const kills = (plan: Plan) => plan.outcome.enemyHpAfter.some((enemy) => enemy.index === 0 && enemy.hp <= 0);

describe("the turn solver: a line killing the ally sets the rule off", () => {
  const solve = (enemies: EnemySim[], hand: CardModel[] = [strike(0), defend(1), defend(2)]) => solveTurn({ hand, player: PLAYER, enemies, fightKind: "boss", turn: 5 } satisfies SolverInput).plans;

  it("the Queen: Enrage has no attack either, so hp_lost is as without the rule; the outcome says the rule fired", () => {
    const on = solve([amalgam(11), queen(queenRule("BURN_BRIGHT_FOR_ME_MOVE"))]);
    const off = solve([amalgam(11), queen(null)]);
    expect(on.map((plan) => [plan.steps.map((step) => `${step.cardId}>${step.target ?? ""}`).join(","), plan.outcome.hpLoss])).toEqual(off.map((plan) => [plan.steps.map((step) => `${step.cardId}>${step.target ?? ""}`).join(","), plan.outcome.hpLoss]));
    const kill = on.find(kills)!;
    expect(kill.outcome.enemyHpAfter.find((enemy) => enemy.index === 1)!.deathMove).toEqual({
      ally: 0, allyName: "火炬头聚合体", move: "ENRAGE_MOVE", moveName: "ENRAGE_MOVE", attack: 0, before: 0, next: "OFF_WITH_YOUR_HEAD_MOVE", nextName: "将头砍下", nextAttack: 35, nowCounts: [21, 21], nextCounts: [22, 22],
    });
    expect(on.filter((plan) => !kills(plan)).every((plan) => plan.outcome.enemyHpAfter.every((enemy) => enemy.deathMove === undefined))).toBe(true);
    expect(describePlan(kill, 85)["death_move"]).toBe(
      "kills 火炬头聚合体: 女王's move becomes ENRAGE_MOVE (no attack this turn; 21 of 21 logged) at once, already in hp_lost; next turn 女王 uses 将头砍下 (OFF_WITH_YOUR_HEAD_MOVE, attack ~35 as priced now; 22 of 22 logged), not in hp_lost (the rollout counts it)",
    );
  });

  it("a same-turn move with an attack: the killing line counts it instead of the shown one", () => {
    const rule: DeathMove = { ...queenRule("BURN_BRIGHT_FOR_ME_MOVE"), move: "SMASH_MOVE", moveName: "砸击", attacks: [{ damage: 16, hits: 1 }] };
    const shown = { ...queen(rule), attacks: [{ damage: 6, hits: 1 }] };
    const plans = solve([amalgam(11), shown], [strike(0)]);
    const kill = plans.find(kills)!;
    const keep = plans.find((plan) => plan.steps.length === 0)!;
    // Killing: the Amalgam's 24 gone, the survivor's 16 instead of 6. Not killing: 24 + 6.
    expect(kill.outcome.hpLoss).toBe(16);
    expect(keep.outcome.hpLoss).toBe(30);
    expect(kill.outcome.enemyHpAfter.find((enemy) => enemy.index === 1)!.deathMove).toMatchObject({ move: "SMASH_MOVE", attack: 16, before: 6 });
  });

  it("nothing logged from her move now (Puppet Strings): a killing line sets nothing off this turn", () => {
    const kill = solve([amalgam(11), queen(queenRule("PUPPET_STRINGS_MOVE"))]).find(kills)!;
    expect(kill.outcome.enemyHpAfter.find((enemy) => enemy.index === 1)!.deathMove).toBeUndefined();
    expect(describePlan(kill, 85)).not.toHaveProperty("death_move");
  });

  it("the planner's move-model forecasts leave the death's own moves out while the ally lives", () => {
    expect(deathOnlyMoves([amalgam(11), queen(queenRule("BURN_BRIGHT_FOR_ME_MOVE"))])).toEqual(new Map([[1, new Set(["ENRAGE_MOVE", "OFF_WITH_YOUR_HEAD_MOVE"])]]));
    expect(deathOnlyMoves([amalgam(11), queen(null)]).size).toBe(0);
  });

  it("not a death: a Stock revive, an illusion, a reattaching segment, an ally dead already", () => {
    expect(diedForGood({ alive: false }, amalgam(11))).toBe(true);
    expect(diedForGood({ alive: true }, amalgam(11))).toBe(false);
    expect(diedForGood({ alive: false }, { ...amalgam(11), stock: 1 })).toBe(false);
    expect(diedForGood({ alive: false }, { ...amalgam(11), illusion: true })).toBe(false);
    expect(diedForGood({ alive: false }, { ...amalgam(11), reattach: true })).toBe(false);
    expect(diedForGood({ alive: false }, amalgam(0))).toBe(false);
    const q = { ...queen(queenRule("BURN_BRIGHT_FOR_ME_MOVE")), alive: true };
    expect(deathMoved(q, { enemies: [{ ...amalgam(0), alive: false }, q] }, { enemies: [amalgam(11), queen(null)] })?.move).toBe("ENRAGE_MOVE");
    expect(deathMoved({ ...q, alive: false }, { enemies: [{ ...amalgam(0), alive: false }, q] }, { enemies: [amalgam(11), queen(null)] })).toBeNull();
  });
});

describe("the board's survivors get the rules (applyDeathRules)", () => {
  const rules = deathRules({ QUEEN: { observed: { ally_deaths: { TORCH_HEAD_AMALGAM: QUEEN } }, moves: QUEEN_MOVES } });
  const raw = (index: number, id: string, move: string) => ({ index, enemy_id: id, is_alive: true, current_hp: 100, move_id: move, powers: [] });
  const board = (move: string) => {
    const enemies = [amalgam(100), queen(null)];
    applyDeathRules(enemies, { enemies: [raw(0, "TORCH_HEAD_AMALGAM", "TACKLE_4_MOVE"), raw(1, "QUEEN", move)], player: { powers: [] } }, rules, 8);
    return enemies;
  };

  it("resolved for the move she shows now; the rule for the later turns kept", () => {
    const burn = board("BURN_BRIGHT_FOR_ME_MOVE")[1]!.moveOnDeath!;
    expect(burn).toHaveLength(1);
    expect(burn[0]).toMatchObject({ ally: 0, allyId: "TORCH_HEAD_AMALGAM", move: "ENRAGE_MOVE", next: "OFF_WITH_YOUR_HEAD_MOVE", nowCounts: [21, 21], nextCounts: [22, 22] });
    expect(burn[0]!.rule).toEqual({ now: { BURN_BRIGHT_FOR_ME_MOVE: "ENRAGE_MOVE" }, next: "OFF_WITH_YOUR_HEAD_MOVE", after: ["ENRAGE_MOVE", "YOU_ARE_MINE_MOVE"], exclusive: ["ENRAGE_MOVE", "OFF_WITH_YOUR_HEAD_MOVE"], aliveOnly: ["BURN_BRIGHT_FOR_ME_MOVE", "PUPPET_STRINGS_MOVE", "YOU_ARE_MINE_MOVE"] });
    expect(board("YOU_ARE_MINE_MOVE")[1]!.moveOnDeath![0]).toMatchObject({ move: null, next: "OFF_WITH_YOUR_HEAD_MOVE" });
    // Puppet Strings (turn 1): nothing logged from it, nothing this turn, but the rule rides along for the rollout.
    expect(board("PUPPET_STRINGS_MOVE")[1]!.moveOnDeath![0]).toMatchObject({ move: null, next: null });
    // The Amalgam has no rule; no rules, nothing set.
    expect(board("BURN_BRIGHT_FOR_ME_MOVE")[0]).not.toHaveProperty("moveOnDeath");
    const none = [amalgam(100), queen(null)];
    applyDeathRules(none, { enemies: [raw(0, "TORCH_HEAD_AMALGAM", "TACKLE_4_MOVE"), raw(1, "QUEEN", "BURN_BRIGHT_FOR_ME_MOVE")] }, new Map(), 8);
    expect(none[1]).not.toHaveProperty("moveOnDeath");
  });
});

// ---------------------------------------------------------------- the rollout and the whole fight

const META: FightMeta = { act: 3, t: 5, asc: 8, kind: "boss", enc: "QUEEN+TORCH_HEAD_AMALGAM", deck: { n: 10, atk: 10, skl: 0, pow: 0, junk: 0, dmg: 60, blk: 0, up: 0 }, relics: 1, max_en: 3 };
/** The A8 move tables (the shown 7x5 Off With Your Head: Strength 2 and our Vulnerable in it), the move model's successors. */
const TABLES: Record<string, EnemyTable> = {
  QUEEN: {
    moves: {
      PUPPET_STRINGS_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 },
      YOU_ARE_MINE_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 },
      BURN_BRIGHT_FOR_ME_MOVE: { damage: 0, hits: 1, strength: 2, block: 20 },
      ENRAGE_MOVE: { damage: 0, hits: 1, strength: 2, block: 0 },
      OFF_WITH_YOUR_HEAD_MOVE: { damage: 7, hits: 5, strength: 0, block: 0, shown: true },
      EXECUTION_MOVE: { damage: 25, hits: 1, strength: 0, block: 0, shown: true },
    },
    next: {
      PUPPET_STRINGS_MOVE: { YOU_ARE_MINE_MOVE: 32 },
      YOU_ARE_MINE_MOVE: { BURN_BRIGHT_FOR_ME_MOVE: 31, OFF_WITH_YOUR_HEAD_MOVE: 1 },
      BURN_BRIGHT_FOR_ME_MOVE: { BURN_BRIGHT_FOR_ME_MOVE: 80, OFF_WITH_YOUR_HEAD_MOVE: 20 },
      ENRAGE_MOVE: { OFF_WITH_YOUR_HEAD_MOVE: 10 },
      OFF_WITH_YOUR_HEAD_MOVE: { EXECUTION_MOVE: 16 },
      EXECUTION_MOVE: { ENRAGE_MOVE: 11 },
    },
  },
  TORCH_HEAD_AMALGAM: { moves: { TACKLE_4_MOVE: { damage: 16, hits: 1, strength: 0, block: 0 }, BEAM_MOVE: { damage: 12, hits: 3, strength: 0, block: 0 } }, next: { TACKLE_4_MOVE: { BEAM_MOVE: 13 }, BEAM_MOVE: { TACKLE_4_MOVE: 21 } } },
};

/** The kill turn (the Amalgam at `allyHp`, the Queen on `move`), the hand one 12-damage Strike, the piles Strikes only (no block). */
function fight(move: string, rule: boolean, allyHp = 11): RolloutInput {
  const hand = [strike(0)];
  const solver: SolverInput = { hand, player: PLAYER, enemies: [amalgam(allyHp), queen(rule ? queenRule(move) : null)], fightKind: "boss", turn: 5 };
  return {
    solver,
    plans: solveTurn(solver).plans,
    enemies: [{ index: 0, id: "TORCH_HEAD_AMALGAM", move: "TACKLE_4_MOVE", strength: 0, powers: { MINION_POWER: 1 } }, { index: 1, id: "QUEEN", move, strength: 0, powers: {} }],
    tables: TABLES,
    piles: { draw: Array.from({ length: 15 }, (_, i) => strike(10 + i, 1)), discard: [], handBase: hand },
    meta: META,
    playerPowers: { VULNERABLE_POWER: 99 },
    potions: 0,
    mm: {},
    model: null,
    gates: null,
    options: { budgetMs: 1e9, seed: 3, now: () => 0, samples: 2, horizon: 3 },
  };
}

const queenMove = (record: { snap: { E: unknown[][] } }) => record.snap.E.find((enemy) => enemy[1] === "QUEEN")![8];

describe("the rollout (5-turn) and the whole fight (B2): the Queen after the Amalgam dies", () => {
  it("the killing line: Enrage this enemy turn, Off With Your Head (7x5) the next, every sample; without the rule mostly Burn Bright again", () => {
    for (const full of [false, true]) {
      let offChops = 0;
      for (let seed = 1; seed <= 12; seed += 1) {
        const on = fight("BURN_BRIGHT_FOR_ME_MOVE", true);
        const records = simulateFight(on, on.plans.find(kills)!, 3, seed, full).records;
        expect(queenMove(records[0]!)).toBe("ENRAGE_MOVE");
        expect(queenMove(records[1]!)).toBe("OFF_WITH_YOUR_HEAD_MOVE");
        // No block in the piles: the next turn's enemy part is the whole head-chop.
        expect(records[1]!.enemyPart).toBe(35);
        const off = fight("BURN_BRIGHT_FOR_ME_MOVE", false);
        const plain = simulateFight(off, off.plans.find(kills)!, 3, seed, full).records;
        expect(queenMove(plain[0]!)).toBe("BURN_BRIGHT_FOR_ME_MOVE");
        if (queenMove(plain[1]!) === "OFF_WITH_YOUR_HEAD_MOVE") offChops += 1;
      }
      // The 5-turn rollout's move model: Burn Bright -> Off With Your Head 20%; the whole fight's hand-written script: always.
      if (full) expect(offChops).toBe(12);
      else expect(offChops).toBeLessThan(12);
    }
  });

  it("the Amalgam alive: never Off With Your Head nor Enrage (the move model's 20% were the death turns)", () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      const on = fight("BURN_BRIGHT_FOR_ME_MOVE", true, 150);
      const records = simulateFight(on, on.plans[0]!, 3, seed, false).records;
      for (const record of records) expect(["BURN_BRIGHT_FOR_ME_MOVE"]).toContain(queenMove(record));
    }
    expect(deathAllowed({ index: 1, base: queen(queenRule("BURN_BRIGHT_FOR_ME_MOVE")) }, [{ index: 0, id: "TORCH_HEAD_AMALGAM", alive: true }, { index: 1, id: "QUEEN", alive: true }])!("OFF_WITH_YOUR_HEAD_MOVE")).toBe(false);
    expect(deathAllowed({ index: 1, base: queen(queenRule("BURN_BRIGHT_FOR_ME_MOVE")) }, [{ index: 0, id: "TORCH_HEAD_AMALGAM", alive: false }, { index: 1, id: "QUEEN", alive: true }])!("BURN_BRIGHT_FOR_ME_MOVE")).toBe(false);
    expect(deathAllowed({ index: 1, base: queen(null) }, [])).toBeUndefined();
  });

  it("killed on You Are Mine (no same-turn change): Off With Your Head next turn, also in the whole fight (the hand script waited a Burn Bright)", () => {
    for (const full of [false, true]) {
      const on = fight("YOU_ARE_MINE_MOVE", true);
      const records = simulateFight(on, on.plans.find(kills)!, 3, 5, full).records;
      expect(queenMove(records[0]!)).toBe("YOU_ARE_MINE_MOVE");
      expect(queenMove(records[1]!)).toBe("OFF_WITH_YOUR_HEAD_MOVE");
    }
    const off = fight("YOU_ARE_MINE_MOVE", false);
    expect(queenMove(simulateFight(off, off.plans.find(kills)!, 3, 5, true).records[1]!)).toBe("BURN_BRIGHT_FOR_ME_MOVE");
  });

  it("killed on a later simulated turn: the rule re-read from her move then (Enrage, then the head-chop)", () => {
    // The Amalgam at 23: the start turn's Strike leaves it at 11, the policy's Strikes (1 damage each) cannot kill it; at 13 the
    // policy's turn-1 hand of 1-damage Strikes is not enough either. Kill it on turn 1 with a hand of real Strikes instead.
    const on = fight("BURN_BRIGHT_FOR_ME_MOVE", true, 30);
    on.piles.draw = Array.from({ length: 15 }, (_, i) => strike(10 + i, 12));
    const records = simulateFight(on, on.plans.find((plan) => plan.steps.length === 1)!, 4, 7, false).records;
    const killedAt = records.findIndex((record) => record.snap.E.find((enemy) => enemy[1] === "TORCH_HEAD_AMALGAM")![5] === false);
    expect(killedAt).toBeGreaterThan(0);
    expect(queenMove(records[killedAt]!)).toBe("ENRAGE_MOVE");
    if (records[killedAt + 1]) expect(queenMove(records[killedAt + 1]!)).toBe("OFF_WITH_YOUR_HEAD_MOVE");
  });
});
