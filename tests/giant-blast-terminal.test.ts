/**
 * The Waterfall Giant in the 5-turn rollout (ops 2026-10-04, AKK09TEEEXKD F17 attempts 1 and 6: the Giant kept at 1-6 HP
 * for ~8 turns while every line that kept it alive read "win ~43%"):
 *   - the end-of-horizon estimate counts the blast after the kill (rollout.ts giantTerminal): kill at the earliest turn
 *     the deck's damage allows, the stacks then (+3 a move), against HP then + next turn's ~12 block;
 *   - a living Giant never draws its Explode, a move it only makes once dead (DEATH_MOVES), which the move model
 *     has after every Giant move and nothing after.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { CardModel } from "../src/strategy/card-model.js";
import { clockEstimate, eruptionOptions, featuresOf, giantTerminal, rolloutDecision, type EnemyTable, type FightMeta, type MoveModelData, type SnapEnemy, type Snapshot } from "../src/strategy/rollout.js";
import { solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";

function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
    damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
    draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...overrides,
  };
}
const strike = (i: number) => card(i, "STRIKE", { damage: 6 });
const defend = (i: number) => card(i, "DEFEND", { type: "Skill", target: "self", validTargets: [], block: 5 });

const META: FightMeta = { act: 1, t: 13, asc: 9, kind: "boss", enc: "WATERFALL_GIANT", deck: { n: 10, atk: 5, skl: 5, pow: 0, junk: 0, dmg: 38, blk: 25, up: 0 }, relics: 1, max_en: 3 };
/** The Giant's A9 cycle as the move model has it (Explode after each move, nothing after Explode). */
const MM: MoveModelData = {
  WATERFALL_GIANT: {
    next: {
      STOMP_MOVE: { RAM_MOVE: 139, EXPLODE_MOVE: 14 },
      RAM_MOVE: { SIPHON_MOVE: 134, EXPLODE_MOVE: 5 },
      SIPHON_MOVE: { PRESSURE_GUN_MOVE: 112, EXPLODE_MOVE: 22 },
      PRESSURE_GUN_MOVE: { PRESSURE_UP_MOVE: 93, EXPLODE_MOVE: 12 },
      PRESSURE_UP_MOVE: { STOMP_MOVE: 85, EXPLODE_MOVE: 8 },
    },
    damage: { STOMP_MOVE: 15.2, RAM_MOVE: 10.2, SIPHON_MOVE: 0, PRESSURE_GUN_MOVE: 23.2, PRESSURE_UP_MOVE: 13.3, EXPLODE_MOVE: 40 },
  },
};

const snap = (hp: number, blk: number, giant: SnapEnemy, others: SnapEnemy[] = []): Snapshot => ({ hp, mhp: 80, blk, en: 0, pw: {}, hand: 2, pots: 0, E: [giant, ...others] });
const living = (hp: number, stacks: number, move: string, intent: number): SnapEnemy => [0, "WATERFALL_GIANT", hp, 250, 0, true, false, intent, move, stacks > 0 ? { STEAM_ERUPTION_POWER: stacks } : {}];
const terminalOf = (s: Snapshot, meta = META) => {
  const f = featuresOf(meta, s, MM);
  const clock = clockEstimate(f);
  return { clock, giant: giantTerminal(clock, f, s, meta, MM) };
};

afterEach(() => {
  eruptionOptions.blastTerminal = true;
  eruptionOptions.deathMoveFilter = true;
});

