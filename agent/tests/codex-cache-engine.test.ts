/** Exercise the real engine with an in-memory app-server; no CLI, network, or live knowledge. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CodexEngine } from "../src/brain/engines/codex.js";
import { loadConfig } from "../src/core/config.js";
import { pickSpec } from "../src/brain/specs.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import type { BrainRequest } from "../src/brain/types.js";

const state = vi.hoisted(() => ({ turns: [] as Record<string, unknown>[], systems: [] as string[], status: "completed", reverted: true, missing: false }));
vi.mock("../src/brain/engines/process.js", async original => ({
  ...await original<typeof import("../src/brain/engines/process.js")>(),
  runAgent: vi.fn(async () => ({ code: 0, signal: null, stderr: "", stdout: JSON.stringify({ models: [{ slug: "gpt-6.1-sol", supported_reasoning_levels: [{ effort: "high" }] }] }) })),
}));
vi.mock("../src/brain/engines/codex-session.js", async original => ({
  ...await original<typeof import("../src/brain/engines/codex-session.js")>(),
  CodexSession: class {
    threadId = "isolated-fixed-thread";
    serverRequests = [];
    async ensureThread(system: string) { state.systems.push(system); return this.threadId; }
    async ask(q: Record<string, unknown>) {
      state.turns.push(q);
      return { status: q.signal instanceof AbortSignal && q.signal.aborted ? "aborted" : state.status, threadId: this.threadId,
        turnId: `turn-${state.turns.length}`, text: '{"choice":"a","reason":"fixed"}', reasoning: [], usage: state.missing ? null : {
          inputTokens: 100, cachedInputTokens: 80, outputTokens: 10, reasoningOutputTokens: 5 }, error: null, retries: [], errors: [],
        firstDeltaMs: 1, deltas: 1, answerChars: 31, maxBlankRun: 0, answerText: "", maxGapMs: 1, ms: 2, events: [], reverted: state.reverted };
    }
    hasPath() { return true; }
    stderrTail() { return ""; }
    async close() {}
  },
}));

let directory: string;
let engines: CodexEngine[];
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "cache-engine-")); engines = [];
  state.turns = []; state.systems = []; state.status = "completed"; state.reverted = true; state.missing = false;
  setKnowledgeCharacter("silent");
});
afterEach(async () => { for (const engine of engines) await engine.close(); rmSync(directory, { recursive: true, force: true }); setKnowledgeCharacter(null); });

function engine(physicalCallLimit?: number) {
  const config = loadConfig({ BRAIN_CODEX_BIN: "/fixed/fake-codex", BRAIN_CODEX_HOME: directory, BRAIN_CODEX_MODE: "session", BRAIN_CODEX_EFFORT: "high" });
  const instance = new CodexEngine({ settings: config.brain.engines.codex, codex: config.brain.codex, stateDir: directory, traceFile: join(directory, "trace.jsonl"), physicalCallLimit,
    readUsage: async () => ({ readAt: new Date().toISOString(), ms: 1, plan: null, windows: [{ name: "codex/primary", usedPct: 1, windowMins: 10080, resetsAt: null }], credits: null, ordinaryUsageAllowed: true, reachedType: null, spendControlReached: false }) });
  engines.push(instance); return instance;
}
function request(overrides: Partial<BrainRequest> = {}): BrainRequest {
  return { label: "event/choose", runId: "fixed-run", question: "fixed complete question", system: "complete fixed knowledge", memory: { act: "fixed" }, payload: { hp: 10 }, options: { a: "fixed option" }, spec: pickSpec("event/choose", { a: "fixed option" }, {}), ...overrides };
}
function traces() { return readFileSync(join(directory, "trace.jsonl"), "utf8").trim().split('\n').map(line => JSON.parse(line)); }

it("preserves full model inputs, model/effort/schema and revert while measuring repeated/dynamic requests", async () => {
  const e = engine();
  await e.decide(request()); await e.decide(request()); await e.decide(request({ question: "updated full question" }));
  expect(state.systems).toEqual(Array(3).fill("complete fixed knowledge"));
  expect(state.turns[0]).toMatchObject({ model: "gpt-6.1-sol", effort: "high" });
  expect(state.turns[1].prompt).toBe(state.turns[0].prompt);
  expect(state.turns[2].schema).toEqual(state.turns[0].schema);
  expect(traces()[1].cache_request.first_different_byte).toEqual({ instructions: null, user: null, schema: null });
  expect(traces()[2].cache_request.first_different_byte.user).toBeTypeOf("number");
  expect(traces().map(r => r.reverted)).toEqual([true, true, true]);
});

it("records new knowledge, schema and role/run boundaries without suppressing refresh", async () => {
  const e = engine(); await e.decide(request()); await e.decide(request({ system: "new complete knowledge" }));
  expect(traces()[1].cache_request.instructions.sha256).not.toBe(traces()[0].cache_request.instructions.sha256);
  await e.decide(request({ spec: { ...request().spec, schema: { type: "object", properties: { other: { type: "string" } }, required: ["other"] } } }));
  expect(traces()[2].cache_request.schema.sha256).not.toBe(traces()[1].cache_request.schema.sha256);
  await e.decide(request({ runId: "next-run" })); expect(traces()[3].cache_request.previous_in_scope).toBe(false);
  setKnowledgeCharacter("ironclad"); await e.decide(request({ runId: "next-run" })); expect(traces()[4].cache_request.previous_in_scope).toBe(false);
});

it("caps real engine attempts at two and preserves failures, cancellation, revert flags and unknown usage", async () => {
  const e = engine(2); state.missing = true; state.reverted = false;
  await e.decide(request()); expect(traces()[0]).not.toHaveProperty("usage"); expect(traces()[0].reverted).toBe(false);
  state.status = "failed"; await expect(e.decide(request())).rejects.toThrow(/session turn failed/);
  await expect(e.decide(request())).rejects.toThrow(/physical-call budget exhausted/);
  expect(state.turns).toHaveLength(2);
  const cancelled = engine(1); const controller = new AbortController(); controller.abort();
  await expect(cancelled.decide(request(), controller.signal)).rejects.toThrow(/aborted/);
  await expect(cancelled.decide(request())).rejects.toThrow(/budget exhausted/);
  expect(state.turns).toHaveLength(3);
});
