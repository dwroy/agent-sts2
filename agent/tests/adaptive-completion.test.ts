import { expect, it } from "vitest";
import { compareOptions, completeAdaptiveBuild } from "../src/sim/build-sim.js";
import { sampleSchedule } from "../src/sim/sample-range.js";
import { isAdaptiveComplete } from "../src/sim/adaptive-sampler.js";
import type { DeckRunRequest, DeckSimRunner } from "../src/sim/build-sim-pool.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import { bossEvaluationPending } from "../src/sim/build-sim-facts.js";
import { board } from "./boss-sim-fixture.js";
import { asRecord, toJsonValue } from "../src/core/util/json.js";
import type { AskDecision } from "../src/memory/types.js";
import type { GameState } from "../src/hand/mod/schema.js";

// Abstract outcomes exercise prefix accounting; no game mechanism or calibration claim.
const outcome = (won: boolean): FightSampleResult => ({ won, died: !won, capped: false, timeUp: false, turns: 2,
  hpLoss: won ? 1 : 50, revived: 0, drunk: [], enemyHpLeft: won ? 0 : 50,
  lossByTurn: [0, won ? 1 : 50], dmgByTurn: [25, won ? 75 : 25], incomingByTurn: [], enemyLossByTurn: [],
  policyTurns: 2, policyNodes: 0 });
function fixtureRunner() {
  const calls: DeckRunRequest[] = [];
  const runner: DeckSimRunner = { run: async (r) => {
    calls.push(r);
    const schedule = sampleSchedule(r.samples, r.decks.length, r.range, r.activeDecks);
    const outcomes = r.decks.map(() => r.orders.map(() => new Array<FightSampleResult | undefined>(r.samples)));
    for (const deck of schedule.indices) for (let id = schedule.from; id < schedule.to; id++) {
      const stripe = r.stripes?.[deck];
      if (stripe && id % stripe.of !== stripe.at) continue;
      const threshold = r.decks[deck]!.solver?.player.hp ?? (id < 300 ? 40 : 60);
      outcomes[deck]![0]![id] = outcome(id % 100 < threshold);
    }
    return { outcomes, complete: Array.from({ length: schedule.to - schedule.from }, (_, i) => i + schedule.from),
      timedOut: false, elapsedMs: 0, workers: 1 };
  } };
  return { runner, calls };
}

it("B3 stops only losing candidates, preserves deduplication, and pairs shorter options with the same baseline prefix", async () => {
  const base = board();
  const edit = (hp: number, block = 0) => ({ solver: { ...base.solver, player: { ...base.solver.player, hp, block } } });
  const options = [{ key: "bad", change: edit(10) }, { key: "bad_alias", change: edit(10) },
    { key: "good", change: edit(80) }, { key: "good_tie", change: edit(80, 1) }];
  const { runner, calls } = fixtureRunner();
  const value = await compareOptions(runner, base, options, { samples: 1000, requireComplete: true, quantitative: true,
    adaptive: { mode: "on", allowS: false }, buildRank: { lowTrust: "fixture", calibratedFloor: .05, tieSe: 2 } });
  expect(completeAdaptiveBuild(value)).toBe(true);
  expect(calls.map((r) => [r.range, r.activeDecks])).toEqual([
    [{ from: 0, to: 300 }, [0, 1, 2, 3]],
    ...Array.from({ length: 7 }, (_, i) => [{ from: 300 + i * 100, to: 400 + i * 100 }, [0, 2, 3]]),
  ]);
  expect(value.base.samples).toBe(1000);
  expect(value.options.map((o) => o.samples)).toEqual([300, 300, 1000, 1000]);
  expect(value.options[0]!.diff!.raw).toBe(-.3);
  expect(value.options[0]!.pairedReference).toMatchObject({ samples: 300, rawWin: .4 });
  expect(value.options[0]!.quantitative).toMatchObject({ samples: 300, paired_win_difference: { n: 300 } });
  expect(asRecord(asRecord(value.options[0]!.quantitative)["paired_win_difference"])["mean"]).toBeCloseTo(-.3);
  expect(value.buildRanking).toMatchObject({ status: "produced", best_group: ["good", "good_tie"] });
  expect(value.adaptive).toMatchObject({ work: { full: 4000, actual: 3300 } });
  const before = calls.length;
  const reused = await compareOptions(runner, base, options, { samples: 1000, requireComplete: true, quantitative: true,
    adaptive: { mode: "on", allowS: false }, buildRank: { lowTrust: "fixture", calibratedFloor: .05, tieSe: 2 } });
  expect(reused.completion?.memoHit).toBe(true);
  expect(calls).toHaveLength(before);
  expect(reused.options).toEqual(value.options);
  const shadow = await compareOptions(runner, base, options, { samples: 1000, requireComplete: true, quantitative: true,
    adaptive: { mode: "shadow", allowS: false }, buildRank: { lowTrust: "fixture", calibratedFloor: .05, tieSe: 2 } });
  expect(shadow.adaptive).toMatchObject({ production_comparison: {
    metric: "deployed-ranking-first-group", full: ["good", "good_tie"], partial: ["good", "good_tie"], agreement: true } });

  const ask = { kind: "ask", label: "reward/card", deepseek: { options: () => [] } } as unknown as AskDecision;
  const state = { in_combat: false, run: { floor: 2, raw: { character_id: "SILENT" } } } as unknown as GameState;
  const record = toJsonValue({ completion: { status: "complete_adaptive" }, requested: 1000, samples: value.samples,
    base: { samples: value.base.samples }, options: Object.fromEntries(value.options.map((o) => [o.key, { samples: o.samples }])), adaptive: value.adaptive });
  expect(bossEvaluationPending(ask, state, record)).toBeNull();
  expect(bossEvaluationPending(ask, state, { ...asRecord(record), adaptive: null })).not.toBeNull();
  expect(isAdaptiveComplete(value.adaptive, "b3", 1000, new Map([["@current", 1000]]))).toBe(false);
});

it("rejects a shortened worker round before it can enter the complete memo", async () => {
  const f = fixtureRunner();
  const broken: DeckSimRunner = { run: async (r) => ({ ...await f.runner.run(r), complete: [0] }) };
  await expect(compareOptions(broken, board(), [{ key: "same", change: null }], {
    samples: 1000, requireComplete: true, adaptive: { mode: "on", allowS: false },
  })).rejects.toThrow("round incomplete");
});
