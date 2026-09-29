/**
 * V4 M3: Jev's prompts are logged verbatim (telemetry/jev-prompt-log.ts), one row per request, joined to the
 * decision rows by decision_id; the path is configurable (JEV_PROMPT_LOG) and the key never reaches a row.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadConfig, type AppConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import { JevClient, JevError, type JevAskResult } from "../src/jev/client.js";
import type { QuestionSet } from "../src/jev/questions.js";
import { runLoop } from "../src/loop.js";
import { ModClient } from "../src/mod/client.js";
import { askJevLogged, createJevPromptLog, jevPromptLogPath, resolveJevPromptLog, type JevPromptMeta } from "../src/telemetry/jev-prompt-log.js";
import { combatPayload, mainMenuPayload, testKnowledge } from "./scenarios.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";

const dirs: string[] = [];
const servers: TestServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "jev-prompt-log-"));
  dirs.push(dir);
  return dir;
}

function readRows(path: string): Record<string, unknown>[] {
  return readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>);
}

const META: JevPromptMeta = {
  decisionId: "d-1",
  runId: "RUN000000001",
  floor: 7,
  turn: 2,
  fingerprint: "{\"hp\":55}",
  observedTs: "2026-09-29T15:00:00.000Z",
  label: "combat/plan-choice",
  jevContext: "v1",
  call: "ask",
};

const QUESTIONS: QuestionSet = { plan: { type: "choice", instructions: "Which plan should I play this turn?", criteria: { plan1: "{\"plays\":\"end turn\"}" } } };

const ANSWERS: AnswerSet = { plan: { type: "choice", choice: "plan1", probabilities: { plan1: 1 }, confidence: 0.9, raw: {} } };

describe("prompt log path", () => {
  it("sits next to the decision log unless JEV_PROMPT_LOG says otherwise; off switches it off", () => {
    expect(jevPromptLogPath("logs/decisions.jsonl")).toBe(join("logs", "jev-prompts.jsonl"));
    expect(jevPromptLogPath("/tmp/x/run-7.jsonl")).toBe("/tmp/x/run-7.jev-prompts.jsonl");
    const base = loadConfig({} as NodeJS.ProcessEnv);
    expect(base.log.jevPromptLog).toBeUndefined();
    expect(resolveJevPromptLog(base.log)).toBe(join("logs", "jev-prompts.jsonl"));
    expect(resolveJevPromptLog(loadConfig({ JEV_PROMPT_LOG: "experiments/p.jsonl" } as NodeJS.ProcessEnv).log)).toBe("experiments/p.jsonl");
    expect(resolveJevPromptLog(loadConfig({ JEV_PROMPT_LOG: "off" } as NodeJS.ProcessEnv).log)).toBeNull();
  });
});

describe("askJevLogged", () => {
  it("writes the whole request body with the decision's ids and Jev's answers, and no key", async () => {
    const path = join(tempDir(), "jev-prompts.jsonl");
    // A real client (its key is in its SDK instance) with the network call stubbed out.
    const client = new JevClient({ apiKey: "sk-SECRET-never-in-a-row", model: "jev-test" });
    const state = { fight: "monster", potion_experience: { note: "x" } };
    (client as unknown as { ask: JevClient["ask"] }).ask = async (): Promise<JevAskResult> => ({ model: "jev-test", answers: ANSWERS, inputTokens: 2014, outputTokens: 34, latencyMs: 477, requestId: "req_1" });
    const result = await askJevLogged(client, createJevPromptLog(path), META, state, QUESTIONS);
    expect(result.requestId).toBe("req_1");
    const text = readFileSync(path, "utf8");
    expect(text).not.toContain("SECRET");
    const [row] = readRows(path);
    expect(row).toMatchObject({
      decision_id: "d-1",
      run_id: "RUN000000001",
      floor: 7,
      turn: 2,
      fingerprint: "{\"hp\":55}",
      observed_ts: "2026-09-29T15:00:00.000Z",
      label: "combat/plan-choice",
      jev_context: "v1",
      call: "ask",
      request: { model: "jev-test", state, questions: QUESTIONS },
      request_id: "req_1",
      input_tokens: 2014,
      output_tokens: 34,
      answers: ANSWERS,
    });
    expect(typeof row?.["ts"]).toBe("string");
  });

  it("logs a failed request with its error and passes the error on", async () => {
    const path = join(tempDir(), "p.jsonl");
    const failing = { model: "jev-test", ask: async (): Promise<JevAskResult> => { throw new JevError("server", "529 overloaded", { status: 529 }); } };
    await expect(askJevLogged(failing, createJevPromptLog(path), { ...META, call: "reask" }, { a: 1 }, QUESTIONS)).rejects.toThrow(/overloaded/);
    const [row] = readRows(path);
    expect(row).toMatchObject({ call: "reask", request_id: null, input_tokens: null, error: { kind: "server", status: 529 } });
    expect(row?.["answers"]).toBeUndefined();
  });

  it("with no log, only asks", async () => {
    const jev = { model: "m", ask: async (): Promise<JevAskResult> => ({ model: "m", answers: ANSWERS, inputTokens: 1, outputTokens: 1, latencyMs: 1, requestId: null }) };
    await expect(askJevLogged(jev, null, META, {}, QUESTIONS)).resolves.toMatchObject({ answers: ANSWERS });
  });
});

describe("the loop logs Jev's prompts", () => {
  async function scripted(sequence: Record<string, unknown>[]): Promise<TestServer> {
    let index = 0;
    const at = (position: number) => sequence[Math.min(position, sequence.length - 1)]!;
    const server = await startTestServer((req, res) => {
      if (req.method === "GET" && req.url === "/state") return sendJson(res, 200, envelope(at(index)));
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        const intent = JSON.parse(raw || "{}") as Record<string, unknown>;
        index += 1;
        sendJson(res, 200, envelope({ action: intent["action"], status: "completed", stable: true, message: "scripted", state: at(index) }));
      });
    });
    servers.push(server);
    return server;
  }

  function stub(): { client: JevClient; asked: unknown[] } {
    const asked: unknown[] = [];
    let calls = 0;
    const client = {
      model: "stub",
      async ask(state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> }>): Promise<JevAskResult> {
        calls += 1;
        asked.push(state);
        const answers: AnswerSet = {};
        for (const [id, question] of Object.entries(questions)) {
          const first = Object.keys(question.criteria ?? {})[0] ?? "";
          answers[id] = { type: "choice", choice: first, probabilities: { [first]: 0.9 }, confidence: 0.9, raw: {} };
        }
        return { model: "stub", answers, inputTokens: 100, outputTokens: 10, latencyMs: 1, requestId: `req_stub_${calls}` };
      },
    } as unknown as JevClient;
    return { client, asked };
  }

  function config(dir: string, env: Record<string, string> = {}): AppConfig {
    const base = loadConfig(env as NodeJS.ProcessEnv);
    return { ...base, combatPlanner: "card", log: { ...base.log, decisionLog: join(dir, "decisions.jsonl") } };
  }

  it("one row per Jev request next to the decision log, with the decision row's decision_id and request id", async () => {
    const dir = tempDir();
    const server = await scripted([combatPayload(), combatPayload(), mainMenuPayload()]);
    const jev = stub();
    const cfg = config(dir);
    await runLoop({ config: cfg, mode: "play", client: new ModClient({ baseUrl: server.url }), jev: jev.client, knowledge: testKnowledge, maxRuns: 1, maxDecisions: 20, pollIntervalMs: 1 });
    const prompts = readRows(join(dir, "jev-prompts.jsonl"));
    const decisions = readRows(cfg.log.decisionLog);
    expect(prompts.length).toBe(jev.asked.length);
    expect(prompts.length).toBeGreaterThan(0);
    for (const [i, prompt] of prompts.entries()) {
      // The state sent is the one logged, byte for byte.
      expect(JSON.stringify((prompt["request"] as { state: unknown }).state)).toBe(JSON.stringify(jev.asked[i]));
      const decision = decisions.find((row) => row["decision_id"] === prompt["decision_id"]);
      expect(decision).toBeDefined();
      expect(decision?.["request_ids"]).toContain(prompt["request_id"]);
      for (const key of ["fingerprint", "observed_ts", "label", "floor", "turn"] as const) expect(prompt[key]).toEqual(decision?.[key]);
      expect(prompt["run_id"]).toBe(decision?.["run_id"] ?? null);
    }
    // Every decision row has an id of its own.
    expect(new Set(decisions.map((row) => row["decision_id"])).size).toBe(decisions.length);
  });

  it("JEV_PROMPT_LOG=off writes no prompt log", async () => {
    const dir = tempDir();
    const server = await scripted([combatPayload(), mainMenuPayload()]);
    await runLoop({ config: config(dir, { JEV_PROMPT_LOG: "off" }), mode: "play", client: new ModClient({ baseUrl: server.url }), jev: stub().client, knowledge: testKnowledge, maxRuns: 1, maxDecisions: 10, pollIntervalMs: 1 });
    expect(existsSync(join(dir, "jev-prompts.jsonl"))).toBe(false);
  });
});
