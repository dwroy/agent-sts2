/** Frozen failures + fixed clock and in-memory app-server/MCP transport. No inference or game. */
import { afterEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppServer } from "../src/brain/engines/codex-session.js";
import { CodexEngine, closeCutAnswer } from "../src/brain/engines/codex.js";
import { KnowledgeAgent } from "../src/brain/engines/knowledge-agent.js";
import { KnowledgeMcp } from "../src/brain/tools/knowledge-mcp.js";
import { handlePayload, type ToolHost } from "../src/brain/tools/mcp-server.js";
import { BrainRouter, type BrainLogRow } from "../src/brain/router.js";
import { loadConfig } from "../src/core/config.js";
import { pickSpec, runPlanSpec } from "../src/brain/specs.js";
import { DecisionBudget, withDecisionBudget } from "../src/core/decision-budget.js";
import { initialPlan } from "./route-reason-fixture.js";
import original from "./brain-budget-original.json";
import cuts from "./brain-budget-cuts.json";
import type { BrainRequest } from "../src/brain/types.js";

const dirs: string[] = [];
const engines: KnowledgeAgent[] = [];
function originalSpec() {
  const spec = pickSpec(original.label, original.options, original.payload);
  return { ...spec, validate: (answer: any) => [...spec.validate(answer),
    ...runPlanSpec("run-plan", original.payload).validate(answer?.run_plan).map(p => `run_plan: ${p}`)] };
}
afterEach(async () => {
  for (const engine of engines.splice(0)) await engine.close();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

type TurnScript = (server: AppServer, params: any, turn: number) => Promise<void> | void;
function fixture(script: TurnScript, holdFirstStart = false) {
  const dir = mkdtempSync(join(tmpdir(), "brain-evidence-")); dirs.push(dir);
  const home = join(dir, "home"); mkdirSync(home);
  const cfg = loadConfig({ BRAIN_ENGINE: "codex", BRAIN_LOG: "off", BRAIN_CODEX_HOME: home }).brain;
  cfg.log = join(dir, "brain.jsonl");
  const requests: Array<{ method: string; params: any; server: AppServer }> = [];
  let host: ToolHost, thread = 0, turns = 0, toolRuns = 0;
  const paths = new Map<string, string>();
  const pendingStarts: Array<(error: Error) => void> = [];
  const originalBegin = KnowledgeMcp.prototype.begin;
  vi.spyOn(KnowledgeMcp.prototype, "begin").mockImplementation(function (...args) { return host = originalBegin.apply(this, args); });
  vi.spyOn(KnowledgeMcp.prototype, "start").mockResolvedValue("http://fixture.invalid/mcp");
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => Response.json(await handlePayload(host, JSON.parse(init.body)))));
  vi.spyOn(AppServer.prototype, "start").mockResolvedValue();
  vi.spyOn(AppServer.prototype, "waitForExit").mockResolvedValue();
  vi.spyOn(AppServer.prototype, "close").mockImplementation(function () {
    this.dead = "closed"; for (const reject of pendingStarts.splice(0)) reject(new Error("closed pending turn/start"));
  });
  vi.spyOn(AppServer.prototype, "request").mockImplementation(async function (method, params) {
    requests.push({ method, params, server: this });
    if (method === "thread/list") return { data: [] };
    if (method === "thread/start") {
      const id = `thread-${++thread}`, path = join(dir, `${id}.jsonl`); paths.set(id, path);
      writeFileSync(path, JSON.stringify({ type: "session_meta", payload: { id } }) + "\n");
      return { thread: { id, path }, instructionSources: [] };
    }
    if (method === "turn/start") {
      const n = ++turns, id = `turn-${n}`;
      writeFileSync(paths.get(params.threadId as string)!, readFileSync(paths.get(params.threadId as string)!, "utf8")
        + JSON.stringify({ type: "turn_context", payload: { turn_id: id, model: params.model, effort: params.effort } }) + "\n");
      if (holdFirstStart && n === 1) return new Promise((_resolve, reject) => pendingStarts.push(reject));
      // The turn/start reply precedes turn notifications, as in the original traces.
      setTimeout(() => { void script(this, { ...params, turnId: id }, n); }, 0);
      return { turn: { id } };
    }
    if (method === "turn/interrupt") this.onNotification?.("turn/completed", { threadId: params.threadId, turn: { id: params.turnId, status: "interrupted" } });
    return {};
  });
  vi.spyOn(CodexEngine.prototype as any, "catalog").mockResolvedValue({ slug: "gpt-6.1-sol" });
  const agent = new KnowledgeAgent("codex", "gpt-6.1-sol", cfg, url => new CodexEngine({
    settings: cfg.engines.codex, codex: { ...cfg.codex, mode: "session" }, knowledgeAgent: true,
    ...(url ? { knowledgeMcpUrl: url } : {}), stateDir: join(dir, "state"), traceFile: join(dir, "codex-calls.jsonl"),
    readUsage: async () => ({ readAt: "2026-10-25T00:00:00Z", ms: 0, plan: null, windows: [], credits: null,
      ordinaryUsageAllowed: true, reachedType: null, spendControlReached: false }),
  })); engines.push(agent);
  const rows: BrainLogRow[] = [];
  const router = new BrainRouter({ config: cfg, codexOnly: true, knowledgeAgent: true, engine: () => agent, log: r => rows.push(r) });
  const req: BrainRequest = { label: original.label, system: "固定格式规则", question: original.question, payload: original.payload,
    options: original.options, spec: originalSpec(),
    questionId: original.question_id, runId: "FIXED-ORIGINAL", knowledge: { mode: "tools" },
    toolContext: { ascension: 10, knowledgeDir: "", logsDir: "" },
    tools: [{ name: "kb_test", description: "fixed", inputSchema: { type: "object" }, run: () => {
      toolRuns++; return { text: '{"sources":[{"source":"own","version":"fixed"}],"entries":["EXACT_FIXED_RETURN"]}' };
    } }],
  };
  vi.useFakeTimers();
  return { dir, agent, router, rows, req, requests, toolRuns: () => toolRuns, turns: () => turns };
}
function completed(server: AppServer, params: any, answer: unknown) {
  server.onNotification?.("item/completed", { threadId: params.threadId, turnId: params.turnId,
    item: { type: "agentMessage", text: JSON.stringify(answer) } });
  server.onNotification?.("turn/completed", { threadId: params.threadId, turn: { id: params.turnId, status: "completed" } });
}
const fullAnswer = { choice: "card1", reason: "格式", run_plan: { ...initialPlan,
  construction: { ...initialPlan.construction, checkpoint: 20 } } };
