/**
 * Mechanics learning (docs/mechanics-learning.md): the stun rules read from monster-db.json `observed`
 * (knowledge/mechanics.ts), the turn solver's "stunned when a power is stripped to 0" (EnemySim.stunOnStrip), the
 * rollout's use of it (the Hopper's Escape delayed, generalising THIEF_FACTS' hand check of Flutter), the option's fact,
 * the board's enemies given the rules (combat-plan applyStripStuns), the fail safe, the knowledge text (render/monster-text
 * observedLines, MECH_RULES off: as before) and the MECH_RULES switch. Hand-made boards and observed blocks, the
 * knowledge-text fixture copied from tests/gkb-data; no live knowledge file is read.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import { STRIP_STUN_MIN_N, isStripStun, stripStunRules, type ObservedDb, type StrippedPower } from "../src/knowledge/mechanics.js";
import { renderKnowledgePrefix } from "../src/knowledge/render/knowledge-prefix.js";
import { renderMonster } from "../src/knowledge/render/monster-text.js";
import type { DecisionEnv } from "../src/memory/types.js";
import { applyStripStuns, describePlan, withMechFallback } from "../src/reflex/combat-plan.js";
import type { CardModel } from "../src/reflex/card-model.js";
import { simulateFight, type EnemyTable, type FightMeta, type RolloutInput } from "../src/reflex/rollout.js";
import { escapeInput, type Thief } from "../src/reflex/thief.js";
import { solveTurn, strippedStun, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/reflex/turn-solver.js";
import { knowledgeFile } from "../src/knowledge/files.js";

/** The pooled Flutter strips of the 2026-10-02 build (41 logged, all stunned; the 10 with an attack cancelled). */
const FLUTTER: StrippedPower = {
  n: 41, fights: 41, move_after: { STUNNED: 41 }, attack_before: 10, attack_cancelled: 10, hp_check: { n: 9, landed: 0 },
  evidence: ["JGJS7QE62GLD F19 T3"], monsters: { THIEVING_HOPPER: 41 },
};

