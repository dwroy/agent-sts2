/** Transient Jev failures (5xx / 429 / timeouts) are retried with backoff instead of ending the process. */

import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/core/config.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { JevError, isTransientJevError, withJevRetry, type JevAskResult, type JevClient } from "../src/reflex/jev/client.js";
import { runLoop, type LoopEvent } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";
import { combatPayload, mainMenuPayload, testKnowledge } from "./scenarios.js";

const servers: TestServer[] = [];
const logs: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const path of logs.splice(0)) rmSync(path, { force: true });
});

const cloudflare520 = (): Error => Object.assign(new Error("520 status code (no body)"), { status: 520 });

describe("isTransientJevError", () => {
  it("retries server errors, rate limits and timeouts but not permanent errors", () => {
    expect(isTransientJevError(cloudflare520())).toBe(true);
    expect(isTransientJevError(Object.assign(new Error("overloaded"), { status: 529 }))).toBe(true);
    expect(isTransientJevError(Object.assign(new Error("busy"), { status: 503 }))).toBe(true);
    expect(isTransientJevError(Object.assign(new Error("slow down"), { status: 429 }))).toBe(true);
    expect(isTransientJevError(Object.assign(new Error("Request timed out."), { name: "APIConnectionTimeoutError" }))).toBe(true);
    expect(isTransientJevError(new Error("read ECONNRESET"))).toBe(true);
    expect(isTransientJevError(Object.assign(new Error("bad body"), { status: 422 }))).toBe(false);
    expect(isTransientJevError(Object.assign(new Error("no key"), { status: 401 }))).toBe(false);
    expect(isTransientJevError(Object.assign(new Error("nope"), { status: 400 }))).toBe(false);
    expect(isTransientJevError(new JevError("validation", "bad"))).toBe(false);
  });
});

describe("withJevRetry", () => {
  it("backs off 2/4/8/16 s and returns once the call succeeds", async () => {
    const slept: number[] = [];
    const retries: number[] = [];
    let calls = 0;
    const result = await withJevRetry(
      async () => {
        calls += 1;
        if (calls < 4) throw cloudflare520();
        return "ok";
      },
      { sleep: async (ms) => void slept.push(ms), onRetry: (info) => retries.push(info.attempt) },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(4);
    expect(slept).toEqual([2_000, 4_000, 8_000]);
    expect(retries).toEqual([1, 2, 3]);
  });

  it("gives up after 4 retries and rethrows", async () => {
    const slept: number[] = [];
    let calls = 0;
    await expect(
      withJevRetry(async () => {
        calls += 1;
        throw cloudflare520();
      }, { sleep: async (ms) => void slept.push(ms) }),
    ).rejects.toThrow("520");
    expect(calls).toBe(5);
    expect(slept).toEqual([2_000, 4_000, 8_000, 16_000]);
  });

  it("does not retry a permanent error", async () => {
    let calls = 0;
    await expect(
      withJevRetry(async () => {
        calls += 1;
        throw Object.assign(new Error("bad body"), { status: 422 });
      }, { sleep: async () => undefined }),
    ).rejects.toThrow("bad body");
    expect(calls).toBe(1);
  });
});

describe("runLoop with a flaky Jev", () => {
  async function scripted(): Promise<{ server: TestServer; actions: unknown[] }> {
    const sequence = [combatPayload(), mainMenuPayload()];
    let index = 0;
    const actions: unknown[] = [];
    const server = await startTestServer((req, res) => {
      if (req.method === "GET" && req.url === "/state") return sendJson(res, 200, envelope(sequence[Math.min(index, 1)]));
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        actions.push(JSON.parse(raw || "{}"));
        index += 1;
        sendJson(res, 200, envelope({ action: "x", status: "completed", stable: true, message: "", state: sequence[Math.min(index, 1)] }));
      });
    });
    servers.push(server);
    return { server, actions };
  }

  function flakyJev(failures: number, error: () => Error): { client: JevClient; calls: () => number } {
    let calls = 0;
    const client = {
      model: "stub",
      async ask(_state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> | string[] }>): Promise<JevAskResult> {
        calls += 1;
        if (calls <= failures) throw error();
        const answers: AnswerSet = {};
        for (const [id, question] of Object.entries(questions)) {
          const keys = question.criteria && !Array.isArray(question.criteria) ? Object.keys(question.criteria) : ["a"];
          const first = keys[0] ?? "";
          answers[id] = { type: "choice", choice: first, probabilities: { [first]: 0.9 }, confidence: 0.9, raw: {} };
        }
        return { model: "stub", answers, inputTokens: 1, outputTokens: 1, latencyMs: 1, requestId: null };
      },
    } as unknown as JevClient;
    return { client, calls: () => calls };
  }

  function config() {
    const path = join(tmpdir(), `jev-retry-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
    logs.push(path, path.replace(/\.jsonl$/, ".states.jsonl"), path.replace(/\.jsonl$/, ".brain.jsonl"));
    const base = loadConfig({} as NodeJS.ProcessEnv);
    return { ...base, combatPlanner: "card" as const, log: { ...base.log, decisionLog: path } };
  }

  it("retries a 520 and keeps playing, logging each retry", async () => {
    const { server, actions } = await scripted();
    const jev = flakyJev(2, cloudflare520);
    const notes: string[] = [];
    const stats = await runLoop({
      config: config(),
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 1,
      pollIntervalMs: 1,
      jevRetryDelaysMs: [0, 0, 0, 0],
      onEvent: (event: LoopEvent) => {
        if (event.type === "note") notes.push(event.message);
      },
    });
    expect(stats.stoppedBecause).not.toContain("Jev failure");
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(jev.calls()).toBeGreaterThanOrEqual(3);
    expect(notes.filter((note) => note.includes("retry"))).toHaveLength(2);
    expect(notes[notes.findIndex((note) => note.includes("retry 1/4"))]).toContain("520");
  });

  it("still stops on a permanent error", async () => {
    const { server } = await scripted();
    const jev = flakyJev(99, () => Object.assign(new Error("bad body"), { status: 422 }));
    const stats = await runLoop({
      config: config(),
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 3,
      pollIntervalMs: 1,
      jevRetryDelaysMs: [0, 0, 0, 0],
    });
    expect(stats.stoppedBecause).toContain("Jev failure");
    expect(jev.calls()).toBe(1);
  });
});
