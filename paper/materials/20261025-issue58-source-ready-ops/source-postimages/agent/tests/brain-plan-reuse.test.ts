/** Fixed interface fixtures only; no learned advice, game, network or model calls. */
import { afterEach, expect, it, vi } from "vitest";
import { createBrain, agentSystemPrompt } from "../src/brain/brain.js";
import { loadConfig } from "../src/core/config.js";
import { buildKnowledgeTools } from "../src/brain/tools/agent-knowledge.js";
import { toolCapabilities } from "../src/brain/tools/capabilities.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { RouteCalculationCache, routeBlockState, makeRoutePlan } from "../src/hand/screens/route-plan.js";
import { withRouteReview, ROUTE_REVIEW_NOTE } from "../src/hand/screens/route-review.js";
import { endgameTask } from "../src/memory/endgame-plan.js";
import * as plans from "../src/memory/run-plan.js";
import { brainAgentReport } from "../tools/brain-agent-report.js";
import { parseRunPlan } from "../src/memory/run-plan.js";
import { updateRunPlan, runPlanUpdateProblems, runPlanReply } from "../src/memory/run-plan-update.js";
import { runPlanSpec, pickSpec, stableSchema } from "../src/brain/specs.js";
import { strictSchema } from "../src/brain/engines/codex.js";
import * as route from "../src/sim/route-map.js";
import { input, costs } from "./route-fixture.js";
import { rewardCardPayload, testKnowledge } from "./scenarios.js";
import { env } from "./oneshot-support.js";
import type { BrainRequest } from "../src/brain/types.js";
import type { AskDecision } from "../src/memory/types.js";

afterEach(() => { vi.restoreAllMocks(); setKnowledgeCharacter(null); });
function state(floor = 5) {
  const raw = rewardCardPayload();
  raw.run = { ...raw.run as object, character_id: "SILENT", ascension: 10, act_id: "0", floor };
  return parseGameState(raw);
}
const full = { archetype: "格式方向", want: [], avoid: [], remove: [], block_target: 0, elites: "normal", rest: "auto",
  boss_prep: "未知", summary: "格式计划", endgame: { core: "格式核心", gaps: "未知", scaling_damage: "未知", sustainable_defense: "未知", resources: "未知", win_condition: "未知", checkpoint: "" } };
const kept = ["r1c0", "r2c0", "r3c1", "r4c1", "r5c1"];
const alternative = ["r1c2", "r2c1", "r3c1", "r4c1", "r5c1"];

it("renders exactly the registered definitions and their real input selectors on the production request", async () => {
  setKnowledgeCharacter("silent");
  const ctx = { ascension: 10, knowledgeDir: "/unused", logsDir: "/unused", state: state().raw };
  const defs = buildKnowledgeTools(ctx), brain = createBrain(loadConfig({ BRAIN_LOG: "off" }), null);
  brain.setToolContext(ctx);
  let request: BrainRequest | undefined;
  vi.spyOn(brain.router, "decide").mockImplementation(async req => {
    request = req;
    return { engine: "codex", model: "fixed", answer: { choice: "a", reason: "格式" }, problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] };
  });
  await brain.choose({}, "格式选项", { a: null }, { label: "reward/card" });
  expect(request!.tools).toHaveLength(15);
  for (const tool of request!.tools!) {
    expect(request!.system).toContain(`${tool.name} — ${tool.description}`);
    for (const key of Object.keys(tool.inputSchema.properties ?? {}).filter(k => !["limit", "offset"].includes(k))) expect(request!.system).toContain(`${key}（`);
    expect(defs.find(t => t.name === tool.name)?.inputSchema).toEqual(tool.inputSchema);
  }
  for (const use of ["启动", "本幕Boss", "最终双Boss", "爬楼路线", "删牌", "升级", "商店"]) expect(request!.system).toContain(use);
  expect(request!.system).not.toMatch(/允许0次|查相关策略与 rk 后|每道构筑题/);
  const renamed = { ...defs[0]!, name: "renamed", description: "新定义", inputSchema: { type: "object" as const, properties: { selector: { type: "string" as const } }, required: ["selector"] } };
  expect(toolCapabilities([renamed])).toBe("\n可用知识工具（按当前问题需要自行选择；正式参数约束随工具提供）：\nrenamed — 新定义\n主要输入：selector（必填）。");
  setKnowledgeCharacter("ironclad");
  expect(agentSystemPrompt()).not.toContain("kb_reflex —");
});

