/** Fixed Silent A10 observations: candidate numbers and dispatched prefixes are separate evidence. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setMoveModelForTests } from "../src/knowledge/move-model.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn, slPointOf } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import * as comparison from "../src/reflex/silent-sl-comparison.js";
import type { Plan } from "../src/reflex/turn-solver.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import type { SlExploreEnv } from "../src/sl/explore.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_sl_comparison_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));
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

const fixtures = JSON.parse(readFileSync(new URL("./silent-sl-comparison-evidence.json", import.meta.url), "utf8"));
const pick = (choice: string) => ({ plan: { type: "choice" as const, choice, confidence: 1, probabilities: { [choice]: 1 }, raw: {} } });
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  setMoveModelForTests({});
  rolloutLiveOptions.enabled = false;
  bossLinesOptions.enabled = false;
});
afterEach(() => {
  vi.restoreAllMocks();
  setMonsterDbForTests(null);
  setMoveModelForTests(null);
  rolloutLiveOptions.enabled = true;
});

function logged(index: number) {
  const fixture = fixtures[index];
  const state = parseGameState(structuredClone(fixture.board));
  const criteria = Object.values(fixture.decision.questions.plan.criteria).map((value) => JSON.parse(value as string));
  const sl = fixture.decision.sl_explore;
  const from = (text: string, numbers: string) => {
    const facts = criteria.find((o) => o.plays.replaceAll(", then ", ", ") === text);
    if (!facts) throw new Error("logged candidate was not found");
    // Only fields consumed by the formatter; these are recorded predictions, not simulated outcomes.
    const plan = { steps: [], outcome: {
      hpLoss: facts.hp_lost ?? 0, hpAfter: facts.hp_after, damageDealt: facts.damage_dealt ?? 0,
      blockGained: facts.block_gained ?? 0, strengthGained: 0, sandpitAfter: null,
      enemyHpAfter: [], cardsDrawn: facts.cards_drawn ?? 0, unknownCards: [],
    } } as unknown as Plan;
    const match = numbers.match(/rollout dead (\d+)\/(\d+)/)!;
    return { plan, randomPotion: false, rollout: {
      horizon: fixture.decision.rollout.horizon, deaths: Number(match[1]), samples: Number(match[2]), wins: 0,
      hpLoss: Number(facts.rollout.match(/expected further HP loss (\d+)/)[1]),
    } };
  };
  return { state, original: from(sl.original, sl.numbers.original), replacement: from(sl.replacement, sl.numbers.replacement) };
}

it("records the observed 0/10 HP and 54/36 damage forecasts without claiming the actual 0/9 and 45/38", () => {
  const { state, original, replacement } = logged(0);
  const before = JSON.stringify([original, replacement]);
  const facts = comparison.silentSlComparison(state, original, replacement).candidate_comparison as any;
  expect(facts).toMatchObject({ scope: "candidate_forecast", actual_turn_result: null,
    original_stage: "after_guard_before_sl",
    original: { hp_loss: 0, damage: 54, block_gained: 28, cards_drawn: 1, replan_expected: true,
      rollout: { horizon: 5, samples: 24, sampled_deaths: 24 } },
    replacement: { hp_loss: 10, damage: 36, block_gained: 11 },
    delta_replacement_minus_original: { hp_loss: 10, damage: -18, block_gained: -17 },
  });
  expect(JSON.stringify([original, replacement])).toBe(before);
  expect(facts.note).toContain("不是实际损血");
});

it("retains the sandworm's unequal 0/24 versus 5/24 deaths and the crabs' 9/14 HP costs", () => {
  const a = logged(1);
  const sand = comparison.silentSlComparison(a.state, a.original, a.replacement).candidate_comparison as any;
  expect(sand.original.rollout.sampled_deaths).toBe(0);
  expect(sand.replacement.rollout.sampled_deaths).toBe(5);
  const b = logged(2);
  const crabs = comparison.silentSlComparison(b.state, b.original, b.replacement).candidate_comparison as any;
  expect(crabs.original).toMatchObject({ hp_loss: 9, damage: 24 });
  expect(crabs.replacement).toMatchObject({ hp_loss: 14, damage: 27 });
  expect(crabs.delta_replacement_minus_original).toMatchObject({ hp_loss: 5, damage: 3 });
});

it("does not invent samples for clock fallbacks or unavailable replay forecasts, or an unsimulated original", () => {
  const { state, original, replacement } = logged(0);
  original.rollout.horizon = 1;
  const facts = comparison.silentSlComparison(state, original, { ...replacement, rollout: undefined, randomPotion: true }).candidate_comparison as any;
  expect(facts.original.rollout).toMatchObject({ scope: "current_turn_and_clock", sampled_deaths: null, sampled_wins: null });
  expect(facts.replacement).toMatchObject({ basis: "random_potion_median", replan_expected: true, rollout: null });
  const missing = comparison.silentSlComparison(state, { plan: null, randomPotion: true }, replacement).candidate_comparison as any;
  expect(missing.original).toBeNull();
  expect(missing.delta_replacement_minus_original).toBeNull();
});

it("adds nothing for another character or an unobserved ascension", () => {
  const { original, replacement } = logged(0);
  for (const [character, ascension] of [["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11]]) {
    const raw = structuredClone(fixtures[0].board);
    raw.run.character_id = character; raw.run.ascension = ascension;
    expect(comparison.silentSlComparison(parseGameState(raw), original, replacement)).toEqual({});
  }
});

function question(explore: SlExploreEnv = {}) {
  const raw = structuredClone(fixtures[1].board);
  const state = parseGameState(raw);
  const cards = raw.run.deck.map((card: any) => ({ id: card.card_id, type: card.card_type }));
  const knowledge = makeKnowledge({ cards, monsters: [{ id: "THE_INSATIABLE", type: "Boss" }] }, "cache");
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [],
    sl: { attempt: 3, maxAttempts: 6, previousAttempts: [], showSim: false, explore } };
  const decision = planCombatTurn(env);
  expect(decision?.kind).toBe("ask");
  return { ask: decision as AskDecision, env };
}

it("logs the actual replay and deviation candidate pairs while preserving selection, intent and commitment", () => {
  const { ask: plain } = question();
  const options = (plain.questions.plan as any).criteria;
  const keys = Object.keys(options).filter((k) => k.startsWith("plan"));
  const originalKey = keys.find((k) => !plain.resolve(pick(k)).guard)!;
  const original = slPointOf(plain, plain.resolve(pick(originalKey)))!.line;
  const replacementKey = keys.find((k) => k !== originalKey && !plain.resolve(pick(k)).guard)!;
  const reference = slPointOf(plain, plain.resolve(pick(replacementKey)))!.line;
  expect(reference).not.toBe(original);
  for (const explore of [
    { replay: { line: reference, reference: 2, point: "T5" } },
    { deviate: { point: "T2", excluded: [original], attempts: [1, 2] } },
  ]) {
    const { ask, env } = question(explore);
    const out = ask.resolve(pick(originalKey));
    const log = out.log!.sl_explore as any;
    const pair = log.replay?.candidate_comparison ?? log.candidate_comparison;
    expect(pair).toMatchObject({ scope: "candidate_forecast", actual_turn_result: null });
    expect(pair.original.steps.length).toBeGreaterThan(0);
    expect(pair.replacement.steps.length).toBeGreaterThan(0);
    const spy = vi.spyOn(comparison, "silentSlComparison").mockReturnValue({});
    const baseline = question(explore);
    const old = baseline.ask.resolve(pick(originalKey));
    expect(out.intent).toEqual(old.intent);
    expect(out.rationale).toBe(old.rationale);
    expect(slPointOf(ask, out)).toEqual(slPointOf(baseline.ask, old));
    out.apply?.(); old.apply?.();
    expect(env.screenMemory.combatPlan).toEqual(baseline.env.screenMemory.combatPlan);
    spy.mockRestore();
  }
});
