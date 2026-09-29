/**
 * BUILD_DECIDER=deepseek (Dai 2026-09-28): card rewards, shops, events, rest sites, relic choices, deck
 * picks outside combat and the act's route are DeepSeek's decisions, with code's values as facts; Jev
 * then code when DeepSeek fails; combat stays with code and Jev. The route is planned once per act and
 * followed by code.
 */

import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { AppConfig } from "../src/config.js";
import { loadConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import type { JevAskResult, JevClient } from "../src/jev/client.js";
import { fillRelicText } from "../src/knowledge/relic-values.js";
import { DeepSeekClient, type DeepSeekAnswer } from "../src/llm/deepseek.js";
import { runLoop } from "../src/loop.js";
import { ModClient } from "../src/mod/client.js";
import { parseGameState, type GameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type Decision, type DecisionEnv } from "../src/project/types.js";
import { planDecision } from "../src/screens/index.js";
import type { RunPlan } from "../src/strategy/run-plan.js";
import type { JsonValue } from "../src/util/json.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";
import {
  baseState,
  chestPayload,
  combatPayload,
  eventPayload,
  mainMenuPayload,
  restPayload,
  rewardCardPayload,
  runPayload,
  selectionPayload,
  shopPayload,
  testKnowledge,
} from "./scenarios.js";

type Raw = Record<string, unknown>;
const config = loadConfig({} as NodeJS.ProcessEnv);

function env(raw: Raw, overrides: Partial<DecisionEnv> = {}): DecisionEnv {
  const state: GameState = parseGameState(raw);
  return {
    state,
    knowledge: testKnowledge,
    brief: buildRunBrief(state, testKnowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: [],
    buildDecider: "deepseek",
    ...overrides,
  };
}

function decide(e: DecisionEnv): Decision {
  const outcome = planDecision(e);
  if (outcome.kind !== "decision") throw new Error(`expected a decision, got ${outcome.kind}: ${outcome.reason}`);
  return outcome.decision;
}

/** The DeepSeek-direct view of a decision: its options (parsed) and facts. */
function deepseekView(decision: Decision): { options: Record<string, Record<string, JsonValue>>; facts: Record<string, JsonValue>; instructions: string } {
  if (decision.kind !== "ask" || !decision.deepseek) throw new Error(`expected a DeepSeek decision, got ${decision.kind} ${decision.label}`);
  const question = decision.questions[decision.deepseek.question];
  if (question?.type !== "choice") throw new Error("expected a choice question");
  const options = Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value ?? "{}") as Record<string, JsonValue>]));
  return { options, facts: decision.state["facts"] as Record<string, JsonValue>, instructions: question.instructions };
}

const plan: RunPlan = {
  runId: "TESTRUN123", act: 2, floor: 18, hpPct: 0.9, trigger: "act", archetype: "Strength", want: ["INFLAME"], avoid: [], remove: ["STRIKE_R"],
  blockTarget: 4, elites: "normal", rest: "smith", bossPrep: "scale Strength", summary: "Strength scaling for the crab",
};

const crabRun = (over: Raw = {}): Raw => runPayload({ boss_id: "KAISER_CRAB_BOSS", floor: 20, act_id: "1", ascension: 8, ...over });

