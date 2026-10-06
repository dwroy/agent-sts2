/** LS8035TB32P3 F16/F40, silent-0201: fixed observed HP and logged boss simulation inputs. */
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { loadConfig } from "../src/core/config.js";
import type { JsonValue } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import { compareOptions, type OptionSim } from "../src/sim/build-sim.js";
import * as projection from "../src/sim/route-projection.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_rest_sim_hp_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));
vi.mock("../src/knowledge/card-upgrades.js", () => ({ cardUpgrade: () => null }));
vi.mock("../src/sim/route-projection.js", async (original) => ({
  ...await original<typeof import("../src/sim/route-projection.js")>(),
  roomCostModel: () => structuredClone(fixture.costs),
}));
vi.mock("../src/sim/build-sim.js", async (original) => ({
  ...await original<typeof import("../src/sim/build-sim.js")>(), compareOptions: vi.fn(),
}));
vi.mock("../src/sim/boss-start.js", async (original) => ({
  ...await original<typeof import("../src/sim/boss-start.js")>(),
  // Fixed simulation output is supplied below; this exercises option planning, not historic shuffles.
  syntheticBossStart: (state: ReturnType<typeof parseGameState>, _knowledge: unknown, _boss: string, hp: number) => ({
    entryHp: Math.min(state.run!.max_hp!, hp), maxHp: state.run!.max_hp,
    boss: { name: "固定本局boss", asc: 10, exact: true, parts: [{ name: "固定本局boss", hp: 419 }] },
    input: {
      solver: { player: { hp: Math.min(state.run!.max_hp!, hp), maxHp: state.run!.max_hp }, hand: [] },
      piles: { draw: [{ index: 900, name: "固定日志牌", known: true, type: "Attack", cost: 1, damage: 6, hits: 1 }], discard: [], exhaust: [] },
    },
    relics: { applied: [], unmodelled: [] },
  }),
}));

const fixture = JSON.parse(readFileSync(new URL("./silent-rest-sim-hp-evidence.json", import.meta.url), "utf8"));
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });

function sim(key: string, row: Record<string, number | null>, samples: number): OptionSim {
  return {
    key, samples, win: row.win!, winCal: row.win_cal!, hp: row.hp ?? 1,
    bossLeft: row.boss_left!, hpLossMean: 0, hpLossWon: row.hp_loss_won ?? null,
    turns: row.turns ?? null, deathTurn: null, order: null,
    diff: { raw: row.diff_raw ?? 0, se: row.se_raw ?? 0, cal: row.diff_cal ?? 0, calSe: row.se_cal ?? 0,
      hpLoss: 0, hpLossSe: 0, bossLeft: row.boss_left_diff ?? 0, bossLeftSe: row.boss_left_se ?? 0 },
  };
}