it("omits a plan on reuse, accepts selective changes with a benefit reason, and preserves unrelated fields", () => {
  const s = state(), previous = parseRunPlan(full, s, testKnowledge, "start");
  const payload = { facts: { your_run_plan: runPlanReply(previous) }, run_plan_task: endgameTask(s, "reward/card", true) };
  const spec = runPlanSpec("run-plan", payload);
  expect(spec.validate(undefined)).toEqual([]);
  expect(spec.validate(null)).toEqual([]);
  expect(updateRunPlan(previous, undefined, state(6), testKnowledge, "review")).toMatchObject({ outcome: "reused", changed: [] });
  expect(updateRunPlan(previous, full, state(6), testKnowledge, "review").plan).toBe(previous);
  expect(spec.validate({ endgame: { resources: "格式新资源" } }).join()).toContain("change_reason");
  const parse = vi.spyOn(plans, "parseRunPlan");
  previous.remove = ["FORMAT_ONLY"];
  const patch = { endgame: { resources: "格式新资源" }, change_reason: "当前资源变化下只修订两战资源判断，预期改善胜率，未知保留" };
  expect(spec.validate(patch)).toEqual([]);
  const result = updateRunPlan(previous, patch, state(6), testKnowledge, "review");
  expect(result).toMatchObject({ outcome: "updated", changed: ["endgame.resources"] });
  expect(result.plan).toMatchObject({ ...previous, floor: 6, trigger: "review", endgame: { ...previous.endgame, resources: "格式新资源" } });
  expect(previous.endgame?.resources).toBe("未知");
  expect(result.plan.remove).toEqual(["FORMAT_ONLY"]); expect(parse).not.toHaveBeenCalled();
  const pick = pickSpec("reward/card", { a: null }, payload);
  expect(pick.schema.required).not.toContain("run_plan");
  expect(stableSchema(pick).properties?.run_plan?.required).toEqual([]);
  expect((strictSchema(stableSchema(pick)) as any).properties.run_plan.type).toEqual(["object", "null"]);
});

it("answers a checkpoint without rebuilding the plan or requiring a pivot", () => {
  const s = state(15), previous = parseRunPlan(full, state(), testKnowledge, "start");
  const payload = { facts: { your_run_plan: runPlanReply(previous) }, run_plan_task: endgameTask(s, "rest/choose", true) };
  expect(runPlanSpec("run-plan", payload).validate(undefined).join()).toContain("checkpoint");
  const patch = { endgame: { checkpoint: "格式检查：准备程度未知，沿用现有方向" } };
  expect(runPlanUpdateProblems(patch, payload)).toEqual([]);
  const result = updateRunPlan(previous, patch, s, testKnowledge, "review");
  expect(result).toMatchObject({ outcome: "checkpoint", changed: ["endgame.checkpoint"] });
  expect(result.plan.endgame?.core).toBe(previous.endgame?.core);
});

