/** C48LLXBGKXQ9 F33 attempt 5 T13, ledger silent-0001. Fixed board; no refreshed knowledge. */
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv, type ActDecision } from "../src/memory/types.js";
import { guardSandpit, planCombatTurn } from "../src/reflex/combat-plan.js";
import { combatPayload } from "./scenarios.js";

vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

type Raw = Record<string, any>;
const knowledge = makeKnowledge({ cards: [
  { id: "STRIKE_SILENT", type: "Attack" }, { id: "DASH", type: "Attack" }, { id: "FRANTIC_ESCAPE", type: "Status" },
], monsters: [{ id: "THE_INSATIABLE", type: "Boss" }] }, "cache");
function envAfterStrike(): DecisionEnv {
  const raw = combatPayload() as Raw;
  raw.run_id = "C48LLXBGKXQ9";
  raw.turn = 13;
  Object.assign(raw.run, { character_id: "SILENT", floor: 33, potions: [], relics: [], deck: [] });
  Object.assign(raw.combat.player, { current_hp: 5, energy: 2, powers: [] });
  raw.combat.enemies = [{ ...raw.combat.enemies[0], enemy_id: "THE_INSATIABLE", current_hp: 9, block: 0,
    powers: [{ power_id: "SANDPIT_POWER", amount: 1 }] }];
  raw.combat.hand = [
    { ...raw.combat.hand[0], card_id: "DASH", energy_cost: 2, valid_target_indices: [0], dynamic_values: [
      { name: "Damage", base_value: 10, current_value: 10 }, { name: "Block", base_value: 13, current_value: 13 },
    ] },
    { ...raw.combat.hand[1], card_id: "FRANTIC_ESCAPE", energy_cost: 2, dynamic_values: [] },
  ];
  const state = parseGameState(raw);
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
}

afterEach(() => { vi.restoreAllMocks(); setMonsterDbForTests(null); });
it("keeps the validated Strike → Dash lethal through its last continuation step", () => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  const before = envAfterStrike();
  const raw = structuredClone(before.state.raw) as Raw;
  raw.combat.player.energy = 3;
  raw.combat.enemies[0].current_hp = 15;
  raw.combat.hand.unshift({ ...raw.combat.hand[0], index: 2, card_id: "STRIKE_SILENT", energy_cost: 1,
    dynamic_values: [{ name: "Damage", base_value: 6, current_value: 6 }] });
  before.state = parseGameState(raw);
  expect(planCombatTurn(before)).toMatchObject({ label: "combat/lethal" });
  const env = envAfterStrike();
  // The memo committed before Strike, matching the remaining board's exact hand signature.
  env.screenMemory.combatPlan = { turn: 13, lethal: true, via: "code", handLen: 2,
    expectedHand: "DASH,FRANTIC_ESCAPE", remaining: [{ cardIndex: 1, cardId: "DASH", name: "DASH", upgraded: false, target: 0, targetName: "THE_INSATIABLE" }],
    enemies: "0:THE_INSATIABLE" };
  const continuation = planCombatTurn(env) as ActDecision;
  expect(continuation).toMatchObject({ kind: "act", label: "combat/plan-continue", intent: { action: "play_card", card_index: 0 } });
  expect(before.screenMemory.combatPlan).toMatchObject({ lethal: true });
  expect(env.screenMemory.combatPlan).toBeNull();
  expect(env.screenMemory.plannedAfter).toMatchObject({ turn: 13, lethal: true, steps: [] });
});

it("still guards a nonlethal continuation, a stale lethal memo, and ending the turn", () => {
  const env = envAfterStrike();
  const dash: ActDecision = { kind: "act", label: "combat/plan-continue", intent: { action: "play_card", card_index: 0, target_index: 0 }, rationale: "fixture" };
  for (const after of [{ turn: 13, lethal: false, steps: [] }, { turn: 12, lethal: true, steps: [] }]) {
    env.screenMemory.plannedAfter = after;
    expect(guardSandpit(env, dash)).toMatchObject({ label: "combat/sandpit-guard", intent: { card_index: 1 } });
  }
  env.screenMemory.plannedAfter = { turn: 13, lethal: true, steps: [] };
  expect(guardSandpit(env, { ...dash, intent: { action: "end_turn" } })).toMatchObject({ label: "combat/sandpit-guard" });
});
