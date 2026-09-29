/** V4 brain router (src/brain/router.ts): engine choice from BRAIN_*, validation, one re-ask, fallback, rests, log. */

import { describe, expect, it } from "vitest";

import { createRouter } from "../src/brain/brain.js";
import { BrainRouter, EngineFailure, labelPrefix, type BrainLogRow } from "../src/brain/router.js";
import { pickSpec } from "../src/brain/specs.js";
import type { BrainAnswer, BrainEngine, BrainRequest, EngineName } from "../src/brain/types.js";
import { brainLogPath, ConfigError, loadConfig } from "../src/config.js";
import { buildRouteMap, routeView } from "../src/strategy/route-map.js";
import type { ToolDef } from "../src/tools/types.js";
import { input } from "./route-fixture.js";

const options = { a: JSON.stringify({ option: "heal" }), b: JSON.stringify({ option: "smith" }) };

function request(label = "rest/plan", extra: Partial<BrainRequest> = {}): BrainRequest {
  return { label, system: "SYSTEM", memory: { act: "act 1" }, question: "Heal or smith?", options, payload: { hp: 20 }, spec: pickSpec(label, options, {}), ...extra };
}

type Step = unknown | Error | "hang";

/** A scripted engine: each call takes the next step (an answer object, an Error to throw, or "hang"). */
class FakeEngine implements BrainEngine {
  readonly requests: BrainRequest[] = [];
  aborted = 0;
  constructor(
    readonly name: EngineName,
    private readonly steps: Step[],
    readonly model = `${name}-model`,
  ) {}
  async decide(req: BrainRequest, signal?: AbortSignal): Promise<BrainAnswer> {
    this.requests.push(req);
    const step = this.steps[Math.min(this.requests.length - 1, this.steps.length - 1)];
    if (step instanceof Error) throw step;
    if (step === "hang") {
      return new Promise((_, reject) => signal?.addEventListener("abort", () => {
        this.aborted += 1;
        reject(new Error("aborted"));
      }));
    }
    return { engine: this.name, model: this.model, answer: step as unknown, problems: [], attempts: 1, latencyMs: 5, usage: { inputTokens: 100, outputTokens: 10, cacheHitTokens: 40, cacheWriteTokens: 20, costUsd: 0.01 }, toolCalls: [], raw: JSON.stringify(step) };
  }
}

function router(env: Record<string, string>, engines: Partial<Record<EngineName, FakeEngine>>, clock = { now: 0 }): { router: BrainRouter; rows: BrainLogRow[] } {
  const rows: BrainLogRow[] = [];
  const config = loadConfig(env as unknown as NodeJS.ProcessEnv).brain;
  return {
    rows,
    router: new BrainRouter({
      config,
      engine: (name) => {
        const engine = engines[name];
        if (!engine) throw new Error(`brain engine ${name} is not implemented yet`);
        return engine;
      },
      log: (row) => rows.push(row),
      now: () => clock.now,
    }),
  };
}

