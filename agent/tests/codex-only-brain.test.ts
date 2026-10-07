import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Brain, createRouter } from "../src/brain/brain.js";
import { BrainRouter, EngineFailure, type BrainLogRow } from "../src/brain/router.js";
import { BRAIN_RETRY_DELAYS, BrainBlockedError, BrainWait, fileBrainWait, type BrainWaitEvent } from "../src/brain/wait.js";
import { classifyBrain, brainSources } from "../src/brain/source.js";
import { CodexUsageGuard, type CodexUsage } from "../src/brain/engines/codex-usage.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainEngine, BrainRequest } from "../src/brain/types.js";
import { loadConfig } from "../src/core/config.js";
import { climbTarget, highestWon } from "../src/memory/ascension-target.js";
import fixtures from "./brain-source-fixtures.json";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { restPayload, rewardCardPayload, eventPayload, mapPayload, mainMenuPayload, testKnowledge } from "./scenarios.js";
import { envelope } from "./support.js";
import type { JevClient } from "../src/reflex/jev/client.js";

afterEach(() => vi.useRealTimers());
const config = () => loadConfig({ BRAIN_ENGINE: "deepseek", BRAIN_ENGINE_MAP: "claude", BRAIN_FALLBACK: "deepseek", BRAIN_LOG: "off" } as NodeJS.ProcessEnv).brain;
const request = (label: string): BrainRequest => ({ runId: "SAME-RUN", label, system: "固定题面", question: "固定问题", options: { a: "A", b: "B" }, payload: { fixture: 1 }, spec: pickSpec(label, { a: "A", b: "B" }, {}) });
const answer = (value: unknown): BrainAnswer => ({ engine: "codex", model: "fixture", answer: value, problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 5, outputTokens: 3 }, toolCalls: [] });

function harness(steps: (unknown | Error)[], label = "rest/plan") {
  let now = 0;
  const events: BrainWaitEvent[] = [], notices: BrainWaitEvent[] = [], sleeps: number[] = [], rows: BrainLogRow[] = [], requests: BrainRequest[] = [];
  const wait = new BrainWait({ now: () => now, originalBudgetMs: 60_000,
    sleep: async (ms) => { sleeps.push(ms); now += ms; }, event: (e) => events.push(e), notify: (e) => notices.push(e) });
  const engine: BrainEngine = { name: "codex", model: "fixture", decide: async (req) => {
    requests.push(req); const step = steps.shift(); if (step instanceof Error) throw step; return answer(step);
  } };
  const r = new BrainRouter({ config: config(), codexOnly: true, wait, now: () => now,
    engine: (name) => { expect(name).toBe("codex"); return engine; }, log: (row) => rows.push(row) });
  return { r, wait, req: request(label), events, notices, sleeps, rows, requests };
}

