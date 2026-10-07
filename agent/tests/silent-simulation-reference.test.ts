/** VLZ6CCT8AQ0A F45 T1/T4: immutable observations and fixed computation, without a model or network call. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { setMoveModelForTests } from "../src/knowledge/move-model.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import type { PotionMc } from "../src/reflex/potion-mc.js";
import { rolloutLiveOptions, type LiveRollout } from "../src/reflex/rollout-live.js";
import * as reference from "../src/reflex/silent-simulation-reference.js";
import type { LineEstimate } from "../src/reflex/rollout.js";
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

const fixture = JSON.parse(readFileSync(new URL("./silent-simulation-reference-evidence.json", import.meta.url), "utf8"));
const state = () => parseGameState(structuredClone(fixture.boards["1"]));

function observed(index = 0) {
  const row = fixture.decisions[index];
  const shown = Object.entries(row.questions.plan.criteria as Record<string, string>).map(([key, value]) => {
    const facts = JSON.parse(value);
    const plan = { steps: [], score: 0, outcome: {
      hpLoss: facts.hp_lost ?? 0, damageDealt: facts.damage_dealt ?? 0,
      unknownCards: facts.unmodelled_cards ? [facts.unmodelled_cards] : [], cardsDrawn: key.startsWith("p") ? 2 : 0,
    } } as unknown as Plan;
    const match = String(facts.rollout).match(/dead within \d+ turns in (\d+)\/(\d+)/);
    const line = { plan, horizon: row.rollout.horizon, samples: row.rollout.samples,
      wins: 0, deaths: match ? Number(match[1]) : 0 } as LineEstimate;
    return { key, plan, line };
  });
  const best = shown.find(({ key }) => key === row.rollout.best)?.plan ?? null;
  const tied = shown.filter(({ key }) => (row.rollout.tied ?? []).includes(key)).map(({ plan }) => plan);
  const potions = (row.potions?.random ?? []).map((p: Record<string, unknown>) => ({
    source: { potionId: p.potion, slot: 0 }, samples: p.samples, requested: p.requested, ms: p.ms, degraded: p.degraded,
  })) as Pick<PotionMc, "source" | "samples" | "requested" | "ms" | "degraded">[];
  const rollout = { available: true, result: {
    horizon: row.rollout.horizon, samples: row.rollout.samples, degraded: row.rollout.degraded,
    lines: shown.map(({ line }) => line),
  }, byPlan: new Map(shown.map(({ plan, line }) => [plan, line])), best, tied,
    spentMs: row.timing.mc_ms, elapsedMs: row.rollout.ms } as LiveRollout & { available: true };
  return { row, shown, rollout, potions };
}

function facts(index = 0) {
  const board = observed(index);
  const result = reference.silentSimulationReference(state(), board.shown, board.rollout, board.potions);
  return { ...board, result, scope: result.simulation_reference as any };
}

it("distinguishes the observed 707-ms 1/12 potion sample and one-turn clock fallback from a tie", () => {
  const { scope, result } = facts();
  expect(scope.rollout).toMatchObject({ scope: "current_turn_and_clock", horizon: 1, samples: 1,
    elapsed_ms: 696, random_potion_shared_ms: 707, ranking: "not_compared", best: null, tied: [] });
  expect(scope.random_potions[0]).toMatchObject({ slot: 0, potion: "CURE_ALL", samples: 1, requested: 12,
    elapsed_ms: 707, degraded: true });
  expect(scope.options.find((o: any) => o.key === "plan1").unmodelled_cards).toEqual(["神化"]);
  expect(scope.options.every((o: any) => o.sampled_wins === null && o.sampled_deaths === null)).toBe(true);
  expect(scope.rollout.note).toContain("没有最佳线不等于选项并列");
  expect(result.note).not.toContain("exact");
});

it("keeps the later 12/12 potion result separate from a cut five-turn, three-sample rollout", () => {
  const { scope } = facts(1);
  expect(scope.rollout).toMatchObject({ scope: "sampled_horizon", horizon: 5, samples: 3,
    ranking: "best", best: "plan1", degraded: ["samples 4 per kill order", "samples 3 (clock)"] });
  expect(scope.random_potions[0]).toMatchObject({ samples: 12, requested: 12, elapsed_ms: 11, degraded: false });
  expect(scope.options.find((o: any) => o.key === "p0").draw_replan).toBe(true);
  expect(scope.random_potions[0].note).toContain("样本完成不等于整场胜率已验证");
});

it("retains T4's explicit three-way tie and its different immediate HP and damage costs", () => {
  const { scope, shown } = facts(2);
  expect(scope.rollout).toMatchObject({ horizon: 5, samples: 8, elapsed_ms: 387, degraded: [],
    ranking: "tied", best: null, tied: ["plan2", "plan3", "plan4"] });
  expect(shown.find((o) => o.key === "plan1")!.plan.outcome).toMatchObject({ hpLoss: 13, damageDealt: 24 });
  expect(shown.find((o) => o.key === "plan2")!.plan.outcome).toMatchObject({ hpLoss: 31, damageDealt: 32 });
  expect(scope.options.every((o: any) => o.sampled_deaths === 8 && o.sampled_wins === 0)).toBe(true);
  expect(scope.rollout.note).toContain("全败样本不证明实盘必败");
});

it("does not invent wins, deaths or a tie when a shown line or a rollout is missing", () => {
  const { shown, rollout } = observed(2);
  rollout.byPlan.delete(shown[0]!.plan);
  const missing = reference.silentSimulationReference(state(), shown, rollout, []).simulation_reference as any;
  expect(missing.options[0]).toMatchObject({ evaluated: false, samples: null, sampled_wins: null, sampled_deaths: null });
  for (const value of [null, { available: false, reason: "缺失转移", elapsedMs: 13 } as LiveRollout]) {
    const result = reference.silentSimulationReference(state(), shown, value, []).simulation_reference as any;
    expect(result.rollout).toMatchObject({ available: false, scope: "unavailable", ranking: "not_compared", tied: [] });
    expect(result.options.every((o: any) => !o.evaluated && o.sampled_deaths === null)).toBe(true);
  }
});

it("preserves the underlying tie when only one peer is shown and distinguishes an unshown best", () => {
  const { shown, rollout } = observed(2);
  const subset = shown.filter(({ key }) => key === "plan1" || key === "plan2");
  const tied = reference.silentSimulationReference(state(), subset, rollout, []).simulation_reference as any;
  expect(tied.rollout).toMatchObject({ ranking: "tied", tied: ["plan2"], tied_total: 3 });
  rollout.best = shown.find(({ key }) => key === "plan3")!.plan;
  rollout.tied = [];
  const outside = reference.silentSimulationReference(state(), subset, rollout, []).simulation_reference as any;
  expect(outside.rollout).toMatchObject({ ranking: "outside_shown", best: null, tied: [], tied_total: 0 });
});

it("keeps per-line sampling limits, including a one-turn line inside a longer overall rollout", () => {
  const { shown, rollout } = observed(2);
  shown[0]!.line.horizon = 1;
  shown[1]!.line.samples = 2;
  shown[1]!.line.deaths = 2;
  const result = reference.silentSimulationReference(state(), shown, rollout, []).simulation_reference as any;
  expect(result.options[0]).toMatchObject({ horizon: 1, sampled_wins: null, sampled_deaths: null });
  expect(result.options[1]).toMatchObject({ horizon: 5, samples: 2, sampled_deaths: 2 });
});

it("adds only facts without mutating plans, rankings, MC requests or the observed state", () => {
  const board = observed(2);
  const raw = state();
  const before = JSON.stringify([raw, board.shown, board.rollout.result, board.rollout.best, board.rollout.tied, board.potions]);
  reference.silentSimulationReference(raw, board.shown, board.rollout, board.potions);
  expect(JSON.stringify([raw, board.shown, board.rollout.result, board.rollout.best, board.rollout.tied, board.potions])).toBe(before);
});

it("does not annotate another character or a state without its character identity", () => {
  const board = observed();
  for (const character of ["IRONCLAD", ""]) {
    const raw = structuredClone(fixture.boards["1"]);
    raw.run.character_id = character;
    expect(reference.silentSimulationReference(parseGameState(raw), board.shown, board.rollout, board.potions)).toEqual({});
  }
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

function question(context: "off" | "v1", character = "SILENT") {
  const raw = structuredClone(fixture.boards["4"]);
  raw.run.character_id = character;
  const state = parseGameState(raw);
  const knowledge = makeKnowledge({ cards: [
    ...["STRIKE_SILENT", "POUNCE"].map((id) => ({ id, type: "Attack" })),
    { id: "PIERCING_WAIL", type: "Skill" }, { id: "ASCENDERS_BANE", type: "Curse" },
  ], monsters: raw.combat.enemies.map((e: any) => ({ id: e.enemy_id, type: "Elite" })) }, "cache");
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, jevContext: context,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [] };
  const decision = planCombatTurn(env);
  expect(decision?.kind).toBe("ask");
  return decision as AskDecision;
}

it.each(["off", "v1"] as const)("reaches the real Jev %s question and preserves every option and resolver", (context) => {
  const spy = vi.spyOn(reference, "silentSimulationReference").mockReturnValueOnce({});
  const baseline = question(context);
  spy.mockRestore();
  const updated = question(context);
  expect(updated.questions).toEqual(baseline.questions);
  const view = context === "v1" ? updated.jevView!.state : updated.state;
  expect(view.simulation_reference).toMatchObject({ rollout: { available: false, reason: "固定缺失转移" } });
  expect(view.note).not.toContain("exact");
  const { simulation_reference: _added, note: _changed, ...rest } = updated.state;
  const { note: _original, ...original } = baseline.state;
  expect(rest).toEqual(original);
  for (const key of Object.keys(updated.questions.plan!.criteria!)) {
    const answer = { plan: { type: "choice" as const, choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } };
    const { apply: newApply, ...newAction } = updated.resolve(answer);
    const { apply: oldApply, ...oldAction } = baseline.resolve(answer);
    expect(newAction).toEqual(oldAction);
    expect(typeof newApply).toBe(typeof oldApply);
  }
});

it("preserves the other character's original global note in the real question", () => {
  const updated = question("v1", "IRONCLAD");
  expect(updated.state).not.toHaveProperty("simulation_reference");
  expect(updated.jevView!.state).not.toHaveProperty("simulation_reference");
  expect(updated.state.note).toContain("exact for this turn");
});