describe("engine choice", () => {
  it("label prefixes and BRAIN_ENGINE / BRAIN_ENGINE_<PREFIX>", () => {
    expect(labelPrefix("map/route-plan")).toBe("MAP");
    expect(labelPrefix("run-plan")).toBe("RUN_PLAN");
    expect(labelPrefix("selection/upgrade")).toBe("SELECTION");
    expect(router({}, {}).router.engineFor("reward/card")).toBe("deepseek");
    const { router: r } = router({ BRAIN_ENGINE: "claude", BRAIN_ENGINE_MAP: "deepseek", BRAIN_ENGINE_RUN_PLAN: "claude" }, {});
    expect(r.engineFor("reward/card")).toBe("claude");
    expect(r.engineFor("map/route-plan")).toBe("deepseek");
    expect(r.engineFor("run-plan")).toBe("claude");
  });

  it("reads the BRAIN_* settings and rejects bad values", () => {
    const config = loadConfig({ BRAIN_ENGINE: "Claude", BRAIN_FALLBACK: "deepseek", BRAIN_CLAUDE_MODEL: "opus", BRAIN_CLAUDE_MODEL_MAP: "claude-opus-5", BRAIN_CLAUDE_EFFORT: "high", BRAIN_CLAUDE_TIMEOUT_MS: "90000", BRAIN_DEEPSEEK_REASK: "on", BRAIN_TOOLS: "off" } as unknown as NodeJS.ProcessEnv);
    expect(config.brain).toMatchObject({ engine: "claude", fallback: "deepseek", tools: false, log: null });
    expect(config.brain.engines.claude).toMatchObject({ model: "opus", modelByPrefix: { MAP: "claude-opus-5" }, effort: "high", timeoutMs: 90000 });
    expect(config.brain.engines.deepseek).toMatchObject({ reask: true, timeoutMs: null, modelByPrefix: {} });
    // Defaults: deepseek, the current Sonnet for claude, 5 minutes for CLI agents.
    const defaults = loadConfig({} as NodeJS.ProcessEnv);
    expect(defaults.brain).toMatchObject({ engine: "deepseek", fallback: null, reask: null, tools: null, byPrefix: {} });
    expect(defaults.brain.engines.claude).toMatchObject({ model: "claude-sonnet-5", timeoutMs: 300_000 });
    expect(brainLogPath(defaults)).toBe("./logs/brain.jsonl");
    expect(brainLogPath({ ...defaults, log: { ...defaults.log, decisionLog: "/tmp/x.jsonl" } })).toBe("/tmp/x.brain.jsonl");
    expect(brainLogPath(loadConfig({ BRAIN_LOG: "off" } as unknown as NodeJS.ProcessEnv))).toBe("");
    expect(() => loadConfig({ BRAIN_ENGINE: "gpt" } as unknown as NodeJS.ProcessEnv)).toThrow(ConfigError);
    expect(() => loadConfig({ BRAIN_ENGINE_MAP: "gpt" } as unknown as NodeJS.ProcessEnv)).toThrow(/BRAIN_ENGINE_MAP/);
    expect(() => loadConfig({ BRAIN_CLAUDE_EFFORT: "extreme" } as unknown as NodeJS.ProcessEnv)).toThrow(/BRAIN_CLAUDE_EFFORT/);
    expect(() => loadConfig({ BRAIN_REASK: "maybe" } as unknown as NodeJS.ProcessEnv)).toThrow(/BRAIN_REASK/);
  });

  it("an engine that is not built yet says so; the fallback answers", async () => {
    const config = loadConfig({ BRAIN_ENGINE: "codex", BRAIN_LOG: "off" } as unknown as NodeJS.ProcessEnv);
    await expect(createRouter(config, null).decide(request())).rejects.toThrow("brain engine codex is not implemented yet (implemented: deepseek, claude)");
    const deepseek = new FakeEngine("deepseek", [{ choice: "a", reason: "heal" }]);
    const { router: r, rows } = router({ BRAIN_ENGINE: "dsh", BRAIN_FALLBACK: "deepseek" }, { deepseek });
    const answer = await r.decide(request());
    expect(answer.engine).toBe("deepseek");
    expect(answer.fellBackFrom).toEqual({ engine: "dsh", error: "brain engine dsh is not implemented yet" });
    expect(rows[0]!.fell_back_from).toMatchObject({ engine: "dsh", kind: "unavailable" });
  });
});

