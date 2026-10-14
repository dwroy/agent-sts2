import { describe, expect, it } from "vitest";
import { board, card } from "./boss-sim-fixture.js";
import { compareOptions } from "../src/sim/build-sim.js";
import { SerialDeckRunner, type DeckRunRequest, type DeckSimRunner } from "../src/sim/build-sim-pool.js";
import { BOSS_POLICY_THREAT, fightSample, slimInput } from "../src/sim/boss-sim.js";
import { bossRelativeMargin, marginOf, summarizeBossMargin, type MarginSample } from "../src/sim/boss-margin.js";
import { bossEvaluationPending, requiresBossEvaluation } from "../src/sim/build-sim-facts.js";
import { quantitativeFightFacts, compactQuantitativeFight } from "../src/sim/quantitative-facts.js";
import { solveTurn } from "../src/reflex/turn-solver.js";
import type { AskDecision } from "../src/memory/types.js";
import type { GameState } from "../src/hand/mod/schema.js";

function runnerSpy() {
  const serial = new SerialDeckRunner();
  const calls: DeckRunRequest[] = [];
  const runner: DeckSimRunner = { run: async (request) => { calls.push(request); return serial.run(request); } };
  return { runner, calls };
}

describe("required complete paired evaluation", () => {
  it("finishes all sample identities beyond the latency target and deduplicates only equal inputs", async () => {
    const input = board({ bossHp: 12 });
    const change = { piles: { ...input.piles, draw: [] } };
    const options = [{ key: "skip", change: null }, { key: "a", change }, { key: "b", change: { piles: { ...input.piles, draw: [] } } }];
    const { runner, calls } = runnerSpy();
    const actual = await compareOptions(runner, input, options, { samples: 3, deadlineMs: 0, requireComplete: true, quantitative: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.deadlineMs).toBeUndefined();
    expect(calls[0]!.decks).toHaveLength(2);
    expect(actual).toMatchObject({ samples: 3, requested: 3, timedOut: false,
      completion: { originalDecks: 3, uniqueDecks: 2, memoHit: false } });
    expect(actual.options.map((o) => o.key)).toEqual(["skip", "a", "b"]);
    expect(actual.options[1]!.quantitative).toEqual(actual.options[2]!.quantitative);
    const reference = await compareOptions(new SerialDeckRunner(), input, options, { samples: 3, quantitative: true });
    expect(actual.base).toEqual(reference.base);
    expect(actual.options).toEqual(reference.options);
  });
  it("does not reuse a different seed, state or mutable policy, or a caller-mutated return", async () => {
    const input = board({ bossHp: 12 });
    const options = [{ key: "skip", change: null }];
    const { runner, calls } = runnerSpy();
    const opts = { samples: 2, requireComplete: true, quantitative: true };
    const first = await compareOptions(runner, input, options, opts);
    const expected = structuredClone(first.base);
    first.base.hp = -999;
    const second = await compareOptions(runner, input, options, opts);
    expect(second.base).toEqual(expected);
    expect(second.completion?.memoHit).toBe(true);
    expect(calls).toHaveLength(1);
    await compareOptions(runner, input, options, { ...opts, seed: 81 });
    expect(calls).toHaveLength(2);
    await compareOptions(runner, { ...input, solver: { ...input.solver, player: { ...input.solver.player, hp: 51 } } }, options, opts);
    expect(calls).toHaveLength(3);
    BOSS_POLICY_THREAT.TEST_BOSS = .5;
    try { await compareOptions(runner, input, options, opts); expect(calls).toHaveLength(4); }
    finally { delete BOSS_POLICY_THREAT.TEST_BOSS; }
  });
  it("rejects incomplete or misidentified paired results rather than treating a minimum as completion", async () => {
    const { runner } = runnerSpy();
    const incomplete: DeckSimRunner = { run: async (req) => ({ ...await runner.run(req), complete: [0], timedOut: true }) };
    await expect(compareOptions(incomplete, board({ bossHp: 12 }), [], { samples: 3, requireComplete: true })).rejects.toThrow("incomplete");
    const wrongIds: DeckSimRunner = { run: async (req) => ({ ...await runner.run(req), complete: [0, 0, 2] }) };
    await expect(compareOptions(wrongIds, board({ bossHp: 12 }), [], { samples: 3, requireComplete: true })).rejects.toThrow("incomplete");
  });
  it("keeps legacy deadline behavior when complete computation is not requested", async () => {
    const { runner, calls } = runnerSpy();
    const result = await compareOptions(runner, board(), [], { samples: 3, deadlineMs: 0 });
    expect(calls[0]!.deadlineMs).toBe(0);
    expect(result.samples).toBe(0);
    expect(result.completion).toBeUndefined();
  });
  it("holds a supported Silent question if computation is absent/partial/error, while other roles stay equivalent", () => {
    const ask = { kind: "ask", label: "reward/card", deepseek: { options: () => [] } } as unknown as AskDecision;
    const state = { in_combat: false, run: { floor: 2, raw: { character_id: "SILENT" } } } as unknown as GameState;
    expect(requiresBossEvaluation(ask, state)).toBe(true);
    expect(bossEvaluationPending(ask, state, undefined)).not.toBeNull();
    expect(bossEvaluationPending(ask, state, { samples: 300, requested: 1000, completion: { status: "complete" } })).not.toBeNull();
    expect(bossEvaluationPending(ask, state, { error: "worker unavailable" })).toBe("worker unavailable");
    expect(bossEvaluationPending(ask, state, { samples: 1000, requested: 1000, completion: { status: "complete" } })).toBeNull();
    const other = { ...state, run: { ...state.run!, raw: { character_id: "IRONCLAD" } } };
    expect(bossEvaluationPending(ask, other, undefined)).toBeNull();
  });
});

const marginSample = (outgoingHp: number, receivedHp: number | null, more: Partial<MarginSample> = {}): MarginSample => ({
  won: true, died: false, capped: false, timeUp: false, turns: 2,
  bossMargin: { reference: { bossHp: 100, myHp: 50, enemyIds: ["FIXTURE"], unknown: [] }, outgoingHp, receivedHp }, ...more,
});

describe("boss-relative formula and provenance", () => {
  it("normalizes against asymmetric HP, rewards mitigation, and preserves invalid denominators", () => {
    expect(bossRelativeMargin(100, 15, 600, 60)).toBeCloseTo(-1 / 12);
    expect(bossRelativeMargin(90, 3, 600, 60)).toBeGreaterThan(bossRelativeMargin(120, 8, 600, 60)!);
    expect(bossRelativeMargin(1, 0, 0, 60)).toBeNull();
    expect(bossRelativeMargin(Infinity, 0, 1, 60)).toBeNull();
    expect(bossRelativeMargin(1, -1, 1, 60)).toBeNull();
  });
  it("includes setup turns, retains missing/censored/sequence samples, and never ranks a selected valid subset", () => {
    const a = marginSample(100, 20), b = marginSample(100, 10);
    expect(marginOf(a)).toBeCloseTo(.3);
    expect(marginOf({ ...a, turns: 4 })).toBeCloseTo(.15);
    const full = summarizeBossMargin([b], [a], [7]);
    expect(full).toMatchObject({ rankingEligible: true, score: { mean: .4 } });
    expect(full.paired.difference.mean).toBeCloseTo(.1);
    for (const unavailable of [marginSample(100, null), { ...a, capped: true }, { ...a, sequence: {} }]) {
      const result = summarizeBossMargin([b, unavailable], [a, a], [7, 9]);
      expect(result).toMatchObject({ rankingEligible: false, valid: 1, missing: 1, score: null,
        paired: { unmatchedBase: 1, unmatchedOption: 0 } });
    }
    expect(() => summarizeBossMargin([a, b], [a, b], [1, 1])).toThrow();
  });
  it("counts status damage and mitigation, caps actual damage at remaining HP, and keeps own-cost mixtures unknown", () => {
    const input = board({ playerHp: 5 }).solver;
    input.hand = [];
    input.captureBossMargin = true;
    input.enemies[0]!.attacks = [{ damage: 100, hits: 1 }];
    const plan = solveTurn(input).plans[0]!;
    expect(plan.outcome.incomingAfterBlock).toBe(100);
    expect(plan.outcome.receivedHpDamage).toBe(5);
    input.hand = [card(0, "FIXTURE_BURN", { type: "Status", playable: false, heldPenalty: 2 })];
    expect(solveTurn(input).plans[0]!.outcome.receivedHpDamage).toBe(5);
    input.enemies[0]!.attacks = [];
    expect(solveTurn(input).plans[0]!.outcome.receivedHpDamage).toBe(2);
    input.player.block = 2;
    expect(solveTurn(input).plans[0]!.outcome.receivedHpDamage).toBe(0);
    input.hand = [card(0, "FIXTURE_DIRECT_HELD", { type: "Status", playable: false, heldPenalty: 3, heldHpLoss: 3 })];
    expect(solveTurn(input).plans[0]!.outcome.receivedHpDamage).toBe(3);
    input.player.startTurnHpLoss = 1;
    expect(solveTurn(input).plans[0]!.outcome.receivedHpDamage).toBeNull();
  });
  it("measures through the real unchanged simulator and reaches compact quantitative consumers", () => {
    const base = board({ bossHp: 12 });
    const before = fightSample(slimInput(base), null, 7);
    const measured = fightSample(slimInput({ ...base, captureBossMargin: true }), null, 7);
    const { bossMargin, ...same } = measured;
    expect(same).toEqual(before);
    expect(bossMargin?.reference).toMatchObject({ myHp: 70, bossHp: 12, unknown: [] });
    expect(bossMargin?.receivedHp).not.toBeNull();
    const facts = compactQuantitativeFight(quantitativeFightFacts([measured], [measured], [7]));
    expect(facts).toMatchObject({ boss_relative_margin: { rankingEligible: true, paired: { difference: { mean: 0 } } } });
  });
});
