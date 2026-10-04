/**
 * MECH_MOVE_RULES (docs/mechanics-learning.md §8): the second learned class, "a power removed or lowered on our turn ->
 * the enemy's move changes at once", read per monster from monster-db.json `observed` (knowledge/mechanics.ts moveRules),
 * the turn solver's use of it (EnemySim.moveOnStrip: the new move's attack in hp_lost, the outcome's movedTo), the
 * option's fact, the rollout going on from the new move, the board's enemies given the rules (combat-plan applyMoveRules),
 * the Kaiser Crab's back attack needing both claws (PlayerSim.backAttackPair), the knowledge text and the switch.
 * Hand-made boards and observed blocks (the counts of the 2026-10-02 build); no live knowledge file is read.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { clearedWith, MOVE_RULE_MIN_N, moveChangeOf, moveRules, type ObservedMonster, type StrippedPower } from "../src/knowledge/mechanics.js";
import { setMonsterDbForTests, type MonsterDb } from "../src/knowledge/monster-db.js";
import { renderKnowledgePrefix } from "../src/knowledge/render/knowledge-prefix.js";
import { renderMonster } from "../src/knowledge/render/monster-text.js";
import { applyMoveRules, describePlan, learnedMoveRules, mechMoveOn } from "../src/reflex/combat-plan.js";
import type { CardModel } from "../src/reflex/card-model.js";
import { simulateFight, type EnemyTable, type FightMeta, type RolloutInput } from "../src/reflex/rollout.js";
import { ruledMove, solveTurn, type EnemySim, type MoveOnStrip, type Plan, type PlayerSim, type SolverInput } from "../src/reflex/turn-solver.js";
import { knowledgeFile } from "../src/knowledge/files.js";

/** The Axebot's last-Stock strips of the 2026-10-02 build: 22 of 23 showed Boot Up on their own frame (one was in it). */
const STOCK: StrippedPower = {
  n: 23, fights: 23, move_after: { BOOT_UP_MOVE: 23 }, co_removed: { STRENGTH_POWER: 22, VULNERABLE_POWER: 14, WEAK_POWER: 3 },
  move_before: { HAMMER_UPPERCUT_MOVE: 13, ONE_TWO_MOVE: 9, BOOT_UP_MOVE: 1 }, move_changed: 22, move_changed_share: 0.957, changed_to: { BOOT_UP_MOVE: 22 },
  changed_evidence: ["TQX5JJX3UD39 F37 T5", "U6W7J2AWV7AV F39 T4"], next_move: { HAMMER_UPPERCUT_MOVE: 22 }, changed_next: { HAMMER_UPPERCUT_MOVE: 21 }, revived: 22,
};

const MONSTERS: Record<string, { observed?: ObservedMonster }> = {
  AXEBOT: {
    observed: {
      powers_stripped: {
        STOCK_POWER: STOCK,
        STRENGTH_POWER: { n: 26, fights: 26, move_changed: 25, changed_to: { BOOT_UP_MOVE: 25 }, revived: 25 },
        // 7 of 8: in the gap above 0.8.
        WEAK_POWER: { n: 8, fights: 8, move_changed: 7, changed_to: { BOOT_UP_MOVE: 7 }, revived: 7 },
      },
      powers_lowered: { STOCK_POWER: { n: 22, fights: 22, move_changed: 22, changed_to: { BOOT_UP_MOVE: 22 }, changed_next: { HAMMER_UPPERCUT_MOVE: 22 }, revived: 22, changed_evidence: ["TQX5JJX3UD39 F37 T1"] } },
    },
  },
  // Crab Rage goes when a partner dies, the survivor's move never changes (19 of 19 unchanged).
  CRUSHER: { observed: { powers_stripped: { CRAB_RAGE_POWER: { n: 19, fights: 19, move_changed: 0, changed_to: {} } } } },
  // A stun is the stun rule's (class A), not a move change.
  THIEVING_HOPPER: { observed: { powers_stripped: { FLUTTER_POWER: { n: 41, fights: 41, move_changed: 41, changed_to: { STUNNED: 41 } } } } },
  FEW: { observed: { powers_stripped: { X_POWER: { n: MOVE_RULE_MIN_N - 1, fights: 4, move_changed: 4, changed_to: { Y_MOVE: 4 } } } } },
  // Changed, but to two moves, neither 80% of the strips.
  SPLIT: { observed: { powers_stripped: { X_POWER: { n: 10, fights: 10, move_changed: 10, changed_to: { A_MOVE: 6, B_MOVE: 4 } } } } },
  PLAIN: {},
};

