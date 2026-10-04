/**
 * RUN_PLAN_MERGE (Dai 2026-10-02, src/memory/run-plan-merge.ts): a due run plan rides on the next DeepSeek question
 * (state.run_plan_task, the answer's run_plan) instead of its own call at the map; its own call only when no question
 * carried it within RUN_PLAN_MERGE_FLOORS floors, or the act boss is next; off: exactly as before.
 *
 * Boards: U6RUE7LBUFJF F17 map -> F18 act-2 Ancient (Tezcatara) -> F18 map, and XLJQ6FPQAU7N F4 map -> F5 card reward
 * -> F5 map, A9 (tests/logged-states/oneshot). DeepSeek is a fake (or a scripted chat server): no live calls. Room costs
 * and card upgrades are fixed fixture tables.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { carriesRunPlan, pickSpec, routePlanSpec, stableSchema, withRunPlanField } from "../src/brain/specs.js";
import type { AppConfig } from "../src/core/config.js";
import { loadConfig } from "../src/core/config.js";
import { setRoomCostsForTests } from "../src/knowledge/room-costs.js";
import { choiceMessage } from "../src/brain/llm/deepseek-message.js";
import { DeepSeekClient, pickJsonObject, questionEffort, type DeepSeekAnswer } from "../src/brain/llm/deepseek.js";
import { runLoop, type LoopOptions } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { createScreenMemory, type ScreenMemory } from "../src/memory/types.js";
import { rememberMap } from "../src/hand/screens/rest.js";
import { RUN_PLAN_MERGE_FLOORS, RUN_PLAN_MERGE_NOTE, runPlanAtMap, runPlanDueAtQuestion, ridingPlanOf } from "../src/memory/run-plan-merge.js";
import { RUN_PLAN_TASK, type RunPlan } from "../src/memory/run-plan.js";
import type { JsonValue } from "../src/core/util/json.js";
import { loggedKnowledge } from "./logged.js";
import { ask, board, decide, DIR, env, scriptedDeepSeek, setupOneshotTests, stubJev, type Raw } from "./oneshot-support.js";
import { legalRoutes } from "./route-fixture.js";
import { baseState, mainMenuPayload, runPayload } from "./scenarios.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";

setupOneshotTests();

/** A9 room costs, fixed (as tests/route-review.test.ts). */
beforeAll(() =>
  setRoomCostsForTests({
    "9": {
      "1": { Monster: { n: 262, median: 2, p75: 7, mean: 4 }, Elite: { n: 50, median: 26, p75: 36, mean: 27 }, Unknown: { n: 189, median: 0, p75: 6, mean: 2 } },
      "2": { Monster: { n: 120, median: 9, p75: 16, mean: 11 }, Elite: { n: 30, median: 30, p75: 42, mean: 31 }, Unknown: { n: 90, median: 1, p75: 8, mean: 3 } },
    },
  }),
);
afterAll(() => setRoomCostsForTests(null));

const ANCIENT = "u6ru-f18-ancient";
const REWARD = "xljq-f5-reward";

/** RUN_PLAN_TASK as it was before RUN_PLAN_MERGE split it into its brief and format (the separate call is unchanged). */
const RUN_PLAN_TASK_BEFORE =
  "TASK: run plan (not an option choice; ignore the {choice, reason} reply format for this one). You set the STRATEGY for the rest of this act and run; code and a small model will apply it to card rewards, shops, removals, map routes and rest sites, and will play every card themselves. Look at the deck, relics, HP, gold, potions, the act boss and the map ahead (memory.lookahead). Name what this deck needs to beat the act boss and survive the act. act_boss_clock gives the boss's HP at this ascension (heals and wasted hits included), the turns you survive at its logged damage and so the turns the fight can last, the damage a turn that needs, and code's estimate of this deck's damage a turn in that fight (calibrated on logged A8 boss fights; Strength growth and the boss mechanic in harder_because counted). If gap_per_turn > 0, closing it comes first: want Strength/scaling and high-damage cards (AoE for two-part bosses), remove Strikes/Defends that dilute them, smith attacks; state the gap in the summary. A gap of 0 is not a reason to stop adding damage: the estimate's typical error is ~25%. " +
  'Reply with JSON only: {"archetype": "<the deck direction, max 12 words>", "want": [card ids to pick when offered, most important first, max 6], "avoid": [card ids not to take, max 6], "remove": [card ids in the deck to remove first, max 3], "block_target": <number of block cards the deck should hold by the act boss>, "elites": "seek" | "normal" | "avoid", "rest": "heal" | "smith" | "auto", "boss_prep": "<max 30 words: what to have ready for the act boss>", "summary": "<max 40 words: the plan in plain words>"}';

