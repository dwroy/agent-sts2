import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { Brain } from "../src/brain/brain.js";
import { BrainRouter } from "../src/brain/router.js";
import { loadConfig } from "../src/core/config.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { board } from "./oneshot-support.js";
import { loggedKnowledge } from "./logged.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { mainMenuPayload } from "./scenarios.js";
import { envelope } from "./support.js";

it("dispatches exactly once after two required runner failures and a failed degraded attempt", async () => {
  const dir = mkdtempSync(join(tmpdir(), "c1-loop-fixed-"));
  const raw = board("xljq-f5-reward", "reward");
  (raw["run"] as Record<string, unknown>)["character_id"] = "SILENT";
  const actions: unknown[] = [];
  let current = raw;
  let called = 0;
  let asked = 0;
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  setKnowledgeCharacter("silent");
  setMonsterDbForTests(FIXTURE_DB);
  const cfg = loadConfig({ CHARACTER: "silent", BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" });
  cfg.log.decisionLog = join(dir, "decisions.jsonl");
  cfg.runPlanLog = join(dir, "run-plans.jsonl");
  cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
  const router = new BrainRouter({ config: cfg.brain, codexOnly: true, engine: () => ({ name: "codex", model: "fixture", decide: async (req) => {
    asked++;
    expect(called).toBe(3);
    expect(JSON.stringify(req.payload)).toContain("故障降级");
    return { engine: "codex", model: "fixture", answer: { choice: Object.keys(req.options ?? {})[0], reason: "固定夹具" },
      problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 5, outputTokens: 3 }, toolCalls: [] };
  } }) });
  const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
    if (String(url).endsWith("/state")) return Response.json(envelope(current));
    const intent = JSON.parse(String(options?.body));
    actions.push(intent);
    current = mainMenuPayload();
    return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixture", state: current }));
  }) as typeof fetch });
  const controller = new AbortController();
  try {
    const pending = runLoop({ config: cfg, mode: "play", client, jev: null,
      brain: new Brain(router, { systemPrompt: "固定知识夹具" }), knowledge: loggedKnowledge,
      maxDecisions: 1, maxMinutes: 1, pollIntervalMs: 1, restoreRun: false, signal: controller.signal,
      buildSim: { db: FIXTURE_DB, mm: FIXTURE_MM, runner: { run: async (req) => {
        called++;
        expect(req.deadlineMs).toBeGreaterThan(0);
        expect(req.deadlineMs).toBeLessThanOrEqual(11_000);
        expect(req.progressTimeoutMs).toBeUndefined();
        throw new Error("fixed worker failure");
      } }, now: () => 0 },
    });
    await vi.advanceTimersByTimeAsync(15_000);
    controller.abort();
    await vi.advanceTimersByTimeAsync(10);
    const result = await pending;
    expect(result.acts).toBe(1);
    expect(actions).toHaveLength(1);
    expect(asked).toBe(1);
    const rows = readFileSync(cfg.log.decisionLog, "utf8").trim().split("\n").map((s) => JSON.parse(s));
    expect(rows.map((r) => r.boss_sim?.completion?.status)).toEqual(["pending", "pending", "degraded"]);
  } finally {
    controller.abort();
    vi.useRealTimers();
    setKnowledgeCharacter(null);
    setMonsterDbForTests(null);
    rmSync(dir, { recursive: true, force: true });
  }
});
