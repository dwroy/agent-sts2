/** Fixed reward payloads: optional navigation, exact IDs, byte bound and original action contract. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planReward } from "../src/hand/screens/reward.js";
import { brainView, type PickOption } from "../src/hand/screens/pick.js";
import * as navigation from "../src/hand/screens/reward-external-stats.js";
import { externalStatsCardId } from "../src/hand/screens/reward-external-stats-ids.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { baseState } from "./scenarios.js";

vi.mock("../src/knowledge/files.js", async original => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__reward_external_stats_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async original => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));

beforeEach(() => { vi.stubEnv("CHARACTER", "silent"); vi.stubEnv("V6_BUILD", "off"); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function envOf(ids = ["SNAKEBITE", "BLADE_DANCE", "NOT_MAPPED"], indices = [4, 9, 2]): DecisionEnv {
  const raw = baseState("REWARD", {
    available_actions: ["choose_reward_card", "skip_reward_cards"],
    reward: { pending_card_choice: true, card_options: ids.map((id, i) => ({
      index: indices[i] ?? i, card_id: id, name: ["蛇咬", "刀刃之舞", "蛇咬"][i] ?? "未知牌", resolved_rules_text: "固定文本。",
    })) },
  });
  Object.assign(raw.run as Record<string, unknown>, { character_id: "SILENT", ascension: 10 });
  const state = parseGameState(raw), knowledge = makeKnowledge({}, "cache");
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    combatPlanner: "card", buildDecider: "deepseek", screenMemory: createScreenMemory("REWARD"), shopDiscardPotions: [] };
}
function question(env = envOf()) {
  const decision = planReward(env) as AskDecision;
  expect(decision.kind).toBe("ask"); expect(decision.label).toBe("reward/card");
  const q = decision.questions.pick!;
  if (q.type !== "choice") throw Error("expected choice");
  return { decision, q, options: Object.fromEntries(Object.entries(q.criteria).map(([key, text]) => [key, JSON.parse(text!)])) };
}
function disableNavigation() {
  return vi.spyOn(navigation, "rewardExternalStatsView").mockImplementation((_env, options) => ({ options, note: "" }));
}
function pickOptions(count: number): PickOption[] {
  return [...Array.from({ length: count }, (_, i): PickOption => ({ key: `card${i}`, summary: { card: "固定牌" },
    score: 0, intent: { action: "choose_reward_card", option_index: i } })),
  { key: "skip", summary: { card: "skip", note: "take no card" }, score: 0, intent: { action: "skip_reward_cards" } }];
}

it("adds exact mapped IDs and optional card/skip navigation without querying or inventing a skip ID", () => {
  const { q, options } = question();
  expect(options.card4.id).toBe("SNAKEBITE"); expect(options.card9.id).toBe("BLADE_DANCE");
  expect(options.card2).not.toHaveProperty("id"); expect(options.skip).not.toHaveProperty("id");
  expect(q.instructions).toContain(navigation.REWARD_EXTERNAL_STATS_NOTE);
  for (const word of ["若需", "可任选", "external_stats_card", "external_stats_skip", "Silent A10", "v0.111", "观察统计", "非因果", "分账"]) {
    expect(q.instructions).toContain(word);
  }
  expect(options.card4).not.toHaveProperty("external_stats");
  expect(JSON.stringify(options)).not.toContain("external:sts2fun");
});

it.each(["NOT_MAPPED", "ACTSFROMTHEPAST-PARASITE", "", "蛇咬", "SNAKEBITE+", "snakebite"])("omits only the ID for missing mapping %s", id => {
  const { options } = question(envOf([id, "BLADE_DANCE", "SNAKEBITE"]));
  expect(options.card4).not.toHaveProperty("id");
  expect(options.card9.id).toBe("BLADE_DANCE"); expect(options.card2.id).toBe("SNAKEBITE");
  expect(Object.keys(options)).toEqual(["card4", "card9", "card2", "skip"]);
  expect(externalStatsCardId(id)).toBeNull();
});

it("preserves all original facts, order, fallback and resolved take/skip actions", () => {
  const env = envOf(), beforeRaw = JSON.stringify(env.state.raw), hinted = question(env);
  disableNavigation(); const original = question(env);
  const withoutIds = Object.fromEntries(Object.entries(hinted.options).map(([key, option]) => {
    const { id: _id, ...rest } = option; return [key, rest];
  }));
  expect(withoutIds).toEqual(original.options);
  expect(hinted.q.instructions.replace(` ${navigation.REWARD_EXTERNAL_STATS_NOTE}`, "")).toBe(original.q.instructions);
  expect(hinted.decision.state).toEqual(original.decision.state);
  expect(JSON.stringify(hinted.decision.deepseek?.baseline)).toBe(JSON.stringify(original.decision.deepseek?.baseline));
  for (const [key, index] of [["card4", 4], ["card9", 9], ["card2", 2], ["skip", null]] as const) {
    const answer = { pick: { type: "choice" as const, choice: key, reason: "固定验证", confidence: 1 } };
    expect(hinted.decision.resolve(answer)).toEqual(original.decision.resolve(answer));
    expect(hinted.decision.resolve(answer).intent).toEqual(index === null
      ? { action: "skip_reward_cards" } : { action: "choose_reward_card", option_index: index });
  }
  const bytes = (q: typeof hinted.q) => Buffer.byteLength(JSON.stringify(q));
  expect(bytes(hinted.q) - bytes(original.q)).toBeGreaterThan(0);
  expect(bytes(hinted.q) - bytes(original.q)).toBeLessThanOrEqual(navigation.REWARD_EXTERNAL_STATS_MAX_BYTES);
  expect(JSON.stringify(env.state.raw)).toBe(beforeRaw);
});

it("bounds ID plus navigation bytes even on unusually large repeated offers", () => {
  const env = envOf(Array(100).fill("ALCHEMIZE"), Array.from({ length: 100 }, (_, i) => i));
  const original = pickOptions(100), before = JSON.stringify(original);
  const shown = navigation.rewardExternalStatsView(env, original);
  const bytes = (options: PickOption[], note: string) => Buffer.byteLength(JSON.stringify({ note, options: options.map(brainView) }));
  expect(bytes(shown.options, shown.note) - bytes(original, "")).toBeLessThanOrEqual(navigation.REWARD_EXTERNAL_STATS_MAX_BYTES);
  expect(shown.options[0]?.facts?.id).toBe("ALCHEMIZE");
  expect(shown.options.at(-2)?.facts?.id).toBeUndefined();
  expect(shown.options.map(o => o.key)).toEqual(original.map(o => o.key));
  expect(JSON.stringify(original)).toBe(before);
});

it.each(["IRONCLAD", "REGENT", "DEFECT"])("keeps %s reward requests byte-equivalent", character => {
  const env = envOf(); env.state.run!.raw.character_id = character;
  const actual = question(env); disableNavigation(); const original = question(env);
  expect(JSON.stringify(actual.decision)).toBe(JSON.stringify(original.decision));
});

it.each([9, 11])("keeps Silent A%s requests byte-equivalent", ascension => {
  const env = envOf(); env.state.run!.ascension = ascension;
  const actual = question(env); disableNavigation(); const original = question(env);
  expect(JSON.stringify(actual.decision)).toBe(JSON.stringify(original.decision));
});

it("keeps the Jev reward path and other screens outside the navigation helper", () => {
  const env = envOf(); env.buildDecider = "jev";
  const spy = vi.spyOn(navigation, "rewardExternalStatsView");
  planReward(env); expect(spy).not.toHaveBeenCalled();
  const options = pickOptions(3);
  for (const screen of ["SHOP", "MAP", "CARD_SELECTION", "EVENT"]) {
    env.state.screen = screen;
    expect(navigation.rewardExternalStatsView(env, options)).toEqual({ options, note: "" });
  }
});
