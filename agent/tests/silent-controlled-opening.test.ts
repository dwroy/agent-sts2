/** XTSV1U9JD34T F47/F49 T1, silent-0164: autonomous simulations do not reconstruct a controlled opening. */
import { afterEach, expect, it, vi } from "vitest";
import evidence from "./silent-controlled-opening-evidence.json" with { type: "json" };
import { loadConfig } from "../src/core/config.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/memory/types.js";
import { fightStartRelics } from "../src/sim/boss-start.js";
import { withBossSim } from "../src/sim/build-sim-facts.js";
import { compareOptions, type OptionSim } from "../src/sim/build-sim.js";

vi.mock("../src/knowledge/files.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/files.js")>(),
  knowledgeFile: (_dir: string, name: string) => `/__silent_controlled_opening_fixed__/${name}`,
}));
vi.mock("../src/knowledge/monster-db.js", async (original) => ({
  ...await original<typeof import("../src/knowledge/monster-db.js")>(),
  readMonsterDbJson: () => ({ monsters: {}, bosses: {}, encounters: {} }),
}));
vi.mock("../src/sim/build-sim.js", async (original) => ({
  ...await original<typeof import("../src/sim/build-sim.js")>(), compareOptions: vi.fn(),
}));
vi.mock("../src/sim/boss-start.js", async (original) => {
  const mod = await original<typeof import("../src/sim/boss-start.js")>();
  return { ...mod, syntheticBossStart: (state: ReturnType<typeof parseGameState>, _knowledge: unknown, _boss: string, hp: number) => ({
    entryHp: hp, maxHp: state.run!.max_hp,
    boss: { asc: 10, exact: true, parts: [{ name: "固定原局boss", hp: 419 }] },
    input: { solver: { player: { hp, maxHp: state.run!.max_hp }, hand: [] }, piles: { draw: [], discard: [], exhaust: [] } },
    relics: mod.fightStartRelics(asRecord(state.run!.raw)),
  }) };
});

afterEach(() => { vi.clearAllMocks(); });

function sim(key: string): OptionSim {
  return { key, samples: 1, win: 0.5, winCal: 0.5, hp: 40, bossLeft: 20, hpLossMean: 10,
    hpLossWon: 10, turns: 4, deathTurn: null, order: null };
}

async function question(buy = false, character = "SILENT", ascension = 10) {
  const raw = structuredClone(evidence.pre_boss.row.state);
  raw.run.character_id = character;
  raw.run.ascension = ascension;
  if (buy) raw.run.relics = raw.run.relics.filter((r) => r.relic_id !== "WHISPERING_EARRING");
  const state = parseGameState(raw);
  // A fixed shop variant isolates candidate annotation; it makes no claim about a historical purchase outcome.
  if (buy) state.raw["shop"] = { relics: [{ index: 0, relic_id: "WHISPERING_EARRING", name: "低语耳环" }] };
  const knowledge = makeKnowledge({}, "cache");
  const env: DecisionEnv = { state, knowledge, brief: buildRunBrief(state, knowledge),
    thresholds: loadConfig({}).thresholds, runStart: "auto", characterPreference: null,
    allowFtueModals: false, strictJev: true, screenMemory: createScreenMemory("REST"), shopDiscardPotions: [] };
  const entries = buy
    ? [{ key: "buy", intent: { action: "buy_relic" as const, option_index: 0 }, summary: { affordable_now: true } },
       { key: "leave", intent: { action: "close_shop_inventory" as const }, summary: {} }]
    : [{ key: "leave", intent: { action: "close_shop_inventory" as const }, summary: {} }];
  const ask: AskDecision = { kind: "ask", label: "shop/buy", state: { facts: { act_boss_clock: {} } },
    questions: { pick: { type: "choice", instructions: "固定题面", criteria: Object.fromEntries(entries.map((e) => [e.key, JSON.stringify(e.summary)])) } },
    resolve: () => ({ intent: { action: "close_shop_inventory" }, rationale: "fixed", confidence: 1, fallback: false }),
    deepseek: { question: "pick", baseline: { kind: "act", label: "shop/leave", intent: { action: "close_shop_inventory" }, rationale: "fixed" }, options: () => entries } };
  const result = { base: sim("@current"), options: entries.map((e) => sim(e.key)), samples: 1, requested: 1,
    timedOut: false, elapsedMs: 0, workers: 0, orders: 1, order: null };
  vi.mocked(compareOptions).mockResolvedValue(result);
  const outcome = await withBossSim(ask, env, { runner: { run: vi.fn() }, samples: 1, now: () => 100 });
  expect(outcome.record).not.toHaveProperty("error");
  return { ask, outcome, result };
}

it("keeps the actual stable first-turn resources distinct from unrecorded takeover actions", () => {
  const state = evidence.after_takeover.row.state;
  expect(state.combat.hand.map((c) => c.card_id)).toEqual(["ASCENDERS_BANE"]);
  expect(state.combat.player).toMatchObject({ current_hp: 23, block: 16, energy: 3 });
  const facts = fightStartRelics(evidence.pre_boss.row.state.run);
  expect(facts.unmodelled.join(" ")).toContain("首轮接管未建模");
  expect(facts.unmodelled.join(" ")).toContain("接管内部顺序未知");
});

it("delivers the held relic limitation through the real B3 question without changing simulations or choices", async () => {
  const { ask, outcome, result } = await question();
  const updated = outcome.decision as AskDecision;
  const facts = asRecord(asRecord(updated.state["facts"])["act_boss_sim"]);
  expect(facts["relics_not_modelled"]).toContain("模型仅计能量");
  expect(facts["relics_not_modelled"]).toContain("XTSV1U9JD34T F49 T1");
  expect(updated.resolve).toBe(ask.resolve);
  expect(updated.deepseek).toBe(ask.deepseek);
  expect(Object.keys(updated.questions.pick!.criteria!)).toEqual(Object.keys(ask.questions.pick!.criteria!));
  expect(outcome.record).toMatchObject({ base: { win: result.base.win, win_cal: result.base.winCal } });
});

it("annotates buying the relic while keeping the buy and leave candidates and their numerical estimates", async () => {
  const { ask, outcome } = await question(true);
  const updated = outcome.decision as AskDecision;
  const criteria = updated.questions.pick!.criteria!;
  expect(JSON.parse(criteria.buy!).boss_sim).toContain("首轮接管未建模");
  expect(JSON.parse(criteria.buy!).boss_sim).toContain("50%");
  expect(Object.keys(criteria)).toEqual(["buy", "leave"]);
  expect(updated.resolve).toBe(ask.resolve);
  const options = asRecord(outcome.record!["options"]);
  expect(options).toMatchObject({ buy: { win: 0.5, win_cal: 0.5 }, leave: { win: 0.5, win_cal: 0.5 } });
});

it.each([["IRONCLAD", 10], ["SILENT", 9], ["SILENT", 11]])("retains the previous %s A%i facts", async (character, ascension) => {
  const { outcome } = await question(false, character as string, ascension as number);
  const facts = asRecord(asRecord((outcome.decision as AskDecision).state["facts"])["act_boss_sim"]);
  expect(facts["relics_not_modelled"] ?? "").not.toContain("首轮接管");
});

it("does not mark a run without the relic as a controlled opening", () => {
  const run = structuredClone(evidence.pre_boss.row.state.run);
  run.relics = asArray(run.relics).map(asRecord).filter((r) => r["relic_id"] !== "WHISPERING_EARRING") as typeof run.relics;
  expect(fightStartRelics(run).unmodelled.join(" ")).not.toContain("首轮接管");
});