/** The run plan DeepSeek answers with (real card ids of the fixture data). */
const NEW_PLAN = {
  archetype: "Strength scaling with AoE",
  want: ["INFLAME", "WHIRLWIND"],
  avoid: ["HAVOC"],
  remove: ["STRIKE_IRONCLAD"],
  block_target: 6,
  elites: "normal",
  rest: "smith",
  boss_prep: "Inflame online by turn 2; keep the block potion for the big hit.",
  summary: "Add Strength and AoE, remove Strikes.",
};

/** A logged run plan of the fixture's run, made `over`. */
const loggedPlan = (runId: string, over: Partial<RunPlan>): RunPlan => ({
  runId,
  act: 1,
  floor: 9,
  hpPct: 0.5,
  trigger: "review",
  archetype: "old archetype",
  want: ["INFLAME"],
  avoid: [],
  remove: [],
  blockTarget: 5,
  elites: "normal",
  rest: "auto",
  bossPrep: "old boss prep",
  summary: "old summary",
  ...over,
});

/* ---- a fake DeepSeek and a loop run in a temporary log directory ---------------------------------- */

type Answer = { choice?: string; route?: string; route_reason?: string; run_plan?: unknown; plan?: unknown; reason?: string };

interface Call {
  label: string;
  state: Record<string, JsonValue>;
  instructions: string;
  criteria: Record<string, string | null>;
  memory: JsonValue | undefined;
  payload?: Record<string, JsonValue>;
}

class PlanFake extends DeepSeekClient {
  calls: Call[] = [];
  constructor(
    private readonly answer: (label: string, state: Record<string, JsonValue>) => Answer | Error,
    /** The router's re-ask (a route its spec rejected): the reply. */
    private readonly reask: (label: string) => string = () => "{}",
  ) {
    super({ apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", timeoutMs: 100 });
  }
  override async chat(_messages: Record<string, unknown>[], label: string) {
    this.calls.push({ label: `${label} (re-ask)`, state: {}, instructions: "", criteria: {}, memory: undefined });
    const meta = { latencyMs: 5, inputTokens: 10, outputTokens: 2, cacheHitTokens: 7, reasoningTokens: 1 };
    return { content: this.reask(label), reasoning: "", finishReason: "stop", toolCalls: [], message: {}, meta };
  }
  override async choose(state: Record<string, JsonValue>, instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}): Promise<DeepSeekAnswer> {
    const label = String(context["label"] ?? "");
    this.calls.push({ label, state, instructions, criteria, memory: context["memory"] });
    const answer = this.answer(label, state);
    if (answer instanceof Error) throw answer;
    const meta = { latencyMs: 5, inputTokens: 10, outputTokens: 2, cacheHitTokens: 7, reasoningTokens: 1 };
    return {
      ...meta,
      choice: answer.choice ?? "",
      reason: answer.reason ?? `fake reason for ${answer.choice ?? ""}`,
      ...(answer.route ? { route: answer.route } : {}),
      ...(answer.route_reason ? { routeReason: answer.route_reason } : {}),
      ...(answer.run_plan !== undefined ? { runPlan: answer.run_plan as Record<string, unknown> } : {}),
    };
  }
  override async choosePlan(state: Record<string, JsonValue>, instructions: string, criteria: Record<string, string | null>, context: Record<string, JsonValue> = {}) {
    const label = String(context["label"] ?? "");
    this.calls.push({ label, state, instructions, criteria, memory: context["memory"] });
    const answer = this.answer(label, state);
    if (answer instanceof Error) throw answer;
    return { json: answer as Record<string, unknown>, meta: { latencyMs: 5, inputTokens: 20, outputTokens: 4, cacheHitTokens: 9, reasoningTokens: 2 } };
  }
  override async askJson(payload: Record<string, JsonValue>, label: string) {
    this.calls.push({ label, state: {}, instructions: String(payload["task"] ?? ""), criteria: {}, memory: payload["memory"], payload });
    return { json: { ...NEW_PLAN, archetype: "separate call" } as Record<string, unknown>, meta: { latencyMs: 30, inputTokens: 100, outputTokens: 40, cacheHitTokens: 90, reasoningTokens: 30 } };
  }
}

const servers: TestServer[] = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function logDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "run-plan-merge-"));
  dirs.push(dir);
  return dir;
}

