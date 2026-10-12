import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-potion-reference-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { potionCostFrom, potionCostOptions } from "../src/reflex/potion-cost.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import * as reference from "../src/reflex/silent-potion-reference.js";
import type { Plan } from "../src/reflex/turn-solver.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const readFileSync = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: frozen Silent evidence only"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync, default: { ...fs, readFileSync } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => {
  const mod = await original<typeof import("../src/reflex/potion-cost.js")>();
  return { ...mod, potionCosts: (ids: string[]) => new Map(ids.map((id) => [id, mod.potionCostFrom(null, id, 10, 1, "monster")])) };
});
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/knowledge/potion-equivalents.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/potion-equivalents.js")>(), heldPotionWorth: () => ({}),
}));

type Raw = Record<string, any>;
const raw = () => structuredClone(evidence.state) as Raw;
const state = () => parseGameState(raw());
const knowledge = makeKnowledge({}, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldCost = potionCostOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false; potionCostOptions.enabled = true;
});
afterEach(() => {
  setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; potionCostOptions.enabled = oldCost;
  vi.restoreAllMocks();
});
const costs = () => new Map([["FLEX_POTION", potionCostFrom(null, "FLEX_POTION", 10, 1, "monster")]]);

// Decision 272361 preserves the model's predictions, not the unused branch's actual outcome.
function observed() {
  const shown = (["plan2", "plan3", "plan5"] as const).map((key) => {
    const criterion = JSON.parse(evidence.criteria[key]);
    const plan = { steps: key === "plan2" ? [{ cardId: "POTION:FLEX_POTION:0" }] : [],
      outcome: { hpLoss: criterion.hp_lost, damageDealt: criterion.damage_dealt, cardsDrawn: 0, unknownCards: [] } } as unknown as Plan;
    return { key, plan };
  });
  const estimates = shown.map(({ key, plan }) => {
    const criterion = JSON.parse(evidence.criteria[key]);
    const text = criterion.rollout as string;
    return [plan, { horizon: 5, samples: 8, hpLoss: Number(text.match(/further HP loss ([\d.]+)/)![1]),
      wins: 8, deaths: 0, winProb: 1, turnsToWin: Number(text.match(/surviving samples\) ~([\d.]+)/)![1]),
      laterDrinks: key === "plan3" ? { FLEX_POTION: 7 } : {} }] as const;
  });
  const rollout = { available: true as const, result: { horizon: 5, degraded: [] as string[] }, byPlan: new Map(estimates),
    noPotion: { base: shown[1]!.plan, line: shown[2]!.plan, merged: false } };
  return { shown, rollout };
}
const facts = (input = observed()): any => reference.silentPotionReference(state(), costs(), input.shown, input.rollout).potion_value_reference;

it("keeps 751 F13 T3 missing held value separate from zero charge and both kinds of dry line", () => {
  const input = observed(), before = JSON.stringify(input.shown), result = facts(input);
  expect(result.unknown_held_values).toEqual([{ potion: "FLEX_POTION", hold_hp: null, charged_hp: 0, zero_reason: "no_table", source: null }]);
  expect(result.no_potion_now).toEqual(["plan3", "plan5"]);
  expect(result.no_potion_fight_reference).toEqual(["plan5"]);
  expect(result.options).toMatchObject([
    { key: "plan2", prediction: { hp_loss: 8, damage: 26 }, sampled_wins: 8, mean_end_turn_surviving_samples: 2.3 },
    { key: "plan3", prediction: { hp_loss: 8, damage: 16 }, no_potion_scope: "current_turn_only", later_drinks: [{ potion: "FLEX_POTION", samples_using: 7 }] },
    { key: "plan5", prediction: { hp_loss: 8, damage: 16 }, no_potion_scope: "sampled_fight_reference", mean_end_turn_surviving_samples: 2.9 },
  ]);
  expect(result.note).toContain("持有价值未知");
  expect(JSON.stringify(input.shown)).toBe(before);
});

