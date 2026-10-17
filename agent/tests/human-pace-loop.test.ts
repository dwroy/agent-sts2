/** In-memory mod/brain fixtures exercise the production loop and both dispatch gates. */
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

afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); setKnowledgeCharacter(null); setMonsterDbForTests(null); });
it.each(["silent", "ironclad"])("activates H1 only for %s and dispatches exactly once through the existing gates", async (character) => {
  const dir = mkdtempSync(join(tmpdir(), "h1-loop-fixed-"));
  const raw = board("xljq-f5-reward", "reward"); (raw.run as any).character_id = character.toUpperCase();
  let current = raw, asks = 0, aborts = 0; const actions: unknown[] = [];
  vi.useFakeTimers(); setKnowledgeCharacter(character); setMonsterDbForTests(FIXTURE_DB);
  const sample = fightSample(slimInput(fightBoard({ bossHp: 12 })), null, 7);
  vi.stubEnv("CONSTRUCTION_MODE", "off");
  const cfg = loadConfig({ CHARACTER: character, BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" });
  cfg.log.decisionLog = join(dir, "decisions.jsonl"); cfg.runPlanLog = join(dir, "run-plans.jsonl"); cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
  const router = new BrainRouter({ config: cfg.brain, codexOnly: true, engine: () => ({ name: "codex", model: "fixed", decide: async (req, signal) => {
    asks++;
    if (character === "silent") {
      expect(req.effort).toBe("xhigh"); expect(req.timeoutMs).toBeLessThanOrEqual(90000);
      return new Promise((_, reject) => signal?.addEventListener("abort", () => { aborts++; reject(new Error("fixed deadline")); }));
    }
    return { engine: "codex", model: "fixed", answer: { choice: Object.keys(req.options ?? {})[0], reason: "fixed" },
      problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] };
  } }) });
  const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
    if (String(url).endsWith("/state")) return Response.json(envelope(current));
    const intent = JSON.parse(String(options?.body)); actions.push(intent); current = mainMenuPayload();
    return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current }));
  }) as typeof fetch });
  const controller = new AbortController();
  try {
    const pending = runLoop({ config: cfg, mode: "play", client, jev: null, brain: new Brain(router, { systemPrompt: "fixed" }),
      buildSim: { db: FIXTURE_DB, mm: FIXTURE_MM, samples: 2, now: () => 0, runner: { run: async (r) => ({
        outcomes: r.decks.map(() => r.orders.map(() => Array.from({ length: r.samples }, () => sample))),
        complete: Array.from({ length: r.samples }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0 }) } },
      knowledge: loggedKnowledge, maxDecisions: 1, maxMinutes: 3, pollIntervalMs: 1, restoreRun: false, signal: controller.signal });
    await vi.advanceTimersByTimeAsync(91000);
    const result = await pending;
    expect(result.acts).toBe(1); expect(actions).toHaveLength(1); expect(asks).toBe(1);
    const rows = readFileSync(cfg.log.decisionLog, "utf8").trim().split("\n").map((s) => JSON.parse(s));
    const row = rows.find((r) => !r.result.startsWith("not dispatched"));
    if (character === "silent") {
      expect(aborts).toBe(1); expect(row).toMatchObject({ fallback: true,
        time_budget: { kind: "brain", budget_ms: 90000, timed_out: true, fallback: expect.any(String) } });
    } else { expect(aborts).toBe(0); expect(row).not.toHaveProperty("time_budget"); expect(row.fallback).toBe(false); }
  } finally { controller.abort(); rmSync(dir, { recursive: true, force: true }); }
});