async function question(settings: { floor?: 16 | 40; character?: string; group?: boolean; route?: boolean; samples?: number; badSmith?: boolean } = {}) {
  const floor = settings.floor ?? 40;
  const board = fixture.boards[String(floor)];
  const raw = structuredClone(board.state);
  raw.run.character_id = settings.character ?? "SILENT";
  const state = parseGameState(raw);
  const knowledge = makeKnowledge({}, "cache");
  const memory = createScreenMemory("REST");
  if (settings.route !== false) {
    const path = floor === 16 ? [{ row: 16, col: 3, type: "Boss", hpOnArrival: null }]
      : ["Treasure", "Monster", "Shop", "RestSite", "Elite", "Unknown", "RestSite", "Boss", "Boss"]
        .map((type, at) => ({ row: 7 + at, col: at === 1 ? 1 : at >= 7 ? 3 : 0, type, hpOnArrival: null }));
    memory.routePlan = { runId: raw.run_id, act: floor === 16 ? 1 : 3, floor, hpPct: raw.run.current_hp / raw.run.max_hp, path, summary: "固定本局路线" };
  }
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: memory, shopDiscardPotions: [] };
  const smithKey = settings.badSmith ? "o1:missing" : settings.group ? "o1" : "o1:c0";
  const entries = [
    { key: "o0", intent: { action: "choose_rest_option" as const, option_index: 0 }, summary: { sentinel: "HEAL" } },
    { key: smithKey, intent: { action: "choose_rest_option" as const, option_index: 1 }, summary: { sentinel: "SMITH" } },
    { key: "o99", intent: { action: "choose_rest_option" as const, option_index: 99 }, summary: { sentinel: "unknown action" } },
  ];
  const ask: AskDecision = { kind: "ask", label: settings.group ? "rest/choose" : "rest/plan", state: { facts: { act_boss_clock: {} } },
    questions: { pick: { type: "choice", instructions: "固定休息题", criteria: { ...Object.fromEntries(entries.map((e) => [e.key, JSON.stringify(e.summary)])), unavailable: null } } },
    resolve: () => ({ intent: { action: "choose_rest_option", option_index: 0 }, rationale: "fixed", confidence: 1, fallback: false }),
    deepseek: { question: "pick", baseline: { kind: "act", label: "rest/choose", intent: { action: "choose_rest_option", option_index: 0 }, rationale: "fixed" }, options: () => entries } };
  const logged = board.boss_sim;
  const samples = settings.samples ?? logged.samples;
  const options = [sim("o0", logged.options.o0, samples), sim(settings.group ? "o1|c0" : smithKey, logged.options["o1:c0"], samples)];
  const result = { base: sim("base", logged.base, samples), options, samples, requested: 1000,
    timedOut: true, elapsedMs: 11_000, workers: 0, orders: 1, order: null };
  vi.mocked(compareOptions).mockResolvedValue(result);
  const outcome = await withBossSim(ask, env, { runner: { run: vi.fn() }, now: () => 100 });
  const updated = outcome.decision as AskDecision;
  const criteria = updated.questions.pick!.criteria!;
  return { outcome, ask, criteria, result, reference: (key: string) => JSON.parse(criteria[key]!).boss_sim_hp_reference };
}

it("separates F40's observed +24 HP from two floored boss inputs and locates their different exhausted rooms", async () => {
  const { reference } = await question();
  expect(reference("o0")).toMatchObject({ current_hp: 4, after_action_hp: 28, immediate_hp_gain: 24,
    after_action_max_hp: 82, simulated_entry_hp: 1, entry_source: "route",
    projection_exhausted_at: { floor: 45, room: "Elite" }, assumed_future_heal_floors: [44, 47], entry_hp_tied_with: ["o1:c0"] });
  expect(reference("o0").projected_boss_hp).toBeCloseTo(-27.9);
  expect(reference("o1:c0")).toMatchObject({ after_action_hp: 4, immediate_hp_gain: 0, simulated_entry_hp: 1,
    projection_exhausted_at: { floor: 42, room: "Monster" }, entry_hp_tied_with: ["o0"] });
  expect(reference("o1:c0").projected_boss_hp).toBeCloseTo(-18.5);
  expect(reference("o0").note).toContain("不代表即时回血无用");
  expect(reference("o0").entry_hp_tie_note).toContain("仅boss模拟输入血量指标并列");
});

