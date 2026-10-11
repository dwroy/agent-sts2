/** Fixed Silent A10 observations: 8JRE F33 T2, YF0L F48 T1, XP2S F33 T1/T3; silent-0079. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { planCombatTurn, slPointOf } from "../src/reflex/combat-plan.js";
import { rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { silentSelectionAudit } from "../src/reflex/silent-selection-audit.js";
import { replaySteps, solveTap, type Plan, type SolverInput } from "../src/reflex/turn-solver.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";

vi.hoisted(() => vi.resetModules());
vi.mock("node:fs", async (original) => {
  const fs = await original<typeof import("node:fs")>();
  const { KNOWLEDGE_DIR } = await import("../src/knowledge/files.js");
  const read = ((path: Parameters<typeof fs.readFileSync>[0], ...args: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(resolve(KNOWLEDGE_DIR) + "/")) {
      throw Object.assign(new Error("ENOENT: fixed selection evidence"), { code: "ENOENT" });
    }
    return (fs.readFileSync as (...args: unknown[]) => unknown)(path, ...args);
  }) as typeof fs.readFileSync;
  return { ...fs, readFileSync: read, default: { ...fs, readFileSync: read } };
});
vi.mock("../src/reflex/potion-cost.js", async (original) => ({
  ...await original<typeof import("../src/reflex/potion-cost.js")>(), potionCosts: () => new Map(),
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-selection-audit-state.json", import.meta.url), "utf8"));
const raw = fixture.state;
const cases = JSON.parse(readFileSync(new URL("./silent-selection-audit-cases.json", import.meta.url), "utf8"));
const knowledge = makeKnowledge({}, "cache");
const oldRollout = rolloutLiveOptions.enabled;
beforeEach(() => { setMonsterDbForTests({ monsters: {}, bosses: {}, encounters: {} }); rolloutLiveOptions.enabled = false; });
afterEach(() => { solveTap.onSolve = null; setMonsterDbForTests(null); rolloutLiveOptions.enabled = oldRollout; });

function envOf(character = "SILENT", ascension = 10, frame = raw): DecisionEnv {
  const payload = structuredClone(frame);
  payload.run.character_id = character;
  payload.run.ascension = ascension;
  const state = parseGameState(payload);
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [],
    sl: { attempt: 3, maxAttempts: 6, previousAttempts: {}, showSim: false, explore: {} } };
}
const answer = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;

function observedPlans(): [Plan, Plan] {
  let input: SolverInput | undefined;
  solveTap.onSolve = (value) => { input ??= value; };
  try { planCombatTurn(envOf()); } finally { solveTap.onSolve = null; }
  if (!input) throw new Error("fixed board was not solved");
  const fixed = input;
  const replay = (ids: string[]) => replaySteps(fixed, ids.map((id) => {
    const card = fixed.hand.find((entry) => entry.cardId === id)!;
    return { cardIndex: card.index, cardId: id, name: card.name, upgraded: card.upgraded, target: card.target === "single" ? 0 : null };
  }))!;
  return [replay(["FRANTIC_ESCAPE", "POISONED_STAB", "PIERCING_WAIL"]), replay(["FRANTIC_ESCAPE", "POISONED_STAB", "STRIKE_SILENT"])];
}

it("the recorded Sandworm pair separates 12 predicted HP from 7 damage and 0/24 from 5/24 deaths", () => {
  const [original, replacement] = observedPlans();
  expect(original.outcome).toMatchObject({ hpLoss: 3, damageDealt: 10 });
  expect(replacement.outcome).toMatchObject({ hpLoss: 15, damageDealt: 17 });
  const before = { text: "original", plan: original, rollout: { horizon: 5, samples: 24, deaths: 0, hpLoss: 47 } };
  const after = { text: "replacement", plan: replacement, rollout: { horizon: 5, samples: 24, deaths: 5, hpLoss: 47 } };
  const audit = silentSelectionAudit(envOf().state, 3, { answer: before, beforeSl: before, afterSl: after }, { action: "play_card", card_index: 0 });
  expect(audit).toMatchObject({ sl_delta: { hp_loss: 12, damage: 7 }, before_sl: { rollout: { deaths: 0, samples: 24 } },
    after_sl: { rollout: { deaths: 5, samples: 24 } }, execution_status: "pending_dispatch", actual_turn: null });
});

it.each(cases.filter((row: { source_line: number }) => row.source_line !== 270282))(
  "the frozen candidate pair at decision $source_line retains growth and does not claim actual damage",
  (row) => {
    const [base] = observedPlans();
    const model = (facts: typeof row.original): Plan => ({ ...base, outcome: { ...base.outcome,
      hpLoss: facts.hp_loss, damageDealt: facts.damage, blockGained: facts.block_gained, strengthGained: facts.strength_gained } });
    const original = { text: row.original.text, plan: model(row.original), rollout: row.original.rollout };
    const final = { text: row.replacement.text, plan: model(row.replacement), rollout: row.replacement.rollout };
    const audit = silentSelectionAudit(parseGameState(row.state), 3, { answer: null, beforeSl: original, afterSl: final }, null);
    expect(audit).toMatchObject({ run_id: row.run, scope: "predicted_candidates", sl_delta: {
      hp_loss: row.replacement.hp_loss - row.original.hp_loss, damage: row.replacement.damage - row.original.damage,
      strength_gained: row.replacement.strength_gained - row.original.strength_gained }, actual_turn: null });
  },
);

it("the real question resolution records the original, pre-SL and replacement with the requested first action", () => {
  const plain = planCombatTurn(envOf()) as AskDecision;
  expect(plain.kind).toBe("ask");
  const question = plain.questions["plan"];
  if (question?.type !== "choice") throw new Error("expected plan question");
  const key = Object.keys(question.criteria).find((k) => k.startsWith("plan"))!;
  const previous = plain.resolve(answer(key));
  const original = slPointOf(plain, previous)!.line;
  const env = envOf();
  env.sl!.explore!.deviate = { point: "T2", excluded: [original], attempts: [1] };
  const ask = planCombatTurn(env) as AskDecision;
  const resolved = ask.resolve(answer(key));
  const point = slPointOf(ask, resolved)!;
  expect(point.explored).toBe(true);
  expect(point.line).not.toBe(original);
  expect(resolved.log?.selection_audit).toMatchObject({
    before_sl: { line: original }, after_sl: { line: point.line },
    requested_action: { action: resolved.intent!.action, card_index: resolved.intent!.card_index ?? null },
    execution_status: "pending_dispatch", actual_turn: null,
  });
  resolved.apply?.();
  expect(env.screenMemory.combatPlan).not.toBeNull();
  expect(resolved.log?.selection_audit).toMatchObject({ execution_status: "pending_dispatch", actual_turn: null });
});

it("the original Jev answer stays separate when the HP guard replaces it before SL", () => {
  const env = envOf("SILENT", 10, fixture.guard_state);
  const ask = planCombatTurn(env) as AskDecision;
  const q = ask.questions["plan"];
  if (q?.type !== "choice") throw new Error("expected plan question");
  const guarded = Object.keys(q.criteria).map((key) => ask.resolve(answer(key))).find((r) => r.guard?.kind === "hp");
  expect(guarded).toBeDefined();
  const audit = guarded!.log!.selection_audit as { answer: { turn: { hp_loss: number } }; before_sl: { turn: { hp_loss: number } } };
  expect(audit.answer.turn.hp_loss).toBeGreaterThan(audit.before_sl.turn.hp_loss);
  expect(guarded!.log!.selection_audit).toMatchObject({ sl_delta: { hp_loss: 0, damage: 0 }, actual_turn: null });
});

it("other characters and unobserved ascensions have no audit fields", () => {
  for (const [character, ascension] of [["IRONCLAD", 10], ["SILENT", 9]] as const) {
    const env = envOf(character, ascension);
    const ask = planCombatTurn(env) as AskDecision;
    expect(ask.kind).toBe("ask");
    const q = ask.questions["plan"];
    if (q?.type !== "choice") throw new Error("expected plan question");
    const key = Object.keys(q.criteria).find((k) => k.startsWith("plan"))!;
    const resolved = ask.resolve(answer(key));
    expect(resolved.log?.selection_audit).toBeUndefined();
    expect(silentSelectionAudit(env.state, 3, { answer: null, beforeSl: null, afterSl: null }, null)).toBeNull();
  }
});

it("a missing plan, random-potion median and clock fallback retain their distinct uncertainty", () => {
  const [base] = observedPlans();
  const sampled = { text: "drink, then re-plan", plan: base, sampled: true, rollout: { horizon: 1, samples: 1, deaths: 1, hpLoss: 47 } };
  expect(silentSelectionAudit(envOf().state, null, { answer: { text: "unsimulated drink", plan: null }, beforeSl: sampled, afterSl: null }, null)).toMatchObject({
    answer: { outcome_kind: "unavailable", turn: null }, before_sl: { outcome_kind: "sampled_potion_median", rollout: { scope: "current_turn_and_clock", samples: null, deaths: null } },
    after_sl: null, sl_delta: null,
  });
});
