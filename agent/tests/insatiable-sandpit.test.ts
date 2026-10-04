/**
 * The Insatiable's Sandpit in the 5-turn rollout (SANDPIT_START: rollout.ts RolloutOptions.sandpitStart, rollout-live
 * rolloutLiveOptions.sandpitStart). Liquify Ground, the boss's first move, starts the count at 4 and adds 6 Frantic Escapes;
 * the whole-fight sim (B4) started the count and put 3 of the Escapes into the draw pile, the live 5-turn rollout did
 * neither: a turn-1 question's rollout played the boss without its Sandpit (no Sandpit death in any later turn, the Escapes
 * dead cards in the discard pile; 80 logged turn-1 questions, 0 of 37,120 samples played to the end eaten, 44.5% won, where
 * the same simulation from the logged turn-2 boards wins 24.5%). With it, the rollout's later turns carry the count from
 * turn 2 as they do from any later decision (402/402 logged: -1 every enemy turn; 237/237: +1 at once per Escape played).
 *
 * Synthetic boards (tests/boss-sim-fixture.ts, as tests/boss-sim-b4.test.ts) and one logged board (YG3H F33 T1, the Liquify
 * Ground turn, through the live planner with frozen clocks); no LLM, nothing written.
 */

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import type { AskDecision } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import type { CardModel } from "../src/reflex/card-model.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { rolloutDecision, simulateFight, type EnemyTable, type RolloutInput, type RolloutResult } from "../src/reflex/rollout.js";
import { rolloutLiveOptions, rolloutTap } from "../src/reflex/rollout-live.js";
import { solveTap, solveTurn, type EnemySim, type SolveResult, type SolverInput } from "../src/reflex/turn-solver.js";
import { board, card } from "./boss-sim-fixture.js";
import { logged, loggedEnv } from "./logged.js";

const enemy = (index: number, name: string, hp: number): EnemySim => ({ index, name, hp, maxHp: hp, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [] });

afterEach(() => {
  solveTap.onSolve = null;
  rolloutTap.onRollout = null;
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.sandpitStart = true;
  potionMcOptions.now = null;
});

/** The policy's turns (solver input and result) of the 5-turn rollout of the board's first line, one sample. */
function rolloutTurns(input: RolloutInput, sandpitStart: boolean, seed = 5): { input: SolverInput; result: SolveResult }[] {
  const seen: { input: SolverInput; result: SolveResult }[] = [];
  solveTap.onSolve = (solver, result) => seen.push({ input: solver, result });
  try {
    rolloutDecision({ ...input, options: { samples: 1, seed, budgetMs: 1e9, k: 1, include: [input.plans[0]!], ...(sandpitStart ? { sandpitStart: true } : {}) } });
  } finally {
    solveTap.onSolve = null;
  }
  return seen;
}