describe("BUILD_DECIDER=deepseek: screens ask DeepSeek with facts", () => {
  it("card reward: every offer and the skip, with their facts (no code value, rank or why: V4 M2); run facts; the Jev/code decision kept as fallback", () => {
    const raw = { ...rewardCardPayload(), run: crabRun() };
    const e = env(raw);
    e.screenMemory.runPlan = plan;
    const decision = decide(e);
    const view = deepseekView(decision);
    expect(decision.label).toBe("reward/card");
    expect(Object.keys(view.options).sort()).toEqual(["card0", "card1", "card2", "skip"]);
    for (const option of Object.values(view.options)) {
      expect(option["code_value"]).toBeUndefined();
      expect(option["code_rank"]).toBeUndefined();
      expect(option["why"]).toBeUndefined();
    }
    for (const key of ["card0", "card1", "card2"]) expect(view.options[key]).toMatchObject({ in_deck: expect.any(Number), outcome_stats: expect.any(String) });
    expect(view.options["skip"]).toEqual({ card: "skip", note: "take no card" });
    expect(view.facts["outcome_stats_basis"]).toMatch(/^outcome_stats .*A\d+ 数据/);
    expect(view.facts["act_boss_clock"]).toMatchObject({ boss: "KAISER_CRAB", need_damage_per_turn: expect.any(Number), deck_damage_per_turn_estimate: expect.any(Number), survivable_turns: expect.any(Number), harder_because: expect.any(String) });
    expect(view.facts["your_run_plan"]).toMatchObject({ archetype: "Strength", want: ["INFLAME"], rest: "smith" });
    for (const key of ["hp", "gold", "deck", "relics", "potions", "potion_slots", "deck_size", "floors_to_act_boss"]) expect(view.facts[key]).toBeDefined();
    expect(view.instructions).toMatch(/You decide this yourself/);
    // The fallback is the decision the screen makes without DeepSeek.
    const baseline = decide(env(raw, { buildDecider: undefined }));
    expect(decision.kind === "ask" && decision.deepseek?.baseline.label).toBe(baseline.label);
    expect(baseline.kind === "ask" ? baseline.deepseek : undefined).toBeUndefined();
    // DeepSeek's answer resolves to the reward action.
    const resolved = decision.kind === "ask" ? decision.resolve({ pick: { type: "choice", choice: "skip", probabilities: { skip: 1 }, confidence: 1, raw: {} } } as AnswerSet) : null;
    expect(resolved?.intent).toEqual({ action: "skip_reward_cards" });
  });

  it("shop (BUILD_ONESHOT=off): purchases, removal and leaving, with their facts (no code value or why: V4 M2)", () => {
    const view = deepseekView(decide(env({ ...shopPayload(true), run: crabRun() }, { oneshot: "off" })));
    expect(Object.keys(view.options).sort()).toEqual(["buy_card0", "buy_relic0", "leave", "remove"]);
    for (const option of Object.values(view.options)) for (const key of ["code_value", "code_rank", "why"]) expect(option[key]).toBeUndefined();
    expect(view.options["buy_card0"]).toMatchObject({ in_deck: expect.any(Number), outcome_stats: expect.any(String) });
    expect(view.options["buy_relic0"]).toMatchObject({ text: expect.any(String), outcome_stats: expect.any(String) });
    expect(view.options["remove"]).toMatchObject({ buy: "card removal", text: "removes one card from the deck" });
    expect(view.facts["shop_stock"]).toBeDefined();
  });

  it("rest site (BUILD_ONESHOT=off): heal vs smith with the heal amount and the cards that can be upgraded", () => {
    const view = deepseekView(decide(env({ ...restPayload(), run: crabRun({ current_hp: 60 }) }, { oneshot: "off" })));
    expect(Object.keys(view.options)).toHaveLength(2);
    expect(view.facts["rest_site"]).toMatchObject({ heal_amount: expect.stringMatching(/24 HP/), upgradable_cards: expect.any(Array) });
  });

  it("event: the unlocked, non-lethal options with our runs' outcome statistics per option (no code why: V4 M2)", () => {
    const decision = decide(env(eventPayload()));
    const view = deepseekView(decision);
    expect(Object.keys(view.options).sort()).toEqual(["o0", "o3"]);
    expect(view.options["o0"]?.["why"]).toBeUndefined();
    expect(Object.keys((view.facts["event"] as Record<string, Record<string, unknown>>)["option_outcome_stats"]!).sort()).toEqual(["o0", "o3"]);
    expect(view.facts["event"]).toMatchObject({ id: "BIG_FISH" });
  });

  it("chest relic and relic text: numbers filled where measured, unknown ones marked, never invented", () => {
    const view = deepseekView(decide(env(chestPayload(true))));
    expect(Object.keys(view.options)).toHaveLength(2);
    expect(fillRelicText("BURNING_BLOOD", "在战斗结束时，回复[green]{Heal}[/green]点生命。")).toBe("在战斗结束时，回复6点生命。");
    expect(fillRelicText("SOME_RELIC", "Gain {Block} Block.")).toContain("数值未知");
  });

  it("deck picks outside combat go to DeepSeek; in-combat picks stay with code and Jev", () => {
    const upgrade = decide(env(selectionPayload()));
    expect(upgrade.kind === "ask" && upgrade.deepseek).toBeTruthy();
    const inCombat = selectionPayload();
    inCombat["in_combat"] = true;
    const combatPick = decide(env(inCombat));
    expect(combatPick.kind === "ask" ? combatPick.deepseek : undefined).toBeUndefined();
  });

  it("without BUILD_DECIDER=deepseek the screens are the baseline", () => {
    for (const raw of [rewardCardPayload(), shopPayload(true), restPayload(), eventPayload(), chestPayload(true)]) {
      const decision = decide(env(raw, { buildDecider: "jev" }));
      expect(decision.kind === "ask" ? decision.deepseek : undefined).toBeUndefined();
    }
  });
});

/* ---- route plan ---------------------------------------------------------------------------------- */

const node = (row: number, col: number, type: string, children: [number, number][], extra: Raw = {}): Raw => ({
  row, col, node_type: type, state: "NotTravelable", visited: false, is_current: false, is_available: false, is_start: false, is_boss: type === "Boss",
  is_second_boss: false, parents: [], children: children.map(([r, c]) => ({ row: r, col: c })), ...extra,
});