async function tool(server: AppServer, params: any, requestId = 999, callId = "original-tool") {
  return server.onRequest!("item/tool/call", { threadId: params.threadId, turnId: params.turnId,
    namespace: "gkb", tool: "kb_test", callId, arguments: { query: "fixed" } }, requestId);
}

it.each(cuts)("original $question_id prefix stays rejected without its required initial run_plan", cut => {
  const spec = originalSpec();
  const closed = closeCutAnswer(cut.text)!;
  expect(closed.json).not.toHaveProperty("run_plan");
  expect(spec.validate(closed.json).join()).toContain("run_plan");
  expect(spec.validate(fullAnswer)).toEqual([]);
});

it("normal tool→answer keeps exact returns, source receipt bytes and a single attempt", async () => {
  const f = fixture(async (server, params) => { await tool(server, params); completed(server, params, fullAnswer); });
  const pending = f.router.decide(f.req);
  await vi.advanceTimersByTimeAsync(1);
  const result = await pending;
  expect(result.answer).toEqual(fullAnswer); expect(f.turns()).toBe(1); expect(f.toolRuns()).toBe(1);
  expect(f.rows[0]).toMatchObject({ accepted: true, attempts: 1, evidence: { pending: false,
    attempts: [{ status: "completed", native_status: "completed" }],
    tools: [{ call_id: "original-tool", status: "completed", output: expect.stringContaining("EXACT_FIXED_RETURN") }] } });
  const receipt = f.rows[0]!.native_receipt!;
  expect(createHash("sha256").update(receipt.context_line!).digest("hex")).toBe(receipt.sha256);
});

it("the original runaway hands completed tools straight to reserved answering without another query turn", async () => {
  const f = fixture(async (server, params, n) => {
    if (n === 1) {
      await tool(server, params);
      server.onNotification?.("item/agentMessage/delta", { threadId: params.threadId, turnId: params.turnId, delta: cuts[0]!.text });
    } else completed(server, params, fullAnswer);
  });
  const pending = f.router.decide(f.req); await vi.advanceTimersByTimeAsync(1);
  const result = await pending;
  expect(result.agent?.fallback).toBe("stall"); expect(result.answer).toEqual(fullAnswer);
  expect(f.turns()).toBe(2); expect(f.toolRuns()).toBe(1);
  const starts = f.requests.filter(r => r.method === "turn/start");
  expect(JSON.stringify(starts[1]!.params.input)).toContain("EXACT_FIXED_RETURN");
  expect(f.rows[0]!.evidence?.attempts.map(a => a.phase)).toEqual(["query", "answer"]);
  expect(f.requests.filter(r => r.method === "thread/start").map(r => Boolean(r.params.dynamicTools))).toEqual([true, false]);
});