describe("the move rules from monster-db.json `observed` (per monster)", () => {
  it("a (monster, power) is a rule with enough strips, nearly all changing its move, to one move", () => {
    const rules = moveRules(MONSTERS);
    expect([...rules.keys()]).toEqual(["AXEBOT"]);
    const axebot = rules.get("AXEBOT")!;
    expect(axebot.map((rule) => `${rule.power}:${rule.how}>${rule.move} ${rule.changed}/${rule.n}`)).toEqual([
      "STOCK_POWER:removed>BOOT_UP_MOVE 22/23",
      "STRENGTH_POWER:removed>BOOT_UP_MOVE 25/26",
      "WEAK_POWER:removed>BOOT_UP_MOVE 7/8",
      "STOCK_POWER:lowered>BOOT_UP_MOVE 22/22",
    ]);
    expect(axebot[0]).toMatchObject({ monster: "AXEBOT", fights: 23, next: { HAMMER_UPPERCUT_MOVE: 21 }, revived: 22, coRemoved: { STRENGTH_POWER: 22 }, evidence: ["TQX5JJX3UD39 F37 T5", "U6W7J2AWV7AV F39 T4"] });
    // The revive clears the powers whose own strips show the same move.
    expect(clearedWith(axebot[0]!, axebot)).toEqual(["STRENGTH_POWER", "WEAK_POWER"]);
    expect(moveChangeOf(undefined)).toBeNull();
    // No data (a DB built before the mining): no rules.
    expect(moveRules(undefined).size).toBe(0);
    expect(moveRules({ PLAIN: {} }).size).toBe(0);
  });
});

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0, 1],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0,
    energyGain: 0, draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  };
}
const strike = (i: number, damage = 6) => card(i, "STRIKE", { damage });
const PLAYER: PlayerSim = { hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
const strikes = (n: number, target?: number) => (plan: Plan) =>
  plan.steps.length === n && plan.steps.every((step) => step.cardId === "STRIKE" && (target === undefined || step.target === target));

const BOOT_UP = (how: "removed" | "lowered"): MoveOnStrip => ({ power: "STOCK_POWER", name: "库存", how, move: "BOOT_UP_MOVE", moveName: "启动", attacks: [], n: how === "removed" ? 23 : 22, changed: 22 });

/** An Axebot with `stock` left at 10 HP showing One-Two 13x2, with the learned rules or not. */
function axebot(stock: number, rules: MoveOnStrip[] = []): EnemySim {
  return {
    index: 0, name: "巨斧机器人", hp: 10, maxHp: 81, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, stock, attacks: [{ damage: 13, hits: 2 }],
    ...(rules.length > 0 ? { moveOnStrip: rules } : {}),
  };
}

describe("the turn solver: a learned move change", () => {
  const solve = (enemy: EnemySim, hand = [strike(0), strike(1)]) => solveTurn({ hand, player: PLAYER, enemies: [enemy], fightKind: "elite", turn: 5 } satisfies SolverInput).plans;

  it("the kill that takes the Axebot's last Stock: back in Boot Up, no attack; the outcome says so", () => {
    const kill = solve(axebot(1, [BOOT_UP("removed"), BOOT_UP("lowered")])).find(strikes(2))!;
    // Dead in the solver's sim before too (the revive is the rollout's): no attack either way, now with the move named.
    expect(kill.outcome.hpLoss).toBe(0);
    expect(kill.outcome.enemyHpAfter[0]!.movedTo).toEqual({ power: "STOCK_POWER", name: "库存", how: "removed", move: "BOOT_UP_MOVE", moveName: "启动", attack: 0, before: 26, n: 23, changed: 22 });
    expect(describePlan(kill, 80)["move_change"]).toBe("removes 巨斧机器人's 库存: its move becomes 启动 (BOOT_UP_MOVE, no attack this turn instead of the 26 shown; 22 of 23 logged), already in hp_lost");
    // One hit kills nothing: One-Two lands, no change.
    const one = solve(axebot(1, [BOOT_UP("removed")])).find(strikes(1))!;
    expect(one.outcome.hpLoss).toBe(26);
    expect(one.outcome.enemyHpAfter[0]).not.toHaveProperty("movedTo");
    expect(describePlan(one, 80)).not.toHaveProperty("move_change");
  });

  it("Stock 2: the kill takes a stack (lowered); only a lowered rule fires", () => {
    const lowered = solve(axebot(2, [BOOT_UP("removed"), BOOT_UP("lowered")])).find(strikes(2))!;
    expect(lowered.outcome.enemyHpAfter[0]!.movedTo).toMatchObject({ how: "lowered", move: "BOOT_UP_MOVE" });
    expect(describePlan(lowered, 80)["move_change"]).toMatch(/^takes a stack of 巨斧机器人's 库存: its move becomes 启动/);
    expect(solve(axebot(2, [BOOT_UP("removed")])).find(strikes(2))!.outcome.enemyHpAfter[0]).not.toHaveProperty("movedTo");
  });

  it("a move with an attack: the new move's hit is counted instead of the shown one", () => {
    // A made-up rule on a counted power: Artifact stripped by a debuff -> a 20 hit, where 5 was shown.
    const bash = card(0, "BASH", { damage: 8, vulnerable: 2, cost: 2 });
    const enemy: EnemySim = { index: 0, name: "X", hp: 80, maxHp: 80, block: 0, vulnerable: 0, weak: 0, artifact: 1, intangible: false, attacks: [{ damage: 5, hits: 1 }] };
    const rule: MoveOnStrip = { power: "ARTIFACT_POWER", name: "人工制品", how: "removed", move: "ANGRY_MOVE", moveName: "暴怒", attacks: [{ damage: 20, hits: 1 }], n: 9, changed: 9 };
    const withRule = solve({ ...enemy, moveOnStrip: [rule] }, [bash]).find((plan) => plan.steps.length === 1)!;
    expect(withRule.outcome.hpLoss).toBe(20);
    expect(withRule.outcome.enemyHpAfter[0]!.movedTo).toMatchObject({ attack: 20, before: 5 });
    expect(describePlan(withRule, 80)["move_change"]).toBe("removes X's 人工制品: its move becomes 暴怒 (ANGRY_MOVE, attack 20 this turn instead of the 5 shown; 9 of 9 logged), already in hp_lost");
    expect(solve(enemy, [bash]).find((plan) => plan.steps.length === 1)!.outcome.hpLoss).toBe(5);
  });

  it("without rules (the switch off, no data) every line and score is the plain solver's", () => {
    const on = solve(axebot(1, [BOOT_UP("removed")]));
    const off = solve(axebot(1));
    expect(on.map((plan) => [plan.outcome.hpLoss, plan.score])).toEqual(off.map((plan) => [plan.outcome.hpLoss, plan.score]));
    expect(ruledMove(axebot(1), axebot(1))).toBeNull();
  });
});

describe("the Kaiser Crab: the back attack needs both claws (class C)", () => {
  const claw = (index: number, name: string, hp: number, damage: number): EnemySim => ({
    index, name, hp, maxHp: 219, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, crabRage: true, attacks: damage > 0 ? [{ damage, hits: 1 }] : [],
  });
  const player = (facing: number, pair: boolean): PlayerSim => ({ ...PLAYER, surrounded: true, facing, ...(pair ? { backAttackPair: true } : {}) });
  const loss = (enemies: EnemySim[], facing: number, pair: boolean, target: number) =>
    solveTurn({ hand: [strike(0)], player: player(facing, pair), enemies, fightKind: "boss", turn: 4 }).plans.find(strikes(1, target))!.outcome.hpLoss;

  it("the partner dies this turn: the survivor's x1.5 from behind is gone (TQX5JJX3UD39 F33 T4: Laser 49 -> 39 with Crab Rage's +6)", () => {
    // We face the Crusher (0); the Rocket behind shows Laser 49 = (31 + 2) x 1.5. The Strike kills the Crusher.
    const board = [claw(0, "碾碎爪", 5, 0), claw(1, "火箭", 150, 49)];
    expect(loss(board, 0, false, 0)).toBe(55);
    expect(loss(board, 0, true, 0)).toBe(39);
    // Faced, it showed no x1.5: turning to the Crusher for the kill no longer puts one on (33 + 6).
    const faced = [claw(0, "碾碎爪", 5, 0), claw(1, "火箭", 150, 33)];
    expect(loss(faced, 1, false, 0)).toBe(55);
    expect(loss(faced, 1, true, 0)).toBe(39);
  });

  it("one claw left: its shown hit is what lands, whatever the noted facing (KXG79NARS0LT F33 T7: Precision Beam 26)", () => {
    // The Crusher died last turn; the Rocket is index 0 now, the noted facing still the dead claw's 1.
    const alone = [claw(0, "火箭", 150, 26)];
    expect(loss(alone, 1, false, 0)).toBe(18);
    expect(loss(alone, 1, true, 0)).toBe(26);
  });

  it("both live at the turn's end: as before", () => {
    const board = [claw(0, "碾碎爪", 100, 0), claw(1, "火箭", 150, 49)];
    expect(loss(board, 0, true, 1)).toBe(loss(board, 0, false, 1));
    expect(loss(board, 0, true, 1)).toBe(33);
  });
});

// ---------------------------------------------------------------- the rollout

const META: FightMeta = { act: 3, t: 5, asc: 8, kind: "elite", enc: "AXEBOT", deck: { n: 10, atk: 10, skl: 0, pow: 0, junk: 0, dmg: 60, blk: 0, up: 0 }, relics: 1, max_en: 3 };
const AXEBOT_TABLE: EnemyTable = {
  moves: {
    BOOT_UP_MOVE: { damage: 0, hits: 1, strength: 3, block: 10 },
    HAMMER_UPPERCUT_MOVE: { damage: 14, hits: 1, strength: 0, block: 0 },
    ONE_TWO_MOVE: { damage: 10, hits: 2, strength: 0, block: 0 },
  },
  next: { BOOT_UP_MOVE: { HAMMER_UPPERCUT_MOVE: 1 }, HAMMER_UPPERCUT_MOVE: { ONE_TWO_MOVE: 1 }, ONE_TWO_MOVE: { ONE_TWO_MOVE: 1 } },
};

function axebotBoard(rule: boolean): RolloutInput {
  const enemy: EnemySim = { ...axebot(1, rule ? [{ ...BOOT_UP("removed"), clears: ["STRENGTH_POWER"] }] : []), attacks: [{ damage: 16, hits: 2 }] };
  const hand = [strike(0), strike(1)];
  const solver: SolverInput = { hand, player: { ...PLAYER, hp: 80 }, enemies: [enemy], fightKind: "elite", turn: 5 };
  return {
    solver,
    plans: solveTurn(solver).plans,
    enemies: [{ index: 0, id: "AXEBOT", move: "ONE_TWO_MOVE", strength: 6, powers: { STOCK_POWER: 1, STRENGTH_POWER: 6 } }],
    tables: { AXEBOT: AXEBOT_TABLE },
    piles: { draw: Array.from({ length: 10 }, (_, i) => card(10 + i, "TAP", { damage: 0, cost: 3 })), discard: [], handBase: hand },
    meta: META,
    playerPowers: {},
    potions: 0,
    mm: {},
    model: null,
    gates: null,
    options: { budgetMs: 1e9, seed: 3, now: () => 0, samples: 1, horizon: 2 },
  };
}

describe("the rollout: the Axebot revived into Boot Up", () => {
  it("the next turn is Boot Up's successor with its Strength cleared and Boot Up's own; without the rule, One-Two again at its old Strength", () => {
    const next = (rule: boolean) => {
      const input = axebotBoard(rule);
      return simulateFight(input, input.plans.find(strikes(2))!, 2, 11, false).records[1]!.loss;
    };
    // Boot Up (+3 Strength) after the revive cleared its 6: Hammer Uppercut 14 + 3.
    expect(next(true)).toBe(17);
    // As before: the move model's One-Two after One-Two, Strength 6 kept: (10 + 6) x 2.
    expect(next(false)).toBe(32);
  });
});

// ---------------------------------------------------------------- the board's enemies, the switch

const DB: MonsterDb = {
  bosses: {}, encounters: {},
  monsters: {
    AXEBOT: {
      moves: {
        BOOT_UP_MOVE: { name: "启动", next: { HAMMER_UPPERCUT_MOVE: 4 } },
        HAMMER_UPPERCUT_MOVE: { name: "上勾锤击", damage_by_asc: { "8": { base_per_hit: { "14": 9 }, hits: { "1": 9 } } } },
      },
      observed: MONSTERS["AXEBOT"]!.observed!,
    },
  },
};

afterEach(() => setMonsterDbForTests(null));

describe("the board's enemies get the rules (applyMoveRules)", () => {
  const raw = (powers: { power_id: string; name: string; amount: number }[], index = 0, id = "AXEBOT") => ({ index, enemy_id: id, is_alive: true, powers });

  it("each rule whose power the solver sees go (Stock), its move's attack at the ascension; not Strength or Weak", () => {
    setMonsterDbForTests(DB);
    const rules = learnedMoveRules({});
    expect(rules.get("AXEBOT")).toHaveLength(4);
    const enemies = [axebot(1), { ...axebot(0), index: 1 }];
    const combat = {
      player: { powers: [] },
      enemies: [raw([{ power_id: "STOCK_POWER", name: "库存", amount: 1 }, { power_id: "STRENGTH_POWER", name: "力量", amount: 6 }]), raw([{ power_id: "STRENGTH_POWER", name: "力量", amount: 6 }], 1)],
    };
    applyMoveRules(enemies, combat, rules, 8);
    expect(enemies[0]!.moveOnStrip).toEqual([
      { power: "STOCK_POWER", name: "库存", how: "removed", move: "BOOT_UP_MOVE", moveName: "启动", attacks: [], n: 23, changed: 22, clears: ["STRENGTH_POWER", "WEAK_POWER"] },
      { power: "STOCK_POWER", name: "库存", how: "lowered", move: "BOOT_UP_MOVE", moveName: "启动", attacks: [], n: 22, changed: 22, clears: ["STRENGTH_POWER", "WEAK_POWER"] },
    ]);
    expect(enemies[1]).not.toHaveProperty("moveOnStrip");
  });

  it("MECH_MOVE_RULES off, or MECH_RULES off: no rules", () => {
    setMonsterDbForTests(DB);
    expect(learnedMoveRules({ mechMoveRules: false }).size).toBe(0);
    expect(learnedMoveRules({ mechRules: false }).size).toBe(0);
    expect(mechMoveOn({})).toBe(true);
    expect(mechMoveOn({ mechRules: false })).toBe(false);
    expect(mechMoveOn({ mechMoveRules: false })).toBe(false);
  });

  it("MECH_MOVE_RULES: on by default; off; an unreadable value is a warning and on", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).mechMoveRules).toBe(true);
    expect(loadConfig({ MECH_MOVE_RULES: "off" } as unknown as NodeJS.ProcessEnv).mechMoveRules).toBe(false);
    const bad = loadConfig({ MECH_MOVE_RULES: "maybe" } as unknown as NodeJS.ProcessEnv);
    expect(bad.mechMoveRules).toBe(true);
    expect(bad.warnings.some((warning) => warning.startsWith("MECH_MOVE_RULES"))).toBe(true);
  });
});