/**
 * current (4,2) -> A (5,1) Monster | B (5,3) Monster; A -> C (6,1) RestSite | D (6,2) Elite; B -> D | E (6,3) Shop;
 * C, D, E -> Boss (7,3).
 */
function routeMap(current: [number, number], available: [number, number, string][], run: Raw = {}): Raw {
  return baseState("MAP", {
    available_actions: ["choose_map_node"],
    run: runPayload({ floor: 5, act_id: "0", current_hp: 70, max_hp: 80, ...run }),
    map: {
      current_node: { row: current[0], col: current[1] },
      boss_node: { row: 7, col: 3 },
      available_nodes: available.map(([row, col, type], index) => ({ index, row, col, node_type: type, state: "Travelable" })),
      nodes: [
        node(4, 2, "Monster", [[5, 1], [5, 3]], { visited: true }),
        node(5, 1, "Monster", [[6, 1], [6, 2]]),
        node(5, 3, "Monster", [[6, 2], [6, 3]], current[0] >= 5 ? { visited: true } : {}),
        node(6, 1, "RestSite", [[7, 3]]),
        node(6, 2, "Elite", [[7, 3]]),
        node(6, 3, "Shop", [[7, 3]]),
        node(6, 4, "Monster", [[7, 3]]),
        node(7, 3, "Boss", []),
      ],
      local_vote: null,
    },
  });
}

const firstFork = (): Raw => routeMap([4, 2], [[5, 1, "Monster"], [5, 3, "Monster"]]);
/** The card reward of the fight at (5,3), one floor after firstFork's map. */
const fightReward = (): Raw => ({ ...rewardCardPayload(), run: runPayload({ floor: 6, act_id: "0", current_hp: 60, max_hp: 80 }) });
const secondFork = (run: Raw = {}): Raw => routeMap([5, 3], [[6, 2, "Elite"], [6, 3, "Shop"]], run);
const brokenFork = (): Raw => routeMap([5, 3], [[6, 2, "Elite"], [6, 4, "Monster"]]);

/** Plans the route and plays DeepSeek's pick of the path through the shop. */
function planThroughShop(e: DecisionEnv): string {
  const decision = decide(e);
  expect(decision.label).toBe("map/route-plan");
  const view = deepseekView(decision);
  const key = Object.keys(view.options).find((option) => String(view.options[option]?.["path"]).includes("Shop"))!;
  const resolved = decision.kind === "ask" ? decision.resolve({ pick: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: {} } } as AnswerSet) : null;
  expect(resolved?.intent).toEqual({ action: "choose_map_node", option_index: 1 });
  resolved?.apply?.();
  return key;
}

describe("BUILD_DECIDER=deepseek: the act's route is planned once and followed", () => {
  it("asks for whole paths to the boss with route facts", () => {
    const view = deepseekView(decide(env(firstFork())));
    const paths = Object.values(view.options).map((option) => String(option["path"]));
    expect(paths).toContain("Monster -> Shop -> Boss");
    expect(paths).toContain("Monster -> RestSite -> Boss");
    const shop = Object.values(view.options).find((option) => String(option["path"]).includes("Shop"))!;
    for (const key of ["fights", "elites", "rests", "shops", "unknown_rooms", "hp_at_boss", "hp_on_arrival_at_elites", "forks_on_path", "fights_before_first_rest", "code_value"]) expect(shop[key]).toBeDefined();
  });

  it("follows the plan without asking, whatever the HP; re-plans only when the next planned node is missing", () => {
    const e = env(firstFork());
    planThroughShop(e);
    const memory = e.screenMemory;
    expect(memory.routePlan?.path.map((step) => step.type)).toEqual(["Monster", "Shop", "Boss"]);
    // Next fork: the plan's Shop is available -> code follows it.
    const follow = decide(env(secondFork(), { screenMemory: memory }));
    expect(follow).toMatchObject({ kind: "act", label: "map/route-follow", intent: { action: "choose_map_node", option_index: 1 } });
    // The Shop is gone -> DeepSeek re-plans, and the log says why.
    const broken = decide(env(brokenFork(), { screenMemory: memory }));
    expect(broken.label).toBe("map/route-plan");
    expect(JSON.stringify(broken.kind === "ask" ? broken.state : {})).toMatch(/not available/);
    // HP far below what the plan projected for the next node is no re-plan (Dai 2026-09-29): the card
    // reward and rest site questions show DeepSeek the HP against the plan instead.
    const low = decide(env(secondFork({ current_hp: 12 }), { screenMemory: memory }));
    expect(low).toMatchObject({ kind: "act", label: "map/route-follow", intent: { action: "choose_map_node", option_index: 1 } });
  });

  it("after a failed route plan the act's map screens use the Jev/code route choice", () => {
    const e = env(firstFork());
    const decision = decide(e);
    if (decision.kind !== "ask" || !decision.deepseek) throw new Error("expected a DeepSeek decision");
    decision.deepseek.onFail?.();
    const next = decide(env(secondFork(), { screenMemory: e.screenMemory }));
    expect(next.label).toBe("map/route");
    expect(next.kind === "ask" ? next.deepseek : undefined).toBeUndefined();
  });
});