const rows = (file: string): Raw[] => {
  try {
    return readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Raw);
  } catch {
    return [];
  }
};

/** Seeds the run-plan log of `dir` with these plans (the loop restores the last one of the run). */
function seedPlans(dir: string, plans: RunPlan[]): void {
  writeFileSync(join(dir, "run-plans.jsonl"), plans.map((plan) => JSON.stringify({ ts: "2026-10-02T00:00:00.000Z", run: plan.runId, floor: plan.floor, trigger: plan.trigger, plan })).join("\n") + "\n");
}

/** One loop run over `sequence` with every log in `dir` (RUN_PLAN=v1, SL off). */
async function play(dir: string, sequence: Raw[], deepseek: DeepSeekClient, over: Partial<AppConfig> = {}, loop: Partial<LoopOptions> = {}) {
  const base = loadConfig({} as NodeJS.ProcessEnv);
  const cfg: AppConfig = {
    ...base,
    combatPlanner: "turn",
    deepseek: { apiKey: "test", baseUrl: "http://127.0.0.1:9", model: "fake", maxCalls: 50, timeoutMs: 100, guideFile: "", handbookFile: "", reasoningEffort: "off", combatReasoningEffort: "", reasoningLog: "" },
    escalation: { ...base.escalation, chain: ["deepseek"] },
    log: { ...base.log, decisionLog: join(dir, "decisions.jsonl") },
    runPlan: "v1",
    runPlanLog: join(dir, "run-plans.jsonl"),
    fightPlanLog: join(dir, "fight-plans.jsonl"),
    sl: { ...base.sl, enabled: false, log: null },
    ...over,
  };
  let index = 0;
  const actions: Raw[] = [];
  const at = (position: number): Raw => sequence[Math.min(position, sequence.length - 1)] as Raw;
  const server = await startTestServer((req, res) => {
    if (req.method === "GET" && req.url === "/state") return sendJson(res, 200, envelope(at(index)));
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const intent = JSON.parse(body || "{}") as Raw;
      actions.push(intent);
      index += 1;
      sendJson(res, 200, envelope({ action: intent["action"], status: "completed", stable: true, message: "scripted", state: at(index) }));
    });
  });
  servers.push(server);
  const notes: string[] = [];
  const stats = await runLoop({ config: cfg, mode: "play", client: new ModClient({ baseUrl: server.url }), jev: stubJev(), escalators: [deepseek], knowledge: loggedKnowledge, maxRuns: 1, maxDecisions: 20, pollIntervalMs: 1, restoreRun: false, onEvent: (event) => (event.type === "note" ? void notes.push(event.message) : undefined), ...loop });
  return { stats, actions, notes, records: rows(cfg.log.decisionLog), runPlans: rows(cfg.runPlanLog) };
}

/** The memory after the MAP screen before the Ancient. */
function afterMap(file: string): ScreenMemory {
  const memory = createScreenMemory("MAP");
  rememberMap(memory, parseGameState(board(file, "map_before")));
  return memory;
}

/** The act-start sequence: the F17 map (act 2 begins), the Ancient, its end page, the F18 map. */
const actStart = (): Raw[] => [board(ANCIENT, "map_before"), board(ANCIENT, "event"), board(ANCIENT, "event_done"), board(ANCIENT, "map_after"), mainMenuPayload()];
/** A legal act route for the Ancient's question. */
const actRoute = (): string => legalRoutes(ask(decide(env(board(ANCIENT, "event"), afterMap(ANCIENT)))).state["act_route"])[1]!.join(" ");
/** The run's act-1 plan (made on F9): the F17 map starts act 2, the "act" checkpoint. */
const act1Plan = (): RunPlan => loggedPlan("U6RUE7LBUFJF", { act: 1, floor: 9, hpPct: 0.5 });
/** A plan made on this map for act 2: nothing is due on these boards. */
const freshPlan = (): RunPlan => loggedPlan("U6RUE7LBUFJF", { act: 2, floor: 17, hpPct: 0.45, trigger: "act" });

