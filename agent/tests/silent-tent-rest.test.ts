/** LLYSRQQ35AVW A8: original rest boards, fixed data, no LLM or refreshed knowledge files. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planRest, restHealHere, silentTentRestFacts } from "../src/hand/screens/rest.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { restedHp } from "../src/sim/route-projection.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_tent_rest_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-tent-rest-evidence.json", import.meta.url), "utf8"));
beforeEach(() => vi.stubEnv("CHARACTER", "silent"));
afterEach(() => vi.unstubAllEnvs());

function board(name = "f24_0") {
  return structuredClone(fixture.states[name]);
}
function envOf(raw: ReturnType<typeof board>, oneshot = true): DecisionEnv {
  const state = parseGameState(raw);
  const knowledge = makeKnowledge({}, "cache");
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    combatPlanner: "turn", buildDecider: "deepseek", oneshot: oneshot ? "on" : "off",
    screenMemory: createScreenMemory("REST"), shopDiscardPotions: [] };
}
function question(raw: ReturnType<typeof board>, oneshot = true) {
  const decision = planRest(envOf(raw, oneshot)) as AskDecision;
  expect(decision.kind).toBe("ask");
  const facts = decision.state as Record<string, any>;
  return { decision, rest: facts.facts.rest_site, options: decision.questions.pick!.criteria! };
}
function direct(raw: ReturnType<typeof board>) {
  const env = envOf(raw);
  const option = raw.rest.options.find((option: any) => option.option_id === "HEAL");
  const heal = restHealHere(option?.description ?? "", raw.run.max_hp, raw.run.relics.map((relic: any) => relic.relic_id));
  const healed = restedHp(raw.run.current_hp, raw.run.max_hp, heal.rest, heal.base);
  return silentTentRestFacts(env.state, healed) as Record<string, any>;
}

it.each([["f24_0", "59/70"], ["f40_0", "69/70"]])("adds the conditional whole-visit HP to the real rest question for %s", (name, hp) => {
  const raw = board(name);
  const before = JSON.stringify(raw);
  for (const oneshot of [true, false]) {
    const { decision, rest, options } = question(raw, oneshot);
    expect(rest.tent_follow_up.available_now).toEqual([{ key: "o0", kind: "HEAL" }, { key: "o1", kind: "SMITH" }]);
    expect(rest.tent_follow_up.if_both_chosen.hp_after_heal_and_smith).toBe(hp);
    expect(rest.hp_after_heal).toBe(hp);
    expect(rest.tent_follow_up.if_both_chosen.hp_tied_orders).toEqual(["HEAL→SMITH", "SMITH→HEAL"]);
    expect(rest.tent_follow_up.single_action_scope).toContain("只计本次动作");
    expect(rest.tent_follow_up.source).toContain("silent-0159/0145/0146/0020");
    expect(Object.keys(options).some((key) => key.startsWith("o1"))).toBe(true);
    const heal = decision.resolve({ pick: { type: "choice", choice: "o0", reason: "fixed", confidence: 1 } });
    expect(heal.intent).toEqual({ action: "choose_rest_option", option_index: 0 });
  }
  expect(JSON.stringify(raw)).toBe(before);
});

it("F32 at full HP reports 70/70 rather than treating the displayed 21 as actual recovery", () => {
  const { rest } = question(board("f32_0"));
  expect(rest.tent_follow_up.if_both_chosen.hp_after_heal_and_smith).toBe("70/70");
  expect(rest.tent_follow_up.if_both_chosen.note).toContain("最大HP截断");
});

it("does not restore the consumed action on either observed return board", () => {
  for (const name of ["f24_1", "f40_1", "f32_1"]) {
    const raw = board(name);
    expect(direct(raw)).toEqual({});
    const decision = planRest(envOf(raw, false));
    expect(decision).toMatchObject({ kind: "act", intent: { action: "choose_rest_option", option_index: 0 } });
    expect(raw.rest.options).toHaveLength(1);
  }
});

it("keeps every original option, summary and action unchanged apart from the added run fact", () => {
  const raw = board();
  const withTent = question(raw, false);
  raw.run.relics = raw.run.relics.filter((relic: any) => relic.relic_id !== "MINIATURE_TENT");
  const withoutTent = question(raw, false);
  expect(withTent.options).toEqual(withoutTent.options);
  const { tent_follow_up, ...originalRest } = withTent.rest;
  expect(originalRest).toEqual(withoutTent.rest);
  expect(tent_follow_up).toBeDefined();
});

it("requires this character, an active tent and both indexed enabled actions", () => {
  const variants = [
    (raw: any) => { raw.run.character_id = "IRONCLAD"; },
    (raw: any) => { raw.run.relics = []; },
    (raw: any) => { raw.run.relics.find((r: any) => r.relic_id === "MINIATURE_TENT").is_melted = true; },
    (raw: any) => { raw.rest.options[0].is_enabled = false; },
    (raw: any) => { raw.rest.options[1].index = null; },
    (raw: any) => { raw.rest.options[1].index = -1; },
    (raw: any) => { raw.rest.options[1].index = 1.5; },
    (raw: any) => { raw.rest.options = []; },
  ];
  for (const change of variants) {
    const raw = board(); change(raw);
    expect(direct(raw)).toEqual({});
  }
  const other = board(); other.run.character_id = "IRONCLAD";
  expect(question(other, false).rest).not.toHaveProperty("tent_follow_up");
});

it("uses current option indices and keeps an unobserved extra rest action in the question", () => {
  const raw = board();
  raw.rest.options[0].index = 4; raw.rest.options[1].index = 7;
  raw.rest.options.push({ index: 9, option_id: "OTHER", title: "其他动作", description: "固定边界夹具", is_enabled: true });
  const { rest, options } = question(raw, false);
  expect(rest.tent_follow_up.available_now).toEqual([{ key: "o4", kind: "HEAL" }, { key: "o7", kind: "SMITH" }]);
  expect(Object.keys(options)).toEqual(["o4", "o7", "o9"]);
  expect(rest.tent_follow_up.observed).toContain("其他营火动作组合未验证");
});