it("does not recompute route facts, enumerate alternatives or generate candidates on identical dependencies", () => {
  const map = route.buildRouteMap(input()), cache = new RouteCalculationCache();
  const facts = vi.spyOn(route, "routeFacts"), rest = vi.spyOn(route, "nextRestFacts"), candidates = vi.spyOn(route, "candidateRoutesFacts");
  const args = { map, plan: kept, start: { hp: 40, max: 80 }, costs, cache };
  const first = routeBlockState(args), second = routeBlockState({ ...args, plan: [...kept] });
  expect(facts).toHaveBeenCalledTimes(1); expect(rest).toHaveBeenCalledTimes(1); expect(candidates).not.toHaveBeenCalled();
  expect(second.plan_facts).toEqual(first.plan_facts);
  expect(second.route_calculation).toMatchObject({ plan_facts: { outcome: "reused" }, next_rest: { outcome: "reused" } });
  (second.plan_facts as any).arrival = ["mutated"];
  expect(routeBlockState(args).plan_facts).toEqual(first.plan_facts);
  routeBlockState({ ...args, plan: undefined, candidates: {} });
  routeBlockState({ ...args, plan: undefined, candidates: {} });
  expect(candidates).toHaveBeenCalledTimes(1);
});

it("invalidates only actual dependencies: rest options, HP, costs, reachable nodes, boots and route", () => {
  const map = route.buildRouteMap(input()), cache = new RouteCalculationCache();
  const facts = vi.spyOn(route, "routeFacts"), rest = vi.spyOn(route, "nextRestFacts");
  const args = { map, plan: kept, start: { hp: 40, max: 80 }, costs, cache };
  routeBlockState(args);
  const options = [{ label: "格式休息", hp: 50, max: 80 }];
  const optionUpdate = routeBlockState({ ...args, options });
  expect(optionUpdate.route_calculation).toMatchObject({ plan_facts: { invalidated_by: ["options"] }, next_rest: { outcome: "reused" } });
  expect(facts).toHaveBeenCalledTimes(2); expect(rest).toHaveBeenCalledTimes(1);
  for (const update of [
    { start: { hp: 30, max: 80 } }, { start: { hp: 30, max: 90 } },
    { costs: { ...costs, bossStartHeal: 12 } },
    { map: { ...map, next: ["r1c0"] } }, { map: { ...map, boots: 1 } }, { plan: alternative },
  ]) {
    const result = routeBlockState({ ...args, ...update });
    expect(result.route_calculation).toMatchObject({ plan_facts: { outcome: "computed" }, next_rest: { outcome: "computed" } });
  }
  expect(facts).toHaveBeenCalledTimes(8); expect(rest).toHaveBeenCalledTimes(7);
});

it("keeps the route object on omission, keep or repeated nodes, and changes only after a reason", () => {
  const e = env(state().raw), map = route.buildRouteMap(input());
  const plan = makeRoutePlan(e, map, kept, { hp: 40, max: 80 }, costs);
  e.screenMemory.routePlan = plan;
  const block = { kind: "card" as const, state: routeBlockState({ map, plan: kept, start: { hp: 40, max: 80 }, costs }),
    note: ROUTE_REVIEW_NOTE, map, plan, remaining: kept, costs };
  const decision: AskDecision = { kind: "ask", label: "reward/card", state: {}, questions: {}, deepseek: { question: "pick", baseline: { kind: "act", label: "fixture", intent: { action: "choose_reward_card", option_index: 0 }, rationale: "格式" } },
    resolve: () => ({ intent: { action: "choose_reward_card", option_index: 0 }, rationale: "格式", confidence: null, fallback: false }) };
  const review = withRouteReview(e, decision, block);
  if (review.kind !== "ask") throw new Error("fixture");
  const answer = (route?: string, reason = "") => review.resolve({ pick: { type: "choice", choice: "a", probabilities: { a: 1 }, confidence: 1, raw: { route, route_reason: reason } } });
  for (const text of [undefined, "keep", kept.join(" ")]) {
    const result = answer(text, "仅改写描述"); result.apply?.();
    expect(result.routeReview?.outcome).toBe("keep"); expect(e.screenMemory.routePlan).toBe(plan); expect(result.plan).toBeUndefined();
  }
  expect(answer(alternative.join(" ")).routeReview).toMatchObject({ outcome: "invalid", invalid: expect.stringContaining("expected win benefit") });
  const result = answer(alternative.join(" "), "当前资源下另一支线更合适，预期保留两战资源并改善胜率");
  expect(result.routeReview?.outcome).toBe("change"); result.apply?.();
  expect(e.screenMemory.routePlan).not.toBe(plan);
  expect(e.screenMemory.runPlan).toBeUndefined();
  const payload = { run_plan_task: endgameTask(state(), "reward/card", true), route_review: block.state };
  const spec = pickSpec("reward/card", { a: null }, payload);
  expect(spec.schema.required).not.toContain("route");
  expect(stableSchema(spec).properties?.route_reason?.description).toContain("expected win benefit");
  expect(spec.softValidate?.({ choice: "a" })).toEqual([]);
  expect(spec.softValidate?.({ choice: "a", route: alternative.join(" ") }).join()).toContain("route_reason");
});