describe("the end-of-horizon estimate counts the Giant's blast (giantTerminal)", () => {
  it("a Giant at 6 HP is not a near win: killed next turn it blows for its stacks + 3 against HP + ~12 block", () => {
    // AKK0 attempt 1 T13: 19 HP, the Giant at 6 HP with 53 stacks, Ram (11) into 16 block.
    const { clock, giant } = terminalOf(snap(19, 16, living(6, 53, "RAM_MOVE", 11)));
    expect(clock.winProb).toBeGreaterThan(0.9);
    // Killed on T14 it blows for 56: 19 + 12 - 56 = -25.
    expect(giant.winProb).toBeLessThan(0.05);
    expect(giant.turns).toBe(1);
    expect(giant.hpLoss).toBe(56 - 12);
    // With the HP for it the same kill is a likely win (60 + 12 - 56 = 16).
    expect(terminalOf(snap(60, 16, living(6, 53, "RAM_MOVE", 11))).giant.winProb).toBeGreaterThan(0.85);
  });

  it("the earliest kill counts the Siphons on the way: 20 HP healed to 35 is a turn later, 3 more stacks", () => {
    const now = terminalOf(snap(60, 0, living(20, 41, "STOMP_MOVE", 16))).giant;
    const siphon = terminalOf(snap(60, 0, living(20, 41, "SIPHON_MOVE", 0))).giant;
    expect(now.turns).toBe(1);
    expect(siphon.turns).toBe(2);
    expect(siphon.winProb).toBeLessThan(terminalOf(snap(60, 0, living(20, 41, "RAM_MOVE", 0))).giant.winProb);
  });

  it("before its first move (no stacks yet) the schedule's stacks on the kill turn count", () => {
    const early = terminalOf(snap(80, 0, living(250, 0, "PRESSURIZE_MOVE", 0)), { ...META, t: 1 }).giant;
    // A 250-HP Giant ~10 turns away: the blast then is near 3T+14 at A9, more than 80 HP and 12 block can take after 10 turns.
    expect(early.turns).toBeGreaterThan(5);
    expect(early.winProb).toBeLessThan(terminalOf(snap(80, 0, living(250, 0, "PRESSURIZE_MOVE", 0)), { ...META, t: 1 }).clock.winProb);
  });

  it("a husk killed on the horizon's last turn: next turn's block meets the blast, not this turn's", () => {
    const husk: SnapEnemy = [0, "WATERFALL_GIANT", 1, 999_999_999, 0, true, false, 50, "ABOUT_TO_BLOW", {}];
    const { clock, giant } = terminalOf(snap(30, 40, husk));
    // The clock read 40 block (gone by the blast) against 50: "10 loss, win ~92%".
    expect(clock.winProb).toBeGreaterThan(0.9);
    expect(giant.winProb).toBeCloseTo(1 / (1 + Math.exp(8 / 8)), 5);
    expect(giant.hpLoss).toBe(38);
  });

  it("anything but a lone Giant, or the switch off: the clock as it is", () => {
    const louse: SnapEnemy = [1, "LOUSE", 10, 10, 0, true, false, 5, "BITE", {}];
    const two = terminalOf(snap(19, 16, living(6, 53, "RAM_MOVE", 11), [louse]));
    expect(two.giant).toEqual(two.clock);
    eruptionOptions.blastTerminal = false;
    const off = terminalOf(snap(19, 16, living(6, 53, "RAM_MOVE", 11)));
    expect(off.giant).toEqual(off.clock);
  });
});

