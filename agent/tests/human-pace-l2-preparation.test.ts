/** Production wiring, fixed clocks and in-memory transports. No models, game or network. */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { Brain } from "../src/brain/brain.js";
import { BrainRouter } from "../src/brain/router.js";
import { loadConfig } from "../src/core/config.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { board } from "./oneshot-support.js";
import { loggedKnowledge } from "./logged.js";
import { envelope } from "./support.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { fightSample, slimInput } from "../src/sim/boss-sim.js";
import { board as fightBoard } from "./boss-sim-fixture.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { mainMenuPayload } from "./scenarios.js";

vi.mock("../src/sim/global-build-observer.js", () => ({ observeGlobalBuild: async () => {
  await new Promise((resolve) => setTimeout(resolve, 70000));
  return { schema: "global-build-v1", mode: "shadow", delivered: false, status: "unknown" };
} }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); setKnowledgeCharacter(null); setMonsterDbForTests(null); });

it.each(["off", "shadow"])("leaves 90s for the real L2 after B3 and G2=%s, and accepts its 89s answer", async (globalMode) => {
  const dir = mkdtempSync(join(tmpdir(), "h1-L2-fixed-"));
  const raw = board("xljq-f5-reward", "reward"); (raw.run as Record<string, unknown>).character_id = "SILENT";
  let current = raw, asks = 0, simulations = 0;
  const actions: unknown[] = [];
  vi.useFakeTimers(); setKnowledgeCharacter("silent"); setMonsterDbForTests(FIXTURE_DB);
  vi.stubEnv("CONSTRUCTION_MODE", "off"); vi.stubEnv("HUMAN_PACE_H2", "off"); vi.stubEnv("GLOBAL_BUILD_EVAL", globalMode);
  const cfg = loadConfig({ CHARACTER: "silent", BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" });
  cfg.log.decisionLog = join(dir, "decisions.jsonl"); cfg.runPlanLog = join(dir, "run-plans.jsonl"); cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
  const router = new BrainRouter({ config: cfg.brain, codexOnly: true, engine: () => ({ name: "codex", model: "fixed", decide: async (req) => {
    asks++; expect(req.effort).toBe("xhigh"); expect(req.timeoutMs).toBe(90000);
    await new Promise((resolve) => setTimeout(resolve, 89000));
    return { engine: "codex", model: "fixed", answer: { choice: Object.keys(req.options ?? {})[0], reason: "fixed" },
      problems: [], attempts: 1, latencyMs: 89000, usage: { inputTokens: 0, outputTokens: 0 }, toolCalls: [] };
  } }), log: () => {} });
  const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
    if (String(url).endsWith("/state")) return Response.json(envelope(current));
    const intent = JSON.parse(String(options?.body)); actions.push(intent); current = mainMenuPayload();
    return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current }));
  }) as typeof fetch });
  const sample = fightSample(slimInput(fightBoard({ bossHp: 12 })), null, 7);
  try {
    const pending = runLoop({ config: cfg, mode: "play", client, jev: null, brain: new Brain(router, { systemPrompt: "fixed" }),
      buildSim: { db: FIXTURE_DB, mm: FIXTURE_MM, samples: 2, now: () => 0, runner: { run: async (request) => {
        simulations++; await new Promise((resolve) => setTimeout(resolve, 11000));
        return { outcomes: request.decks.map(() => request.orders.map(() => Array.from({ length: request.samples }, () => sample))),
          complete: Array.from({ length: request.samples }, (_, i) => i), timedOut: false, elapsedMs: 11000, workers: 0 };
      } } }, knowledge: loggedKnowledge, maxDecisions: 1, maxMinutes: 4, pollIntervalMs: 1, restoreRun: false });
    await vi.advanceTimersByTimeAsync(175000);
    const result = await pending;
    expect(result.acts).toBe(1); expect(actions).toHaveLength(1); expect(asks).toBe(1); expect(simulations).toBe(1);
    const row = readFileSync(cfg.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line)).find((r) => r.result.startsWith("completed:"));
    expect(row.fallback).toBe(false);
    expect(row.time_budget.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: "B3_current", actual_ms: 11000 }),
      expect.objectContaining({ stage: "L2_brain", scope: "L2", budget_ms: 90000, actual_ms: 89000, timed_out: false }),
    ]));
    if (globalMode === "shadow") expect(row.time_budget.stages).toContainEqual(expect.objectContaining({ stage: "G2_global_shadow", scope: "shadow", actual_ms: 70000 }));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