describe("validation and the one re-ask", () => {
  it("re-asks once with the specific problems and takes the corrected answer", async () => {
    const claude = new FakeEngine("claude", [{ choice: "c", reason: "?" }, { choice: "b", reason: "smith the bash" }]);
    const { router: r, rows } = router({ BRAIN_ENGINE: "claude" }, { claude });
    const answer = await r.decide(request());
    expect(answer.answer).toEqual({ choice: "b", reason: "smith the bash" });
    expect(answer.problems).toEqual([]);
    expect(answer.attempts).toBe(2);
    expect(answer.usage).toEqual({ inputTokens: 200, outputTokens: 20, cacheHitTokens: 80, cacheWriteTokens: 40, costUsd: 0.02 });
    expect(claude.requests[1]!.reask).toEqual({ answer: '{"choice":"c","reason":"?"}', problems: ['choice "c" is not one of a, b'] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ engine: "claude", model: "claude-model", reasks: 1, attempts: 2, first: { answer: { choice: "c", reason: "?" }, problems: ['choice "c" is not one of a, b'] }, answer: { choice: "b" } });
  });

  it("a second bad answer leaves the answer null (the caller keeps its state)", async () => {
    const claude = new FakeEngine("claude", [{ choice: "c" }, { choice: "d" }]);
    const { router: r, rows } = router({ BRAIN_ENGINE: "claude" }, { claude });
    const answer = await r.decide(request());
    expect(answer.answer).toBeNull();
    expect(answer.problems).toEqual(['choice "d" is not one of a, b']);
    expect(claude.requests).toHaveLength(2);
    expect(rows[0]).toMatchObject({ answer: null, reasks: 1 });
  });

  it("a failed re-ask keeps the first problems and no answer", async () => {
    const claude = new FakeEngine("claude", [{ choice: "c" }, new Error("process died")]);
    const answer = await router({ BRAIN_ENGINE: "claude" }, { claude }).router.decide(request());
    expect(answer.answer).toBeNull();
    expect(answer.problems).toEqual(['choice "c" is not one of a, b', "re-ask failed: process died"]);
  });

  it("BRAIN_<ENGINE>_REASK=off: one call, the answer kept with its problems", async () => {
    const claude = new FakeEngine("claude", [{ choice: "c" }]);
    const answer = await router({ BRAIN_ENGINE: "claude", BRAIN_CLAUDE_REASK: "off" }, { claude }).router.decide(request());
    expect(claude.requests).toHaveLength(1);
    expect(answer.answer).toEqual({ choice: "c" });
    expect(answer.problems).toEqual(['choice "c" is not one of a, b']);
  });

  it("DeepSeek without tools is not re-asked by default (v3 repairs itself); with tools it is", async () => {
    const deepseek = new FakeEngine("deepseek", [{ choice: "c" }, { choice: "a", reason: "ok" }]);
    await router({}, { deepseek }).router.decide(request());
    expect(deepseek.requests).toHaveLength(1);
    const tool: ToolDef = { name: "kb_x", description: "x", inputSchema: { type: "object" }, run: () => ({ text: "x" }) };
    const withTools = new FakeEngine("deepseek", [{ choice: "c" }, { choice: "a", reason: "ok" }]);
    const answer = await router({ BRAIN_DEEPSEEK_TOOLS: "on" }, { deepseek: withTools }).router.decide(request("rest/plan", { tools: [tool], toolContext: { ascension: 8, knowledgeDir: "/k", logsDir: "/l" } }));
    expect(withTools.requests).toHaveLength(2);
    expect(answer.answer).toEqual({ choice: "a", reason: "ok" });
  });
});

