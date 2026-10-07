/**
 * V4 brain, DeepSeek engine: with the default configuration (BRAIN_* unset) every request DeepSeek gets through
 * the brain is byte-for-byte the request v3's client sent for the same call, and the result is v3's own; with
 * tools it runs DeepSeek's native function calling with the tools in process. No network: a fake fetch captures
 * the request bodies.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type Brain } from "../src/brain/brain.js";
import { createBrain } from "./legacy-brain.js";
import { DeepSeekEngine } from "../src/brain/engines/deepseek.js";
import { pickSpec } from "../src/brain/specs.js";
import { loadConfig } from "../src/core/config.js";
import { DeepSeekAnswerError, DeepSeekClient } from "../src/brain/llm/deepseek.js";
import { isRunPlanReply } from "../src/memory/run-plan.js";
import type { ToolDef } from "../src/brain/tools/types.js";
import type { JsonValue } from "../src/core/util/json.js";
import { buildRouteMap, routeView } from "../src/sim/route-map.js";
import { input } from "./route-fixture.js";

/** The act-start joint question's map (tests/route-fixture.ts). */
const actRoute = JSON.parse(JSON.stringify(routeView(buildRouteMap(input())))) as JsonValue;

type Reply = { content?: string; reasoning?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] };

const realFetch = globalThis.fetch;
let bodies: string[] = [];
let replies: Reply[] = [];
let index = 0;

/** A chat-completions reply per request from now on, in order (the last one repeated); request bodies kept verbatim. */
function reply(...next: Reply[]): void {
  replies = next;
  index = 0;
}