/* ---- loop ---------------------------------------------------------------------------------------- */

class FakeDeepSeek extends DeepSeekClient {
  calls: { label: string; state: Record<string, JsonValue>; criteria: Record<string, string | null>; instructions: string }[] = [];
  constructor(private readonly pickFn: (criteria: Record<string, string | null>, label: string) => string | Error | { choice: string; route?: string; routeReason?: string }) {
    super({ apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", timeoutMs: 100 });
  }
  override async choose(state: Record<string, JsonValue>, instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}): Promise<DeepSeekAnswer> {
    const label = String(context["label"] ?? "");
    this.calls.push({ label, state, criteria, instructions });
    const picked = this.pickFn(criteria, label);
    if (picked instanceof Error) throw picked;
    // A pick function may find nothing (undefined): passed on as the choice, as before.
    const { choice, ...extras } = typeof picked === "object" && picked !== null ? picked : { choice: picked as string };
    return { choice, reason: `fake reason for ${choice}`, latencyMs: 5, inputTokens: 10, outputTokens: 2, cacheHitTokens: 7, reasoningTokens: 1, ...extras };
  }
}

interface StubJev {
  client: JevClient;
  calls: number;
  labels: string[];
}

function stubJev(confidence = 0.9): StubJev {
  const state = { calls: 0, labels: [] as string[] };
  const client = {
    model: "stub",
    async ask(_state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> | string[] }>): Promise<JevAskResult> {
      state.calls += 1;
      const answers: AnswerSet = {};
      for (const [id, question] of Object.entries(questions)) {
        if (question.type === "choice" && question.criteria && !Array.isArray(question.criteria)) {
          const first = Object.keys(question.criteria)[0] ?? "";
          answers[id] = { type: "choice", choice: first, probabilities: { [first]: confidence }, confidence, raw: {} };
        } else {
          answers[id] = { type: "noul", noul: 0.5, raw: {} };
        }
      }
      return { model: "stub", answers, inputTokens: 100, outputTokens: 10, latencyMs: 1, requestId: `req_${state.calls}` };
    },
  } as unknown as JevClient;
  return {
    client,
    get calls() {
      return state.calls;
    },
    labels: state.labels,
  } as StubJev;
}

const servers: TestServer[] = [];
const logs: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const path of logs.splice(0)) rmSync(path, { force: true });
});