// ---------------------------------------------------------------- the knowledge text

const GKB = join(dirname(fileURLToPath(import.meta.url)), "gkb-data", "knowledge");
const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A copy of tests/gkb-data's knowledge with a move rule on the CLAW: its Thorns stripped -> SNIP 30 of 30, revived. */
function movedCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), "mech-move-"));
  temps.push(dir);
  cpSync(GKB, dir, { recursive: true });
  const path = knowledgeFile(dir, "monster-db.json");
  const db = JSON.parse(readFileSync(path, "utf8")) as { monsters: Record<string, Record<string, unknown>>; observed?: unknown };
  const thorns: StrippedPower = { n: 30, fights: 20, move_after: { SNIP_MOVE: 30 }, move_changed: 30, changed_to: { SNIP_MOVE: 30 }, changed_next: { SNIP_MOVE: 28 }, revived: 30 };
  db.observed = { note: "test", end_turn_check: true, powers_stripped: { THORNS_POWER: { ...thorns, monsters: { CLAW: 30 } } } };
  db.monsters["CLAW"]!["observed"] = { powers_stripped: { THORNS_POWER: thorns } };
  writeFileSync(path, JSON.stringify(db));
  return dir;
}

describe("the knowledge text: learned move changes", () => {
  const ctx = { ascension: 9, knowledgeDir: GKB };
  const prefix = (over: Record<string, unknown>) => renderKnowledgePrefix({ ...ctx, ...over }, { sections: null, path: "none", missing: "test" } as never);

  it("one short line per move; MECH_MOVE_RULES off: the prefix as with MECH_RULES alone", () => {
    const copy = movedCopy();
    const text = renderMonster("CLAW", { ...ctx, knowledgeDir: copy });
    const lines = text.slice(text.indexOf("观察到的机制")).split("\n所在遭遇的战绩")[0]!.split("\n").filter((line) => line.startsWith("- "));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^- .+ 在我方回合被去掉时：它的招式立即变成 .+（(有|无)攻击；.+去掉 30\/30 次），下回合 .+；那一帧它的最大生命值变了（被打到 0 后复活或变形）$/);
    const off = prefix({ knowledgeDir: copy, moveRules: false });
    expect(off).not.toContain("在我方回合被去掉时：它的招式立即变成");
    // Without the observed data, both switches on: as before.
    expect(prefix({})).toBe(prefix({ moveRules: false }));
    expect(prefix({ knowledgeDir: copy })).not.toBe(off);
  });
});
