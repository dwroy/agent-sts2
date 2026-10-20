import { afterEach, expect, it, vi } from "vitest";
import { constructionQuestion } from "../src/v6/construction-safety.js";
import type { AskDecision } from "../src/memory/types.js";
import { board, decide, env, FakeDeepSeek, play, setupOneshotTests, type Raw } from "./oneshot-support.js";

setupOneshotTests();
afterEach(() => vi.unstubAllEnvs());

function selection(task: "add" | "choose"): Raw {
  const raw = board("xljq-f5-reward", "reward");
  const cards = (raw.reward as Raw).card_options;
  raw.screen = "CARD_SELECTION";
  raw.in_combat = false;
  raw.available_actions = ["select_deck_card"];
  raw.reward = null;
  raw.selection = { kind: task === "add" ? "deck_card_select" : "choose_card_select",
    prompt: task === "add" ? "Choose a card to add to your deck." : "Choose a card.",
    min_select: 1, max_select: 1, selected_count: 0, can_confirm: false, cards };
  return raw;
}

it.each(["reward/card", "selection/add", "selection/choose"])("does not treat an unmarked %s as a V6 card question", label => {
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "jev");
  const e = env(board("xljq-f5-reward", "reward"));
  const decision = { kind: "ask", label, state: {},
    questions: { pick: { type: "choice", criteria: { card0: "a", card1: "b" } } } } as unknown as AskDecision;
  const before = JSON.stringify(e.screenMemory);
  expect(constructionQuestion(e, decision)).toBeNull();
  expect(JSON.stringify(e.screenMemory)).toBe(before);
});

it.each(["add", "choose"] as const)("keeps noncombat selection/%s on the original V5 brain path without a V6 handover", async task => {
  vi.stubEnv("V6_BUILD", "on"); vi.stubEnv("V6_CARD_DECIDER", "brain");
  const raw = selection(task), original = JSON.stringify(decide(env(raw)));
  const originalBrain = new FakeDeepSeek(() => "card0");
  const baseline = await play([raw], originalBrain, { buildOneshot: "off", buildDecider: "deepseek" }, { maxDecisions: 1 });
  const originalCall = originalBrain.calls.filter(call => call.label === `selection/${task}`);
  expect(originalCall).toHaveLength(1);
  vi.stubEnv("V6_CARD_DECIDER", "jev");
  expect(JSON.stringify(decide(env(raw)))).toBe(original);
  const brain = new FakeDeepSeek(() => "card0"), ask = vi.fn(async () => { throw Error("noncombat selection reached Jev"); });
  const evaluateCard = vi.fn();
  const actual = await play([raw], brain, { buildOneshot: "off", buildDecider: "deepseek" }, {
    maxDecisions: 1, jev: { model: "fixture", ask } as never, v6Projection: { evaluateCard } as never,
  });
  expect(actual.actions).toEqual([{ action: "select_deck_card", option_index: 0 }]);
  expect(actual.actions).toEqual(baseline.actions);
  expect(brain.calls.filter(call => call.label === `selection/${task}`)).toEqual(originalCall);
  expect(actual.notes.filter(note => note.includes("v6_unknown_to_brain"))).toEqual([]);
  expect(ask).not.toHaveBeenCalled();
  expect(evaluateCard).not.toHaveBeenCalled();
});
