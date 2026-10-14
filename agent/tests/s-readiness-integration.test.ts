import { afterEach, describe, expect, it, vi } from "vitest";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import { compareOptions } from "../src/sim/build-sim.js";
import type { DeckRunRequest, DeckSimRunner } from "../src/sim/build-sim-pool.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import { board as simBoard } from "./boss-sim-fixture.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { board, decide, env, setupOneshotTests } from "./oneshot-support.js";
import { asRecord } from "../src/core/util/json.js";

vi.mock("../src/sim/boss-trust.js", async (original) => ({ ...await original<object>(), bossTrustReason: () => null }));
setupOneshotTests();
afterEach(() => vi.unstubAllEnvs());

function fixedRunner() {
  const run = vi.fn(async (req: DeckRunRequest) => {
    const reference = { myHp: req.base.solver.player.hp, bossHp: req.base.solver.enemies.reduce((sum, enemy) => sum + enemy.hp, 0), enemyIds: ["FIXTURE"], unknown: [] };
    const sample: FightSampleResult = { won: true, died: false, capped: false, timeUp: false, turns: 2,
      hpLoss: 1, revived: 0, drunk: [], enemyHpLeft: 0, lossByTurn: [1, 0], dmgByTurn: [reference.bossHp, 0],
      incomingByTurn: [1, 0], enemyLossByTurn: [1, 0], policyTurns: 2, policyNodes: 1,
      bossMargin: { reference, outgoingHp: reference.bossHp, receivedHp: 1 } };
    return { outcomes: req.decks.map(() => req.orders.map(() => Array.from({ length: req.samples }, () => structuredClone(sample)))),
      complete: Array.from({ length: req.samples }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0 };
  });
  return { run } satisfies DeckSimRunner;
}

describe("P1 actual B3 plumbing", () => {
  async function question(mode: string, character = "SILENT") {
    vi.stubEnv("S_READINESS", mode);
    const raw = board("xljq-f5-reward", "reward");
    const before = decide(env(raw));
    (raw.run as Record<string, unknown>).character_id = character;
    const e = { ...env(raw), requiredBossEvaluation: character === "SILENT" };
    const runner = fixedRunner();
    const result = await withBossSim(before, e, { runner, samples: 2, db: FIXTURE_DB, mm: FIXTURE_MM, now: () => 0 });
    return { ...result, runner };
  }
  it("shadow records diagnostics while leaving the original question exactly unchanged", async () => {
    const off = await question("off"), shadow = await question("shadow");
    expect(shadow.record).not.toHaveProperty("error");
    expect(shadow.record?.readiness).toMatchObject({ schema: "boss-readiness-v1", mode: "shadow", delivered: false, samples: 2 });
    expect(JSON.stringify(shadow.decision)).toBe(JSON.stringify(off.decision));
    expect(shadow.runner.run.mock.calls.every(([req]) => req.deadlineMs === undefined)).toBe(true);
    expect(off.record).not.toHaveProperty("readiness");
  });
  it("on delivers only the compact field at the real brain facts boundary", async () => {
    const on = await question("on"), shadow = await question("shadow");
    expect(on.decision.kind).toBe("ask");
    if (on.decision.kind !== "ask" || shadow.decision.kind !== "ask") throw new Error("fixture question missing");
    const { boss_readiness, ...rest } = asRecord(on.decision.state.facts);
    expect(boss_readiness).toMatch(/^当前牌组Boss模拟胜率/);
    expect(rest).toEqual(shadow.decision.state.facts);
    expect(on.decision.questions).toEqual(shadow.decision.questions);
    expect(on.record?.readiness).toMatchObject({ delivered: true });
  });
  it("keeps Ironclad byte-equivalent when an operator requests on", async () => {
    const off = await question("off", "IRONCLAD"), on = await question("on", "IRONCLAD");
    expect(JSON.stringify(on.decision)).toBe(JSON.stringify(off.decision));
    expect(on.record).toEqual(off.record);
    expect(on.record).not.toHaveProperty("readiness");
  });
  it("does not serve a cached no-readiness result after the feature mode changes", async () => {
    const runner = fixedRunner(), base = simBoard({ bossHp: 12 });
    const common = { samples: 2, quantitative: true, requireComplete: true };
    const off = await compareOptions(runner, base, [], common);
    const on = await compareOptions(runner, base, [], { ...common, readiness: true });
    expect(off.readiness).toBeUndefined();
    expect(on.readiness).toMatchObject({ samples: 2 });
    expect(on.base).toEqual(off.base);
  });
});
