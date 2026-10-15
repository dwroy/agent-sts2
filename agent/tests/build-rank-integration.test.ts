import { afterEach, expect, it, vi } from "vitest";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import { compareOptions } from "../src/sim/build-sim.js";
import { board as simBoard } from "./boss-sim-fixture.js";
import type { DeckSimRunner } from "../src/sim/build-sim-pool.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { board, decide, env, setupOneshotTests } from "./oneshot-support.js";
import { asArray, asRecord } from "../src/core/util/json.js";

vi.mock("../src/sim/boss-trust.js", async (original) => ({ ...await original<object>(), bossTrustReason: () => null }));
setupOneshotTests();
afterEach(() => vi.unstubAllEnvs());

const runner: DeckSimRunner = { async run(req) {
  const reference = { myHp: req.base.solver.player.hp, bossHp: req.base.solver.enemies.reduce((sum, e) => sum + e.hp, 0), enemyIds: ["FIXTURE"], unknown: [] };
  const sample: FightSampleResult = { won: true, died: false, capped: false, timeUp: false, turns: 2,
    hpLoss: 1, revived: 0, drunk: [], enemyHpLeft: 0, lossByTurn: [1, 0], dmgByTurn: [reference.bossHp, 0],
    incomingByTurn: [1, 0], enemyLossByTurn: [1, 0], policyTurns: 2, policyNodes: 1,
    bossMargin: { reference, outgoingHp: reference.bossHp, receivedHp: 1 } };
  return { outcomes: req.decks.map(() => req.orders.map(() => Array.from({ length: req.samples }, () => structuredClone(sample)))),
    complete: Array.from({ length: req.samples }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0 };
} };
async function question(mode: string, character = "SILENT", name = "xljq-f5-reward", key = "reward") {
  vi.stubEnv("S_BUILD_RANK", mode);
  vi.stubEnv("S_READINESS", "off");
  const raw = board(name, key), before = decide(env(raw));
  (raw.run as Record<string, unknown>).character_id = character;
  return withBossSim(before, { ...env(raw), requiredBossEvaluation: character === "SILENT" },
    { runner, samples: 2, db: FIXTURE_DB, mm: FIXTURE_MM, now: () => 0 });
}

it("shadow keeps every original question byte-identical while recording code groups", async () => {
  const off = await question("off"), shadow = await question("shadow");
  expect(shadow.record).not.toHaveProperty("error");
  expect(shadow.record?.build_ranking).toMatchObject({ schema: "build-ranking-v1", status: "produced", mode: "shadow", delivered: false });
  expect(JSON.stringify(shadow.decision)).toBe(JSON.stringify(off.decision));
  expect(off.record).not.toHaveProperty("build_ranking");
});
it("on merges S into one ranking table and retains all legal options", async () => {
  const shadow = await question("shadow"), on = await question("on");
  if (on.decision.kind !== "ask" || shadow.decision.kind !== "ask") throw new Error("missing real question");
  const ranking = asRecord(asRecord(on.decision.state.facts).build_ranking);
  expect(ranking.schema).toBe("build-ranking-v1");
  expect(asArray(ranking.best_group).length).toBeGreaterThan(0);
  for (const key of Object.keys(on.decision.questions)) {
    const a = asRecord(on.decision.questions[key]), b = asRecord(shadow.decision.questions[key]);
    expect(Object.keys(asRecord(a.criteria))).toEqual(Object.keys(asRecord(b.criteria)));
    for (const text of Object.values(asRecord(a.criteria))) {
      if (typeof text !== "string") continue;
      expect(asRecord(JSON.parse(text).quantitative_fight)).not.toHaveProperty("boss_relative_margin");
    }
  }
  expect(on.record?.build_ranking).toMatchObject({ mode: "on", delivered: true });
});
it("keeps Ironclad's complete original question and record identical", async () => {
  const off = await question("off", "IRONCLAD"), on = await question("on", "IRONCLAD");
  expect(JSON.stringify(on.decision)).toBe(JSON.stringify(off.decision));
  expect(on.record).toEqual(off.record);
});

it("measures readiness alone, excluding subsequent C2 shadow and P2 ranking work", async () => {
  let time = 0;
  const clock = vi.spyOn(performance, "now").mockImplementation(() => ++time);
  try {
    const result = await compareOptions(runner, simBoard({ bossHp: 12 }), [{ key: "skip", change: null }],
      { samples: 2, now: () => 0, requireComplete: true, quantitative: true, readiness: true,
        adaptive: { allowS: true }, buildRank: { lowTrust: null, calibratedFloor: .01, tieSe: 2 } });
    expect(result.readinessMs).toBe(1);
    expect(result.adaptive).toBeDefined();
    expect(result.buildRanking).toBeDefined();
  } finally { clock.mockRestore(); }
});

it.each([
  ["7b0d-f8-rest", "rest"],
  ["7b0d-f8-rest", "upgrade_select"],
  ["u6ru-f22-shop", "open"],
  ["qug1-f22-shop-remove", "remove_select"],
])("retains every supported candidate identity for %s/%s", async (name, key) => {
  const result = await question("on", "SILENT", name, key);
  expect(result.record).not.toHaveProperty("error");
  const ranking = asRecord(result.record?.build_ranking);
  expect(ranking.status).toBe("produced");
  const options = Object.keys(asRecord(result.record?.options));
  expect(options.length).toBeGreaterThan(0);
  expect(asArray(ranking.rows).map((row) => asRecord(row).key).sort()).toEqual([...options].sort());
  expect(asArray(ranking.candidates).map((row) => asRecord(row).key).sort()).toEqual([...options].sort());
});
