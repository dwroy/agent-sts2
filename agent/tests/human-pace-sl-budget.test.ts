/** Fixed clocks and in-memory SL transport; no game, network, or model calls. */
import { afterEach, expect, it, vi } from "vitest";
import { DecisionBudget, DecisionBudgetExpired, DecisionBudgetLedger, combatBudgetKind, currentDecisionBudget,
  withCombatComputation, withDecisionBudget, withinDecisionBudget, withShadowDecisionBudget } from "../src/core/decision-budget.js";
import { loadConfig } from "../src/core/config.js";
import { RunJournal } from "../src/memory/run-journal.js";
import { createScreenMemory } from "../src/memory/types.js";
import { SlController } from "../src/sl/controller.js";
import { bossBoard, menuBoard, state } from "./sl-support.js";
import { testKnowledge } from "./scenarios.js";

afterEach(() => vi.useRealTimers());

it.each([["boss", 60000], ["elite", 15000], ["hallway", 10000]] as const)("protects one three-second Jev allowance on first and retry %s turns", async (fight, limit) => {
  let time = 0;
  const ledger = new DecisionBudgetLedger(() => time);
  for (const attempt of [1, 2, 3, 4]) {
    const budget = ledger.open(`fixed:17:1:${attempt}`, combatBudgetKind(fight));
    expect(budget.remaining()).toBe(limit);
    await withDecisionBudget(budget, async () => {
      withCombatComputation(() => {
        expect(budget.remaining()).toBe(limit - 3000);
        time += budget.remaining();
        expect(budget.remaining()).toBe(0);
      });
      expect(budget.remaining()).toBe(3000);
      expect(budget.record().timed_out).toBe(false);
      await withinDecisionBudget("Jev", async () => { time += 1000; return "accepted"; });
      // A card step/re-ask shares the original turn and does not create another reservation.
      expect(ledger.open(budget.key, combatBudgetKind(fight))).toBe(budget);
      withCombatComputation(() => expect(budget.remaining()).toBe(0));
      expect(budget.remaining()).toBe(2000);
      await withinDecisionBudget("Jev", async () => { time += 1999; });
      expect(budget.remaining()).toBe(1);
      await expect(withinDecisionBudget("Jev", async () => { time += 1; })).rejects.toBeInstanceOf(DecisionBudgetExpired);
      expect(budget.elapsed()).toBe(limit);
      expect(budget.record()).toMatchObject({ budget_ms: limit, jev_reserve_ms: 3000, jev_actual_ms: 3000 });
    });
  }
});

it("keeps observer and L2 allowances independent and restores the real computation scope after an error", () => {
  let time = 0;
  const budget = new DecisionBudget("fixed-shadow", "boss", () => time);
  withDecisionBudget(budget, () => {
    withCombatComputation(() => {
      withShadowDecisionBudget("fixed_shadow", () => {
        expect(currentDecisionBudget()).not.toBe(budget);
        expect(currentDecisionBudget()!.remaining()).toBe(57000);
        time += 10000;
      });
      expect(budget.remaining()).toBe(57000);
    });
    expect(() => withCombatComputation(() => { time += 2000; throw new Error("fixed"); })).toThrow("fixed");
    expect(budget.remaining()).toBe(58000);
    expect(budget.record()).toMatchObject({ shared_actual_ms: 2000, independent_actual_ms: 10000 });
  });
  expect(withCombatComputation(() => currentDecisionBudget())).toBeUndefined();
  const routine = new DecisionBudget("fixed-routine", "routine", () => 0);
  expect(withDecisionBudget(routine, () => withCombatComputation(() => routine.remaining()))).toBe(5000);
});

it.each(["boss", "listed", "hallway"])("caps every Silent %s SL gate at four attempts and preserves other roles", async (gate) => {
  for (const character of ["SILENT", "IRONCLAD", "REGENT"]) {
    const cfg = loadConfig({ SL_ENABLED: "on", SL_BOSS_RETRIES: "5", SL_ELITE_RETRIES: "5", SL_RETRY_EXPLORE: "off" }).sl;
    cfg.log = null;
    const raw = (turn: number, hp: number, lethal: boolean) => {
      const r = bossBoard({ turn, hp, lethal, floor: gate === "boss" ? 17 : 40, actId: gate === "boss" ? "0" : "2",
        enemyIds: gate === "boss" ? ["TEST_SUBJECT"] : gate === "listed" ? ["ENTOMANCER"] : ["JAW_WORM"] });
      (r.run as Record<string, unknown>).character_id = character;
      return r;
    };
    let current = raw(1, 20, false), calls = 0, clock = 0;
    const client = { state: async () => state(current), act: async (intent: { action: string }) => {
      calls++;
      current = intent.action === "save_and_quit" ? menuBoard() : raw(1, 20, false);
      return { action: intent.action, status: "completed" as const, stable: true, message: "fixed", state: null, raw: {} };
    } };
    const sl = new SlController({ config: cfg, knowledge: testKnowledge, client,
      elites: { source: "fixed", date: "2026-10-18", elites: [{ name: "Entomancer", zh: "fixed", enemy_ids: ["ENTOMANCER"], deaths: 1, fights: 1 }] },
      note: () => {}, sleep: async (ms) => { clock += ms; }, now: () => clock });
    const memory = { journal: new RunJournal(), screenMemory: createScreenMemory() };
    for (let attempt = 1; attempt <= 4; attempt++) {
      current = raw(1, 20, false); sl.observe(state(current), memory);
      expect(sl.decisionFields().sl_attempt).toBe(attempt);
      if (attempt > 1) expect(sl.envFor(state(current))?.maxAttempts).toBe(character === "SILENT" ? 4 : 6);
      current = raw(3, 1, true); sl.observe(state(current), memory);
      const result = await sl.beforeEndTurn(state(current), { label: "combat/end_turn", ...memory });
      expect(result.handled).toBe(character !== "SILENT" || attempt < 4);
    }
    expect(calls).toBe(character === "SILENT" ? 6 : 8);
  }
});