/** The F4 map's route plan answer (the first legal route through the node the run took; tests/route-review.test.ts). */
function routePlanAnswer(): Answer {
  const fx = JSON.parse(readFileSync(join(DIR, `${REWARD}.json`), "utf8")) as { states: Record<string, Raw>; memory: { chosen_index: number } };
  const map = parseGameState(fx.states["map_before"]!);
  const available = (map.raw["map"] as Raw)["available_nodes"] as Raw[];
  const chosen = available.find((node) => node["index"] === fx.memory.chosen_index)!;
  const decision = decide(env(fx.states["map_before"]!, createScreenMemory("MAP")));
  const route = legalRoutes(ask(decision).state["route_map"]).find((ids) => ids[0] === `r${String(chosen["row"])}c${String(chosen["col"])}`)!;
  return { route: route.join(" "), reason: "fixture route" };
}

/* ---- tests ------------------------------------------------------------------------------------------ */

describe("RUN_PLAN_MERGE config", () => {
  it("is on by default; off when set; an unreadable value warns and stays on", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).runPlanMerge).toBe(true);
    expect(loadConfig({ RUN_PLAN_MERGE: "off" } as NodeJS.ProcessEnv).runPlanMerge).toBe(false);
    const odd = loadConfig({ RUN_PLAN_MERGE: "maybe" } as NodeJS.ProcessEnv);
    expect(odd.runPlanMerge).toBe(true);
    expect(odd.warnings.join(" ")).toMatch(/RUN_PLAN_MERGE/);
  });

  it("the separate call's task is byte for byte what it was; the merged note shares its brief and format", () => {
    expect(RUN_PLAN_TASK).toBe(RUN_PLAN_TASK_BEFORE);
    expect(RUN_PLAN_MERGE_NOTE).toContain("act_boss_clock gives the boss's HP at this ascension");
    expect(RUN_PLAN_MERGE_NOTE).toContain('"run_plan": {"archetype": "<the deck direction, max 12 words>",');
  });
});

describe("when a run plan is due, and what carries it", () => {
  const mapAt = (floor: number, run: Raw = {}, nodes: Raw[] = [{ index: 0, row: 3, col: 1, node_type: "Monster" }]) =>
    parseGameState(baseState("MAP", { run: runPayload({ floor, ...run }), map: { available_nodes: nodes, nodes: [] } }));
  const plan = (over: Partial<RunPlan> = {}) => loggedPlan("TESTRUN123", { act: 2, floor: 1, hpPct: 55 / 80, ...over });

  it("the map keeps runPlanTrigger's checkpoints: due is pending, not asked; nothing due clears it", () => {
    const memory = createScreenMemory("MAP");
    expect(runPlanAtMap(memory, mapAt(9), plan())).toEqual({ action: "wait", trigger: "review", since: 9, fresh: true });
    expect(memory.runPlanPending).toEqual({ runId: "TESTRUN123", trigger: "review", floor: 9 });
    expect(runPlanAtMap(memory, mapAt(9 + RUN_PLAN_MERGE_FLOORS - 1), plan())).toMatchObject({ action: "wait", since: 9, fresh: false });
    expect(runPlanAtMap(memory, mapAt(9), plan({ floor: 9 }))).toEqual({ action: "none" });
    expect(memory.runPlanPending).toBeUndefined();
  });

  it(`asked on its own after ${RUN_PLAN_MERGE_FLOORS} floors with no question carrying it, or right away when the act boss is next`, () => {
    const memory = createScreenMemory("MAP");
    runPlanAtMap(memory, mapAt(9), plan());
    expect(runPlanAtMap(memory, mapAt(9 + RUN_PLAN_MERGE_FLOORS), plan())).toEqual({ action: "ask", trigger: "review", why: "pending since F9 and no question carried it" });
    const boss = createScreenMemory("MAP");
    expect(runPlanAtMap(boss, mapAt(16, {}, [{ index: 0, row: 15, col: 3, node_type: "Boss" }]), plan({ floor: 8 }))).toMatchObject({ action: "ask", trigger: "review", why: expect.stringMatching(/act boss is next/) });
  });

  it("a question carries what the map left pending; the run start rides on the run's first question (before any map)", () => {
    const memory = createScreenMemory("EVENT");
    const event = parseGameState(baseState("EVENT", { run: runPayload({ floor: 1 }) }));
    expect(runPlanDueAtQuestion(memory, event, null)).toBe("start");
    expect(memory.runPlanPending).toMatchObject({ trigger: "start", floor: 1 });
    // A plan in force with nothing pending: the question goes as it is, even when a checkpoint would be due at the next map.
    const quiet = createScreenMemory("REWARD");
    expect(runPlanDueAtQuestion(quiet, mapAt(12), plan())).toBeNull();
    expect(quiet.runPlanPending).toBeUndefined();
    const pending = createScreenMemory("MAP");
    runPlanAtMap(pending, mapAt(9), plan());
    expect(runPlanDueAtQuestion(pending, mapAt(10), plan())).toBe("review");
  });

  it("an answer's run_plan is used when it is a plan", () => {
    expect(ridingPlanOf(NEW_PLAN)).toEqual({ plan: NEW_PLAN });
    expect(ridingPlanOf(undefined)).toEqual({ missing: "the answer has no run_plan" });
    expect(ridingPlanOf({ choice: "o0", reason: "x" })).toMatchObject({ missing: expect.stringMatching(/^run_plan is not a run plan/) });
    expect(ridingPlanOf("keep")).toMatchObject({ missing: expect.stringMatching(/^run_plan is not an object/) });
  });
});