describe("Roy's production Codex-only brain", () => {
  it("overrides all engine selectors and fallback without a DeepSeek client", () => {
    const cfg = loadConfig({ BRAIN_ENGINE: "deepseek", BRAIN_ENGINE_MAP: "claude", BRAIN_FALLBACK: "deepseek" } as NodeJS.ProcessEnv);
    const r = createRouter(cfg, null);
    for (const label of ["map/route-plan", "reward/card", "event/plan", "shop/plan", "rest/plan", "run-plan", "fight-plan"]) expect(r.engineFor(label)).toBe("codex");
    expect(r.config).toMatchObject({ engine: "codex", fallback: null, byPrefix: {} });
  });

  it.each(["map/route-plan", "reward/card", "event/plan", "shop/plan", "rest/plan", "run-plan", "fight-plan"])("%s quota waits and recovers on the same question without any substitute", async (label) => {
    const h = harness([new EngineFailure("quota", "quota", Infinity), { choice: "b" }], label);
    const executed = vi.fn();
    const result = await h.r.decide(h.req); executed(result.answer);
    expect(h.requests).toHaveLength(2);
    expect(h.requests[0]!.questionId).toBe(h.requests[1]!.questionId);
    expect(h.requests[0]!.payload).toBe(h.requests[1]!.payload);
    expect(executed).toHaveBeenCalledExactlyOnceWith({ choice: "b" });
    expect(h.notices.map((e) => e.state)).toEqual(["paused", "resumed"]);
    expect(h.rows.map((row) => [row.engine, row.accepted])).toEqual([["codex", false], ["codex", true]]);
    expect(h.wait.suspendedMs).toBe(5_000);
  });

  it("empty/invalid answers retry the same question after the validation re-ask", async () => {
    const h = harness([null, { choice: "unknown" }, { choice: "b" }]);
    expect((await h.r.decide(h.req)).answer).toEqual({ choice: "b" });
    expect(new Set(h.requests.map((r) => r.questionId)).size).toBe(1);
    expect(h.notices.map((e) => e.state)).toEqual(["paused", "resumed"]);
  });

  it("does not drop a due embedded route or run-plan field", async () => {
    const h = harness([{ choice: "a" }, { choice: "a" }, { choice: "b", route: "keep" }]);
    h.req.spec.softValidate = (a) => (a as { route?: string }).route ? [] : ["missing route"];
    expect((await h.r.decide(h.req)).answer).toEqual({ choice: "b", route: "keep" });
    expect(h.requests).toHaveLength(3);
  });

  it("typed auth/unavailable/overload and preflight failures recover without resetting the run", async () => {
    const h = harness([new EngineFailure("login expired", "auth"), new EngineFailure("read failed", "unavailable"), new EngineFailure("busy", "overloaded"), { choice: "b" }]);
    h.r.markUnavailable("codex", "preflight failed");
    let probes = 0;
    h.r.onRecovery(async () => { probes += 1; if (probes === 1) throw new EngineFailure("preflight still down", "unavailable"); });
    await h.r.decide(h.req);
    expect(probes).toBe(5);
    expect(h.requests).toHaveLength(4);
    expect(h.notices).toHaveLength(2);
  });

  it("does not swallow programming errors or authorize a fallback", async () => {
    const bug = new TypeError("bad schema code");
    const h = harness([bug]);
    await expect(h.r.decide(h.req)).rejects.toMatchObject({ state: "fault", cause: bug });
    expect(h.requests).toHaveLength(1);
    expect(h.notices.map((e) => e.state)).toEqual(["fault"]);
  });

  it("two consecutive timeouts honor the existing ten-minute rest with bounded polling", async () => {
    const h = harness([new EngineFailure("slow", "timeout"), new EngineFailure("slow again", "timeout"), { choice: "b" }]);
    await h.r.decide(h.req);
    expect(h.requests).toHaveLength(3);
    expect(h.wait.suspendedMs).toBeGreaterThanOrEqual(605_000);
    expect(Math.max(...h.sleeps)).toBeLessThanOrEqual(1_000);
    expect(h.notices).toHaveLength(2);
  });

  it("call budget remains enforced, cancellation leaves no answer/action and emits once", async () => {
    let now = 0;
    const abort = new AbortController();
    const events: BrainWaitEvent[] = [];
    const wait = new BrainWait({ signal: abort.signal, now: () => now, sleep: async (ms) => { now += ms; abort.abort(); }, notify: (e) => events.push(e) });
    const engine = vi.fn();
    const cfg = config(); cfg.engines.codex.maxCalls = 0;
    const r = new BrainRouter({ config: cfg, codexOnly: true, wait, engine: () => ({ name: "codex", model: "fixture", decide: engine }) });
    await expect(r.decide(request("run-plan"))).rejects.toMatchObject({ state: "cancelled" });
    expect(engine).not.toHaveBeenCalled();
    expect(events.map((e) => e.state)).toEqual(["paused", "cancelled"]);
  });

  it("heartbeats remain fresh during backoff, bounded sleeps and all retries; notices are idempotent", async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const events: BrainWaitEvent[] = [], notices: BrainWaitEvent[] = [];
    const wait = new BrainWait({ event: (e) => events.push(e), notify: (e) => notices.push(e), originalBudgetMs: 123 });
    wait.pause({ ...request("rest/plan"), questionId: "fixed" }, "quota");
    for (let i = 0; i < 8; i++) {
      const retry = wait.retry();
      await vi.advanceTimersByTimeAsync(BRAIN_RETRY_DELAYS[Math.min(i, 5)]!);
      await retry;
    }
    wait.finish("resumed"); wait.finish("resumed");
    expect(notices.map((e) => e.state)).toEqual(["paused", "resumed"]);
    expect(events.filter((e) => e.state === "heartbeat").length).toBeGreaterThan(30);
    expect(events.at(-1)).toMatchObject({ original_budget_ms: 123, budget_policy: "outage_time_excluded", retries: 8, question_id: "fixed" });
    expect(wait.suspendedMs).toBe(1_130_000);
  });

  it("a long-timeout cancellation propagates while the engine is in flight", async () => {
    const abort = new AbortController();
    const wait = new BrainWait({ signal: abort.signal });
    const r = new BrainRouter({ config: config(), codexOnly: true, wait, engine: () => ({ name: "codex", model: "fixture", decide: async (_r, signal) => new Promise((_, reject) => {
      signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true }); abort.abort();
    }) }) });
    await expect(r.decide(request("rest/plan"))).rejects.toBeInstanceOf(BrainBlockedError);
  });

  it("ops STOP interrupts an in-flight call even when the call timeout is disabled", async () => {
    vi.useFakeTimers();
    let stopped = false;
    const cfg = config(); cfg.engines.codex.timeoutMs = null;
    const wait = new BrainWait({ stop: () => stopped });
    const r = new BrainRouter({ config: cfg, codexOnly: true, wait, engine: () => ({ name: "codex", model: "fixture", decide: async () => new Promise(() => {}) }) });
    const pending = r.decide(request("rest/plan"));
    const checked = expect(pending).rejects.toMatchObject({ state: "cancelled" });
    stopped = true;
    await vi.advanceTimersByTimeAsync(1_000);
    await checked;
  });

  it("preflight probe is retried, preserving engine/isolation checks", async () => {
    const h = harness([{ choice: "b" }]);
    const b = new Brain(h.r, { systemPrompt: "fixed" });
    const check = vi.fn().mockResolvedValueOnce({ ok: false, error: "not logged in" }).mockResolvedValue({ ok: true });
    await b.preflight(undefined, check);
    await h.r.decide(h.req);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("usage guard waits for a fresh passing quota reading rather than clearing a stop", async () => {
    const reading = (pct: number): CodexUsage => ({ readAt: "2026-10-07T00:00:00Z", ms: 1, plan: "plus", windows: [{ name: "primary", usedPct: pct, windowMins: 300, resetsAt: null }], credits: null, ordinaryUsageAllowed: true, reachedType: null, spendControlReached: false });
    const read = vi.fn().mockResolvedValueOnce(reading(100)).mockResolvedValueOnce(reading(95)).mockResolvedValueOnce(reading(1));
    const guard = new CodexUsageGuard({ stopPct: 80, everyCalls: 5, everyMin: 5, required: true }, read);
    await guard.start();
    await expect(guard.recover()).rejects.toMatchObject({ kind: "quota" });
    expect(guard.stopped).toBeTruthy();
    await guard.recover();
    await guard.beforeCall();
    expect(guard.stopped).toBeNull();
    expect(read).toHaveBeenCalledTimes(3);
  });
});

