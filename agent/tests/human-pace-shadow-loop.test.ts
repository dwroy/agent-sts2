/** Production-loop equivalence, with fixed engines/mod and the original shared runner. */
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
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
import type { JevClient } from "../src/reflex/jev/client.js";
import type { GlobalBossPool } from "../src/sim/global-build-pool.js";
vi.mock("node:os", async (original) => ({ ...await original<object>(), loadavg: (): [number, number, number] => [1, 1, 1] }));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); setKnowledgeCharacter(null); setMonsterDbForTests(null); });

async function playFixture(mode: string, character: string) {
  const dir = mkdtempSync(join(tmpdir(), "h2-loop-fixed-"));
  const raw = board("xljq-f5-reward", "reward"); (raw.run as any).character_id = character.toUpperCase();
  let current = raw, jevCalls = 0, workers = 0;
  const requests: unknown[] = [], actions: unknown[] = [];
  setKnowledgeCharacter(character); setMonsterDbForTests(FIXTURE_DB);
  vi.stubEnv("HUMAN_PACE_H2", mode); vi.stubEnv("CONSTRUCTION_MODE", "off");
  vi.spyOn(performance, "now").mockReturnValue(0);
  const cfg = loadConfig({ CHARACTER: character, BRAIN_LOG: "off", RUN_PLAN: "off", FIGHT_PLAN: "off", BUILD_ONESHOT: "off" });
  cfg.log.decisionLog = join(dir, "decisions.jsonl"); cfg.runPlanLog = join(dir, "run-plans.jsonl"); cfg.fightPlanLog = join(dir, "fight-plans.jsonl");
  const router = new BrainRouter({ config: cfg.brain, codexOnly: true, engine: () => ({ name: "codex", model: "fixed", decide: async (req) => {
    requests.push(structuredClone({ payload: req.payload, question: req.question, options: req.options, effort: req.effort }));
    return { engine: "codex", model: "fixed", answer: { choice: Object.keys(req.options ?? {})[0], reason: "fixed" },
      problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] };
  } }) });
  const client = new ModClient({ baseUrl: "http://fixture.invalid", fetchImpl: (async (url, options) => {
    if (String(url).endsWith("/state")) return Response.json(envelope(current));
    const intent = JSON.parse(String(options?.body)); actions.push(intent); current = mainMenuPayload();
    return Response.json(envelope({ action: intent.action, status: "completed", stable: true, message: "fixed", state: current }));
  }) as typeof fetch });
  const sample = fightSample(slimInput(fightBoard({ bossHp: 12 })), null, 7);
  const pool: GlobalBossPool = { character: "silent", ascension: Number((raw.run as any).ascension), unknown: [],
    source: { path: "fixed", sha256: "a".repeat(64), generated: null }, unit: "observed_fight_records_including_retries",
    stages: [{ act: 3, candidates: [{ boss: "THE_KIN", count: 1, frequency: 1, evidence: ["FIXTURE"] }] }] };
  const jev = { ask: vi.fn(async () => {
    jevCalls++;
    expect(actions).toHaveLength(1); // Shadow happens only after the actual gated action and log.
    expect(readFileSync(cfg.log.decisionLog, "utf8")).toContain("completed:");
    return { model: "fixed", answers: { card: { type: "choice", choice: "skip", probabilities: {}, confidence: 1, raw: {} } },
      inputTokens: 1, outputTokens: 1, latencyMs: 1, requestId: "FIXED" };
  }) } as unknown as JevClient;
  try {
    const result = await runLoop({ config: cfg, mode: "play", client, jev, brain: new Brain(router, { systemPrompt: "fixed" }),
      buildSim: { db: FIXTURE_DB, mm: FIXTURE_MM, globalPool: pool, samples: 2, now: () => 0, runner: { run: async (r) => {
        workers++; return { outcomes: r.decks.map(() => r.orders.map(() => Array.from({ length: r.samples }, () => sample))),
          complete: Array.from({ length: r.samples }, (_, i) => i), timedOut: false, elapsedMs: 0, workers: 0 };
      } } }, knowledge: loggedKnowledge, maxDecisions: 1, maxMinutes: 3, pollIntervalMs: 1, restoreRun: false });
    expect(result.acts).toBe(1);
    const records = readFileSync(cfg.log.decisionLog, "utf8").trim().split("\n").map((s) => JSON.parse(s));
    const sidecar = join(dir, "human-pace-shadow.jsonl");
    return { requests, actions, jevCalls, workers, records, sidecar: existsSync(sidecar) ? readFileSync(sidecar, "utf8").trim().split("\n").map((s) => JSON.parse(s)) : [] };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

it.each(["silent", "ironclad"])("keeps %s actual questions, choices, gates and worker requests equal with shadow enabled", async (character) => {
  const off = await playFixture("off", character), shadow = await playFixture("shadow", character);
  expect(shadow.requests).toEqual(off.requests);
  expect(shadow.actions).toEqual(off.actions); expect(shadow.workers).toBe(off.workers);
  expect(shadow.requests).toHaveLength(1); expect(shadow.actions).toHaveLength(1);
  expect(shadow.records.map((r) => ({ questions: r.questions, chosen: r.chosen, result: r.result })))
    .toEqual(off.records.map((r) => ({ questions: r.questions, chosen: r.chosen, result: r.result })));
  expect(off.sidecar).toHaveLength(0);
  if (character === "silent") {
    expect(shadow.jevCalls).toBe(1);
    expect(shadow.sidecar.find((r) => r.jev_shadow)?.jev_shadow).toMatchObject({ jev_choice: "skip", delivered: false });
    expect(shadow.sidecar.find((r) => r.direction)?.direction).toMatchObject({ delivered: false, s_sort: false });
  } else { expect(shadow.sidecar).toHaveLength(0); expect(shadow.jevCalls).toBe(0); }
});