function loopConfig(over: Partial<AppConfig> = {}): AppConfig {
  const path = join(tmpdir(), `jev-sts2-build-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
  logs.push(path);
  const base = loadConfig({} as NodeJS.ProcessEnv);
  return {
    ...base,
    combatPlanner: "turn",
    deepseek: { apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", maxCalls: 50, timeoutMs: 100, guideFile: "", handbookFile: "", reasoningEffort: "off", combatReasoningEffort: "", reasoningLog: "" },
    escalation: { ...base.escalation, chain: ["deepseek"] },
    log: { ...base.log, decisionLog: path },
    ...over,
  };
}

async function scriptedMod(sequence: Raw[]): Promise<{ server: TestServer; actions: Raw[] }> {
  let index = 0;
  const actions: Raw[] = [];
  const at = (position: number): Raw => sequence[Math.min(position, sequence.length - 1)] as Raw;
  const server = await startTestServer((req, res) => {
    if (req.method === "GET" && req.url === "/state") return sendJson(res, 200, envelope(at(index)));
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      const intent = JSON.parse(raw || "{}") as Raw;
      actions.push(intent);
      index += 1;
      sendJson(res, 200, envelope({ action: intent["action"], status: "completed", stable: true, message: "scripted", state: at(index) }));
    });
  });
  servers.push(server);
  return { server, actions };
}

async function play(sequence: Raw[], deepseek: FakeDeepSeek, jev: StubJev, over: Partial<AppConfig> = {}) {
  const config = loopConfig(over);
  const { server, actions } = await scriptedMod(sequence);
  const stats = await runLoop({ config, mode: "play", client: new ModClient({ baseUrl: server.url }), jev: jev.client, escalators: [deepseek], knowledge: testKnowledge, maxRuns: 1, maxDecisions: 20, pollIntervalMs: 1 });
  const records = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Raw);
  return { stats, actions, records };
}

describe("BUILD_DECIDER=deepseek in the loop", () => {
  it("a card reward is decided by DeepSeek, logged as decider deepseek with its reason; Jev is not asked", async () => {
    const deepseek = new FakeDeepSeek(() => "card2");
    const jev = stubJev();
    const { actions, records, stats } = await play([rewardCardPayload(), mainMenuPayload()], deepseek, jev);
    expect(actions[0]).toEqual({ action: "choose_reward_card", option_index: 2 });
    expect(jev.calls).toBe(0);
    expect(deepseek.calls).toHaveLength(1);
    expect(deepseek.calls[0]?.state["facts"]).toMatchObject({ hp: "55/80 (69%)", deck_size: 5 });
    const record = records.find((entry) => entry["label"] === "reward/card")!;
    expect(record).toMatchObject({ decider: "deepseek", deepseek: { by: "deepseek", direct: true, choice: "card2", reason: "fake reason for card2" } });
    // DeepSeek's own tokens are the decision's usage (they were logged as zeros before).
    expect(record["usage"]).toEqual({ input_tokens: 10, output_tokens: 2, cache_hit_tokens: 7, reasoning_tokens: 1 });
    expect(String(record["rationale"])).toContain("fake reason for card2");
    expect(stats.deepseekCalls).toBe(1);
  });

  it("falls back to Jev, then code, when DeepSeek errors (and does not ask it again as an escalation)", async () => {
    const deepseek = new FakeDeepSeek(() => new Error("DeepSeek HTTP 503"));
    const jev = stubJev(0.1);
    const { actions, records } = await play([rewardCardPayload(), mainMenuPayload()], deepseek, jev);
    expect(actions).toHaveLength(1);
    expect(deepseek.calls).toHaveLength(1);
    const record = records.find((entry) => entry["label"] === "reward/card")!;
    expect(record["decider"]).not.toBe("deepseek");
    expect(record["deepseek_fallback"]).toBe("deepseek failed");
  });

  it("out of DeepSeek budget: the screen is the baseline decision, no DeepSeek call", async () => {
    const deepseek = new FakeDeepSeek(() => "card2");
    const jev = stubJev();
    const base = loopConfig();
    const { records } = await play([rewardCardPayload(), mainMenuPayload()], deepseek, jev, { deepseek: { ...base.deepseek!, maxCalls: 0 } });
    expect(deepseek.calls).toHaveLength(0);
    expect(records.find((entry) => entry["label"] === "reward/card")?.["deepseek_fallback"]).toBe("deepseek unavailable or out of budget");
  });

  it("combat still goes to Jev: no DeepSeek call, even on a near-guess", async () => {
    const deepseek = new FakeDeepSeek(() => new Error("must not be asked"));
    const jev = stubJev(0.1);
    const { records } = await play([combatPayload(), mainMenuPayload()], deepseek, jev);
    expect(deepseek.calls).toHaveLength(0);
    expect(jev.calls).toBeGreaterThan(0);
    expect(records.filter((entry) => String(entry["label"]).startsWith("combat/")).every((entry) => entry["decider"] !== "deepseek")).toBe(true);
  });

  it("route: planned once by DeepSeek at the first fork, the next fork followed in code; a missing node re-plans", async () => {
    const pickShop = (criteria: Record<string, string | null>) => Object.keys(criteria).find((key) => String(criteria[key]).includes("Shop"))!;
    const deepseek = new FakeDeepSeek(pickShop);
    const jev = stubJev();
    const followed = await play([firstFork(), secondFork(), mainMenuPayload()], deepseek, jev);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["map/route-plan"]);
    expect(followed.actions).toEqual([{ action: "choose_map_node", option_index: 1 }, { action: "choose_map_node", option_index: 1 }]);
    expect(followed.records.map((record) => record["label"])).toEqual(expect.arrayContaining(["map/route-plan", "map/route-follow"]));
    expect(String(followed.records.find((record) => record["label"] === "map/route-plan")?.["rationale"])).toContain("Monster -> Shop -> Boss");

    const again = new FakeDeepSeek(pickShop);
    const replanned = await play([firstFork(), brokenFork(), mainMenuPayload()], again, stubJev());
    expect(again.calls.map((call) => call.label)).toEqual(["map/route-plan", "map/route-plan"]);
    expect(String(replanned.records.filter((record) => record["label"] === "map/route-plan")[1]?.["rationale"])).toMatch(/route re-plan \(the planned next node/);
  });

  it("card reward with a route change: one call for both; the change is its own map/route-change row (a reused plan step); the next map follows it", async () => {
    const pickShop = (criteria: Record<string, string | null>) => Object.keys(criteria).find((key) => String(criteria[key]).includes("Shop"))!;
    const deepseek = new FakeDeepSeek((criteria, label) => (label === "map/route-plan" ? pickShop(criteria) : { choice: "card2", route: "p1", routeReason: "elite while HP is up" }));
    const { actions, records, stats } = await play([firstFork(), fightReward(), secondFork({ floor: 6, current_hp: 60 }), mainMenuPayload()], deepseek, stubJev());
    expect(deepseek.calls.map((call) => call.label)).toEqual(["map/route-plan", "reward/card"]);
    expect(stats.deepseekCalls).toBe(2);
    const review = deepseek.calls[1]!.state["route_review"] as Record<string, JsonValue>;
    expect(review["hp"]).toMatch(/^HP 60\/80, \d+ points below the plan's projection for the next node \(Shop, F7: \d+\/80\)/);
    expect(review["routes"]).toMatchObject({ keep: { path: "Shop -> Boss" }, p1: { path: "Elite -> Boss" } });
    expect(deepseek.calls[1]!.instructions).toMatch(/"route": "keep"/);
    expect(actions).toEqual([{ action: "choose_map_node", option_index: 1 }, { action: "choose_reward_card", option_index: 2 }, { action: "choose_map_node", option_index: 0 }]);
    const card = records.find((record) => record["label"] === "reward/card")!;
    expect(card).toMatchObject({
      decider: "deepseek",
      deepseek: { choice: "card2", route: "p1", route_reason: "elite while HP is up", plan_id: "TESTRUN123:F6:reward#1", plan: ["card2", "p1"], plan_step: 1 },
      route_review: { answer: "p1", outcome: "change", reason: "elite while HP is up", plan_ref: "TESTRUN123:F6:reward#1", plan_step: 2 },
    });
    expect(card["route_plan"]).toBeUndefined();
    const change = records.find((record) => record["label"] === "map/route-change")!;
    expect(change).toMatchObject({
      ts: card["ts"],
      fingerprint: card["fingerprint"],
      decider: "deepseek",
      deepseek: { by: "deepseek", reused: true, plan_ref: "TESTRUN123:F6:reward#1", plan_step: 2, choice: "p1", reason: "elite while HP is up", from: "Shop -> Boss", to: "Elite -> Boss" },
      usage: { input_tokens: 0, output_tokens: 0 },
      route_plan: { summary: "Elite -> Boss", why: "card-reward review", floor: 6 },
      journal: { choice: "route (card-reward review): Elite -> Boss", reason: "elite while HP is up" },
    });
    expect(records.indexOf(change)).toBe(records.indexOf(card) + 1);
    expect(records.find((record) => record["label"] === "map/route-follow")).toMatchObject({ chosen: { action: "choose_map_node", option_index: 0 } });
    // Paid DeepSeek rows (ops counts): the route plan and the card reward; the change made no call.
    expect(records.filter((record) => record["deepseek"] && !(record["deepseek"] as Raw)["reused"]).map((record) => record["label"])).toEqual(["map/route-plan", "reward/card"]);
  });

  it("card reward with keep (or no route): recorded in the card row only; the next map follows the plan", async () => {
    const pickShop = (criteria: Record<string, string | null>) => Object.keys(criteria).find((key) => String(criteria[key]).includes("Shop"))!;
    for (const answer of [{ choice: "card0", route: "keep", routeReason: "shop for removal" }, { choice: "card0" }]) {
      const deepseek = new FakeDeepSeek((criteria, label) => (label === "map/route-plan" ? pickShop(criteria) : answer));
      const { actions, records } = await play([firstFork(), fightReward(), secondFork({ floor: 6, current_hp: 60 }), mainMenuPayload()], deepseek, stubJev());
      expect(actions.at(-1)).toEqual({ action: "choose_map_node", option_index: 1 });
      expect(records.some((record) => record["label"] === "map/route-change")).toBe(false);
      const card = records.find((record) => record["label"] === "reward/card")!;
      expect(card["route_review"]).toEqual(answer.route ? { answer: "keep", outcome: "keep", reason: "shop for removal" } : { answer: null, outcome: "invalid", invalid: "the answer has no route" });
      expect((card["deepseek"] as Raw)["plan_id"]).toBeUndefined();
    }
  });

  it("route: when DeepSeek fails the act's forks use the Jev/code route choice", async () => {
    const deepseek = new FakeDeepSeek(() => new Error("timeout"));
    const jev = stubJev();
    const { actions, records } = await play([firstFork(), secondFork(), mainMenuPayload()], deepseek, jev);
    expect(deepseek.calls).toHaveLength(1);
    expect(actions).toHaveLength(2);
    expect(records.filter((record) => String(record["label"]).startsWith("map/")).every((record) => record["decider"] !== "deepseek")).toBe(true);
  });
});

describe("a paid DeepSeek decision the board moved past is still logged (Y3XT F36/F46: Lord's Parasol shops)", () => {
  it("the state changes while DeepSeek decides: a 'not dispatched' row carries its answer and tokens; no action is sent", async () => {
    let moved = false;
    const deepseek = new FakeDeepSeek(() => {
      // Lord's Parasol hands over the whole stock while the call runs: the shop is gone on the re-read.
      moved = true;
      return "buy_card0";
    });
    const actions: Raw[] = [];
    const server = await startTestServer((req, res) => {
      if (req.method === "GET" && req.url === "/state") return sendJson(res, 200, envelope(moved ? mainMenuPayload() : { ...shopPayload(true), run: crabRun() }));
      req.on("data", () => undefined);
      req.on("end", () => {
        actions.push({});
        sendJson(res, 200, envelope({ action: "none", status: "completed", stable: true, message: "scripted", state: mainMenuPayload() }));
      });
    });
    servers.push(server);
    const config = loopConfig({ buildOneshot: "off" });
    const stats = await runLoop({ config, mode: "play", client: new ModClient({ baseUrl: server.url }), jev: stubJev().client, escalators: [deepseek], knowledge: testKnowledge, maxRuns: 1, maxDecisions: 5, pollIntervalMs: 1 });
    const records = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Raw);
    expect(actions).toHaveLength(0);
    expect(deepseek.calls).toHaveLength(1);
    const record = records.find((entry) => entry["label"] === "shop/buy")!;
    expect(record).toMatchObject({ decider: "deepseek", deepseek: { by: "deepseek", choice: "buy_card0" }, result: "not dispatched: state changed while deciding" });
    expect(record["usage"]).toEqual({ input_tokens: 10, output_tokens: 2, cache_hit_tokens: 7, reasoning_tokens: 1 });
    expect(stats.deepseekCalls).toBe(1);
  });
});

/* ---- consistency guard in the loop (run 2WNTQHYY4GAD, F12 rest) ------------------------------------ */

async function scriptedDeepSeek(replies: { content: string; reasoning?: string }[]): Promise<DeepSeekClient> {
  let calls = 0;
  const server = await startTestServer((req, res) => {
    req.on("data", () => undefined);
    req.on("end", () => {
      const reply = replies[Math.min(calls, replies.length - 1)]!;
      calls += 1;
      sendJson(res, 200, { choices: [{ message: { content: reply.content, reasoning_content: reply.reasoning ?? "" } }], usage: { prompt_tokens: 100, completion_tokens: 10 } });
    });
  });
  servers.push(server);
  return new DeepSeekClient({ apiKey: "test", baseUrl: server.url, model: "fake", timeoutMs: 5000, reasoningEffort: "max" });
}

/** The consistency guard and recovery tests below use the step-by-step rest question (heal o0 / smith o1). */
async function playWith(sequence: Raw[], deepseek: DeepSeekClient, jev: JevClient = stubJev().client, over: Partial<AppConfig> = { buildOneshot: "off" }) {
  const config = loopConfig(over);
  const { server, actions } = await scriptedMod(sequence);
  const stats = await runLoop({ config, mode: "play", client: new ModClient({ baseUrl: server.url }), jev, escalators: [deepseek], knowledge: testKnowledge, maxRuns: 1, maxDecisions: 20, pollIntervalMs: 1 });
  const records = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Raw);
  return { stats, actions, records };
}

describe("DeepSeek consistency guard in the loop", () => {
  const rest = (): Raw => ({ ...restPayload(), run: crabRun({ current_hp: 24 }) });

  it("reasoning 'Decisive: heal' with a smith answer and no reason: re-asked, heals, both answers logged", async () => {
    const deepseek = await scriptedDeepSeek([
      { content: '{"choice":"o1"}', reasoning: "HP 24/80, dying is worse.\nDecisive: heal." },
      { content: '{"choice":"o0","reason":"24 HP; heal"}', reasoning: "Answer: o0 (heal)." },
    ]);
    const { actions, records, stats } = await playWith([rest(), mainMenuPayload()], deepseek);
    expect(actions[0]).toEqual({ action: "choose_rest_option", option_index: 0 });
    expect(stats.deepseekCalls).toBe(2);
    const record = records.find((entry) => entry["label"] === "rest/choose")!;
    expect(record["decider"]).toBe("deepseek");
    expect(record["deepseek_consistency"]).toMatchObject({ resolution: "reasked", choice: "o0", first: { choice: "o1", reason: "" }, second: { choice: "o0", reason: "24 HP; heal" } });
    expect(record["deepseek"]).toMatchObject({ choice: "o0", consistency: { resolution: "reasked" } });
    // BXAZV0R9ZHWK F11: the row's own flag said false after DeepSeek was re-asked.
    expect(record["reasked"]).toBe(true);
  });

  it("a consistent answer is not a re-ask", async () => {
    const deepseek = await scriptedDeepSeek([{ content: '{"choice":"o0","reason":"24 HP; heal"}', reasoning: "HP 24/80.\nDecisive: heal." }]);
    const { records, stats } = await playWith([rest(), mainMenuPayload()], deepseek);
    expect(stats.deepseekCalls).toBe(1);
    const record = records.find((entry) => entry["label"] === "rest/choose")!;
    expect(record["decider"]).toBe("deepseek");
    expect(record["reasked"]).toBe(false);
  });

  it("still inconsistent with no usable conclusion: the existing fallback decides, and the answers are logged", async () => {
    const deepseek = await scriptedDeepSeek([{ content: '{"choice":"o1"}' }]);
    const { actions, records, stats } = await playWith([rest(), mainMenuPayload()], deepseek);
    expect(actions).toHaveLength(1);
    expect(stats.deepseekCalls).toBe(2);
    const record = records.find((entry) => entry["label"] === "rest/choose")!;
    expect(record["decider"]).not.toBe("deepseek");
    expect(record["deepseek_fallback"]).toBe("deepseek answer inconsistent after re-ask");
    expect(record["deepseek_consistency"]).toMatchObject({ resolution: "fallback", first: { choice: "o1" }, second: { choice: "o1" } });
    expect(record["reasked"]).toBe(true);
  });
});

/* ---- an unusable DeepSeek answer: its reasoning first, then Jev with its words (WXMB F11 rest) ---------- */

describe("DeepSeek answer unusable: recover the choice from its reasoning before Jev (WXMB F11)", () => {
  const rest = (): Raw => ({ ...restPayload(), run: crabRun({ current_hp: 24 }) });
  /** A Jev that records the state it is shown. */
  const seeingJev = () => {
    const stub = stubJev(0.05);
    const seen: Record<string, unknown>[] = [];
    const client = { model: "stub", ask: async (state: Record<string, unknown>, questions: never) => (seen.push(state), stub.client.ask(state as never, questions)) } as unknown as JevClient;
    return { client, seen, stub };
  };

  it("reply not JSON, reasoning concluded heal: heals as DeepSeek, logged 'recovered from reasoning', Jev not asked", async () => {
    const deepseek = await scriptedDeepSeek([{ content: "choice: 休息 (heal)", reasoning: "64% HP, forced elite ahead.\nDecisive: heal." }]);
    const jev = seeingJev();
    const { actions, records, stats } = await playWith([rest(), mainMenuPayload()], deepseek, jev.client);
    expect(actions[0]).toEqual({ action: "choose_rest_option", option_index: 0 });
    expect(stats.deepseekCalls).toBe(1);
    expect(jev.stub.calls).toBe(0);
    const record = records.find((entry) => entry["label"] === "rest/choose")!;
    expect(record["decider"]).toBe("deepseek");
    expect(record["deepseek_fallback"]).toBeUndefined();
    expect(record["deepseek"]).toMatchObject({ choice: "o0", recovered_from_reasoning: "Decisive: heal." });
    expect(String(record["rationale"])).toContain("recovered from reasoning");
  });

  it("an unknown option and a reasoning that settles on nothing: Jev decides, shown DeepSeek's reason", async () => {
    const deepseek = await scriptedDeepSeek([{ content: '{"choice":"sleep well","reason":"64% HP, forced elite ahead; heal"}', reasoning: "Heal or smith? Hard to say." }]);
    const jev = seeingJev();
    // At 42/80 heal and smith score close: code does not settle it, Jev is asked.
    const { actions, records } = await playWith([{ ...restPayload(), run: crabRun({ current_hp: 42 }) }, mainMenuPayload()], deepseek, jev.client);
    expect(actions).toHaveLength(1);
    const record = records.find((entry) => entry["label"] === "rest/choose")!;
    expect(record["decider"]).not.toBe("deepseek");
    expect(record["deepseek_fallback"]).toBe("deepseek failed");
    expect(jev.seen[0]?.["deepseek_advice"]).toMatchObject({ reason: "64% HP, forced elite ahead; heal" });
  });

  it("reasoning and raw reply conclude on different options: not recovered", async () => {
    const deepseek = await scriptedDeepSeek([{ content: "Final answer: o1", reasoning: "Decisive: heal." }]);
    const { records } = await playWith([rest(), mainMenuPayload()], deepseek);
    expect(records.find((entry) => entry["label"] === "rest/choose")?.["deepseek_fallback"]).toBe("deepseek failed");
  });
});