describe("route answers (M2): a forced re-ask, soft problems, the run id", () => {
  /** The act-start joint question's map: the route is checked on it (tests/route-fixture.ts). */
  const act = { act_route: JSON.parse(JSON.stringify(routeView(buildRouteMap(input())))) as Record<string, unknown> };
  const joint = (): BrainRequest => ({ ...request("event/act-plan"), payload: act, spec: pickSpec("event/act-plan", options, act) });

  it("DeepSeek without tools is re-asked on an illegal route (the spec asks for it); the corrected answer is taken", async () => {
    const deepseek = new FakeEngine("deepseek", [{ choice: "a", reason: "x", route: "r1c2 r2c0 r3c1 r4c1" }, { choice: "a", reason: "x", route: "r1c0 r2c0 r3c1 r4c1" }]);
    const { router: r, rows } = router({}, { deepseek });
    const answer = await r.decide({ ...joint(), runId: "RUN1" });
    expect(deepseek.requests).toHaveLength(2);
    expect(deepseek.requests[1]!.reask!.problems).toEqual(["route: 第 2 步 r1c2 → r2c0：没有连线（r1c2 只连到 r2c1、r2c2；没有飞行靴次数）"]);
    expect(answer.answer).toEqual({ choice: "a", reason: "x", route: "r1c0 r2c0 r3c1 r4c1" });
    expect(answer.problems).toEqual([]);
    // brain.jsonl carries the run id (the same value as decisions.jsonl's run_id).
    expect(rows[0]).toMatchObject({ run_id: "RUN1", reasks: 1, attempts: 2 });
    expect(Object.keys(rows[0]!)[1]).toBe("run_id");
  });

  it("a route still illegal after the re-ask leaves the answer usable (its choice stands), the problems reported", async () => {
    const deepseek = new FakeEngine("deepseek", [{ choice: "b", reason: "x", route: "r2c0" }, { choice: "b", reason: "y", route: "r9c9" }]);
    const answer = await router({}, { deepseek }).router.decide(joint());
    expect(answer.answer).toEqual({ choice: "b", reason: "y", route: "r9c9" });
    expect(answer.problems).toEqual(["route: 第 1 步 r9c9：地图上没有这个节点"]);
    // A re-ask that breaks the choice keeps the first answer (its route problem reported).
    const worse = new FakeEngine("deepseek", [{ choice: "b", reason: "x", route: "r2c0" }, { choice: "zz", reason: "y" }]);
    const kept = await router({}, { deepseek: worse }).router.decide(joint());
    expect(kept.answer).toEqual({ choice: "b", reason: "x", route: "r2c0" });
    expect(kept.problems).toEqual(["route: 第 1 步 r2c0：不是下一步能走的节点（能走：r1c0、r1c2）", "route: 终点 r2c0（问号）不是 boss：路线要一直走到 boss（r4c1、r5c1）", 're-ask: choice "zz" is not one of a, b']);
    // An explicit BRAIN_DEEPSEEK_REASK=off wins: one call, the answer with its soft problem.
    const off = new FakeEngine("deepseek", [{ choice: "b", reason: "x", route: "r2c0" }]);
    const once = await router({ BRAIN_DEEPSEEK_REASK: "off" }, { deepseek: off }).router.decide(joint());
    expect(off.requests).toHaveLength(1);
    expect(once.answer).toEqual({ choice: "b", reason: "x", route: "r2c0" });
    // Without a run id the row has none.
    const { router: r, rows } = router({}, { deepseek: new FakeEngine("deepseek", [{ choice: "a", reason: "x", route: "r1c0 r2c0 r3c1 r4c1" }]) });
    await r.decide(joint());
    expect(rows[0]!.run_id).toBeUndefined();
  });
});

describe("tools per engine", () => {
  const tool: ToolDef = { name: "kb_x", description: "x", inputSchema: { type: "object" }, run: () => ({ text: "x" }) };
  const withTools = request("rest/plan", { tools: [tool], toolContext: { ascension: 8, knowledgeDir: "/k", logsDir: "/l" } });

  it("DeepSeek gets no tools by default (v3 parity); claude does; BRAIN_TOOLS switches them", async () => {
    const deepseek = new FakeEngine("deepseek", [{ choice: "a", reason: "x" }]);
    const claude = new FakeEngine("claude", [{ choice: "a", reason: "x" }]);
    await router({}, { deepseek }).router.decide(withTools);
    expect(deepseek.requests[0]!.tools).toEqual([]);
    const { router: r, rows } = router({ BRAIN_ENGINE: "claude" }, { claude });
    await r.decide(withTools);
    expect(claude.requests[0]!.tools!.map((t) => t.name)).toEqual(["kb_x"]);
    expect(rows[0]!.tools).toEqual(["kb_x"]);
    const off = new FakeEngine("claude", [{ choice: "a", reason: "x" }]);
    await router({ BRAIN_ENGINE: "claude", BRAIN_TOOLS: "off" }, { claude: off }).router.decide(withTools);
    expect(off.requests[0]!.tools).toEqual([]);
  });

  it("KNOWLEDGE_PREFIX=full: Claude gets no tools by default (the knowledge is in the prompt); BRAIN_CLAUDE_TOOLS=on adds them", async () => {
    const claude = new FakeEngine("claude", [{ choice: "a", reason: "x" }]);
    const { router: r, rows } = router({ BRAIN_ENGINE: "claude", KNOWLEDGE_PREFIX: "full" }, { claude });
    expect(r.toolsFor("claude")).toBe(false);
    await r.decide(withTools);
    expect(claude.requests[0]!.tools).toEqual([]);
    expect(rows[0]!.tools).toEqual([]);
    const on = new FakeEngine("claude", [{ choice: "a", reason: "x" }]);
    const { router: withOn } = router({ BRAIN_ENGINE: "claude", KNOWLEDGE_PREFIX: "full", BRAIN_CLAUDE_TOOLS: "on" }, { claude: on });
    await withOn.decide(withTools);
    expect(on.requests[0]!.tools!.map((t) => t.name)).toEqual(["kb_x"]);
    expect(router({ KNOWLEDGE_PREFIX: "full", BRAIN_TOOLS: "on" }, {}).router.toolsFor("claude")).toBe(true);
  });
});

