/**
 * Fix batch B (notes/review-2026-09-29-consistency.md, review-2026-09-29-coverage.md): the turn solver, the
 * facts shown to Jev and route scoring. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states), never the refreshing knowledge files.
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory, type AskDecision, type Decision } from "../src/project/types.js";
import { planCombatTurn, revivesOf, trackLizardTail } from "../src/screens/combat-plan.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutDecision, type EnemyTable, type FightMeta, type RolloutInput } from "../src/strategy/rollout.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { reviveThrough, solveTurn, type EnemySim, type PlayerSim, type Revive } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";

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

const strike = (index: number): CardModel => card(index, "STRIKE_IRONCLAD", { damage: 6 });
const defend = (index: number): CardModel => card(index, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 5 });

function enemy(overrides: Partial<EnemySim> = {}): EnemySim {
  return { index: 0, name: "Jaw Worm", hp: 40, maxHp: 44, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...overrides };
}

function player(overrides: Partial<PlayerSim> = {}): PlayerSim {
  return { hp: 10, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, ...overrides };
}

const FAIRY: Revive = { source: "FAIRY_IN_A_BOTTLE", name: "瓶中精灵", hp: 24 };
const TAIL: Revive = { source: "LIZARD_TAIL", name: "蜥蜴尾巴", hp: 40 };

type Raw = Record<string, unknown>;

describe("1. Fairy in a Bottle and Lizard Tail are revives (JR66CJ9T8H7W F48, YQL8D59999AX F31)", () => {
  it("reviveThrough: the loss that reaches 0 is caught (its overflow lost), the later ones land on the revive's HP", () => {
    expect(reviveThrough(10, [12, 12], [FAIRY])).toEqual({ hp: 12, used: [FAIRY] });
    expect(reviveThrough(10, [5, 4], [FAIRY])).toEqual({ hp: 1, used: [] });
    // Two revives in order; one short of the second death is still death.
    expect(reviveThrough(10, [30, 30, 30], [FAIRY, TAIL])).toEqual({ hp: 10, used: [FAIRY, TAIL] });
    expect(reviveThrough(10, [30, 30, 50], [FAIRY, TAIL]).hp).toBeLessThanOrEqual(0);
  });

  it("the solver: a line that reaches 0 with a Fairy held goes on at its HP; its hpLoss counts the revive as lost", () => {
    const input = (revives?: Revive[]) => ({
      hand: [strike(0), defend(1)],
      player: player({ energy: 1, ...(revives ? { revives } : {}) }),
      enemies: [enemy({ attacks: [{ damage: 12, hits: 2 }] })],
      fightKind: "monster" as const,
    });
    // Without a revive every line dies (the logged "every simulated line dies").
    expect(solveTurn(input()).plans.every((plan) => plan.outcome.dies)).toBe(true);
    const plans = solveTurn(input([FAIRY])).plans;
    expect(plans.every((plan) => !plan.outcome.dies)).toBe(true);
    const lineOf = (id: string | null) => plans.find((plan) => (id === null ? plan.steps.length === 0 : plan.steps[0]?.cardId === id))!;
    // Defend: 12 - 5 = 7 of 10, then 12 takes it to 0: the Fairy brings us to 24; nothing after it.
    expect(lineOf("DEFEND_IRONCLAD").outcome.revived).toMatchObject({ names: ["瓶中精灵"], reviveHp: 24, hp: 24 });
    expect(lineOf("DEFEND_IRONCLAD").outcome.hpLoss).toBe(10);
    // Strike: the first 12 takes it to 0, the second lands on the 24.
    expect(lineOf("STRIKE_IRONCLAD").outcome.revived).toMatchObject({ hp: 12 });
    expect(lineOf("STRIKE_IRONCLAD").outcome.hpLoss).toBe(22);
    expect(lineOf("STRIKE_IRONCLAD").outcome.hpAfter).toBe(-12);
    // A line that lives without spending it is never beaten by one that spends it.
    const safe = solveTurn({ ...input([FAIRY]), enemies: [enemy({ attacks: [{ damage: 12, hits: 1 }] })] }).plans;
    expect(safe[0]!.outcome.revived).toBeUndefined();
    expect(safe[0]!.steps.map((step) => step.cardId)).toEqual(["DEFEND_IRONCLAD"]);
  });

  it("the rollout: a sample that reaches 0 in a later turn goes on at the revive's HP, not dead", () => {
    const table: EnemyTable = { moves: { CHOMP: { damage: 11, hits: 1, strength: 0, block: 0 } }, next: { CHOMP: { CHOMP: 1 } } };
    const meta: FightMeta = { act: 1, t: 1, asc: 8, kind: "hallway", enc: "JAW_WORM", deck: { n: 10, atk: 5, skl: 5, pow: 0, junk: 0, dmg: 30, blk: 25, up: 0 }, relics: 1, max_en: 3 };
    const scenario = (revives?: Revive[]): RolloutInput => {
      const hand = [strike(0), strike(1), strike(2)];
      const solver = { hand, player: player({ hp: 14, ...(revives ? { revives } : {}) }), enemies: [enemy({ hp: 44, attacks: [{ damage: 11, hits: 1 }] })], fightKind: "monster" as const, turn: 1 };
      return {
        solver,
        plans: solveTurn(solver).plans,
        enemies: [{ index: 0, id: "JAW_WORM", move: "CHOMP", strength: 0, powers: {} }],
        tables: { JAW_WORM: table },
        piles: { draw: Array.from({ length: 10 }, (_, i) => strike(10 + i)), discard: [], handBase: hand },
        meta,
        playerPowers: {},
        potions: revives ? 1 : 0,
        mm: {},
        model: null,
        gates: null,
        options: { budgetMs: 1e9, seed: 3, now: () => 0 },
      };
    };
    const without = rolloutDecision(scenario()).lines[0]!;
    const withFairy = rolloutDecision(scenario([FAIRY])).lines.find((line) => line.plan.steps.length === without.plan.steps.length)!;
    expect(without.deaths).toBeGreaterThan(0);
    expect(withFairy.deaths).toBeLessThan(without.deaths);
    expect(withFairy.revived).toBeGreaterThan(0);
    // Its HP is not ours: the loss is all 14 HP we have (then only what comes after it), not 14 - 24.
    expect(withFairy.hpLoss).toBe(14);
    expect(withFairy.wins).toBeGreaterThan(without.wins);
  });

  it("revivesOf: every Fairy in the belt, then Lizard Tail until it was seen to trigger", () => {
    const fx = logged("en55-f8-t9");
    const run = fx.state["run"] as Raw;
    run["potions"] = [{ index: 0, potion_id: "FAIRY_IN_A_BOTTLE", name: "瓶中精灵", occupied: true, can_use: false }, { index: 1, occupied: false }];
    run["relics"] = [...((run["relics"] as Raw[]) ?? []), { index: 9, relic_id: "LIZARD_TAIL", name: "蜥蜴尾巴", stack: null }];
    const state = parseGameState(fx.state);
    const memory = createScreenMemory("COMBAT");
    expect(revivesOf(state, memory, 80)).toEqual([
      { source: "FAIRY_IN_A_BOTTLE", name: "瓶中精灵", hp: 24 },
      { source: "LIZARD_TAIL", name: "蜥蜴尾巴", hp: 40 },
    ]);
    memory.lizardTail = { runId: String(fx.state["run_id"]), used: true };
    expect(revivesOf(state, memory, 80).map((revive) => revive.source)).toEqual(["FAIRY_IN_A_BOTTLE"]);
  });

  it("trackLizardTail: a turn that began at 50% of max HP right after a lethal turn spends it (0NG27W8QBNYX F24: 17 -> 35 of 71)", () => {
    const board = (turn: number, hp: number, intent: number): ReturnType<typeof parseGameState> => {
      const fx = logged("en55-f8-t9");
      const run = fx.state["run"] as Raw;
      run["relics"] = [{ index: 0, relic_id: "LIZARD_TAIL", name: "蜥蜴尾巴", stack: null }];
      fx.state["turn"] = turn;
      const combat = fx.state["combat"] as Raw;
      combat["end_turn_will_kill_player"] = false;
      (combat["player"] as Raw)["current_hp"] = hp;
      (combat["player"] as Raw)["max_hp"] = 71;
      ((combat["enemies"] as Raw[])[0]!["intents"] as Raw[])[0]!["damage"] = intent;
      return parseGameState(fx.state);
    };
    const memory = createScreenMemory("COMBAT");
    // A turn that ends at 17 HP against 10: no trigger at 35 next turn (a heal, not the tail).
    trackLizardTail(memory, board(2, 17, 10));
    trackLizardTail(memory, board(3, 35, 10));
    expect(memory.lizardTail?.used).toBe(false);
    // 17 HP against 33: lethal; the next turn opens at 35 = 50% of 71.
    trackLizardTail(memory, board(3, 17, 33));
    trackLizardTail(memory, board(4, 35, 33));
    expect(memory.lizardTail?.used).toBe(true);
  });

  it("the planner: with a Fairy in the belt the all-dying board is no least-loss auto-play; the lines say the revive is spent", () => {
    potionMcOptions.now = () => 0;
    rolloutLiveOptions.enabled = false;
    try {
      const board = (fairy: boolean): Decision | null => {
        const fx = logged("en55-f8-t9");
        const run = fx.state["run"] as Raw;
        run["potions"] = fairy ? [{ index: 0, potion_id: "FAIRY_IN_A_BOTTLE", name: "瓶中精灵", occupied: true, can_use: false, can_discard: false, usage: "Automatic" }] : [];
        return planCombatTurn(loggedEnv(fx));
      };
      // 7 HP against the Eel's 33: every line dies without it (the logged least-loss auto-play).
      expect(board(false)?.label).toBe("combat/least-loss");
      const decision = board(true)!;
      expect(decision.label).not.toBe("combat/least-loss");
      const texts = decision.kind === "ask" ? Object.values((decision as AskDecision).questions["plan"]!.criteria!).map(String) : [decision.rationale];
      expect(texts.some((text) => /瓶中精灵/.test(text))).toBe(true);
    } finally {
      potionMcOptions.now = null;
      rolloutLiveOptions.enabled = true;
    }
  });
});