describe("the rollout on the Giant's board", () => {
  const TABLE: EnemyTable = {
    moves: {
      STOMP_MOVE: { damage: 0, hits: 1, strength: 0, block: 0, selfPowers: { STEAM_ERUPTION_POWER: 3 } },
      RAM_MOVE: { damage: 11, hits: 1, strength: 0, block: 0, selfPowers: { STEAM_ERUPTION_POWER: 3 } },
      SIPHON_MOVE: { damage: 0, hits: 1, strength: 0, block: 0, selfPowers: { STEAM_ERUPTION_POWER: 3 }, heal: 15 },
      EXPLODE_MOVE: { damage: 41, hits: 1, strength: 0, block: 0 },
    },
    next: { STOMP_MOVE: { EXPLODE_MOVE: 9, STOMP_MOVE: 1 }, RAM_MOVE: { SIPHON_MOVE: 134, EXPLODE_MOVE: 5 }, SIPHON_MOVE: { RAM_MOVE: 1 } },
  };
  const giant = (hp: number, eruption: number, attack: number): EnemySim => ({
    index: 0, name: "Waterfall Giant", hp, maxHp: 250, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, eruption, attacks: attack > 0 ? [{ damage: attack, hits: 1 }] : [],
  });
  const run = (hp: number, enemy: EnemySim, move: string, hand: CardModel[], draw: CardModel[], include?: (plans: ReturnType<typeof solveTurn>["plans"]) => ReturnType<typeof solveTurn>["plans"]) => {
    const player: PlayerSim = { hp, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
    const solver: SolverInput = { hand, player, enemies: [enemy], fightKind: "boss", turn: META.t };
    const plans = solveTurn(solver).plans;
    const result = rolloutDecision({
      solver, plans, enemies: [{ index: 0, id: "WATERFALL_GIANT", move, strength: 0, powers: enemy.eruption ? { STEAM_ERUPTION_POWER: enemy.eruption } : {} }],
      tables: { WATERFALL_GIANT: TABLE }, piles: { draw, discard: [], handBase: hand }, meta: META, playerPowers: {}, potions: 0, mm: MM,
      model: null, gates: null, options: { budgetMs: 1e9, seed: 11, include: include ? include(plans) : [] },
    });
    return { plans, result };
  };

  it("a living Giant never draws its Explode: no 41-HP turn while it lives (the move model's Stomp -> Explode 90% here)", () => {
    const zero = (i: number) => card(i, "STRIKE", { damage: 1, cost: 0 });
    const hand = [zero(0)];
    const draw = Array.from({ length: 40 }, (_, k) => zero(10 + k));
    const losses = () => run(300, giant(250, 20, 0), "STOMP_MOVE", hand, draw).result.lines[0]!.perTurn.flatMap((t) => [t.loss.max]);
    expect(Math.max(...losses())).toBe(0);
    eruptionOptions.deathMoveFilter = false;
    expect(Math.max(...losses())).toBeGreaterThanOrEqual(41);
  });

  it("AKK0 T13 in small: keeping the Giant at 6 HP no longer reads as a likely win; both lines read as lost", () => {
    // 19 HP, Giant 6/250 at 53 stacks, Ram next; a hand that kills (Strike) or blocks; later hands Defends and Strikes.
    const hand = [strike(0), defend(1), defend(2)];
    const draw = Array.from({ length: 30 }, (_, k) => (k % 2 === 0 ? defend(10 + k) : strike(10 + k)));
    const keepOf = (plans: ReturnType<typeof solveTurn>["plans"]) => plans.find((plan) => !(plan.outcome.explodesNext ?? 0) && plan.steps.length > 0 && plan.steps.every((step) => step.cardId === "DEFEND"))!;
    const killOf = (plans: ReturnType<typeof solveTurn>["plans"]) => plans.find((plan) => (plan.outcome.explodesNext ?? 0) > 0)!;
    const lines = () => {
      const { plans, result } = run(19, giant(6, 53, 11), "RAM_MOVE", hand, draw, (all) => [keepOf(all), killOf(all)]);
      return { keep: result.lines.find((line) => line.plan === keepOf(plans))!, kill: result.lines.find((line) => line.plan === killOf(plans))! };
    };
    eruptionOptions.blastTerminal = false;
    eruptionOptions.deathMoveFilter = false;
    const before = lines();
    eruptionOptions.blastTerminal = true;
    eruptionOptions.deathMoveFilter = true;
    const after = lines();
    // The kill dies to the 53 blast next turn in every sample, before and after (the rollout plays it out).
    expect(before.kill.deaths).toBe(before.kill.samples);
    expect(after.kill.deaths).toBe(after.kill.samples);
    // Keeping it alive read as a likely win at the horizon; now as lost as the kill.
    expect(before.keep.winProb ?? 0).toBeGreaterThan(0.2);
    expect(after.keep.winProb ?? 0).toBeLessThan(0.05);
  });
});