describe("engine provenance and climb", () => {
  it.each(fixtures)("classifies $name by actual successes", (f) => {
    expect(classifyBrain(f.rows)).toMatchObject({ source: f.source, eligible: f.eligible, successful_answers: f.counts });
  });
  it("streaming preserves Unicode, complete records and role/SL isolation; compatibility fields cannot promote", () => {
    const dir = mkdtempSync(join(tmpdir(), "source-fixed-"));
    try {
      const runs = [
        { run_id: "C", character: "SILENT", ascension: 2, victory: true, sl: true, deepseek_calls: 99 },
        { run_id: "D", character: "SILENT", ascension: 10, victory: true },
        { run_id: "M", character: "SILENT", ascension: 11, victory: true },
        { run_id: "U", character: "SILENT", ascension: 12, victory: true, ds_calls: 0 },
        { run_id: "I", character: "IRONCLAD", ascension: 5, victory: true },
      ];
      const runPath = join(dir, "runs.jsonl");
      writeFileSync(runPath, runs.map((r) => JSON.stringify(r)).join("\n") + "\n");
      writeFileSync(join(dir, "brain.jsonl"), [...fixtures.flatMap((f) => f.rows).filter((r) => r.run_id !== "U"), { run_id: "I", engine: "codex", label: "run-plan", answer: {}, accepted: true, question: "中文".repeat(70_000) }].map((r) => JSON.stringify(r)).join("\n") + '\n{"run_id":"TORN"');
      expect(brainSources(join(dir, "brain.jsonl")).get("I")?.source).toBe("codex");
      expect(climbTarget("silent", null, runPath)).toBe(3);
      expect(climbTarget("ironclad", null, runPath)).toBe(6);
      expect(highestWon("silent", runPath, true)).toBe(12);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("runtime notification files are confined to fixed fixtures", () => {
    const dir = mkdtempSync(join(tmpdir(), "brain-inbox-fixed-"));
    try {
      mkdirSync(join(dir, "ops"));
      const wait = fileBrainWait(join(dir, "logs"), join(dir, "ops"));
      wait.pause({ ...request("rest/plan"), questionId: "fixed" }, "quota");
      wait.pause(request("rest/plan"), "quota");
      wait.finish("resumed"); wait.finish("resumed");
      expect(readFileSync(join(dir, "ops/inbox-dev.md"), "utf8").match(/Codex 大脑/g)).toHaveLength(2);
      expect(JSON.parse(readFileSync(join(dir, "logs/brain-wait.json"), "utf8"))).toMatchObject({ state: "resumed", run_id: "SAME-RUN", question_id: "fixed" });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("production loop with fixed in-memory transport", () => {
  async function fixture(raw: Record<string, unknown>, fault = false) {
    const dir = mkdtempSync(join(tmpdir(), "codex-loop-fixed-"));
    const actions: unknown[] = [], asked: BrainRequest[] = [];
    let current = raw;
    let now = 0;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    const wait = new BrainWait({ now: () => now, sleep: async (ms) => { now += ms; } });
    const cfg = loadConfig({ BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" } as NodeJS.ProcessEnv);
    cfg.log.decisionLog = join(dir, "decisions.jsonl");
    cfg.runPlanLog = join(dir, "run-plans.jsonl"); cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
    const r = new BrainRouter({ config: cfg.brain, codexOnly: true, wait, engine: (name) => {
      expect(name).toBe("codex");
      return { name, model: "fixture", decide: async (req) => {
        asked.push(req);
        if (fault) throw new TypeError("fixture program fault");
        if (asked.length === 1) throw new EngineFailure("quota", "quota");
        return answer({ choice: Object.keys(req.options ?? {})[0], reason: "固定夹具" });
      } };
    } });
    const jevAsk = vi.fn().mockRejectedValue(new Error("Jev must not replace the brain"));
    const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
      if (String(url).endsWith("/state")) return Response.json(envelope(current));
      if (String(url).endsWith("/action")) {
        const intent = JSON.parse(String(options?.body)); actions.push(intent);
        current = mainMenuPayload();
        return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixture", state: current }));
      }
      throw new Error(`unexpected fixture transport ${String(url)}`);
    }) as typeof fetch });
    try {
      const result = await runLoop({ config: cfg, mode: "play", client, jev: { ask: jevAsk } as unknown as JevClient,
        brain: new Brain(r, { systemPrompt: "固定知识夹具" }), knowledge: testKnowledge,
        maxDecisions: 1, maxMinutes: 0.001, pollIntervalMs: 0 });
      return { result, asked, actions, jevAsk };
    } catch (error) { return { error, asked, actions, jevAsk }; }
    finally { clock.mockRestore(); rmSync(dir, { recursive: true, force: true }); }
  }
  it.each([["rest", restPayload], ["reward", rewardCardPayload], ["event", eventPayload]] as const)("%s outage resumes the same real screen question and dispatches once", async (_name, board) => {
    const h = await fixture(board());
    expect(h).not.toHaveProperty("error");
    expect(h.asked).toHaveLength(2);
    expect(h.asked[0]!.questionId).toBe(h.asked[1]!.questionId);
    expect(h.actions).toHaveLength(1);
    expect(h.jevAsk).not.toHaveBeenCalled();
    if ("result" in h) {
      expect(h.result?.brainPausedMs).toBe(5_000);
      expect(h.result?.activeElapsedMs).toBe(0);
    }
  });
  it("a genuine brain program fault crosses the loop's legacy fallback catches without dispatch", async () => {
    const h = await fixture(restPayload(), true);
    expect(h).toHaveProperty("error.state", "fault");
    expect(h.actions).toHaveLength(0); expect(h.jevAsk).not.toHaveBeenCalled();
  });
  it("missing route facts cannot silently select the code route fallback", async () => {
    const h = await fixture(mapPayload());
    expect(h).toHaveProperty("error.state", "fault");
    expect(h.actions).toHaveLength(0); expect(h.jevAsk).not.toHaveBeenCalled();
  });
});
