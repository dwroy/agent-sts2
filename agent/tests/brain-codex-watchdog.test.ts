import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodexEngine } from "../src/brain/engines/codex.js";
import * as processes from "../src/brain/engines/process.js";
import { pickSpec } from "../src/brain/specs.js";
import { loadConfig } from "../src/core/config.js";

interface PendingRun {
  aborted: boolean;
  firstToken(): void;
  event(event: Record<string, unknown>): void;
  finish(): void;
}

const directories: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});

function harness(env: Record<string, string> = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const dir = mkdtempSync(join(tmpdir(), "codex-watchdog-"));
  directories.push(dir);
  const home = join(dir, "home");
  mkdirSync(home);
  const traceFile = join(dir, "trace.jsonl");
  const runs: PendingRun[] = [];
  // Exercise the real engine watchdog, parsing and retry loop with scheduled stream events.
  // Native process startup and pipe scheduling are covered by the other Codex process tests.
  vi.spyOn(processes, "runAgent").mockImplementation(async (bin, args, options) => {
    if (args[0] === "debug") return { code: 0, signal: null, ms: 0, stderr: "",
      stdout: JSON.stringify({ models: [{ slug: "gpt-6.1-sol", supported_reasoning_levels: [{ effort: "xhigh" }] }] }) };
    expect(args[0]).toBe("exec");
    const began = Date.now();
    return new Promise<processes.AgentRun>((resolve, reject) => {
      let stdout = "", stderr = "";
      const run: PendingRun = {
        aborted: false,
        firstToken: () => {
          const line = 'event.name="codex.turn_ttft"';
          stderr += line + "\n";
          options.onStderrLine?.(line);
        },
        event: (event) => {
          const line = JSON.stringify(event);
          stdout += line + "\n";
          options.onStdoutLine?.(line);
        },
        finish: () => {
          run.event({ type: "item.completed", item: { id: "answer", type: "agent_message",
            text: JSON.stringify({ choice: "a", reason: "固定回答" }) } });
          run.event({ type: "turn.completed", usage: { input_tokens: 100, output_tokens: 10 } });
          options.signal?.removeEventListener("abort", abort);
          resolve({ code: 0, signal: null, ms: Date.now() - began, stdout, stderr });
        },
      };
      const abort = () => {
        run.aborted = true;
        reject(new processes.AgentAbortedError(bin, Date.now() - began, stdout, stderr));
      };
      options.signal?.addEventListener("abort", abort, { once: true });
      runs.push(run);
      run.event({ type: "thread.started", thread_id: `fixed-${runs.length}` });
      run.event({ type: "turn.started" });
    });
  });
  const config = loadConfig({ BRAIN_CODEX_EFFORT: "xhigh", BRAIN_CODEX_MODEL: "gpt-6.1-sol", BRAIN_CODEX_HOME: home,
    BRAIN_CODEX_BIN: "fixed-no-native-codex", BRAIN_CODEX_STALL_MS: "1000", ...env });
  const engine = new CodexEngine({ settings: config.brain.engines.codex, codex: config.brain.codex,
    stateDir: join(dir, "state"), traceFile,
    readUsage: async () => ({ readAt: new Date().toISOString(), ms: 0, plan: null, windows: [], credits: null,
      ordinaryUsageAllowed: true, reachedType: null, spendControlReached: false }) });
  const options = { a: "固定选项" };
  const request = { label: "rest/plan", system: "固定测试", memory: {}, question: "固定题", options,
    payload: {}, spec: pickSpec("rest/plan", options, {}) };
  const trace = () => readFileSync(traceFile, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  return { engine, request, runs, trace };
}

describe("Codex exec watchdog with controlled stream phases", () => {
  it("before the first token only BRAIN_CODEX_FIRST_TOKEN_MS (off by default) and the router's timeout apply: long thinking is not a stall", async () => {
    const thinking = harness();
    const answer = thinking.engine.decide(thinking.request);
    const checked = expect(answer).resolves.toMatchObject({ answer: { choice: "a" }, native: { runs: 1 } });
    await vi.advanceTimersByTimeAsync(3000);
    expect(thinking.runs).toHaveLength(1);
    expect(thinking.runs[0]!.aborted).toBe(false);
    thinking.runs[0]!.firstToken();
    thinking.runs[0]!.finish();
    await checked;
    expect(thinking.trace()).toMatchObject([{ outcome: "answered", ttft_ms: 3000, ms: 3000 }]);
    expect(vi.getTimerCount()).toBe(0);

    const capped = harness({ BRAIN_CODEX_FIRST_TOKEN_MS: "2000" });
    const retry = capped.engine.decide(capped.request);
    const retried = expect(retry).resolves.toMatchObject({ native: { runs: 2 } });
    await vi.advanceTimersByTimeAsync(1999);
    expect(capped.runs).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(capped.runs).toHaveLength(2);
    expect(capped.runs[0]!.aborted).toBe(true);
    capped.runs[1]!.finish();
    await retried;
    expect(capped.trace()[0]).toMatchObject({ outcome: "stalled", stall: "no first token within 2 s", first_token_ms: 2000 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("still resets the post-token silence deadline on stream events and retries at the exact deadline", async () => {
    const h = harness();
    const answer = h.engine.decide(h.request);
    const checked = expect(answer).resolves.toMatchObject({ native: { runs: 2 } });
    await vi.advanceTimersByTimeAsync(0);
    h.runs[0]!.firstToken();
    await vi.advanceTimersByTimeAsync(999);
    h.runs[0]!.event({ type: "turn.started" });
    await vi.advanceTimersByTimeAsync(999);
    expect(h.runs).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.runs).toHaveLength(2);
    h.runs[1]!.finish();
    await checked;
    expect(h.trace()[0]).toMatchObject({ outcome: "stalled", ttft_ms: 0, ms: 1999,
      stall: "no stream event for 1 s after the first token at 0 s (last: turn.started at 1 s)" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("still aborts long thinking on the caller signal without retrying", async () => {
    const h = harness();
    const controller = new AbortController();
    const answer = h.engine.decide(h.request, controller.signal);
    const checked = expect(answer).rejects.toThrow(/aborted/);
    await vi.advanceTimersByTimeAsync(3000);
    controller.abort();
    await checked;
    expect(h.runs).toHaveLength(1);
    expect(h.runs[0]!.aborted).toBe(true);
    expect(h.trace()[0]).toMatchObject({ outcome: "aborted", ms: 3000 });
    expect(vi.getTimerCount()).toBe(0);
  });
});
