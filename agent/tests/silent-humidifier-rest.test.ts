/** UMVLWER4CD98 A10: fixed rest boards, no LLM, network or refreshed knowledge inputs. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planRest } from "../src/hand/screens/rest.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_humidifier_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));
vi.mock("../src/knowledge/card-upgrades.js", () => ({ cardUpgrade: () => null }));

const fixture = JSON.parse(readFileSync(new URL("./silent-humidifier-rest-evidence.json", import.meta.url), "utf8"));
beforeEach(() => vi.stubEnv("CHARACTER", "silent"));
afterEach(() => vi.unstubAllEnvs());

function board(floor = 44) {
  return structuredClone(fixture.boards[String(floor)]);
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
  const rest = (decision.state as Record<string, any>).facts.rest_site;
  return { decision, rest, reference: rest.humidifier_rest_growth,
    options: decision.questions.pick!.criteria! };
}

it.each([
  [7, 75, 75, 18, 23], [9, 80, 80, 21, 26], [16, 81, 90, 25, 30],
  [44, 82, 115, 33, 38], [47, 70, 120, 34, 39],
])("exposes capped recovery and growth in the real rest question at F%s", (floor, hp, max, recovery, gain) => {
  const raw = board(floor);
  const before = JSON.stringify(raw);
  for (const oneshot of [true, false]) {
    const { decision, rest, reference, options } = question(raw, oneshot);
    expect(reference.source).toContain("UMVLWER4CD98");
    expect(reference.source).toContain("silent-0215/0204/0020");
    expect(reference.actions[0]).toMatchObject({ key: "o0", kind: "HEAL", after_action_hp_reference: hp,
      after_action_max_hp_reference: max, ordinary_hp_recovered_reference: recovery,
      growth_hp_reference: 5, total_hp_gain_reference: gain });
    expect(reference.actions[1]).toMatchObject({ key: "o1", kind: "SMITH", after_action_hp_reference: raw.run.current_hp,
      after_action_max_hp_reference: raw.run.max_hp, ordinary_hp_recovered_reference: 0,
      growth_hp_reference: 0, total_hp_gain_reference: 0 });
    expect(rest.hp_after_heal).toBe(`${hp}/${max}`);
    expect(reference.max_hp_tied_option_groups).toEqual([]);
    expect(Object.keys(options).some((key) => key.startsWith("o1"))).toBe(true);
    expect(decision.resolve({ pick: { type: "choice", choice: "o0", reason: "fixed", confidence: 1 } }).intent)
      .toEqual({ action: "choose_rest_option", option_index: 0 });
  }
  expect(JSON.stringify(raw)).toBe(before);
});

it("does not credit F9's executed smith with the hypothetical heal's growth", () => {
  const { decision, reference } = question(board(9), false);
  const observed = fixture.observations.find((row: any) => row.floor === 9);
  expect(reference.actions[1]).toMatchObject({ after_action_hp_reference: observed.next.hp,
    after_action_max_hp_reference: observed.next.max, total_hp_gain_reference: 0 });
  expect(decision.resolve({ pick: { type: "choice", choice: "o1", reason: "fixed", confidence: 1 } }).intent)
    .toEqual({ action: "choose_rest_option", option_index: 1 });
  expect(reference.trigger).toContain("进入营火本身不算增长");
  expect(reference.limits).toContain("六次boss仍全败");
});

it("keeps original options, facts and actions equal to the board without this active relic", () => {
  const raw = board();
  const active = question(raw, false);
  raw.run.relics.find((r: any) => r.relic_id === "STONE_HUMIDIFIER").is_melted = true;
  const melted = question(raw, false);
  expect(active.options).toEqual(melted.options);
  const { humidifier_rest_growth, ...original } = active.rest;
  expect(original).toEqual(melted.rest);
  expect(melted.rest).not.toHaveProperty("humidifier_rest_growth");
  expect(humidifier_rest_growth).toBeDefined();
  expect(active.decision.resolve({ pick: { type: "choice", choice: "o1", reason: "fixed", confidence: 1 } }).intent)
    .toEqual(melted.decision.resolve({ pick: { type: "choice", choice: "o1", reason: "fixed", confidence: 1 } }).intent);
});

it("uses current keys, marks only equal max HP and retains unobserved actions with unknown references", () => {
  const raw = board();
  raw.rest.options[0].index = 4; raw.rest.options[1].index = 7;
  raw.rest.options.push({ ...raw.rest.options[1], index: 8 });
  raw.rest.options.push({ index: 9, option_id: "OTHER", title: "其他动作", description: "固定未知动作", is_enabled: true });
  const { reference, options } = question(raw, false);
  expect(Object.keys(options)).toEqual(["o4", "o7", "o8", "o9"]);
  expect(reference.max_hp_tied_option_groups).toEqual([["o7", "o8"]]);
  expect(reference.actions[3]).toMatchObject({ key: "o9", after_action_hp_reference: null,
    after_action_max_hp_reference: null, ordinary_hp_recovered_reference: null,
    growth_hp_reference: null, total_hp_gain_reference: null });
  expect(reference.reference_scope).toContain("相同最大HP只在该指标并列");
});

it("omits disabled and invalid keys from the reference without changing offered actions", () => {
  const raw = board();
  raw.rest.options.push({ ...raw.rest.options[1], index: 2, is_enabled: false });
  raw.rest.options.push({ ...raw.rest.options[1], index: -1 });
  raw.rest.options.push({ ...raw.rest.options[1], index: 2.5 });
  const { reference } = question(raw, false);
  expect(reference.actions.map((a: any) => a.key)).toEqual(["o0", "o1"]);
});

it("leaves other characters, missing or melted relics, invalid HP and unobserved heal combinations alone", () => {
  const changes = [
    (raw: any) => { raw.run.character_id = "IRONCLAD"; },
    (raw: any) => { raw.run.relics = []; },
    (raw: any) => { raw.run.relics.find((r: any) => r.relic_id === "STONE_HUMIDIFIER").is_melted = true; },
    (raw: any) => { raw.run.current_hp = 0; },
    (raw: any) => { raw.run.current_hp = 111; },
    (raw: any) => { raw.run.current_hp = 44.5; },
    (raw: any) => { raw.run.max_hp = null; },
    (raw: any) => { raw.rest.options[0].description += "\n额外回复来源提供+15点生命。"; },
  ];
  for (const change of changes) {
    const raw = board(); change(raw);
    expect(question(raw, false).rest).not.toHaveProperty("humidifier_rest_growth");
  }
});