it("no output consumes only 180s query + 120s answer and records both real attempts on the 300s failure", async () => {
  const f = fixture(() => {});
  const pending = withDecisionBudget(new DecisionBudget("fixed", "brain", () => Date.now(), 300_000, 0),
    () => f.router.decide(f.req)).catch(error => error);
  await vi.advanceTimersByTimeAsync(180_001);
  expect(f.turns()).toBe(2);
  await vi.advanceTimersByTimeAsync(120_000);
  expect((await pending).message).toContain("budget exhausted");
  expect(f.rows).toHaveLength(1);
  expect(f.rows[0]).toMatchObject({ accepted: false, attempts: 2, latency_ms: 300_000,
    evidence: { cancellation: "outer-budget", attempts: [{ phase: "query", status: "aborted" }, { phase: "answer", status: "aborted" }] } });
  await vi.advanceTimersByTimeAsync(30_000); expect(f.turns()).toBe(2);
});

it("outer budget after completed tools preserves attempts, full returns and receipt before async cleanup", async () => {
  let seen: (() => void) | undefined;
  const called = new Promise<void>(resolve => { seen = resolve; });
  const f = fixture(async (server, params) => { await tool(server, params); seen!(); });
  const abort = new AbortController(); f.req.budgetSignal = abort.signal;
  const pending = f.router.decide(f.req).catch(error => error);
  await vi.advanceTimersByTimeAsync(1); await called;
  abort.abort(); await vi.advanceTimersByTimeAsync(0);
  expect((await pending).message).toContain("budget exhausted");
  expect(f.rows[0]).toMatchObject({ accepted: false, attempts: 1, native_receipt: { source: "turn_context" },
    tool_calls: [{ name: "kb_test", callId: "original-tool", output: expect.stringContaining("EXACT_FIXED_RETURN") }],
    evidence: { cancellation: "outer-budget", attempts: [{ status: "aborted", native_status: null }] } });
  const journal = readFileSync(join(f.dir, "brain-evidence.jsonl"), "utf8");
  expect(journal).toContain('"cleanup":"finished"');
  expect(f.turns()).toBe(1);
});

it("same call ID is executed once, stale turns are rejected, pending tools are explicitly unknown", async () => {
  const f = fixture(async (server, params) => {
    await Promise.all([tool(server, params), tool(server, params, 1000)]);
    const stale: any = await tool(server, { ...params, turnId: "another-turn" }, 1001, "stale");
    expect(stale.success).toBe(false);
    completed(server, params, fullAnswer);
  });
  const pending = f.router.decide(f.req); await vi.advanceTimersByTimeAsync(1); await pending;
  expect(f.toolRuns()).toBe(1);
  expect(f.rows[0]!.evidence?.tools.map(t => t.status)).toEqual(["completed", "rejected"]);
});

