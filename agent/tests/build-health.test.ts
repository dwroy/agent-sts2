import { describe, expect, it, vi } from "vitest";
import { parseGameState } from "../src/hand/mod/schema.js";
import { syntheticBossStart } from "../src/sim/boss-start.js";
import { compareOptions } from "../src/sim/build-sim.js";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import type { DeckRunRequest, DeckRunResult } from "../src/sim/build-sim-pool.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { loggedKnowledge } from "./logged.js";
import { board, decide, env, setupOneshotTests } from "./oneshot-support.js";
setupOneshotTests();
const deps = { db: FIXTURE_DB, mm: FIXTURE_MM };
const raw = () => board("xljq-f5-reward", "reward");
const empty = (req: DeckRunRequest): DeckRunResult => ({ outcomes: req.decks.map(() => req.orders.map(() => [])),
  complete: [], timedOut: true, elapsedMs: 100, workers: 2,
  ...(req.diagnostics ? { diagnostics: { queueMs: 40, coldStart: true, preparationMs: 3, firstReplyMs: null,
    chunksPlanned: 100, chunksDispatched: 2, chunksCompleted: 0, outcomesCompleted: 0 } } : {}) });

describe("B3 service diagnostics", () => {
  it("keeps order search and paired comparison failures separate, without modifying the budget", async () => {
    const start = syntheticBossStart(parseGameState(raw()), loggedKnowledge, "THE_KIN_BOSS", 40, deps).input;
    const run = vi.fn(async (req: DeckRunRequest) => empty(req));
    const result = await compareOptions({ run }, start, [{ key: "skip", change: null }], { deadlineMs: 11_000, diagnostics: true });
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[0]![0].deadlineMs).toBe(2750);
    expect(run.mock.calls[1]![0].deadlineMs).toBeLessThanOrEqual(11_000);
    expect(result.samples).toBe(0);
    expect(result.diagnostics).toMatchObject({ decks: 1, options: 1, deadlineMs: 11_000,
      orderSearch: { samples: 0, timedOut: true, pool: { firstReplyMs: null, chunksCompleted: 0 } },
      comparison: { samples: 0, pool: { queueMs: 40, chunksDispatched: 2 } } });
    const plain = await compareOptions({ run }, start, [], { deadlineMs: 11_000 });
    expect(plain.diagnostics).toBeUndefined();
  });

  it("retains failed Silent workload facts and keeps incomplete DPR out of the question", async () => {
    const r = raw();
    (r.run as Record<string, unknown>).character_id = "SILENT";
    const e = env(r);
    const result = await withBossSim(decide(env(raw())), e, { ...deps, runner: { run: async (req) => empty(req) } });
    expect(result.record?.diagnostics).toMatchObject({ schema: "build-sim-health-v1", status: "failed",
      reason: "zero_paired_samples", samples: 0, requested: 1000, minimumShown: 300 });
    expect(JSON.stringify(result.decision)).not.toContain('effective_damage_per_turn');
    expect(String(result.record?.error)).toContain('没有跑完一个样本');
  });

  it("preserves other roles' failure output shape", async () => {
    const e = env(raw());
    const result = await withBossSim(decide(e), e, { ...deps, runner: { run: async (req) => empty(req) } });
    expect(Object.keys(result.record!).sort()).toEqual(['error', 'ms']);
  });
});