it.each(["missing", "clock", "degraded"])("%s rollout never fabricates sampled wins or a whole-fight dry comparison", (mode) => {
  const input = observed();
  if (mode === "clock") {
    input.rollout.result.horizon = 1;
    for (const estimate of input.rollout.byPlan.values()) estimate.horizon = 1;
  }
  if (mode === "degraded") input.rollout.result.degraded = ["1-turn"];
  const result: any = reference.silentPotionReference(state(), costs(), input.shown, mode === "missing" ? null : input.rollout).potion_value_reference;
  expect(result.no_potion_fight_reference).toEqual([]);
  for (const row of result.options) expect(row).toMatchObject({ sampled_wins: null, sampled_deaths: null, samples: null,
    forecast_hp_loss: null, estimated_win_probability: null, mean_end_turn_surviving_samples: null, later_drinks: null });
});

it("an absent, unshown or drinking dry reference stays absent; a merged dry reference retains its shown key", () => {
  const input = observed();
  input.rollout.noPotion.merged = true;
  input.rollout.byPlan.get(input.shown[1]!.plan)!.laterDrinks = {};
  expect(facts(input).no_potion_fight_reference).toEqual(["plan3"]);
  input.shown.splice(1, 1);
  expect(facts(input).no_potion_fight_reference).toEqual([]);
  input.rollout.noPotion.base = input.shown[0]!.plan;
  expect(facts(input).no_potion_fight_reference).toEqual([]);
});

it.each([0, 4.5])("a known held value of %s is not labelled unknown", (holdHp) => {
  const input = observed(), known = costs();
  known.set("FLEX_POTION", { ...known.get("FLEX_POTION")!, holdHp, hp: holdHp, zero: holdHp === 0 ? "worthless" : null });
  expect(reference.silentPotionReference(state(), known, input.shown, input.rollout)).toEqual({});
});

function planned(frame = raw(), v1 = false) {
  const current = parseGameState(frame);
  const env: DecisionEnv = { state: current, knowledge, brief: buildRunBrief(current, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory(current.screen), shopDiscardPotions: [], ...(v1 ? { jevContext: "v1" } : {}) };
  return planCombatTurn(env);
}

it.each([false, true])("the real consumer shows unknown value with valid option keys and preserves choices and ranks (v1=%s)", (v1) => {
  const current = planned(raw(), v1);
  if (current?.kind !== "ask" || current.questions.plan?.type !== "choice") throw new Error("expected a plan question");
  const context = current.state.potion_context as Raw;
  expect(context.potion_value_reference.unknown_held_values[0]).toMatchObject({ potion: "FLEX_POTION", hold_hp: null });
  expect(context.potion_value_reference.no_potion_now.length).toBeGreaterThan(0);
  for (const option of context.potion_value_reference.options) expect(current.questions.plan.criteria).toHaveProperty(option.key);
  if (v1) expect((current.jevView!.state.potion_context as Raw).potion_value_reference).toEqual(context.potion_value_reference);
  vi.spyOn(reference, "silentPotionReference").mockReturnValue({});
  const old = planned(raw(), v1);
  if (old?.kind !== "ask") throw new Error("expected baseline question");
  expect(current.questions).toEqual(old.questions);
  expect(current.jevView?.questions).toEqual(old.jevView?.questions);
  const without = structuredClone(current.state);
  delete (without.potion_context as Raw).potion_value_reference;
  expect(without).toEqual(old.state);
});

it.each([["IRONCLAD", 10], ["SILENT", 9]])("%s A%s keeps the entire previous question", (character, ascension) => {
  const frame = raw(); frame.run.character_id = character; frame.run.ascension = ascension;
  const current = planned(frame);
  vi.spyOn(reference, "silentPotionReference").mockReturnValue({});
  expect(JSON.stringify(planned(frame))).toBe(JSON.stringify(current));
});

it("a disabled cost policy keeps the original consumer question", () => {
  potionCostOptions.enabled = false;
  const current = planned();
  if (current?.kind !== "ask") throw new Error("expected question");
  expect(current.state.potion_context).not.toHaveProperty("potion_value_reference");
});