it("retains every original option, resolver and simulation value in the real question augmentation", async () => {
  const { outcome, ask, criteria, result } = await question();
  expect(outcome.record).not.toHaveProperty("error");
  expect(Object.keys(criteria)).toEqual(Object.keys(ask.questions.pick!.criteria!));
  expect((outcome.decision as AskDecision).deepseek).toBe(ask.deepseek);
  expect((outcome.decision as AskDecision).resolve).toBe(ask.resolve);
  expect(JSON.parse(criteria.o0!)).toMatchObject({ sentinel: "HEAL", boss_sim_win_tied_with: ["o1:c0"] });
  expect(JSON.parse(criteria.o0!).boss_sim).toContain("5%");
  expect((outcome.record!.options as Record<string, JsonValue>)).toMatchObject({ o0: { hp: 1, win: 0, win_cal: 0.0474, boss_left: 611.5096 } });
  expect(result.options[0]!.hp).toBe(1);
  expect(vi.mocked(compareOptions).mock.calls[0]![1].solver.player.hp).toBe(1);
  const heal = vi.mocked(compareOptions).mock.calls[0]![2].find((o) => o.key === "o0")!;
  expect(heal.change!.solver!.player.hp).toBe(1);
  expect(JSON.parse(criteria.o99!)).not.toHaveProperty("boss_sim_hp_reference");
  expect(criteria.unavailable).toBeNull();
});

it("keeps F16's non-exhausted 42 and 65 HP inputs distinct", async () => {
  const { reference } = await question({ floor: 16 });
  expect(reference("o0")).toMatchObject({ current_hp: 42, after_action_hp: 65, immediate_hp_gain: 23,
    projected_boss_hp: 65, simulated_entry_hp: 65, projection_exhausted_at: null, assumed_future_heal_floors: [] });
  expect(reference("o1:c0")).toMatchObject({ after_action_hp: 42, projected_boss_hp: 42, simulated_entry_hp: 42 });
  expect(reference("o0")).not.toHaveProperty("entry_hp_tied_with");
  expect(reference("o0").note).not.toContain("按下限1血");
});

it("also annotates the step-by-step smith group without changing its per-card simulation", async () => {
  const { criteria, reference } = await question({ group: true });
  expect(reference("o1")).toMatchObject({ after_action_hp: 4, simulated_entry_hp: 1, entry_hp_tied_with: ["o0"] });
  expect(reference("o0").entry_hp_tied_with).toEqual(["o1"]);
  expect(JSON.parse(criteria.o1!).boss_sim_by_card.c0).toContain("5%");
});

it("shows current-HP provenance when no route plan is present", async () => {
  const { reference } = await question({ route: false });
  expect(reference("o0")).toMatchObject({ entry_source: "hp_now", projected_boss_hp: 28,
    simulated_entry_hp: 28, projection_exhausted_at: null, assumed_future_heal_floors: [] });
  expect(reference("o0")).not.toHaveProperty("entry_hp_tied_with");
});

it("does not turn an unknown projection into a known 1-HP tie", async () => {
  vi.spyOn(projection, "projectPath").mockImplementation((types, _hp, costs) => ({
    arrival: types.map(() => null), riskAfter: types.map(() => null), runsOut: null, riskLow: null,
    end: null, maxArrival: types.map(() => costs.maxHp), maxEnd: costs.maxHp,
  }));
  const { reference } = await question();
  expect(reference("o0")).toMatchObject({ projected_boss_hp: null, simulated_entry_hp: 1, projection_exhausted_at: null });
  expect(reference("o0").note).toContain("进场投影未知");
  expect(reference("o0")).not.toHaveProperty("entry_hp_tied_with");
});

it("does not attach a reference or tie to a smith target the planner could not find", async () => {
  const { criteria, reference } = await question({ badSmith: true });
  expect(JSON.parse(criteria["o1:missing"]!)).not.toHaveProperty("boss_sim_hp_reference");
  expect(reference("o0")).not.toHaveProperty("entry_hp_tied_with");
});

it("leaves the other character's question facts unchanged", async () => {
  const { criteria } = await question({ character: "IRONCLAD" });
  for (const value of Object.values(criteria)) if (value) expect(JSON.parse(value)).not.toHaveProperty("boss_sim_hp_reference");
});

it("keeps the existing sample minimum and adds no option facts for a suppressed simulation", async () => {
  const { outcome, ask, criteria } = await question({ samples: 299 });
  expect(outcome.record).toHaveProperty("error");
  expect(criteria).toEqual(ask.questions.pick!.criteria!);
});