describe("the stun rules from monster-db.json `observed`", () => {
  it("a power is a rule with enough strips, nearly all stunned, the attacks cancelled and not landing", () => {
    const observed: ObservedDb = {
      powers_stripped: {
        FLUTTER_POWER: FLUTTER,
        // Removed with a Plow stun or an Axebot's revive: 44 of 99 stunned.
        STRENGTH_POWER: { n: 99, fights: 95, move_after: { STUNNED: 44, BOOT_UP_MOVE: 25 }, attack_before: 93, attack_cancelled: 79, hp_check: { n: 90, landed: 6 } },
        FEW: { n: STRIP_STUN_MIN_N - 1, fights: 4, move_after: { STUNNED: 4 } },
        // Stunned on the frame, but the attacks still came (the move shown was not the one cancelled).
        NOT_CANCELLED: { n: 10, fights: 10, move_after: { STUNNED: 10 }, attack_before: 6, attack_cancelled: 2 },
        LANDED: { n: 10, fights: 10, move_after: { STUNNED: 10 }, attack_before: 6, attack_cancelled: 6, hp_check: { n: 5, landed: 3 } },
        // No attack before any strip (a sleeper): stunned is enough.
        ASLEEP_POWER: { n: 55, fights: 55, move_after: { STUNNED: 55 }, attack_before: 0, attack_cancelled: 0, hp_check: { n: 0, landed: 0 } },
      },
    };
    const rules = stripStunRules(observed);
    expect([...rules.keys()]).toEqual(["ASLEEP_POWER", "FLUTTER_POWER"]);
    expect(rules.get("FLUTTER_POWER")).toEqual({ power: "FLUTTER_POWER", n: 41, fights: 41, stunned: 41, cancelled: [10, 10], landed: [0, 9], evidence: ["JGJS7QE62GLD F19 T3"], monsters: { THIEVING_HOPPER: 41 } });
    expect(isStripStun(undefined)).toBe(false);
    // No data (a DB built before the mining, or a failed mining): no rules.
    expect(stripStunRules(undefined).size).toBe(0);
    expect(stripStunRules({}).size).toBe(0);
  });
});

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0,
    energyGain: 0, draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  };
}
const strike = (i: number, damage = 6) => card(i, "STRIKE", { damage });
const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });
const PLAYER: PlayerSim = { hp: 50, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
const RULE = [{ power: "FLUTTER_POWER", name: "振翅" }];

/** A Thieving Hopper with `flutter` stacks showing Nab 14 (its T4), with or without the learned rule. */
function hopper(flutter: number, rule = true, attacks = [{ damage: 14, hits: 1 }]): EnemySim {
  return { index: 0, name: "偷窃草蜢", hp: 40, maxHp: 84, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, flutter, attacks, ...(rule ? { stunOnStrip: RULE } : {}) };
}

const strikes = (n: number) => (plan: Plan) => plan.steps.filter((step) => step.cardId === "STRIKE").length === n && plan.steps.length === n;

describe("the turn solver: stunned when the last Flutter is stripped", () => {
  const solve = (enemy: EnemySim) => solveTurn({ hand: [strike(0), strike(1), defend(2)], player: PLAYER, enemies: [enemy], fightKind: "monster", turn: 4 } satisfies SolverInput).plans;

  it("two hits strip Flutter 2: the Nab is cancelled, out of hp_lost, the enemy marked stunned with what it cancels", () => {
    const strip = solve(hopper(2)).find(strikes(2))!;
    expect(strip.outcome.hpLoss).toBe(0);
    expect(strip.outcome.enemyHpAfter[0]).toMatchObject({ flutter: 0, stunned: true, strippedStun: { power: "FLUTTER_POWER", name: "振翅", attack: 14 } });
    // One hit leaves a stack: the Nab lands (less the Defend's block when it is played).
    const one = solve(hopper(2)).find(strikes(1))!;
    expect(one.outcome.hpLoss).toBe(14);
    expect(one.outcome.enemyHpAfter[0]!.strippedStun).toBeUndefined();
    expect(one.outcome.enemyHpAfter[0]!.stunned).toBeUndefined();
  });

  it("without the rule (MECH_RULES off, no data) the strip changes nothing, as before", () => {
    const strip = solve(hopper(2, false)).find(strikes(2))!;
    expect(strip.outcome.hpLoss).toBe(14);
    expect(strip.outcome.enemyHpAfter[0]).not.toHaveProperty("stunned");
    expect(strip.outcome.enemyHpAfter[0]).not.toHaveProperty("strippedStun");
    // The rule's lines and scores are those of the plain solver on every line that strips nothing.
    const on = solve(hopper(3));
    const off = solve(hopper(3, false));
    expect(on.map((plan) => [plan.outcome.hpLoss, plan.score])).toEqual(off.map((plan) => [plan.outcome.hpLoss, plan.score]));
  });

  it("a rule on a power without a solver counter, or already at 0, sets nothing off", () => {
    const enemy = { ...hopper(2, false), stunOnStrip: [{ power: "PLATING_POWER", name: "覆甲" }] };
    expect(solve(enemy).find(strikes(2))!.outcome.hpLoss).toBe(14);
    expect(strippedStun({ ...hopper(0), flutter: 0 }, hopper(0))).toBeNull();
  });

  it("the option says it", () => {
    const strip = solve(hopper(2)).find(strikes(2))!;
    expect(describePlan(strip, 80)["stripped_stun"]).toBe("stuns 偷窃草蜢 (its last 振翅 stripped): its attack this turn (14) is cancelled, already left out of hp_lost");
    const escape = solveTurn({ hand: [strike(0), strike(1)], player: PLAYER, enemies: [hopper(2, true, [])], fightKind: "monster", turn: 5 }).plans.find(strikes(2))!;
    expect(describePlan(escape, 80)["stripped_stun"]).toBe("stuns 偷窃草蜢 (its last 振翅 stripped): its move this turn is cancelled");
    expect(describePlan(solve(hopper(2)).find(strikes(1))!, 80)).not.toHaveProperty("stripped_stun");
  });
});

describe("the board's enemies get the rules (applyStripStuns)", () => {
  const rules = stripStunRules({ powers_stripped: { FLUTTER_POWER: FLUTTER, ASLEEP_POWER: { n: 55, fights: 55, move_after: { STUNNED: 55 } } } });
  const raw = (powers: { power_id: string; name: string; amount: number }[], index = 0) => ({ index, enemy_id: "X", is_alive: true, powers });

  it("each rule power up with a solver counter; nothing for the others or without rules", () => {
    const enemies = [hopper(5, false), { ...hopper(0, false), index: 1, name: "B" }, { ...hopper(0, false), index: 2, name: "C" }];
    const combat = {
      enemies: [
        raw([{ power_id: "FLUTTER_POWER", name: "振翅", amount: 5 }, { power_id: "ESCAPE_ARTIST_POWER", name: "逃脱大师", amount: 2 }], 0),
        // Asleep is a rule, but the solver models sleep by hand (no counter): not given.
        raw([{ power_id: "ASLEEP_POWER", name: "沉睡", amount: 2 }], 1),
        raw([{ power_id: "FLUTTER_POWER", name: "振翅", amount: 0 }], 2),
      ],
    };
    applyStripStuns(enemies, combat, rules);
    expect(enemies[0]!.stunOnStrip).toEqual([{ power: "FLUTTER_POWER", name: "振翅" }]);
    expect(enemies[1]).not.toHaveProperty("stunOnStrip");
    expect(enemies[2]).not.toHaveProperty("stunOnStrip");
    const untouched = [hopper(5, false)];
    applyStripStuns(untouched, combat, new Map());
    expect(untouched[0]).not.toHaveProperty("stunOnStrip");
  });
});

describe("the fail safe", () => {
  it("a planning error with the rules on plans again with them off; off plans once", () => {
    const seen: (boolean | undefined)[] = [];
    const plan = (env: DecisionEnv) => {
      seen.push(env.mechRules);
      if (env.mechRules !== false) throw new Error("rule step failed");
      return "off-decision";
    };
    // MECH_DEATH_MOVE on (undefined: on) is tried off first, then MECH_MOVE_RULES off too, then all off.
    expect(withMechFallback({ mechRules: true, mechMoveRules: false, mechDeathMove: false } as DecisionEnv, plan)).toBe("off-decision");
    expect(seen).toEqual([true, false]);
    seen.length = 0;
    expect(withMechFallback({ mechRules: true, mechMoveRules: false } as DecisionEnv, plan)).toBe("off-decision");
    expect(seen).toEqual([true, true, false]);
    seen.length = 0;
    const tried: [boolean | undefined, boolean | undefined][] = [];
    expect(withMechFallback({} as DecisionEnv, (env) => (tried.push([env.mechMoveRules, env.mechDeathMove]), plan(env)))).toBe("off-decision");
    expect(seen).toEqual([undefined, undefined, undefined, false]);
    expect(tried.slice(0, 3)).toEqual([[undefined, undefined], [undefined, false], [false, false]]);
    // An error of something else throws again, as before.
    expect(() => withMechFallback({ mechRules: true } as DecisionEnv, () => { throw new Error("other"); })).toThrow("other");
    seen.length = 0;
    expect(() => withMechFallback({ mechRules: false } as DecisionEnv, plan)).not.toThrow();
    expect(seen).toEqual([false]);
  });
});

// ---------------------------------------------------------------- the rollout

const META: FightMeta = { act: 2, t: 5, asc: 8, kind: "hallway", enc: "THIEVING_HOPPER", deck: { n: 10, atk: 5, skl: 5, pow: 0, junk: 0, dmg: 30, blk: 25, up: 0 }, relics: 1, max_en: 3 };
const HOPPER: EnemyTable = {
  moves: {
    HAT_TRICK_MOVE: { damage: 21, hits: 1, strength: 0, block: 0 },
    NAB_MOVE: { damage: 14, hits: 1, strength: 0, block: 0 },
    ESCAPE_MOVE: { damage: 0, hits: 1, strength: 0, block: 0 },
  },
  next: { HAT_TRICK_MOVE: { NAB_MOVE: 1 }, NAB_MOVE: { ESCAPE_MOVE: 1 }, ESCAPE_MOVE: { ESCAPE_MOVE: 1 } },
};
const DB = { THIEVING_HOPPER: { moves: { ESCAPE_MOVE: { intents: { Escape: 51 } } } } };

function thief(hp: number, turnsLeft: number, flutter: number): Thief {
  return { index: 0, id: "THIEVING_HOPPER", name: "偷窃草蜢", hp, maxHp: 84, block: 0, cards: ["岩石铠甲"], turnsLeft, flutter };
}

function board(move: string, opts: { rule: boolean; escapes: boolean; flutter?: number }): RolloutInput {
  const attacks = move === "NAB_MOVE" ? [{ damage: 14, hits: 1 }] : [];
  const enemy: EnemySim = { ...hopper(opts.flutter ?? 2, opts.rule, attacks), hp: 60 };
  const hand = [strike(0), strike(1), defend(2)];
  const solver: SolverInput = { hand, player: PLAYER, enemies: [enemy], fightKind: "monster", turn: move === "NAB_MOVE" ? 4 : 5 };
  return {
    solver,
    plans: solveTurn(solver).plans,
    enemies: [{ index: 0, id: "THIEVING_HOPPER", move, strength: 0, powers: { FLUTTER_POWER: opts.flutter ?? 2 } }],
    tables: { THIEVING_HOPPER: HOPPER },
    piles: { draw: Array.from({ length: 10 }, (_, i) => defend(10 + i)), discard: [], handBase: hand },
    meta: META,
    playerPowers: {},
    potions: 0,
    mm: {},
    model: null,
    gates: null,
    options: { budgetMs: 1e9, seed: 3, now: () => 0, samples: 2, horizon: 3 },
    ...(opts.escapes ? { escapes: escapeInput([thief(60, move === "ESCAPE_MOVE" ? 1 : 2, opts.flutter ?? 2)], DB) } : {}),
  };
}

describe("the rollout: a learned strip-stun", () => {
  it("its Escape turn (THIEF_FACTS on): the stripping line keeps it a turn more, as the step-1 Flutter check did", () => {
    for (const rule of [false, true]) {
      const input = board("ESCAPE_MOVE", { rule, escapes: true });
      const records = simulateFight(input, input.plans.find(strikes(2))!, 3, 11, false).records;
      expect(records[0]!.thieves).toEqual({ "THIEVING_HOPPER@0": "open" });
      // Its Escape comes again next turn (the move model's Escape -> Escape) and resolves: the card gone.
      expect(records[1]!.thieves).toEqual({ "THIEVING_HOPPER@0": "gone" });
    }
  });

  it("its Nab turn: the stripping line loses no HP that turn; without the rule it took the Nab", () => {
    for (const escapes of [false, true]) {
      const on = board("NAB_MOVE", { rule: true, escapes });
      const off = board("NAB_MOVE", { rule: false, escapes });
      const first = (input: RolloutInput) => simulateFight(input, input.plans.find(strikes(2))!, 3, 11, false).records[0]!;
      expect(first(on).loss).toBe(0);
      expect(first(off).loss).toBe(14);
    }
  });
});

// ---------------------------------------------------------------- the knowledge text

const GKB = join(dirname(fileURLToPath(import.meta.url)), "gkb-data", "knowledge");
const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A copy of tests/gkb-data's knowledge with an `observed` block on the CLAW (a stun rule, an Escape, a kill reward). */
function observedCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), "mech-"));
  temps.push(dir);
  cpSync(GKB, dir, { recursive: true });
  const path = knowledgeFile(dir, "monster-db.json");
  const db = JSON.parse(readFileSync(path, "utf8")) as { monsters: Record<string, Record<string, unknown>>; observed?: unknown };
  const plating: StrippedPower = { n: 12, fights: 10, move_after: { STUNNED: 12 }, attack_before: 4, attack_cancelled: 4, hp_check: { n: 3, landed: 0 }, co_removed: {}, evidence: ["R1 F3 T2"] };
  db.observed = { note: "test", end_turn_check: true, powers_stripped: { PLATING_POWER: { ...plating, monsters: { CLAW: 12 } }, THORNS_POWER: { n: 30, fights: 20, move_after: { SNIP_MOVE: 30 } } } };
  db.monsters["CLAW"]!["observed"] = {
    powers_stripped: { PLATING_POWER: plating, THORNS_POWER: { n: 30, fights: 20, move_after: { SNIP_MOVE: 30 } } },
    escape_moves: { HEX_MOVE: { n: 9, gone: 5, gone_stunned: 0, stayed: 3, stayed_stunned: 3, killed_first: 1, next_after_stay: { HEX_MOVE: 3 } } },
    kill_rewards: [{ reward: "SpecialCard:取回你被偷走的牌。", killed: [6, 6], left: [0, 5], elsewhere: [0, 40], only_when_killed: true, exclusive: true }],
    mid_turn_stuns: { n: 12, fights: 10, triggers: { "power_removed:PLATING_POWER": 12, hp_lost: 12 }, unexplained: 0 },
  };
  writeFileSync(path, JSON.stringify(db));
  return dir;
}

