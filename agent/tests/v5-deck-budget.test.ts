import { afterEach, beforeEach, expect, it } from "vitest";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/memory/types.js";
import { budgetedState, deckBudget, deckBudgetFacts, deckBudgetProblem, SILENT_DECK_CONSTRAINT } from "../src/memory/run-constraints.js";
import { constructionState } from "../src/construction/adapter.js";
import { applyBuildAction } from "../src/construction/planner.js";
import { planDecision } from "../src/hand/screens/index.js";
import { baseState, testKnowledge } from "./scenarios.js";
import { knowledgeCharacter, setKnowledgeCharacter } from "../src/knowledge/files.js";
import { runConfigRow } from "../src/eye/run-config.js";
import { loadConfig } from "../src/core/config.js";

let previous: string;
beforeEach(() => { previous = knowledgeCharacter(); setKnowledgeCharacter("silent"); });
afterEach(() => setKnowledgeCharacter(previous));

function environment(size: number): DecisionEnv {
  const raw = baseState("REWARD", { run_id: "V5_UNBOUNDED", available_actions: ["choose_reward_card", "skip_reward_cards"],
    reward: { pending_card_choice: true, card_options: [{ index: 7, card_id: "ANGER", name: "Anger", upgraded: false }] } });
  const run = raw["run"] as Record<string, unknown>;
  Object.assign(run, { character_id: "SILENT", ascension: 10,
    deck: Array.from({ length: size }, (_, index) => ({ index, card_id: "STRIKE_R", name: "Strike", card_type: "Attack", upgraded: false, energy_cost: 1, resolved_rules_text: "Deal 6 damage." })) });
  const state = parseGameState(raw);
  return { state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), screenMemory: createScreenMemory("REWARD"),
    thresholds: { act: .6, strong: .8 }, runStart: "auto", characterPreference: "SILENT", allowFtueModals: false, strictJev: true,
    shopDiscardPotions: [], buildDecider: "deepseek" };
}

it.each([30, 31, 45])("keeps card choices available in V5 with %i permanent cards", (size) => {
  const env = environment(size);
  expect(SILENT_DECK_CONSTRAINT.active).toBe(false);
  expect(deckBudget(env.state)).toBeNull();
  expect(budgetedState(env.state)).toBe(env.state);
  expect(deckBudgetProblem(env.state, { action: "choose_reward_card", option_index: 7 })).toBeNull();
  const result = planDecision(env);
  expect(result.kind).toBe("decision");
  if (result.kind !== "decision" || result.decision.kind !== "ask") throw new Error("expected brain card question");
  const keys = result.decision.deepseek?.options?.().map((o) => o.key);
  expect(keys).toContain("card7"); expect(keys).toContain("skip");
  expect(deckBudgetFacts(env.state)).toMatchObject({ run_constraints: { id: "roy-20261013-v5-no-deck-cap", max_permanent_cards: null } });
});

it("removes the same hard limit from construction forecasts, while retaining spending checks", () => {
  const state = constructionState(environment(45));
  expect(state.cap).toBeNull();
  expect(applyBuildAction(state, { kind: "add", card: { id: "A", upgraded: false }, price: 0 })?.cards).toHaveLength(46);
  expect(applyBuildAction(state, { kind: "add", card: { id: "A", upgraded: false }, price: state.gold + 1 })).toBeNull();
});

it("does not turn unknown additions into a deck-cap rejection after the limit is retired", () => {
  const env = environment(45);
  env.state.raw["event"] = { options: [{ index: 0, description: "将若干卡牌加入你的牌组。" }] };
  expect(deckBudgetProblem(env.state, { action: "choose_event_option", option_index: 0 })).toBeNull();
});

it("records the removal in actual run configuration without adding constraints to other roles", () => {
  const opts = { config: loadConfig({ KNOWLEDGE_PREFIX: "off" }), brain: null, jevEnabled: false, mode: "shadow", env: {},
    code: { commit: "a".repeat(40), code: "aaaaaaa", dirty: false, dirty_files: [], branch: "fixture", worktree: "fixture" }, processStarted: "2026-01-01T00:00:00Z" };
  const run = { runId: "V5", ascension: 10, character: "SILENT", floor: 1 };
  const row = runConfigRow(opts, run, new Date("2026-01-01T00:00:01Z"));
  expect(row.operator_constraints).toMatchObject({ id: "roy-20261013-v5-no-deck-cap", max_permanent_cards: null });
  expect(runConfigRow(opts, { ...run, character: "REGENT" }, new Date("2026-01-01T00:00:01Z"))).not.toHaveProperty("operator_constraints");
});
