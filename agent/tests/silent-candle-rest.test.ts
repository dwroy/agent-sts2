/** Fixed SILENT A10 boards: observed refuelling and spent charges, without LLM or live knowledge files. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { planRest, silentCandleRestFacts } from "../src/hand/screens/rest.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_candle_rest_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-candle-rest-evidence.json", import.meta.url), "utf8"));
beforeEach(() => vi.stubEnv("CHARACTER", "silent"));
afterEach(() => vi.unstubAllEnvs());

function board(name = "XBD8Z9XLPCPN_f32_3") {
  return structuredClone(fixture.states[name]);
}
function envOf(raw: ReturnType<typeof board>, oneshot = false): DecisionEnv {
  const state = parseGameState(raw);
  const knowledge = makeKnowledge({}, "cache");
  return { state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: loadConfig({}).thresholds,
    runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    combatPlanner: "turn", buildDecider: "deepseek", oneshot: oneshot ? "on" : "off",
    screenMemory: createScreenMemory("REST"), shopDiscardPotions: [] };
}
function question(raw: ReturnType<typeof board>, oneshot = false) {
  const decision = planRest(envOf(raw, oneshot)) as AskDecision;
  expect(decision.kind).toBe("ask");
  return { decision, rest: (decision.state as Record<string, any>).facts.rest_site,
    options: decision.questions.pick!.criteria! };
}

it.each([true, false])("shows extinguished refuelling on the real rest question (oneshot=%s)", (oneshot) => {
  const raw = board();
  const before = JSON.stringify(raw);
  const { decision, rest, options } = question(raw, oneshot);
  expect(rest.hp_after_heal).toBe("23/70");
  expect(rest.candle_refuel.current_charges).toBe(0);
  expect(rest.candle_refuel.actions).toEqual([
    { key: "o0", kind: "HEAL", charges_after_action_reference: 0 },
    { key: "o1", kind: "SMITH", charges_after_action_reference: 0 },
    { key: "o2", kind: "KINDLE", charges_after_action_reference: 5 },
  ]);
  expect(rest.candle_refuel.charge_tied_option_groups).toEqual([["o0", "o1"]]);
  expect(rest.candle_refuel.simulation_scope).toContain("没有模拟KINDLE");
  expect(rest.candle_refuel.limits).toContain("没有添火后的受控胜负");
  expect(Object.keys(options).some((key) => key.startsWith("o1"))).toBe(true);
  for (const key of ["o0", "o2"]) {
    expect(decision.resolve({ pick: { type: "choice", choice: key, reason: "固定验证", confidence: 1 } }).intent)
      .toEqual({ action: "choose_rest_option", option_index: Number(key.slice(1)) });
  }
  expect(JSON.stringify(raw)).toBe(before);
});

it("keeps the executed UJ F29 0-to-5 observation separate from its HP and other energy relics", () => {
  const { rest } = question(board("UJ0K3G10609Y_f29_3"));
  expect(rest.candle_refuel.current_charges).toBe(0);
  expect(rest.candle_refuel.observed).toContain("77血不变");
  expect(rest.candle_refuel.source).toContain("silent-0186/0184/0185/0020");
  expect(fixture.observations.filter((r: any) => r.run === "UJ0K3G10609Y" && r.floor === 29)
    .map((r: any) => [r.candle.stack, r.hp])).toEqual([[0, 77], [5, 77], [5, 77]]);
  expect(silentCandleRestFacts(envOf(board("UJ0K3G10609Y_f29_0")).state)).toEqual({});
});

it("does not extrapolate positive-charge refuelling from the extinguished observation", () => {
  for (const [name, charges] of [["XBD8Z9XLPCPN_f24_3", 3], ["XBD8Z9XLPCPN_f28_3", 2]] as const) {
    const { rest } = question(board(name));
    expect(rest.candle_refuel.current_charges).toBe(charges);
    expect(rest.candle_refuel.actions.map((a: any) => a.charges_after_action_reference)).toEqual([charges, charges, null]);
    expect(rest.candle_refuel.charge_tied_option_groups).toEqual([["o0", "o1"]]);
  }
});

it("keeps missing or invalid charges unknown and does not invent refuelling results", () => {
  for (const stack of [null, undefined, -1, 1.5, "0", NaN]) {
    const raw = board(); raw.run.relics[0].stack = stack;
    const { rest } = question(raw);
    expect(rest.candle_refuel.current_charges).toBeNull();
    expect(rest.candle_refuel.actions.map((a: any) => a.charges_after_action_reference)).toEqual([null, null, null]);
    expect(rest.candle_refuel.charge_tied_option_groups).toEqual([]);
  }
  const raw = board(); raw.run.relics[0].stack = 6;
  const { rest } = question(raw);
  expect(rest.candle_refuel.current_charges).toBe(6);
  expect(rest.candle_refuel.actions.map((a: any) => a.charges_after_action_reference)).toEqual([null, null, null]);
});

it("preserves options, summaries, HP facts and actions with the added fact removed", () => {
  const raw = board();
  const present = question(raw);
  raw.run.relics = [];
  const absent = question(raw);
  expect(present.options).toEqual(absent.options);
  const { candle_refuel, ...original } = present.rest;
  expect(original).toEqual(absent.rest);
  expect(candle_refuel).toBeDefined();
});

it("requires this character, an active candle and an available valid KINDLE action", () => {
  const changes = [
    (raw: any) => { raw.run.character_id = "IRONCLAD"; },
    (raw: any) => { raw.run.relics = []; },
    (raw: any) => { raw.run.relics[0].is_melted = true; },
    (raw: any) => { raw.rest.options[2].is_enabled = false; },
    (raw: any) => { raw.rest.options[2].index = null; },
    (raw: any) => { raw.rest.options[2].index = -1; },
    (raw: any) => { raw.rest.options[2].index = 1.5; },
    (raw: any) => { raw.rest.options[2].option_id = "OTHER"; },
  ];
  for (const change of changes) {
    const raw = board(); change(raw);
    expect(silentCandleRestFacts(envOf(raw).state)).toEqual({});
    expect(question(raw).rest).not.toHaveProperty("candle_refuel");
  }
});

it("uses current indices and retains an unobserved extra action with unknown reference", () => {
  const raw = board();
  raw.rest.options[0].index = 4; raw.rest.options[1].index = 7; raw.rest.options[2].index = 8;
  raw.rest.options.push({ index: 9, option_id: "OTHER", title: "其他动作", description: "固定边界夹具", is_enabled: true });
  const { rest, options } = question(raw);
  expect(Object.keys(options)).toEqual(["o4", "o7", "o8", "o9"]);
  expect(rest.candle_refuel.charge_tied_option_groups).toEqual([["o4", "o7"]]);
  expect(rest.candle_refuel.actions.at(-1)).toEqual({ key: "o9", kind: "OTHER", charges_after_action_reference: null });
});