it("a late tool result is appended after the immutable timeout snapshot, never filled into its old row", async () => {
  let resolveTool!: (value: { text: string }) => void;
  const f = fixture(async (server, params) => { await tool(server, params); });
  f.req.tools![0]!.run = () => new Promise(resolve => { resolveTool = resolve; });
  const abort = new AbortController(); f.req.budgetSignal = abort.signal;
  const pending = f.router.decide(f.req).catch(error => error);
  await vi.advanceTimersByTimeAsync(1);
  abort.abort(); await vi.advanceTimersByTimeAsync(0); await pending;
  expect(f.rows[0]!.evidence).toMatchObject({ pending: true, tools: [{ status: "pending", output: null }] });
  resolveTool({ text: "ORIGINAL_LATE_BYTES" }); await vi.advanceTimersByTimeAsync(0);
  expect(f.rows[0]!.evidence!.tools[0]!.output).toBeNull();
  const events = readFileSync(join(f.dir, "brain-evidence.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line));
  expect(events.filter(e => e.kind === "tool").at(-1)).toMatchObject({ question_id: f.req.questionId,
    value: { status: "completed", output: "ORIGINAL_LATE_BYTES", call_id: "original-tool" } });
  expect(f.turns()).toBe(1);
});

it("existing complete plans can be reused without outputting a new plan through the same adapter", async () => {
  const f = fixture((server, params) => completed(server, params, { choice: "card1", reason: "格式复用" }));
  const payload: any = structuredClone(f.req.payload);
  payload.facts.your_run_plan = fullAnswer.run_plan;
  payload.run_plan_task.plan_reuse = true; payload.run_plan_task.endgame_plan_required = false;
  f.req.payload = payload;
  const spec = pickSpec(f.req.label, original.options, payload);
  f.req.spec = { ...spec, validate: (answer: any) => [...spec.validate(answer), ...runPlanSpec("run-plan", payload).validate(answer?.run_plan)] };
  const pending = f.router.decide(f.req); await vi.advanceTimersByTimeAsync(1);
  expect((await pending).answer).toEqual({ choice: "card1", reason: "格式复用" });
  expect(f.rows[0]).toMatchObject({ accepted: true, attempts: 1 });
});

it("initial plan omissions remain invalid, the single re-ask gets the same acquired tool returns", async () => {
  const f = fixture(async (server, params, n) => {
    if (n === 1) await tool(server, params);
    completed(server, params, n === 1 ? { choice: "card1", reason: "格式缺失计划" } : fullAnswer);
  });
  const pending = f.router.decide(f.req); await vi.advanceTimersByTimeAsync(1);
  expect((await pending).answer).toEqual(fullAnswer);
  expect(f.rows[0]).toMatchObject({ accepted: true, reasks: 1, attempts: 2, first: { problems: [expect.stringContaining("run_plan")] } });
  const starts = f.requests.filter(r => r.method === "turn/start");
  expect(JSON.stringify(starts[1]!.params.input)).toContain("EXACT_FIXED_RETURN");
  expect(f.toolRuns()).toBe(1);
});

it("an unacknowledged turn/start is cancelled before the final phase, with an explicitly unknown turn/receipt", async () => {
  const f = fixture((server, params) => completed(server, params, fullAnswer), true);
  const pending = f.router.decide(f.req);
  await vi.advanceTimersByTimeAsync(180_001);
  expect((await pending).answer).toEqual(fullAnswer);
  expect(f.turns()).toBe(2);
  expect(f.rows[0]!.evidence?.attempts[0]).toMatchObject({ status: "aborted", turn_id: null, native_receipt: null, cleanup: "finished" });
});

it("the final harness waits for the query harness exit and uses only the remaining total allowance", async () => {
  const f = fixture((server, params, n) => { if (n === 2) completed(server, params, fullAnswer); });
  let exit!: () => void;
  const exited = new Promise<void>(resolve => { exit = resolve; });
  vi.mocked(AppServer.prototype.waitForExit).mockReturnValue(exited);
  const pending = f.router.decide(f.req);
  await vi.advanceTimersByTimeAsync(180_000);
  expect(f.turns()).toBe(1);
  await vi.advanceTimersByTimeAsync(1000); expect(f.turns()).toBe(1);
  exit(); await vi.advanceTimersByTimeAsync(1);
  expect((await pending).answer).toEqual(fullAnswer); expect(f.turns()).toBe(2);
  expect(f.rows[0]!.evidence?.attempts.map(a => a.phase)).toEqual(["query", "answer"]);
});

it("a revoked MCP host cannot execute a lookup or spend the following question's allowance", async () => {
  const mcp = new KnowledgeMcp(), run = vi.fn(() => ({ text: "fixed" })), limited = vi.fn();
  const ctx = { ascension: 0, knowledgeDir: "", logsDir: "" };
  const tools = [{ name: "kb_test", description: "fixed", inputSchema: { type: "object" as const }, run }];
  const old = mcp.begin(tools, ctx, 1, Infinity, limited);
  mcp.end(); const current = mcp.begin(tools, ctx, 1, Infinity, limited);
  expect((await old.call("kb_test", {})).isError).toBe(true);
  expect((await current.call("kb_test", {})).text).toBe("fixed");
  expect(run).toHaveBeenCalledTimes(1); await mcp.close();
});

it("JSON-RPC retries execute once within a turn while a later turn may reuse a request ID", async () => {
  const server = new AppServer({ bin: "unused", args: [], cwd: "unused", env: {} });
  const writes: unknown[] = [];
  vi.spyOn(server as any, "write").mockImplementation((message: unknown) => { writes.push(message); });
  server.onRequest = vi.fn(async () => ({ success: true, contentItems: [] }));
  const dispatch = (message: unknown) => (server as any).dispatch(message);
  const request = { id: 999, method: "item/tool/call", params: { threadId: "fixed", turnId: "turn1", callId: "one" } };
  dispatch(request); dispatch(request); await Promise.resolve();
  expect(server.onRequest).toHaveBeenCalledTimes(1);
  expect(writes).toHaveLength(2);
  const next = server.request("turn/start", { threadId: "fixed" }, 1000);
  dispatch({ id: 1, result: { turn: { id: "turn2" } } }); await next;
  dispatch({ ...request, params: { ...request.params, turnId: "turn2" } }); await Promise.resolve();
  expect(server.onRequest).toHaveBeenCalledTimes(2);
});