describe("fallback", () => {
  it("an engine error falls back to BRAIN_FALLBACK, named in fellBackFrom and the log", async () => {
    const claude = new FakeEngine("claude", [new Error("claude exited 1 without a result")]);
    const deepseek = new FakeEngine("deepseek", [{ choice: "a", reason: "heal" }]);
    const { router: r, rows } = router({ BRAIN_ENGINE: "claude", BRAIN_FALLBACK: "deepseek" }, { claude, deepseek });
    const answer = await r.decide(request());
    expect(answer).toMatchObject({ engine: "deepseek", answer: { choice: "a" }, fellBackFrom: { engine: "claude", error: "claude exited 1 without a result" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ engine: "deepseek", fell_back_from: { engine: "claude", kind: "error" } });
  });

  it("without a fallback the error is thrown and logged", async () => {
    const claude = new FakeEngine("claude", [new Error("boom")]);
    const { router: r, rows } = router({ BRAIN_ENGINE: "claude" }, { claude });
    await expect(r.decide(request())).rejects.toThrow("boom");
    expect(rows[0]).toMatchObject({ engine: "claude", error: "boom", error_kind: "error", answer: null });
  });

  it("an answer failure (the engine answered, unusably) is passed on, not fallen back from", async () => {
    const failure = Object.assign(new Error("DeepSeek returned non-JSON"), { answerFailure: true });
    const deepseek = new FakeEngine("deepseek", [failure]);
    const claude = new FakeEngine("claude", [{ choice: "a", reason: "x" }]);
    await expect(router({ BRAIN_FALLBACK: "claude" }, { deepseek, claude }).router.decide(request())).rejects.toBe(failure);
    expect(claude.requests).toHaveLength(0);
  });

  it("a timeout aborts the engine and falls back", async () => {
    const claude = new FakeEngine("claude", ["hang"]);
    const deepseek = new FakeEngine("deepseek", [{ choice: "b", reason: "smith" }]);
    const { router: r, rows } = router({ BRAIN_ENGINE: "claude", BRAIN_FALLBACK: "deepseek", BRAIN_CLAUDE_TIMEOUT_MS: "1000" }, { claude, deepseek });
    const answer = await r.decide(request());
    expect(answer.engine).toBe("deepseek");
    expect(answer.fellBackFrom).toEqual({ engine: "claude", error: "claude timed out after 1000 ms" });
    expect(claude.aborted).toBe(1);
    expect(rows[0]!.fell_back_from).toMatchObject({ kind: "timeout" });
  });

  it("a quota failure rests the engine: its next questions go straight to the fallback until the rest ends", async () => {
    const clock = { now: 1_000_000 };
    const claude = new FakeEngine("claude", [new EngineFailure("claude success [quota]: You've hit your limit", "quota", 60_000), { choice: "a", reason: "back" }]);
    const deepseek = new FakeEngine("deepseek", [{ choice: "b", reason: "fallback" }]);
    const { router: r, rows } = router({ BRAIN_ENGINE: "claude", BRAIN_FALLBACK: "deepseek" }, { claude, deepseek }, clock);
    await r.decide(request());
    expect(r.restingUntil("claude")).toBe(1_060_000);
    clock.now += 30_000;
    const rested = await r.decide(request());
    expect(claude.requests).toHaveLength(1);
    expect(rested.engine).toBe("deepseek");
    expect(rested.fellBackFrom!.error).toMatch(/^resting until .* after quota: claude success \[quota\]/);
    expect(rows.map((row) => row.fell_back_from?.kind)).toEqual(["quota", "quota"]);
    clock.now += 31_000;
    const back = await r.decide(request());
    expect(back.engine).toBe("claude");
    expect(claude.requests).toHaveLength(2);
  });
});