it("reports natural evidence fields without counting omitted reusable plans as failed updates", () => {
  const previous = parseRunPlan(full, state(), testKnowledge, "start");
  const payload = { facts: { act: 1, your_run_plan: runPlanReply(previous) }, run_plan_task: endgameTask(state(), "reward/card", true),
    route_review: { route_calculation: { plan_facts: { outcome: "reused", invalidated_by: [] } } } };
  const rows = [{ run_id: "fixture", question_id: "reuse", engine: "codex", label: "reward/card", knowledge: { mode: "tools" }, payload,
    answer: { choice: "a", reason: "沿用" }, accepted: true, latency_ms: 12, usage: { outputTokens: 5 }, tool_calls: [] },
    { run_id: "fixture", question_id: "change", engine: "codex", label: "reward/card", knowledge: { mode: "tools" }, payload,
      answer: { choice: "a", reason: "格式", run_plan: { endgame: { gaps: "格式新缺口" }, change_reason: "新证据支持局部更新，预期有利于胜率" } },
      accepted: true, latency_ms: 15, tool_calls: [{ name: "kb_experience", ms: 2 }] }];
  const report = brainAgentReport(rows);
  expect(report.endgame_groups[0]).toMatchObject({ questions: 2, accepted_plan_updates: 1, reuse_offered: 2, reuse_without_plan_output: 1 });
  expect(report.planning_questions[0]).toMatchObject({ question_id: "reuse", plan_output: null, question_latency_ms: 12, output_tokens: 5,
    route_calculation: payload.route_review.route_calculation, tools: [] });
  expect(report.planning_questions[1]).toMatchObject({ tools: [{ name: "kb_experience", ms: 2 }], change_reason: expect.stringContaining("预期"), answer_json_chars: expect.any(Number), raw_output_chars: null });
  expect(brainAgentReport([]).planning_questions).toEqual([]);
});

it.each(["pick", "plan"])("%s: a final omitted plan means reuse, never a resurrected patch from the rejected first answer", async kind => {
  setKnowledgeCharacter("silent");
  const brain = createBrain(loadConfig({ BRAIN_LOG: "off" }), null);
  brain.setToolContext({ ascension: 10, knowledgeDir: "/unused", logsDir: "/unused", state: state().raw });
  const payload = { facts: { your_run_plan: full }, run_plan_task: endgameTask(state(), "reward/card", true) };
  vi.spyOn(brain.router, "decide").mockImplementation(async () => ({ engine: "codex", model: "fixed",
    answer: kind === "pick" ? { choice: "a", reason: "沿用" } : { plan: ["leave"], reason: "沿用" },
    first: { answer: { run_plan: { summary: "旧回答不可捞回", change_reason: "旧回答" } }, problems: ["rejected first choice"] },
    problems: [], attempts: 2, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] }));
  const result = kind === "pick" ? await brain.choose(payload, "格式", { a: null }, { label: "reward/card" })
    : await brain.choosePlan(payload, "格式", { leave: null }, { label: "shop/plan" });
  expect(result).not.toHaveProperty("runPlan");
  expect(result).not.toHaveProperty("json.run_plan");
});