describe("the answer format and the call", () => {
  const options = { o0: '{"option":"a"}', o1: '{"option":"b"}' };
  const task = { run_plan_task: { trigger: "act" } };

  it("a question carrying the run plan gets the run_plan field (never a problem); without it the spec is as before", () => {
    const plain = pickSpec("reward/card", options, {});
    const carried = pickSpec("reward/card", options, task);
    expect(plain.schema.properties?.["run_plan"]).toBeUndefined();
    expect(carried.schema.properties?.["run_plan"]?.required).toContain("archetype");
    expect(carried.schema.required).toEqual(plain.schema.required);
    expect(carried.validate({ choice: "o0", reason: "x" })).toEqual([]);
    expect(carried.validate({ choice: "o0", reason: "x", run_plan: "nonsense" })).toEqual([]);
    expect(stableSchema(plain).properties?.["run_plan"]).toBeUndefined();
    expect(stableSchema(carried).properties?.["run_plan"]).toBeDefined();
    expect(carriesRunPlan(task)).toBe(true);
    const route = withRunPlanField(routePlanSpec("map/route-plan", {}));
    expect(route.schema.properties?.["run_plan"]).toBeDefined();
    expect(route.validate({ route: "keep" })).toEqual(routePlanSpec("map/route-plan", {}).validate({ route: "keep" }));
  });

  it("its thinking effort is the run plan's when that is higher (a card reward thinks at high, the run plan at max)", () => {
    const config = { reasoningEffort: "max" };
    expect(questionEffort("reward/card", {}, config)).toBe("high");
    expect(questionEffort("reward/card", task, config)).toBe("max");
    expect(questionEffort("event/act-plan", task, config)).toBe("max");
    expect(questionEffort("reward/card", task, { reasoningEffort: "off" })).toBe("off");
  });

  it("a run plan sent as its own object after the answer joins the answer; a reply without one is read as before", () => {
    const shop = { plan: ["buy_card1"], reason: "damage" };
    expect(pickJsonObject(`${JSON.stringify(shop)}\n${JSON.stringify({ run_plan: NEW_PLAN })}`)).toEqual({ ...shop, run_plan: NEW_PLAN });
    expect(pickJsonObject(`${JSON.stringify({ choice: "review", reason: "x" })} ${JSON.stringify(shop)}`)).toEqual(shop);
    expect(pickJsonObject(JSON.stringify({ ...shop, run_plan: NEW_PLAN }))).toEqual({ ...shop, run_plan: NEW_PLAN });
  });
});

