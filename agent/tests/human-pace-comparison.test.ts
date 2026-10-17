/** Existing start and B3 comparison adapters, using only fixed symbolic outcomes. */
import { afterEach, expect, it, vi } from "vitest";
import { compareDirection, directionStart, humanPaceShadowRunner } from "../src/sim/human-pace-comparison.js";
import { DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { constructionState } from "../src/construction/adapter.js";
import { board, env } from "./oneshot-support.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import type { DeckSimRunner } from "../src/sim/build-sim-pool.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import type { GlobalBossTarget } from "../src/sim/global-build.js";
afterEach(() => { vi.unstubAllEnvs(); setKnowledgeCharacter(null); });
const target: GlobalBossTarget = { boss: "SOUL_FYSH", act: 2, frequency: 1, count: 1, evidence: ["FIXTURE"], source: "observed_silent_pool", unknown: null };
function fixture() {
  setKnowledgeCharacter("silent"); vi.stubEnv("SIM_ADAPTIVE", "off");
  const raw = board("xljq-f5-reward", "reward"); Object.assign(raw.run as object, { character_id: "SILENT", relics: [] });
  const environment = env(raw), current = constructionState(environment);
  return { environment, current };
}
it("reuses the existing runner with a separate memo namespace and records win and S from the original paired samples", async () => {
  const { environment, current } = fixture(), before = JSON.stringify(environment.state.raw);
  const changed = structuredClone(current); changed.cards.push({ ...changed.cards[0]! });
  const run = vi.fn<DeckSimRunner["run"]>(async (req) => {
    const hp = req.base.solver.enemies.reduce((n, enemy) => n + enemy.hp, 0);
    const sample: FightSampleResult = { won: true, died: false, capped: false, timeUp: false, turns: 1,
      hpLoss: 1, revived: 0, drunk: [], enemyHpLeft: 0, lossByTurn: [1], dmgByTurn: [hp], incomingByTurn: [1], enemyLossByTurn: [hp],
      policyTurns: 1, policyNodes: 1, bossMargin: { reference: { myHp: req.base.solver.player.hp, bossHp: hp, enemyIds: ["FIXED"], unknown: [] }, outgoingHp: hp, receivedHp: 1 } };
    return { outcomes: req.decks.map(() => req.orders.map(() => Array.from({ length: req.samples }, () => structuredClone(sample)))),
      complete: Array.from({ length: req.samples }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0 };
  });
  const runner = { run }, budget = new DecisionBudget("fixed", "direction", () => 0);
  const result = await withDecisionBudget(budget, () => compareDirection(environment, current, target,
    { key: "added", state: changed, added: [{ kind: "card", id: changed.cards[0]!.id }] }, budget,
    { runner, samples: 2, now: () => 0, db: FIXTURE_DB, mm: FIXTURE_MM }));
  expect(result).toMatchObject({ status: "computed", win: 1, samples: 2, s: { mean: expect.any(Number) } });
  expect(run).toHaveBeenCalledTimes(1); expect(run.mock.calls[0]?.[0].deadlineMs).toBeLessThanOrEqual(59000);
  expect(humanPaceShadowRunner(runner)).toBe(humanPaceShadowRunner(runner));
  expect(humanPaceShadowRunner(runner)).not.toBe(runner); expect(humanPaceShadowRunner(runner)).not.toHaveProperty("close");
  expect(JSON.stringify(environment.state.raw)).toBe(before);
});
it("refuses invalid resource contracts and unknown components rather than filling model values", () => {
  const { environment, current } = fixture(), setup = { runner: { run: vi.fn() }, db: FIXTURE_DB, mm: FIXTURE_MM };
  expect(() => directionStart(environment, { ...current, hp: 0 }, target, setup)).toThrow("invalid_inventory_resource_contract");
  expect(() => directionStart(environment, { ...current, cards: [...current.cards, { id: "NOT_A_MODEL", upgraded: false }] }, target, setup)).toThrow("unmodelled_core_component");
});

it("allows only labelled Act2 partial-model benchmarks for unchanged held relics", () => {
  const { environment } = fixture();
  (environment.state.run!.raw as any).relics = [{ relic_id: "UNKNOWN_HELD", name: "fixed held relic", description: "each turn effect" }];
  // directionStart clones state.raw, so update the corresponding original frame too.
  (environment.state.raw.run as any).relics = (environment.state.run!.raw as any).relics;
  const current = constructionState(environment), limits: string[] = [];
  const setup = { runner: { run: vi.fn() }, db: FIXTURE_DB, mm: FIXTURE_MM };
  const before = JSON.stringify(environment.state.raw);
  expect(() => directionStart(environment, current, target, setup)).toThrow("hypothetical_inventory_has_unmodelled_relics");
  expect(directionStart(environment, current, target, setup, limits)).toBeDefined();
  expect(limits.join(" ")).toContain("effects_do_not_assume_cancellation");
  expect(limits.join(" ")).toContain("fixed held relic");
  expect(() => directionStart(environment, { ...current, relics: [...current.relics, "NEW_RELIC"] }, target, setup, [])).toThrow("hypothetical_inventory_has_unmodelled_relics");
  expect(() => directionStart(environment, current, { ...target, act: 3 }, setup, [])).toThrow("hypothetical_inventory_has_unmodelled_relics");
  expect(JSON.stringify(environment.state.raw)).toBe(before);
});
