import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import { silentHeldLossFacts } from "../src/reflex/silent-held-loss.js";
import * as heldLoss from "../src/reflex/silent-held-loss.js";
import { silentSelectionAudit } from "../src/reflex/silent-selection-audit.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { replaySteps, solveTap, type Plan, type SolverInput } from "../src/reflex/turn-solver.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__fixed_silent_held_loss__/${name}`,
}));
vi.mock("../src/knowledge/experience.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/experience.js")>(), selectLessons: () => [],
}));
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const evidence = JSON.parse(readFileSync(new URL("./silent-held-loss-evidence.json", import.meta.url), "utf8"));
const rawAt = (line: number) => structuredClone(evidence.find((r: { source: { line: number } }) => r.source.line === line).state);
const knowledge = makeKnowledge({}, "cache");
const oldRollout = rolloutLiveOptions.enabled, oldBoss = bossLinesOptions.enabled;
beforeEach(() => {
  setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} });
  rolloutLiveOptions.enabled = false; bossLinesOptions.enabled = false;
});
afterEach(() => {
  vi.restoreAllMocks();
  solveTap.onSolve = null; setMonsterDbForTests(null);
  rolloutLiveOptions.enabled = oldRollout; bossLinesOptions.enabled = oldBoss;
});

function observed(line: number, context: "off" | "v1" = "off") {
  const state = parseGameState(rawAt(line));
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("COMBAT"),
    shopDiscardPotions: [], jevContext: context };
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  let decision;
  try { decision = planCombatTurn(env); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("fixed board was not solved");
  const solver = input;
  const replay = (indices: number[]): Plan => {
    const result = replaySteps(solver, indices.map((index) => {
      const card = solver.hand.find((entry) => entry.index === index)!;
      return { cardIndex: index, cardId: card.cardId, name: card.name, upgraded: card.upgraded,
        target: card.target === "single" ? 0 : null };
    }));
    if (!result) throw new Error("fixed steps could not be replayed");
    return result;
  };
  return { state, decision, replay };
}

it("keeps 751 T7's two held Beckons conservative until the real discard, then recomputes one", () => {
  const pending = observed(278577), plan = pending.replay([1]);
  expect(plan.outcome.unknownCards).toContain("弃牌选择未确定");
  const before = JSON.stringify(plan);
  expect(silentHeldLossFacts(pending.state, plan)).toMatchObject({ held_loss_prediction: {
    held_hp_loss: 12, discard_choice_pending: true, actual_held_hp_loss: null,
  } });
  expect(JSON.stringify(plan)).toBe(before);
  const settled = observed(278580), end = settled.replay([]);
  expect(end.outcome.hpLoss).toBe(13);
  expect(silentHeldLossFacts(settled.state, end)).toMatchObject({ held_loss_prediction: {
    total_hp_loss: 13, held_hp_loss: 6, incoming_after_block: 7, discard_choice_pending: false,
  } });
  expect(rawAt(278580).run.current_hp - rawAt(278581).run.current_hp).toBe(13);
});

it("separates KEN T10's six held HP from the 15 versus 21 total prediction, without crediting a full turn", () => {
  const frame = observed(280588), original = frame.replay([0, 2, 3]), replacement = frame.replay([0, 2, 4]);
  expect(original.outcome.hpLoss).toBe(15);
  expect(replacement.outcome.hpLoss).toBe(21);
  expect(silentHeldLossFacts(frame.state, original)).toMatchObject({ held_loss_prediction: { held_hp_loss: 0 } });
  expect(silentHeldLossFacts(frame.state, replacement)).toMatchObject({ held_loss_prediction: { held_hp_loss: 6 } });
  const audit = silentSelectionAudit(frame.state, 5, {
    answer: { text: "original", plan: original }, beforeSl: { text: "original", plan: original },
    afterSl: { text: "replacement", plan: replacement },
  }, null);
  expect(audit).toMatchObject({ before_sl: { turn: { held_loss_prediction: { held_hp_loss: 0 } } },
    after_sl: { turn: { held_loss_prediction: { held_hp_loss: 6 } } }, actual_turn: null });
  const sampled: any = silentSelectionAudit(frame.state, null, { answer: null,
    beforeSl: { text: "random median", plan: replacement, sampled: true }, afterSl: null }, null);
  expect(sampled.before_sl.turn.held_loss_prediction).toBeUndefined();
});

it.each(["off", "v1"] as const)("the %s question and real resolution both carry the facts without deleting options", (context) => {
  const frame = observed(280588, context), ask = frame.decision as AskDecision;
  expect(ask.kind).toBe("ask");
  const q = ask.questions.plan!;
  const criteria = q.criteria!;
  const keys = Object.keys(criteria).filter((key) => key.startsWith("plan"));
  expect(keys.length).toBeGreaterThan(1);
  for (const key of keys) {
    expect(JSON.parse(criteria[key]!)).toHaveProperty("held_loss_prediction");
    const result = ask.resolve({ plan: { type: "choice", choice: key, confidence: 0.9, probabilities: { [key]: 1 }, raw: {} } });
    expect(result.log?.selection_audit).toMatchObject({ answer: { turn: {
      held_loss_prediction: { scope: "current_turn_model", actual_held_hp_loss: null },
    } } });
  }
  if (context === "v1") {
    const view = ask.jevView!.questions.plan!.criteria!;
    expect(Object.keys(view)).toEqual(Object.keys(criteria));
    for (const key of keys) expect(JSON.parse(view[key]!)).toHaveProperty("held_loss_prediction");
  }
});

it("adds no facts outside the observed character, ascension, room and enemy or without a Beckon", () => {
  const plan = observed(280588).replay([0, 2, 4]);
  for (const change of [
    (r: any) => { r.run.character_id = "IRONCLAD"; },
    (r: any) => { r.run.ascension = 9; },
    (r: any) => { r.run.floor = 33; },
    (r: any) => { r.combat.enemies[0].enemy_id = "UNOBSERVED_ENEMY"; },
    (r: any) => { r.combat.hand = r.combat.hand.filter((c: any) => c.card_id !== "BECKON"); },
  ]) {
    const raw = rawAt(280588); change(raw);
    expect(silentHeldLossFacts(parseGameState(raw), plan)).toEqual({});
  }
});

it.each(["off", "v1"] as const)("%s retains the same candidates, ranks and dispatched actions when the added facts are omitted", (context) => {
  const active = observed(280588, context).decision as AskDecision;
  vi.spyOn(heldLoss, "silentHeldLossFacts").mockReturnValue({});
  const baseline = observed(280588, context).decision as AskDecision;
  const strip = (criteria: Record<string, string | null>) => Object.fromEntries(Object.entries(criteria).map(([key, raw]) => {
    if (!raw || !key.startsWith("plan")) return [key, raw];
    const { held_loss_prediction: _added, ...rest } = JSON.parse(raw);
    return [key, rest];
  }));
  expect(strip(active.questions.plan!.criteria!)).toEqual(strip(baseline.questions.plan!.criteria!));
  if (context === "v1") expect(strip(active.jevView!.questions.plan!.criteria!))
    .toEqual(strip(baseline.jevView!.questions.plan!.criteria!));
  for (const key of Object.keys(active.questions.plan!.criteria!).filter((k) => k.startsWith("plan"))) {
    const answer = { plan: { type: "choice" as const, choice: key, confidence: 0.9, probabilities: { [key]: 1 }, raw: {} } };
    expect(active.resolve(answer).intent).toEqual(baseline.resolve(answer).intent);
  }
});
