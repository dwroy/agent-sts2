/** 2L1BNN9ZJEFU F9 and 2PVLGRBGUX9S F16: fixed rest boards and logged simulation values. */
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import type { JsonValue } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import { compareOptions, type CompareResult, type OptionSim } from "../src/sim/build-sim.js";
import { silentBuildWinTies } from "../src/sim/silent-build-win-ties.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_build_ties_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));
vi.mock("../src/sim/build-sim.js", async (original) => ({
  ...await original<typeof import("../src/sim/build-sim.js")>(), compareOptions: vi.fn(),
}));
vi.mock("../src/sim/boss-start.js", async (original) => ({
  ...await original<typeof import("../src/sim/boss-start.js")>(),
  // The simulator's output is fixed input here; neither a rollout nor generated knowledge is consulted.
  syntheticBossStart: (_state: unknown, _knowledge: unknown, _boss: string, hp: number) => ({
    entryHp: hp, maxHp: 73,
    boss: { name: "瀑布巨兽", asc: 6, exact: true, parts: [{ name: "瀑布巨兽", hp: 240 }] },
    input: { solver: { player: { hp, maxHp: 73 } }, piles: { draw: [], discard: [], exhaust: [] } },
    relics: { applied: [], unmodelled: [] },
  }),
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-build-ties-evidence.json", import.meta.url), "utf8"));
function loggedSim(key: string, row: Record<string, number | null>, samples: number): OptionSim {
  return { key, samples, win: row.win!, winCal: row.win_cal!,
    diff: { raw: row.diff_raw ?? 0, se: row.se_raw ?? 0, cal: row.diff_cal ?? 0, calSe: row.se_cal ?? 0,
      hpLoss: 0, hpLossSe: 0, bossLeft: row.boss_left_diff ?? 0, bossLeftSe: row.boss_left_se ?? 0 },
    bossLeft: row.boss_left!, hpLossMean: 0, hpLossWon: row.hp_loss_won ?? null,
    turns: row.turns ?? null, deathTurn: null, order: null, hp: row.hp ?? 66 };
}
const observed = fixture.observations[0].boss_sim;
const options = Object.entries(observed.options).map(([key, row]) => loggedSim(key, row as Record<string, number | null>, observed.samples));
const result: CompareResult = { base: loggedSim("base", observed.base, observed.samples), options,
  samples: observed.samples, requested: 1000, timedOut: true, elapsedMs: 11_000, workers: 0, orders: 1, order: null };
afterEach(() => vi.clearAllMocks());

it("marks all nine observed exact win-rate ties while preserving their different HP and turns", () => {
  const before = JSON.stringify(options);
  const ties = silentBuildWinTies("SILENT", options);
  expect(ties.size).toBe(9);
  expect(ties.get("o0")?.boss_sim_win_tied_with).toEqual(options.slice(1).map((option) => option.key));
  expect(ties.get("o1:c1")?.boss_sim_win_tie_note).toContain("胜率指标并列");
  expect(ties.get("o1:c1")?.boss_sim_win_tie_note).toContain("不代表整局价值相同");
  expect([options[0]!.bossLeft, options[1]!.bossLeft]).toEqual([227.3856, 223.6316]);
  expect([options[0]!.turns, options[1]!.turns]).toEqual([30, 27]);
  expect(JSON.stringify(options)).toBe(before);
});

it("does not confuse equal rounded percentages or a calibration floor with exact win-rate ties", () => {
  const other = fixture.observations[1].boss_sim;
  const defense = loggedSim("o1:c5", other.options["o1:c5"], other.samples);
  const stab = loggedSim("o1:c14", other.options["o1:c14"], other.samples);
  expect(Math.round(defense.winCal * 100)).toBe(81);
  expect(Math.round(stab.winCal * 100)).toBe(81);
  expect(silentBuildWinTies("silent", [defense, stab]).size).toBe(0);
  expect(silentBuildWinTies("silent", [options[0]!, { ...options[1]!, win: 0.00001 }]).size).toBe(0);
  expect(silentBuildWinTies("silent", [options[0]!, { ...options[1]!, winCal: 0.047400001 }]).size).toBe(0);
});

it("requires equal positive sample counts and valid rates, and leaves other characters alone", () => {
  for (const patch of [{ samples: 0 }, { samples: 751 }, { samples: 752.5 }, { win: NaN }, { winCal: Infinity }, { win: -1 }, { winCal: 2 }]) {
    expect(silentBuildWinTies("silent", [options[0]!, { ...options[1]!, ...patch }]).size).toBe(0);
  }
  expect(silentBuildWinTies("silent", []).size).toBe(0);
  expect(silentBuildWinTies("silent", [options[0]!]).size).toBe(0);
  expect(silentBuildWinTies("ironclad", options).size).toBe(0);
});

it("labels each exact tie independently of whether it wins, without moving or removing other options", () => {
  const slate = [options[0]!, options[1]!,
    { ...options[2]!, win: 0.75, winCal: 0.8 },
    { ...options[3]!, win: 0.75, winCal: 0.8 },
    { ...options[4]!, win: 0.5, winCal: 0.6 }];
  const ties = silentBuildWinTies("silent", slate);
  expect(ties.size).toBe(4);
  expect(ties.get(slate[2]!.key)?.boss_sim_win_tied_with).toEqual([slate[3]!.key]);
  expect(ties.has(slate[4]!.key)).toBe(false);
  expect(slate.map((option) => option.key)).toEqual(options.slice(0, 5).map((option) => option.key));
});

async function question(character = "SILENT", samples = observed.samples) {
  const raw = structuredClone(fixture.state); raw.run.character_id = character;
  const state = parseGameState(raw);
  const knowledge = makeKnowledge({}, "cache");
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("REST"), shopDiscardPotions: [] };
  const entries = options.map((sim) => ({ key: sim.key, intent: { action: "choose_rest_option" as const, option_index: sim.key === "o0" ? 0 : 1 },
    summary: { original_option: sim.key } }));
  entries.push({ key: "unsupported", intent: { action: "choose_rest_option", option_index: 99 }, summary: { original_option: "unsupported" } });
  const criteria: Record<string, string | null> = Object.fromEntries(entries.map((entry) => [entry.key, JSON.stringify(entry.summary)]));
  criteria["not_offered"] = null;
  const ask: AskDecision = { kind: "ask", label: "rest/plan", state: { facts: { act_boss_clock: {} } },
    questions: { pick: { type: "choice", instructions: "固定休息题", criteria } },
    resolve: () => ({ intent: { action: "choose_rest_option", option_index: 0 }, rationale: "fixed", confidence: 1, fallback: false }),
    deepseek: { question: "pick", baseline: { kind: "act", label: "rest/choose", intent: { action: "choose_rest_option", option_index: 0 }, rationale: "fixed" }, options: () => entries } };
  vi.mocked(compareOptions).mockResolvedValue({ ...result, samples, options: [...options,
    { ...options[0]!, key: "unsupported" }, { ...options[0]!, key: "not_offered" }] });
  const outcome = await withBossSim(ask, env, { runner: { run: vi.fn() } });
  return { outcome, ask, criteria: (outcome.decision as AskDecision).questions.pick!.criteria! };
}

it("adds ties to the production DeepSeek question, retaining all options and the original simulation facts", async () => {
  const { outcome, ask, criteria } = await question();
  expect(outcome.record).not.toHaveProperty("error");
  expect(Object.keys(criteria)).toEqual(Object.keys(ask.questions.pick!.criteria!));
  for (const option of options) {
    const facts = JSON.parse(criteria[option.key]!);
    expect(facts.original_option).toBe(option.key);
    expect(facts.boss_sim_win_tied_with).toEqual(options.filter((peer) => peer.key !== option.key).map((peer) => peer.key));
    expect(facts.boss_sim).toContain("5%");
    expect(facts.boss_sim).toContain(`约 ${option.turns} 回合`);
  }
  expect(JSON.parse(criteria.unsupported!)).not.toHaveProperty("boss_sim_win_tied_with");
  expect(criteria.not_offered).toBeNull();
  expect((outcome.record as Record<string, JsonValue>).options).toMatchObject({ o0: { boss_left: 227.3856, turns: 30 } });
});

it("does not add ties for another character or when the existing sample minimum suppresses the simulation", async () => {
  const original = await question("IRONCLAD");
  expect(original.outcome.record).not.toHaveProperty("error");
  for (const value of Object.values(original.criteria)) {
    if (value) expect(JSON.parse(value)).not.toHaveProperty("boss_sim_win_tied_with");
  }
  const insufficient = await question("SILENT", 299);
  expect(insufficient.outcome.record).toHaveProperty("error");
  expect(insufficient.criteria).toEqual(insufficient.ask.questions.pick!.criteria!);
});