describe("the knowledge text: observed mechanics", () => {
  const ctx = { ascension: 9, knowledgeDir: GKB };

  it("a monster's notable observations, one short line each", () => {
    const text = renderMonster("CLAW", { ...ctx, knowledgeDir: observedCopy() });
    const lines = text.slice(text.indexOf("观察到的机制")).split("\n所在遭遇的战绩")[0]!.split("\n").filter((line) => line.startsWith("- "));
    expect(lines[0]).toMatch(/^- .+：观察到在我方回合被打到 0 层（去掉）时它立即眩晕、本回合行动取消（10 场 12\/12 次；当回合有攻击的 4\/4 次攻击取消）$/);
    expect(lines[1]).toBe("- HEX_MOVE（意图逃跑）：我方回合结束时它活着且未眩晕的 5/5 次在敌方回合后离场（不算击杀）；被眩晕的 3/3 次留下，下回合是 HEX_MOVE 3 次".replace(/HEX_MOVE/g, lines[1]!.slice(2, lines[1]!.indexOf("（"))));
    expect(lines[2]).toBe("- 击杀才有的奖励：取回你被偷走的牌。（击杀它的 6/6 场，它离场的 0/5 场，没有它的战斗 0 场）");
    // The mid-turn stuns are the Plating line's: not said twice. Thorns (not a rule) says nothing.
    expect(lines).toHaveLength(3);
  });

  it("MECH_RULES off, or no observed data: the prefix exactly as before", () => {
    const before = renderKnowledgePrefix(ctx, { sections: null, path: "none", missing: "test" } as never);
    const copy = observedCopy();
    expect(renderKnowledgePrefix({ ...ctx, knowledgeDir: copy, mechanics: false }, { sections: null, path: "none", missing: "test" } as never)).toBe(before);
    const on = renderKnowledgePrefix({ ...ctx, knowledgeDir: copy }, { sections: null, path: "none", missing: "test" } as never);
    expect(on).not.toBe(before);
    expect(on).toContain("观察到的机制（日志统计，能力描述里没写；n 为次数）:");
  });
});

describe("MECH_RULES", () => {
  it("on by default; off; an unreadable value is a warning and on", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).mechRules).toBe(true);
    expect(loadConfig({ MECH_RULES: "off" } as unknown as NodeJS.ProcessEnv).mechRules).toBe(false);
    const bad = loadConfig({ MECH_RULES: "maybe" } as unknown as NodeJS.ProcessEnv);
    expect(bad.mechRules).toBe(true);
    expect(bad.warnings.some((warning) => warning.startsWith("MECH_RULES"))).toBe(true);
  });
});
