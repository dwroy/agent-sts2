import { afterEach, beforeEach, expect, it, vi } from "vitest";
import evidence from "./silent-hp-guard-audit-evidence.json";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setMoveModelForTests } from "../src/knowledge/move-model.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import * as audit from "../src/reflex/silent-hp-guard-audit.js";
import { rolloutLiveOptions, type LiveRollout } from "../src/reflex/rollout-live.js";
import type { Plan } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";

vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/knowledge/jev-hints.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/jev-hints.js")>(), selectHints: () => [],
}));
vi.mock("../src/reflex/jev-experience.js", async (original) => ({
  ...await original<typeof import("../src/reflex/jev-experience.js")>(), jevExperience: () => ({}),
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));
vi.mock("../src/reflex/rollout-live.js", async (original) => ({
  ...await original<typeof import("../src/reflex/rollout-live.js")>(),
  liveRollout: () => ({ available: false, reason: "固定缺失转移", elapsedMs: 0 }),
}));

const state = () => parseGameState(structuredClone(evidence.board));
function observed(facts: { hp_lost: number; damage_dealt: number }) {
  return { steps: [], score: 0, outcome: { hpLoss: facts.hp_lost, damageDealt: facts.damage_dealt,
    strengthGained: 0, sandpitAfter: 4, unknownCards: [], enemyHpAfter: [] } } as unknown as Plan;
}

it("keeps F33 T5's predicted 12 HP saved and 18 damage forgone separate from actual outcomes", () => {
  const before = observed(evidence.guard.plan4), after = observed(evidence.guard.plan6);
  const inputs = JSON.stringify([before, after]);
  const value = audit.silentHpGuardAudit(state(), before, before, after, 8, null);
  expect(value).toMatchObject({ scope: "candidate_predictions_before_sl", slack: 8,
    predicted_hp_saved: 12, predicted_damage_change: -18, actual_outcome: null,
    before_guard: { hp_lost: 16, damage_dealt: 43, rollout: null },
    after_guard: { hp_lost: 4, damage_dealt: 25, rollout: null } });
  expect(JSON.stringify([before, after])).toBe(inputs);
});

it("does not turn capped expected HP loss into a tie between zero and five deaths in 24 samples", () => {
  const before = observed(evidence.sl.plan1), after = observed(evidence.sl.plan2);
  const rollout = { available: true, byPlan: new Map([
    [before, { horizon: 5, samples: 24, deaths: 0, wins: 0, hpLoss: 47 }],
    [after, { horizon: 5, samples: 24, deaths: 5, wins: 0, hpLoss: 47 }],
  ]) } as unknown as LiveRollout;
  expect(audit.silentHpGuardAudit(state(), before, before, after, 8, rollout)).toMatchObject({
    before_guard: { rollout: { samples: 24, deaths: 0, expected_hp_loss: 47 } },
    after_guard: { rollout: { samples: 24, deaths: 5, expected_hp_loss: 47 } },
    predicted_hp_saved: -12, predicted_damage_change: 7, actual_outcome: null,
  });
});

it("does not add diagnostics outside observed Silent A10 or when no guard replacement occurred", () => {
  const before = observed(evidence.guard.plan4), after = observed(evidence.guard.plan6);
  const raw = structuredClone(evidence.board);
  for (const character of ["IRONCLAD", ""]) {
    raw.run.character_id = character;
    expect(audit.silentHpGuardAudit(parseGameState(raw), before, before, after, 8, null)).toBeNull();
  }
  raw.run.character_id = "SILENT";
  raw.run.ascension = 9;
  expect(audit.silentHpGuardAudit(parseGameState(raw), before, before, after, 8, null)).toBeNull();
  expect(audit.silentHpGuardAudit(state(), before, before, before, 8, null)).toBeNull();
});

beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  setMoveModelForTests({});
  rolloutLiveOptions.enabled = true;
  bossLinesOptions.enabled = false;
  vi.spyOn(Date, "now").mockReturnValue(1000);
});
afterEach(() => {
  vi.restoreAllMocks();
  setMonsterDbForTests(null);
  setMoveModelForTests(null);
  bossLinesOptions.enabled = true;
});

function question(character = "SILENT") {
  const raw = structuredClone(evidence.board);
  raw.run.character_id = character;
  const parsed = parseGameState(raw);
  const knowledge = makeKnowledge({ cards: raw.run.deck.map((card) => ({
    id: card.card_id, name: card.name, type: card.card_type,
  })), monsters: raw.combat.enemies.map((enemy) => ({ id: enemy.enemy_id, type: "Boss" })) }, "cache");
  const env: DecisionEnv = { state: parsed, knowledge, brief: buildRunBrief(parsed, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, jevContext: "off",
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  const decision = planCombatTurn(env);
  expect(decision?.kind).toBe("ask");
  return decision as AskDecision;
}

it("reaches the production resolver and logs a guard substitution without changing any choice or action", () => {
  const spy = vi.spyOn(audit, "silentHpGuardAudit").mockReturnValue(null);
  const baseline = question();
  const answerFor = (key: string) => ({ plan: { type: "choice" as const, choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } });
  const oldActions = new Map(Object.keys(baseline.questions.plan!.criteria!).map((key) => [key, baseline.resolve(answerFor(key))]));
  spy.mockRestore();
  const updated = question();
  expect(updated.questions).toEqual(baseline.questions);
  let guarded = 0;
  for (const key of Object.keys(updated.questions.plan!.criteria!)) {
    const old = oldActions.get(key)!;
    const value = updated.resolve(answerFor(key));
    expect(value.intent).toEqual(old.intent);
    expect(value.guard).toEqual(old.guard);
    expect(value.rationale).toEqual(old.rationale);
    if (value.guard) {
      guarded++;
      expect(value.log?.hp_guard).toMatchObject({ scope: "candidate_predictions_before_sl", actual_outcome: null });
    } else expect(value.log?.hp_guard).toBeUndefined();
  }
  expect(guarded).toBeGreaterThan(0);
});

it("keeps the other character's production choices and decision logs equivalent", () => {
  const spy = vi.spyOn(audit, "silentHpGuardAudit").mockReturnValue(null);
  const baseline = question("IRONCLAD");
  const answerFor = (key: string) => ({ plan: { type: "choice" as const, choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } });
  const oldActions = new Map(Object.keys(baseline.questions.plan!.criteria!).map((key) => [key, baseline.resolve(answerFor(key))]));
  spy.mockRestore();
  const updated = question("IRONCLAD");
  expect(updated.questions).toEqual(baseline.questions);
  for (const key of Object.keys(updated.questions.plan!.criteria!)) {
    const { apply: _oldApply, ...old } = oldActions.get(key)!;
    const { apply: _newApply, ...value } = updated.resolve(answerFor(key));
    expect(value).toEqual(old);
    expect(value.log?.hp_guard).toBeUndefined();
  }
});