describe("act start in the loop: the Ancient's question carries the act's run plan", () => {
  it("one call: the Ancient's option, the act's route and the run plan; all three stored", async () => {
    const dir = logDir();
    seedPlans(dir, [act1Plan()]);
    const route = actRoute();
    const deepseek = new PlanFake(() => ({ choice: "o0", route, run_plan: NEW_PLAN }));
    const { stats, records, runPlans, notes } = await play(dir, actStart(), deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["event/act-plan"]);
    expect(stats.deepseekCalls).toBe(1);
    expect(notes).toContain("run plan due (act, floor 17): it rides on the next DeepSeek question");
    const call = deepseek.calls[0]!;
    expect(call.state["run_plan_task"]).toMatchObject({ trigger: "act", due_because: "act 2 begins", current_plan: { in: "state.facts.your_run_plan", made_in_act: 1, made_on_floor: 9 } });
    // The facts the plan needs are the question's own: not repeated.
    expect(call.state["run_plan_task"]).not.toHaveProperty("deck");
    expect(call.instructions.endsWith(` ${RUN_PLAN_MERGE_NOTE}`)).toBe(true);
    // The Ancient's option and route as before.
    const row = records.find((r) => r["label"] === "event/act-plan")!;
    expect(row).toMatchObject({ decider: "deepseek", deepseek: { choice: "o0", route, plan: ["o0", route] }, route_plan: { act: 2 }, run_plan_merge: { trigger: "act", outcome: "stored" } });
    expect(records.find((r) => r["label"] === "map/route-follow")).toMatchObject({ deepseek: { plan_step: 2 } });
    // The run plan: logged with its trigger and the question it rode on, restorable as a separate call's plan.
    const stored = runPlans.at(-1)!;
    expect(stored).toMatchObject({ run: "U6RUE7LBUFJF", floor: 18, trigger: "act", merged_into: "event/act-plan", decision_id: row["decision_id"], plan: { act: 2, floor: 18, archetype: NEW_PLAN.archetype, want: ["INFLAME", "WHIRLWIND"], rest: "smith", trigger: "act" }, question: { label: "event/act-plan", latency_ms: 5 } });
    expect(stored["observed_ts"]).toBe(row["observed_ts"]);
    // Its call is the question's: no usage of its own at the top level.
    expect(stored).not.toHaveProperty("latency_ms");
    // Nothing due at the next map.
    expect(notes.filter((note) => /asking DeepSeek for the run plan/.test(note))).toEqual([]);
  });

  it("RUN_PLAN_MERGE=off: the run plan's own call at the map, then the Ancient's question exactly as the screen built it", async () => {
    const dir = logDir();
    seedPlans(dir, [act1Plan()]);
    const route = actRoute();
    const deepseek = new PlanFake(() => ({ choice: "o0", route }));
    const { stats, records, runPlans } = await play(dir, actStart(), deepseek, { runPlanMerge: false });
    expect(deepseek.calls.map((call) => call.label)).toEqual(["run-plan", "event/act-plan"]);
    expect(stats.deepseekCalls).toBe(2);
    expect(deepseek.calls[0]!.payload).toMatchObject({ task: RUN_PLAN_TASK, run_state: { trigger: "act", act: 2, floor: 17 }, previous_plan: { act: 1, floor: 9 } });
    const event = deepseek.calls[1]!;
    expect(event.state).not.toHaveProperty("run_plan_task");
    const memory = afterMap(ANCIENT);
    const built = ask(decide(env(board(ANCIENT, "event"), memory)));
    expect(event.instructions).toBe(String(built.questions["pick"]?.instructions));
    expect(records.find((r) => r["label"] === "event/act-plan")).not.toHaveProperty("run_plan_merge");
    expect(runPlans.at(-1)).toMatchObject({ trigger: "act", floor: 17, plan: { archetype: "separate call" }, latency_ms: 30 });
    expect(runPlans.at(-1)).not.toHaveProperty("merged_into");
  });

  it("nothing due: the question is byte for byte the same with RUN_PLAN_MERGE on and off", async () => {
    const messages: string[] = [];
    for (const merge of [true, false]) {
      const dir = logDir();
      seedPlans(dir, [freshPlan()]);
      const route = actRoute();
      const deepseek = new PlanFake(() => ({ choice: "o0", route }));
      await play(dir, actStart(), deepseek, { runPlanMerge: merge });
      expect(deepseek.calls.map((call) => call.label)).toEqual(["event/act-plan"]);
      const call = deepseek.calls[0]!;
      expect(call.state).not.toHaveProperty("run_plan_task");
      messages.push(choiceMessage(call.state, call.instructions, call.criteria, call.memory));
    }
    expect(messages[0]).toBe(messages[1]);
  });

  it("an answer whose run_plan is no plan: the option and the route are used, the plan stays due and is asked on its own two floors on", async () => {
    const dir = logDir();
    seedPlans(dir, [act1Plan()]);
    const route = actRoute();
    const deepseek = new PlanFake(() => ({ choice: "o0", route, run_plan: { choice: "o0", reason: "echo" } }));
    // The F18 map, then the next floor's map with no question between them (the route plan followed by code).
    const later = (floor: number): Raw => {
      const raw = board(ANCIENT, "map_after");
      (raw["run"] as Raw)["floor"] = floor;
      return raw;
    };
    const sequence = [board(ANCIENT, "map_before"), board(ANCIENT, "event"), board(ANCIENT, "event_done"), board(ANCIENT, "map_after"), later(19), mainMenuPayload()];
    const { records, runPlans, notes } = await play(dir, sequence, deepseek);
    const row = records.find((r) => r["label"] === "event/act-plan")!;
    expect(row).toMatchObject({ decider: "deepseek", chosen: { action: "choose_event_option", option_index: 0 }, deepseek: { route }, route_plan: { act: 2 }, run_plan_merge: { trigger: "act", outcome: "missing", why: expect.stringMatching(/^run_plan is not a run plan/) } });
    expect(runPlans.find((r) => r["merged_into"] === "event/act-plan")).toMatchObject({ trigger: "act", error: expect.stringMatching(/not a run plan/) });
    expect(notes.some((note) => /event\/act-plan: no usable run plan in the answer .*still due since floor 17/.test(note))).toBe(true);
    // Still due at the F18 map (one floor on); asked on its own at F19, two floors after it became due.
    expect(deepseek.calls.map((call) => call.label)).toEqual(["event/act-plan", "run-plan"]);
    expect(notes).toContain("run plan (act) asked on its own: pending since F17 and no question carried it");
    expect(runPlans.at(-1)).toMatchObject({ trigger: "act", floor: 19, plan: { archetype: "separate call" } });
  });

  it("an illegal route re-asked by the router: the corrected answer without a run_plan keeps the first answer's plan", async () => {
    const dir = logDir();
    seedPlans(dir, [act1Plan()]);
    const route = actRoute();
    const deepseek = new PlanFake(() => ({ choice: "o0", route: "r9c9", run_plan: NEW_PLAN }), () => JSON.stringify({ choice: "o0", route, reason: "a legal route" }));
    const { records, runPlans } = await play(dir, actStart(), deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["event/act-plan", "event/act-plan (re-ask)"]);
    expect(records.find((r) => r["label"] === "event/act-plan")).toMatchObject({ deepseek: { choice: "o0", route }, run_plan_merge: { outcome: "stored" } });
    expect(runPlans.at(-1)).toMatchObject({ trigger: "act", merged_into: "event/act-plan", plan: { archetype: NEW_PLAN.archetype } });
  });

  it("no question at all: asked on its own once the plan has waited the floors", async () => {
    const dir = logDir();
    seedPlans(dir, [act1Plan()]);
    const deepseek = new PlanFake(() => new Error("no question expected"));
    const at = (floor: number): Raw => {
      const raw = board(ANCIENT, "map_before");
      (raw["run"] as Raw)["floor"] = floor;
      return raw;
    };
    const { notes } = await play(dir, [at(17), at(18), at(19), mainMenuPayload()], deepseek);
    expect(deepseek.calls.map((call) => call.label)).toEqual(["run-plan"]);
    expect(notes.filter((note) => /^run plan/.test(note))).toEqual(["run plan due (act, floor 17): it rides on the next DeepSeek question", "run plan (act) asked on its own: pending since F17 and no question carried it", expect.stringMatching(/^run plan \(.* context chars, 0 s, act\): separate call/)]);
  });

  it("the act boss next: asked on its own at once (the fight comes before any question)", async () => {
    const dir = logDir();
    seedPlans(dir, [loggedPlan("U6RUE7LBUFJF", { act: 2, floor: 8, hpPct: 0.45 })]);
    const deepseek = new PlanFake(() => new Error("no question expected"));
    const boss = board(ANCIENT, "map_before");
    ((boss["map"] as Raw)["available_nodes"] as Raw[])[0]!["node_type"] = "Boss";
    (boss["run"] as Raw)["floor"] = 16;
    const deepseekOnMap = new PlanFake((label) => (label === "map/route-plan" ? { route: "keep", reason: "no plan" } : new Error(`unexpected ${label}`)));
    const { notes } = await play(dir, [boss, mainMenuPayload()], deepseekOnMap);
    // Its own call first; the map's route question after it carries nothing.
    expect(deepseekOnMap.calls.map((call) => call.label).filter((label) => !label.endsWith("(re-ask)"))).toEqual(["run-plan", "map/route-plan"]);
    expect(deepseekOnMap.calls[1]!.state).not.toHaveProperty("run_plan_task");
    expect(notes).toContain("run plan (review) asked on its own: the act boss is next: its fight comes before any question could carry the plan");
    expect(deepseek.calls).toEqual([]);
  });

  it("the run start rides on the run's first question (no plan yet)", async () => {
    const dir = logDir();
    const deepseek = new PlanFake(() => ({ choice: "o1", run_plan: NEW_PLAN }));
    const { runPlans, records } = await play(dir, [board(ANCIENT, "event"), board(ANCIENT, "event_done"), board(ANCIENT, "map_after"), mainMenuPayload()], deepseek);
    // The first map's route plan comes after it, with the plan in its facts and nothing riding on it.
    expect(deepseek.calls.map((call) => call.label).filter((label) => !label.endsWith("(re-ask)"))).toEqual(["event/choose", "map/route-plan"]);
    expect(deepseek.calls[0]!.state["run_plan_task"]).toMatchObject({ trigger: "start", due_because: "the run start", current_plan: null });
    expect(deepseek.calls[1]!.state).not.toHaveProperty("run_plan_task");
    expect((deepseek.calls[1]!.state["facts"] as Record<string, JsonValue>)["your_run_plan"]).toMatchObject({ archetype: NEW_PLAN.archetype, made_on_floor: 18 });
    expect(records.find((r) => r["label"] === "event/choose")).toMatchObject({ run_plan_merge: { trigger: "start", outcome: "stored" } });
    expect(runPlans).toEqual([expect.objectContaining({ trigger: "start", merged_into: "event/choose", plan: expect.objectContaining({ archetype: NEW_PLAN.archetype }) })]);
  });

  it("the real client reads the run plan from the answer, or from its own object after it", async () => {
    const route = actRoute();
    const answer = { choice: "o0", route, reason: "soup for the strikes" };
    for (const content of [JSON.stringify({ ...answer, run_plan: NEW_PLAN }), `${JSON.stringify(answer)}\n${JSON.stringify({ run_plan: NEW_PLAN })}`]) {
      const dir = logDir();
      seedPlans(dir, [act1Plan()]);
      const { client, bodies } = await scriptedDeepSeek([{ content, reasoning: "Decisive: o0." }]);
      const { stats, records, runPlans } = await play(dir, actStart(), client);
      expect(stats.deepseekCalls).toBe(1);
      expect(records.find((r) => r["label"] === "event/act-plan")).toMatchObject({ deepseek: { choice: "o0", route }, run_plan_merge: { outcome: "stored" } });
      expect(runPlans.at(-1)).toMatchObject({ trigger: "act", merged_into: "event/act-plan", plan: { archetype: NEW_PLAN.archetype } });
      const user = String(((bodies[0]!["messages"] as Raw[])[1] as Raw)["content"]);
      expect(user).toContain('"run_plan_task":{"trigger":"act"');
    }
  });
});