describe("SANDPIT_START: the Sandpit Liquify Ground starts, in the 5-turn rollout", () => {
  const escape = card(90, "FRANTIC_ESCAPE", { type: "Status", target: "self", validTargets: [], special: "frantic_escape", cost: 1 });
  const table = (escapes: number): EnemyTable => ({
    moves: {
      LIQUIFY_GROUND_MOVE: { damage: 0, hits: 1, strength: 0, block: 0, sandpit: 4, statusCards: escapes > 0 ? [{ cardId: "FRANTIC_ESCAPE", count: escapes, pile: "discard" }] : [] },
      THRASH_MOVE: { damage: 1, hits: 1, strength: 0, block: 0 },
    },
    next: { LIQUIFY_GROUND_MOVE: { THRASH_MOVE: 1 }, THRASH_MOVE: { THRASH_MOVE: 1 } },
  });
  /** A 5000-HP worm on its Liquify Ground turn, 400 HP for us: only the Sandpit can end the fight within the horizon. */
  function worm(escapes = 6): RolloutInput {
    const base = board();
    const solver: SolverInput = { ...base.solver, player: { ...base.solver.player, hp: 400, maxHp: 400 }, enemies: [enemy(0, "Worm", 5000)] };
    return { ...base, solver, plans: solveTurn(solver).plans, enemies: [{ index: 0, id: "THE_INSATIABLE", move: "LIQUIFY_GROUND_MOVE", strength: 0, powers: {} }], tables: { THE_INSATIABLE: table(escapes) }, statusCards: { FRANTIC_ESCAPE: escape } };
  }

  it("turn 2 starts at 4 (off: no count, as before)", () => {
    expect(rolloutTurns(worm(), true)[0]!.input.enemies[0]!.sandpit).toBe(4);
    expect(rolloutTurns(worm(), false)[0]!.input.enemies[0]!.sandpit).toBeUndefined();
  });

  it("3 of the 6 Frantic Escapes go into the draw pile, playable (off: all 6 in the discard pile, none drawn on turn 2)", () => {
    const drawn = (on: boolean) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((seed) => rolloutTurns(worm(), on, seed)[0]!.input.hand.filter((c: CardModel) => c.cardId === "FRANTIC_ESCAPE"));
    const on = drawn(true);
    expect(Math.max(...on.map((hand) => hand.length))).toBeGreaterThan(0);
    expect(Math.max(...on.map((hand) => hand.length))).toBeLessThanOrEqual(3);
    for (const hand of on) for (const c of hand) expect(c).toMatchObject({ playable: true, cost: 1, special: "frantic_escape" });
    expect(Math.max(...drawn(false).map((hand) => hand.length))).toBe(0);
  });

  it("each Escape a later turn plays adds 1 at once; the count falls 1 an enemy turn", () => {
    let checked = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const turns = rolloutTurns(worm(), true, seed);
      for (let t = 0; t + 1 < turns.length; t += 1) {
        const played = turns[t]!.result.plans[0]!.steps.filter((step) => step.cardId === "FRANTIC_ESCAPE").length;
        expect(turns[t + 1]!.input.enemies[0]!.sandpit).toBe(turns[t]!.input.enemies[0]!.sandpit! + played - 1);
        if (played > 0) checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("with no Escape to play, every sample is eaten at the end of turn 5 with most of its 400 HP (off: none dies)", () => {
    const input = worm(0);
    const result = (on: boolean): RolloutResult => rolloutDecision({ ...input, options: { samples: 4, seed: 3, budgetMs: 1e9, k: 1, include: [input.plans[0]!], ...(on ? { sandpitStart: true } : {}) } });
    const on = result(true).lines[0]!;
    expect(on.deaths).toBe(4);
    expect(on.turnsToDeath).toBe(5);
    expect(on.winProb).toBe(0);
    expect(result(false).lines[0]!.deaths).toBe(0);
    // The whole-fight sim did this already (B4): the same 5 turns.
    const fight = simulateFight(input, input.plans[0]!, 12, 5).records;
    expect(fight).toHaveLength(5);
    expect(fight[4]!.died).toBe(true);
    expect(fight[4]!.snap.hp).toBeGreaterThan(350);
  });
});

describe("SANDPIT_START on the logged YG3H F33 T1 board (the Liquify Ground turn), through the live planner", () => {
  /** The live rollout's input and result for the board (frozen clocks: the full 5 turns x 8 samples). */
  /** `env`: the switch as the loop passes it (DecisionEnv.sandpitStart, from config); absent, rollout-live's default. */
  function liveRolloutOf(sandpitStart: boolean, env?: boolean): { input: RolloutInput; result: RolloutResult; decision: AskDecision } {
    let tapped: { input: RolloutInput; result: RolloutResult } | null = null;
    rolloutTap.onRollout = (input, result) => {
      tapped = { input, result };
    };
    rolloutLiveOptions.enabled = true;
    rolloutLiveOptions.sandpitStart = sandpitStart;
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    const decision = planCombatTurn(loggedEnv(logged("yg3h-f33-t1"), env !== undefined ? { sandpitStart: env } : {})) as AskDecision;
    rolloutTap.onRollout = null;
    expect(tapped).not.toBeNull();
    return { ...(tapped as unknown as { input: RolloutInput; result: RolloutResult }), decision };
  }

  /** Turn 2..5 of one sample of the line, as the rollout plays it (its own seeds: seed * 7919 + 1 + j). */
  function sampleTurns(input: RolloutInput, j: number): { input: SolverInput; result: SolveResult }[] {
    const seen: { input: SolverInput; result: SolveResult }[] = [];
    solveTap.onSolve = (solver, result) => seen.push({ input: solver, result });
    try {
      simulateFight(input, input.plans[0]!, 5, (input.options?.seed ?? 1) * 7919 + 1 + j, false);
    } finally {
      solveTap.onSolve = null;
    }
    return seen;
  }

  it("the rollout's turn 2 starts at Sandpit 4 with up to 3 Escapes drawn, and some samples are eaten by turn 5", () => {
    const { input, result, decision } = liveRolloutOf(true);
    expect(decision.kind).toBe("ask");
    expect(input.options?.sandpitStart).toBe(true);
    const samples = [0, 1, 2, 3, 4, 5, 6, 7].map((j) => sampleTurns(input, j));
    for (const turns of samples) {
      expect(turns[0]!.input.enemies[0]!.sandpit).toBe(4);
      expect(turns[0]!.input.hand.filter((c) => c.cardId === "FRANTIC_ESCAPE").length).toBeLessThanOrEqual(3);
    }
    // The Escapes are played in the later turns, and a sample that plays too few is eaten (the count at 0 after its turn).
    expect(samples.some((turns) => turns.some((t) => t.result.plans[0]!.steps.some((step) => step.cardId === "FRANTIC_ESCAPE")))).toBe(true);
    const eaten = result.lines.reduce((sum, line) => sum + line.deaths, 0);
    expect(eaten).toBeGreaterThan(0);
  }, 60_000);

  it("off: as before, no count in any later turn and fewer deaths", () => {
    const off = liveRolloutOf(false);
    expect(off.input.options?.sandpitStart).toBeUndefined();
    // The planner's board reads no Sandpit power on turn 1 (0); nothing starts one later.
    for (const j of [0, 1, 2, 3]) for (const turn of sampleTurns(off.input, j)) expect(turn.input.enemies[0]!.sandpit ?? 0).toBe(0);
    const on = liveRolloutOf(true);
    const deaths = (r: RolloutResult) => r.lines.reduce((sum, line) => sum + line.deaths, 0);
    expect(deaths(on.result)).toBeGreaterThan(deaths(off.result));
  }, 60_000);

  it("the loop's switch (DecisionEnv.sandpitStart, config SANDPIT_START) wins over rollout-live's default", () => {
    expect(liveRolloutOf(true, false).input.options?.sandpitStart).toBeUndefined();
    expect(liveRolloutOf(false, true).input.options?.sandpitStart).toBe(true);
    expect(loadConfig({} as NodeJS.ProcessEnv).sandpitStart).toBe(true);
    expect(loadConfig({ SANDPIT_START: "off" } as NodeJS.ProcessEnv).sandpitStart).toBe(false);
  }, 60_000);
});
