import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { Brain } from "../src/brain/brain.js";
import { BrainRouter } from "../src/brain/router.js";
import { loadConfig } from "../src/core/config.js";
import { asArray, asRecord } from "../src/core/util/json.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { setKnowledgeCharacter } from "../src/knowledge/files.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import type { FightSampleResult } from "../src/sim/boss-sim.js";
import { board } from "./oneshot-support.js";
import { loggedKnowledge } from "./logged.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";
import { mainMenuPayload } from "./scenarios.js";
import { envelope } from "./support.js";

vi.mock("../src/sim/boss-trust.js", async (original) => ({ ...await original<object>(), bossTrustReason: () => null }));

it("reasks a missing override reason, dispatches once, and records the actual accepted reason", async () => {
  const dir = mkdtempSync(join(tmpdir(), "p2-loop-fixed-"));
  const raw = board("xljq-f5-reward", "reward");
  (raw.run as Record<string, unknown>).character_id = "SILENT";
  let current = raw, asked = 0;
  const actions: unknown[] = [];
  vi.stubEnv("S_BUILD_RANK", "on");
  vi.stubEnv("S_READINESS", "off");
  setKnowledgeCharacter("silent");
  setMonsterDbForTests(FIXTURE_DB);
  const cfg = loadConfig({ CHARACTER: "silent", BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" });
  cfg.log.decisionLog = join(dir, "decisions.jsonl");
  cfg.runPlanLog = join(dir, "run-plans.jsonl");
  cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
  const router = new BrainRouter({ config: cfg.brain, codexOnly: true, engine: () => ({ name: "codex", model: "fixture", decide: async (req) => {
    asked++;
    const ranking = asRecord(asRecord(asRecord(req.payload).facts).build_ranking);
    expect(ranking.schema).toBe("build-ranking-v1");
    const choice = Object.keys(req.options ?? {}).find((key) => !asArray(ranking.best_group).includes(key));
    expect(choice).toBeDefined();
    if (asked === 2) expect(req.reask?.problems.join()).toContain("ranking_override_reason");
    return { engine: "codex", model: "fixture", answer: { choice, reason: "fixed fixture",
      ...(asked > 1 ? { ranking_override_reason: "Preserve a route resource." } : {}) },
      problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 5, outputTokens: 3 }, toolCalls: [] };
  } }) });
  const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
    if (String(url).endsWith("/state")) return Response.json(envelope(current));
    const intent = JSON.parse(String(options?.body)); actions.push(intent); current = mainMenuPayload();
    return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixture", state: current }));
  }) as typeof fetch });
  try {
    const result = await runLoop({ config: cfg, mode: "play", client, jev: null,
      brain: new Brain(router, { systemPrompt: "固定知识夹具" }), knowledge: loggedKnowledge,
      maxDecisions: 1, maxMinutes: 1, pollIntervalMs: 1, restoreRun: false,
      buildSim: { db: FIXTURE_DB, mm: FIXTURE_MM, samples: 4, now: () => 0, runner: { run: async (req) => {
        const reference = { myHp: req.base.solver.player.hp, bossHp: req.base.solver.enemies.reduce((sum, e) => sum + e.hp, 0), enemyIds: ["FIXTURE"], unknown: [] };
        const sample = (deck: number): FightSampleResult => ({ won: true, died: false, capped: false, timeUp: false, turns: 2,
          hpLoss: 1 + deck, revived: 0, drunk: [], enemyHpLeft: 0, lossByTurn: [1 + deck, 0], dmgByTurn: [reference.bossHp, 0],
          incomingByTurn: [1 + deck, 0], enemyLossByTurn: [1 + deck, 0], policyTurns: 2, policyNodes: 1,
          bossMargin: { reference, outgoingHp: reference.bossHp, receivedHp: 1 + deck } });
        return { outcomes: req.decks.map((_, i) => req.orders.map(() => Array.from({ length: req.samples }, () => sample(i)))),
          complete: Array.from({ length: req.samples }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0 };
      } } },
    });
    expect(result.acts).toBe(1);
    expect(actions).toHaveLength(1);
    expect(asked).toBe(2);
    const rows = readFileSync(cfg.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(rows).toHaveLength(1);
    expect(rows[0].boss_sim.build_ranking.selection).toMatchObject({ deviated: true, ranking_override_reason: "Preserve a route resource." });
    expect(rows[0].deepseek.ranking_override_reason).toBe("Preserve a route resource.");
  } finally {
    vi.unstubAllEnvs();
    setKnowledgeCharacter(null); setMonsterDbForTests(null); rmSync(dir, { recursive: true, force: true });
  }
});