describe("card reward in the loop: a review rides on it with the route review", () => {
  it("the review due at the F4 map rides on the F5 card reward (the route plan restored from the logs): one call, the card, the route and the plan", async () => {
    const dir = logDir();
    // A first process plans the act's route at the F4 map (no run plan), and stops.
    const planner = new PlanFake((label) => (label === "map/route-plan" ? routePlanAnswer() : new Error(`unexpected ${label}`)));
    await play(dir, [board(REWARD, "map_before"), mainMenuPayload()], planner, { runPlan: "off" });
    expect(planner.calls.map((call) => call.label)).toEqual(["map/route-plan"]);
    // The run's plan is 8 floors old at F4 (and HP is near its level): the review is due at the map.
    seedPlans(dir, [loggedPlan("XLJQ6FPQAU7N", { act: 1, floor: -4, hpPct: 65 / 91, trigger: "start" })]);
    const deepseek = new PlanFake((label) => (label === "reward/card" ? { choice: "card0", route: "keep", route_reason: "the plan fits", run_plan: NEW_PLAN } : new Error(`unexpected ${label}`)));
    const { records, runPlans, notes } = await play(dir, [board(REWARD, "map_before"), board(REWARD, "reward"), board(REWARD, "map_after"), mainMenuPayload()], deepseek, {}, { restoreRun: true });
    expect(deepseek.calls.map((call) => call.label)).toEqual(["reward/card"]);
    expect(notes).toContain("run plan due (review, floor 4): it rides on the next DeepSeek question");
    const call = deepseek.calls[0]!;
    expect(call.state).toHaveProperty("route_review");
    expect(call.state["run_plan_task"]).toMatchObject({ trigger: "review", due_because: "the plan is 9 floors old" });
    const row = records.find((r) => r["label"] === "reward/card")!;
    expect(row).toMatchObject({ decider: "deepseek", deepseek: { choice: "card0", route: "keep" }, route_review: { outcome: "keep" }, run_plan_merge: { trigger: "review", outcome: "stored" } });
    expect(runPlans.at(-1)).toMatchObject({ run: "XLJQ6FPQAU7N", floor: 5, trigger: "review", merged_into: "reward/card", plan: { floor: 5, trigger: "review", rest: "smith" } });
  });
});