beforeEach(() => {
  bodies = [];
  replies = [];
  index = 0;
  globalThis.fetch = (async (_url: unknown, init?: { body?: unknown }) => {
    bodies.push(String(init?.body));
    const r = replies[Math.min(index, replies.length - 1)] ?? { content: "{}" };
    index += 1;
    const message: Record<string, unknown> = { content: r.content ?? "", ...(r.reasoning ? { reasoning_content: r.reasoning } : {}), ...(r.tool_calls ? { tool_calls: r.tool_calls } : {}) };
    return new Response(JSON.stringify({ choices: [{ message, finish_reason: "stop" }], usage: { prompt_tokens: 1000, completion_tokens: 50, prompt_cache_hit_tokens: 600, completion_tokens_details: { reasoning_tokens: 30 } } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const dir = mkdtempSync(join(tmpdir(), "brain-ds-"));
writeFileSync(join(dir, "guide.md"), "GUIDE: fight the boss with block.");
writeFileSync(join(dir, "handbook.md"), "HANDBOOK: keep one potion for the boss.");

function client(): DeepSeekClient {
  return new DeepSeekClient({ apiKey: "k-test", baseUrl: "http://deepseek.invalid", model: "deepseek-flash", timeoutMs: 5000, guideFile: join(dir, "guide.md"), handbookFile: join(dir, "handbook.md"), reasoningEffort: "max", combatReasoningEffort: "high" });
}

function brainOf(ds: DeepSeekClient, env: Record<string, string> = {}): { brain: Brain; log: string } {
  const log = join(mkdtempSync(join(tmpdir(), "brain-log-")), "brain.jsonl");
  const config = loadConfig({ BRAIN_LOG: log, ...env } as unknown as NodeJS.ProcessEnv);
  return { brain: createBrain(config, ds), log };
}

const rows = (log: string): Record<string, unknown>[] => readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>);

// A card reward as the loop asks it: memory sections in cache order (one empty: dropped), facts in the state. The
// options as V4 M2 renders them: facts only (copies in the deck, our runs' outcome statistics), no code value or rank.
const memory: Record<string, JsonValue> = { act: "第2幕 boss: 骇鳗", history: "F1 拿了 挑衅", this_floor: "", knowledge: "经验: 格挡不足" };
const state: Record<string, JsonValue> = { screen: "REWARD", facts: { deck: ["STRIKE", "DEFEND"], hp: "50/80 (62%)", outcome_stats_basis: "outcome_stats = A8 数据" }, run_brief: { act: 2, notes: [] } };
const criteria: Record<string, string | null> = {
  card0: JSON.stringify({ card: "挑衅", type: "Skill", cost: 1, in_deck: 0, outcome_stats: "A8 第2幕 拿了 n=6 过本幕boss 33% 均终层34.5 / 给了没拿 无数据" }),
  card1: JSON.stringify({ card: "重刃", type: "Attack", cost: 2, in_deck: 0, outcome_stats: "无数据" }),
  skip: JSON.stringify({ card: "skip", note: "take no card" }),
};
const context = { label: "reward/card", memory: { ...memory } };

describe("brain with the default configuration sends v3's exact DeepSeek requests", () => {
  it("choose (a card reward): one request, identical body, identical result", async () => {
    const ds = client();
    const answer = '{"choice": "card0", "reason": "block for the boss"}';
    reply({ content: answer, reasoning: "Weighing card0 vs card1. Decision: card0." });
    const direct = await ds.choose(state, "Pick a card.", criteria, context);
    const v3 = [...bodies];
    bodies.length = 0;
    const { brain, log } = brainOf(ds);
    reply({ content: answer, reasoning: "Weighing card0 vs card1. Decision: card0." });
    const routed = await brain.choose(state, "Pick a card.", criteria, context);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toBe(v3[0]);
    // The result is v3's own (latency aside), with no brain note: the decision row stays as it was.
    expect({ ...routed, latencyMs: 0 }).toEqual({ ...direct, latencyMs: 0 });
    expect("brain" in routed).toBe(false);
    const row = rows(log)[0]!;
    expect(row).toMatchObject({ label: "reward/card", engine: "deepseek", model: "deepseek-flash", answer: { choice: "card0", reason: "block for the boss" }, problems: [], reasks: 0, attempts: 1, question: "Pick a card.", options: criteria, payload: state });
    expect(row["memory"]).toEqual(memory);
    expect(row["usage"]).toMatchObject({ inputTokens: 1000, cacheHitTokens: 600, outputTokens: 50, reasoningTokens: 30 });
    expect(JSON.stringify(row)).not.toContain("k-test");
  });

  it("choose with v3's consistency re-ask: both requests identical, still one router call", async () => {
    const ds = client();
    // An empty reason is suspect: v3 re-asks once in the same conversation.
    const script: Reply[] = [{ content: '{"choice": "card1", "reason": ""}', reasoning: "Decision: card1." }, { content: '{"choice": "card1", "reason": "damage"}', reasoning: "card1." }];
    reply(...script);
    const direct = await ds.choose(state, "Pick a card.", criteria, context);
    const v3 = [...bodies];
    expect(v3).toHaveLength(2);
    bodies.length = 0;
    const { brain, log } = brainOf(ds);
    reply(...script);
    const routed = await brain.choose(state, "Pick a card.", criteria, context);
    expect(bodies).toEqual(v3);
    expect(routed.consistency).toEqual(direct.consistency);
    expect(rows(log)[0]).toMatchObject({ attempts: 2, reasks: 0 });
  });

  it("the escalation context (Jev's near-guess) sends the same request as v3", async () => {
    const ds = client();
    const escalation = { ...context, label: "combat/card-pick", why_escalated: "close call", jev_choice: "card1", jev_confidence: 0.4 };
    reply({ content: '{"choice": "card0", "reason": "ok"}' });
    await ds.choose(state, "Pick.", criteria, escalation);
    const v3 = [...bodies];
    bodies.length = 0;
    reply({ content: '{"choice": "card0", "reason": "ok"}' });
    await brainOf(ds).brain.choose(state, "Pick.", criteria, escalation);
    expect(bodies).toEqual(v3);
  });

  it("choosePlan (a shop list): identical body and result", async () => {
    const ds = client();
    const shop: Record<string, string | null> = { buy_card0: JSON.stringify({ card: "耸肩无视", price: 49, affordable_now: true }), remove: JSON.stringify({ price: 75 }), leave: JSON.stringify({ end: "stop" }) };
    const shopState: Record<string, JsonValue> = { screen: "SHOP", your_cards: { c0: "打击", c1: "防御" } };
    const answer = '{"plan": ["buy_card0", "remove:c0", "leave"], "reason": "block and thin"}';
    reply({ content: answer });
    const direct = await ds.choosePlan(shopState, "Plan the visit.", shop, { label: "shop/plan", memory: { ...memory } });
    const v3 = [...bodies];
    bodies.length = 0;
    reply({ content: answer });
    const routed = await brainOf(ds).brain.choosePlan(shopState, "Plan the visit.", shop, { label: "shop/plan", memory: { ...memory } });
    expect(bodies).toEqual(v3);
    expect(routed.json).toEqual(direct.json);
    expect({ ...routed.meta, latencyMs: 0 }).toEqual({ ...direct.meta, latencyMs: 0 });
  });

  it("askJson (run plan with its format check, fight plan without): identical bodies and results", async () => {
    const ds = client();
    const plan = '{"archetype": "block", "want": ["IMPERVIOUS"], "avoid": [], "remove": ["STRIKE_IRONCLAD"], "block_target": 7, "elites": "normal", "rest": "heal", "boss_prep": "potions", "summary": "block up"}';
    const runPayload: Record<string, JsonValue> = { task: "TASK: run plan", run_state: { trigger: "act_start", act: 2 }, memory: { ...memory }, previous_plan: { archetype: "old" } };
    reply({ content: plan });
    const direct = await ds.askJson(runPayload, "run-plan", isRunPlanReply);
    const v3 = [...bodies];
    bodies.length = 0;
    reply({ content: plan });
    const routed = await brainOf(ds).brain.askJson(runPayload, "run-plan", isRunPlanReply);
    expect(bodies).toEqual(v3);
    expect(routed.json).toEqual(direct.json);

    const fight = '{"approach": "setup", "setup_cards": ["INFLAME"], "focus_enemy": "", "potions": {"BLOOD_POTION": "emergency"}, "key_turns": "t3", "summary": "scale"}';
    const fightPayload: Record<string, JsonValue> = { task: "TASK: fight plan", fight_state: { enemies: ["骇鳗"] }, memory: { ...memory }, run_plan: { archetype: "block" }, note: "revise" };
    bodies.length = 0;
    reply({ content: fight });
    const directFight = await ds.askJson(fightPayload, "fight-plan");
    const v3Fight = [...bodies];
    bodies.length = 0;
    reply({ content: fight });
    const routedFight = await brainOf(ds).brain.askJson(fightPayload, "fight-plan");
    expect(bodies).toEqual(v3Fight);
    expect(routedFight.json).toEqual(directFight.json);
  });

  it("a run-plan echo is recovered from the reasoning as v3 did; a reply with no plan throws v3's error", async () => {
    const ds = client();
    const payload: Record<string, JsonValue> = { task: "TASK: run plan", run_state: { act: 1 }, memory: { ...memory } };
    const echo: Reply = { content: '{"choice": "review", "reason": "run plan"}', reasoning: 'Draft: {"archetype": "strength", "want": ["INFLAME"], "summary": "scale"}' };
    reply(echo);
    const routed = await brainOf(ds).brain.askJson(payload, "run-plan", isRunPlanReply);
    expect(routed.recovered).toBe(true);
    expect(routed.json["archetype"]).toBe("strength");
    reply({ content: '{"choice": "review", "reason": "x"}', reasoning: "no draft" });
    await expect(brainOf(ds).brain.askJson(payload, "run-plan", isRunPlanReply)).rejects.toBeInstanceOf(DeepSeekAnswerError);
  });

  it("v3's answer errors reach the caller unchanged (recoverFrom still works) and nothing falls back", async () => {
    const ds = client();
    reply({ content: "not json at all", reasoning: "Heal is right here. Decision: card1" });
    const { brain, log } = brainOf(ds, { BRAIN_FALLBACK: "claude" });
    const error = await brain.choose(state, "Pick.", criteria, context).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DeepSeekAnswerError);
    expect((error as DeepSeekAnswerError).recoverFrom(criteria)?.option).toBe("card1");
    expect(bodies).toHaveLength(1);
    expect(rows(log)[0]).toMatchObject({ engine: "deepseek", error_kind: "error" });
  });

  it("the act-start question's route (M2): a missing or illegal route is re-asked once in the same conversation; BRAIN_DEEPSEEK_REASK=off plays v3's answer", async () => {
    const ds = client();
    const withMap: Record<string, JsonValue> = { ...state, act_route: actRoute };
    reply({ content: '{"choice": "card0", "reason": "ok"}' }, { content: '{"choice": "card0", "reason": "ok", "route": ["r1c0", "r2c0", "r3c1", "r4c1"]}' });
    const { brain, log } = brainOf(ds);
    const routed = await brain.choose(withMap, "Pick a card and the act route.", criteria, context);
    expect(routed.choice).toBe("card0");
    // A list of ids reads as the same ids.
    expect(routed.route).toBe("r1c0 r2c0 r3c1 r4c1");
    expect(routed.brain).toMatchObject({ engine: "deepseek", attempts: 2 });
    expect(bodies).toHaveLength(2);
    const second = JSON.parse(bodies[1]!) as { messages: { role: string; content: string }[] };
    expect(second.messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(second.messages[3]!.content).toContain('missing "route": the node ids from one of state.act_route.next_nodes to the boss');
    expect(rows(log)[0]).toMatchObject({ reasks: 1, attempts: 2, problems: [], first: { problems: ['missing "route": the node ids from one of state.act_route.next_nodes to the boss'] } });
    // Switched off: one call, v3's answer played as it is, the problem logged.
    bodies.length = 0;
    reply({ content: '{"choice": "card0", "reason": "ok", "route": "r1c2 r2c0"}' });
    const off = brainOf(client(), { BRAIN_DEEPSEEK_REASK: "off" });
    const once = await off.brain.choose(withMap, "Pick a card and the act route.", criteria, context);
    expect(once.route).toBe("r1c2 r2c0");
    expect(bodies).toHaveLength(1);
    expect(rows(off.log)[0]!["problems"]).toEqual(["route: 第 2 步 r1c2 → r2c0：没有连线（r1c2 只连到 r2c1、r2c2；没有飞行靴次数）", "route: 终点 r2c0（问号）不是 boss：路线要一直走到 boss（r4c1、r5c1）"]);
  });
});

describe("DeepSeek engine beyond v3", () => {
  const echoTool: ToolDef = {
    name: "kb_monster",
    description: "Monster facts.",
    inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    run: (input, ctx) => ({ text: `${String(input["name"])}: A${ctx.ascension} HP 150 (n=22)` }),
  };

  it("with tools: native function calling, tools run in process and are recorded, the answer parsed", async () => {
    const ds = client();
    reply(
      { content: "", reasoning: "Need the eel's HP.", tool_calls: [{ id: "call_1", function: { name: "kb_monster", arguments: '{"name": "骇鳗"}' } }] },
      { content: '{"choice": "card0", "reason": "block vs 骇鳗"}', reasoning: "Done." },
    );
    const engine = new DeepSeekEngine(ds);
    const spec = pickSpec("reward/card", criteria, state);
    const answer = await engine.decide({ label: "reward/card", system: ds.systemPrompt, memory, question: "Pick a card.", options: criteria, payload: state, spec, tools: [echoTool], toolContext: { ascension: 8, knowledgeDir: "/k", logsDir: "/l" } });
    expect(answer.answer).toEqual({ choice: "card0", reason: "block vs 骇鳗" });
    expect(answer.toolCalls).toEqual([{ name: "kb_monster", input: { name: "骇鳗" }, output: "骇鳗: A8 HP 150 (n=22)", ms: expect.any(Number) }]);
    expect(answer.attempts).toBe(2);
    expect(answer.usage).toMatchObject({ inputTokens: 2000, cacheHitTokens: 1200, outputTokens: 100 });
    const first = JSON.parse(bodies[0]!) as { tools: { function: { name: string } }[]; response_format?: unknown; messages: { role: string; content: string }[] };
    expect(first.tools.map((tool) => tool.function.name)).toEqual(["kb_monster"]);
    expect(first.response_format).toBeUndefined();
    expect(first.messages[0]!.content).toContain("# Tools");
    const second = JSON.parse(bodies[1]!) as { messages: { role: string; content: string; tool_call_id?: string; reasoning_content?: string }[] };
    expect(second.messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "tool"]);
    expect(second.messages[2]!.reasoning_content).toBe("Need the eel's HP.");
    expect(second.messages[3]).toMatchObject({ tool_call_id: "call_1", content: "骇鳗: A8 HP 150 (n=22)" });
  });

  it("the router's re-ask continues the conversation with the problems (valid choices listed for a pick)", async () => {
    const ds = client();
    const withMap: Record<string, JsonValue> = { ...state, act_route: actRoute };
    reply({ content: '{"choice": "card0", "reason": "ok", "route": "r9c9"}' }, { content: '{"choice": "card0", "reason": "ok", "route": "r1c2 r2c2 r3c2 r4c1"}' });
    const { brain } = brainOf(ds, { BRAIN_DEEPSEEK_REASK: "on" });
    const routed = await brain.choose(withMap, "Pick a card and the act route.", criteria, context);
    expect(routed.route).toBe("r1c2 r2c2 r3c2 r4c1");
    const first = JSON.parse(bodies[0]!) as { messages: { role: string; content: string }[] };
    const second = JSON.parse(bodies[1]!) as { messages: { role: string; content: string }[] };
    expect(second.messages[1]!.content).toBe(first.messages[1]!.content);
    expect(second.messages[2]!.content).toBe('{"choice":"card0","reason":"ok","route":"r9c9"}');
    expect(second.messages[3]!.content).toContain("route: 第 1 步 r9c9：地图上没有这个节点");
    expect(second.messages[3]!.content).toContain("Valid choices: card0, card1, skip.");
  });
});

describe("V3-final's empty-reply fixes on V4's paths (v3 fa46f6c, 7b54237)", () => {
  it("a shop plan through the brain: an empty reply takes the plan its reasoning drafted that the screen's own check accepts", async () => {
    const ds = client();
    const shop: Record<string, string | null> = { buy_card1: JSON.stringify({ price: 50 }), buy_card3: JSON.stringify({ price: 75 }), leave: null };
    // The reasoning drafts two plans; the screen accepts only buy_card3 (say buy_card1 is sold out now).
    reply({ content: "", reasoning: 'First {"plan": ["buy_card1"], "reason": "a"} then {"plan": ["buy_card3"], "reason": "b"} ... wait {"plan": ["buy_card1"], "reason": "c"}' });
    const { brain } = brainOf(ds);
    const screen = (json: Record<string, unknown>) => Array.isArray(json["plan"]) && !(json["plan"] as unknown[]).includes("buy_card1");
    const { json, recovered, note } = await brain.choosePlan({ screen: "SHOP" }, "Plan the shop.", shop, { label: "shop/plan", memory: { ...memory } }, screen);
    expect(json).toEqual({ plan: ["buy_card3"], reason: "b" });
    expect(recovered).toBe(true);
    expect(note).toMatch(/empty reply \(finish_reason stop; .*\): the answer taken from the end of its reasoning/);
    expect(bodies).toHaveLength(1);
  });

  it("the router's re-ask path: an empty reply takes the answer its reasoning drafted; none drafted names the finish_reason", async () => {
    const ds = client();
    const engine = new DeepSeekEngine(ds);
    const spec = pickSpec("reward/card", criteria, state);
    const req = { label: "reward/card", system: ds.systemPrompt, memory, question: "Pick a card.", options: criteria, payload: state, spec, reask: { answer: "(no answer)", problems: ["no answer"] } };
    reply({ content: "", reasoning: 'I will send {"choice": "card1", "reason": "damage"}' });
    expect((await engine.decide(req)).answer).toEqual({ choice: "card1", reason: "damage" });
    reply({ content: "", reasoning: "thinking, no answer drafted" });
    const none = await engine.decide(req);
    expect(none.answer).toBeNull();
    expect(none.problems).toEqual(["the reply was empty (finish_reason stop) and its reasoning drafted no valid answer"]);
  });
});
