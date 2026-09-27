/**
 * End-to-end loop test with a scripted mod server and a stub Jev.
 *
 * It proves the whole chain the design depends on: read → plan → ask → gate → (re-read) → dispatch →
 * log, with no game and no real model.
 */

import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { AppConfig } from "../src/config.js";
import { loadConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import type { JevAskResult, JevClient } from "../src/jev/client.js";
import { runLoop, type LoopEvent } from "../src/loop.js";
import { ModClient } from "../src/mod/client.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";
import {
  afterRunPayload,
  combatPayload,
  gameOverPayload,
  gameOverSavedPayload,
  mainMenuPayload,
  mapPayload,
  rewardAfterSkipPayload,
  rewardCardPayload,
  shopPayload,
  testKnowledge,
} from "./scenarios.js";

interface StubJev {
  client: JevClient;
  calls: number;
}

/** Answers the way a cooperative model would: pick the first offered option of every question. */
function stubJev(): StubJev {
  const state = { calls: 0 };
  const client = {
    model: "stub",
    async ask(_state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> | string[] }>): Promise<JevAskResult> {
      state.calls += 1;
      const answers: AnswerSet = {};
      for (const [id, question] of Object.entries(questions)) {
        if (question.type === "choice" && question.criteria && !Array.isArray(question.criteria)) {
          const first = Object.keys(question.criteria)[0] ?? "";
          answers[id] = { type: "choice", choice: first, probabilities: { [first]: 0.9 }, confidence: 0.9, raw: {} };
        } else {
          answers[id] = { type: "noul", noul: 0.5, raw: {} };
        }
      }
      return { model: "stub", answers, inputTokens: 100, outputTokens: 10, latencyMs: 1, requestId: `req_stub_${state.calls}` };
    },
  } as unknown as JevClient;
  return {
    client,
    get calls() {
      return state.calls;
    },
  } as StubJev;
}

const servers: TestServer[] = [];
const logs: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const path of logs.splice(0)) {
    try {
      rmSync(path, { force: true });
    } catch {
      // best effort
    }
  }
});

function testConfig(): AppConfig {
  const path = join(tmpdir(), `jev-sts2-test-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
  logs.push(path);
  const config = loadConfig({} as NodeJS.ProcessEnv);
  return { ...config, combatPlanner: "card", log: { ...config.log, decisionLog: path } };
}

interface ScriptOptions {
  /** States served in order; the last one repeats once exhausted. */
  sequence: Record<string, unknown>[];
}

async function scriptedMod(options: ScriptOptions): Promise<{ server: TestServer; actions: Record<string, unknown>[] }> {
  let index = 0;
  const actions: Record<string, unknown>[] = [];
  const at = (position: number): Record<string, unknown> =>
    options.sequence[Math.min(position, options.sequence.length - 1)] as Record<string, unknown>;

  const server = await startTestServer((req, res) => {
    if (req.method === "GET" && req.url === "/state") {
      return sendJson(res, 200, envelope(at(index)));
    }
    if (req.method === "POST" && req.url === "/action") {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        const intent = JSON.parse(raw || "{}") as Record<string, unknown>;
        actions.push(intent);
        index += 1;
        sendJson(
          res,
          200,
          envelope({
            action: intent["action"],
            status: "completed",
            stable: true,
            message: "scripted",
            state: at(index),
          }),
        );
      });
      return;
    }
    sendJson(res, 404, { ok: false, request_id: "x", error: { code: "not_found", message: "no route", retryable: false } });
  });
  servers.push(server);
  return { server, actions };
}

describe("runLoop", () => {
  it("plays through a scripted fight and stops when the run ends", async () => {
    const config = testConfig();
    const { server, actions } = await scriptedMod({
      sequence: [combatPayload(), combatPayload(), mainMenuPayload()],
    });
    const jev = stubJev();

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 20,
      pollIntervalMs: 1,
    });

    expect(stats.acts).toBe(2);
    expect(stats.runsCompleted).toBe(1);
    // Per-run accounting is reported separately from the session totals.
    expect(stats.runs).toHaveLength(1);
    expect(stats.runs[0]).toMatchObject({ index: 1, outcome: "run ended", jevCalls: stats.jevCalls });
    expect(stats.runs[0]?.inputTokens).toBe(stats.inputTokens);
    expect(stats.runs[0]?.maxFloor).toBe(9);
    expect(stats.errors).toBe(0);
    expect(stats.stoppedBecause).toContain("run 1 ended");
    expect(actions.map((intent) => intent["action"])).toEqual(["play_card", "play_card"]);
    expect(stats.jevCalls).toBeGreaterThan(0);
  });

  it("writes one decision record per decision", async () => {
    const config = testConfig();
    const { server } = await scriptedMod({ sequence: [combatPayload(), mainMenuPayload()] });
    const jev = stubJev();

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 20,
      pollIntervalMs: 1,
    });

    const lines = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(lines).toHaveLength(stats.decisions);
    for (const line of lines) {
      expect(line).toMatchObject({ mode: "play", screen: expect.any(String), label: expect.any(String) });
      expect(typeof line.fingerprint).toBe("string");
      expect(line.chosen).toBeTruthy();
    }
  });

  it("dispatches nothing in shadow mode", async () => {
    const config = testConfig();
    const { server, actions } = await scriptedMod({ sequence: [combatPayload(), combatPayload()] });
    const jev = stubJev();

    const stats = await runLoop({
      config,
      mode: "shadow",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxDecisions: 1,
      pollIntervalMs: 1,
    });

    expect(actions).toHaveLength(0);
    expect(stats.acts).toBe(0);
    expect(stats.decisions).toBe(1);
    const lines = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(lines[0].result).toContain("shadow");
  });

  it("stops on the circuit breaker instead of hammering a broken mod", async () => {
    const config = testConfig();
    const server = await startTestServer((_req, res) => {
      sendJson(res, 503, { ok: false, request_id: "x", error: { code: "state_unavailable", message: "settling", retryable: true } });
    });
    servers.push(server);
    const jev = stubJev();

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url, timeoutMs: 500 }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxDecisions: 20,
      pollIntervalMs: 1,
    });

    expect(stats.acts).toBe(0);
    expect(stats.errors).toBeGreaterThanOrEqual(3);
    expect(stats.stoppedBecause).toContain("circuit breaker");
  });

  it("honours the decision cap", async () => {
    const config = testConfig();
    const { server } = await scriptedMod({ sequence: [combatPayload(), combatPayload()] });
    const jev = stubJev();

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxDecisions: 3,
      pollIntervalMs: 1,
    });

    expect(stats.stoppedBecause).toContain("decision cap");
    expect(stats.decisions).toBeLessThanOrEqual(3);
  });

  it("drives the game without Jev, resolving every question in code", async () => {
    const config = testConfig();
    const { server, actions } = await scriptedMod({ sequence: [combatPayload(), combatPayload(), mainMenuPayload()] });

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: null,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 20,
      pollIntervalMs: 1,
    });

    expect(stats.acts).toBe(2);
    expect(stats.jevCalls).toBe(0);
    expect(stats.fallbacks).toBeGreaterThan(0);
    expect(actions.map((intent) => intent["action"])).toEqual(["play_card", "play_card"]);

    const lines = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    const asked = lines.filter((line) => line.label === "combat/play");
    expect(asked).toHaveLength(2);
    for (const line of asked) {
      expect(line.no_jev).toBe(true);
      expect(line.fallback).toBe(true);
      expect(line.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
    }
  });

  it("does not re-ask Jev while the board is unchanged", async () => {
    const config = testConfig();
    const { server } = await scriptedMod({ sequence: [combatPayload()] });
    const jev = stubJev();
    const notes: string[] = [];

    const stats = await runLoop({
      config,
      mode: "shadow",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxMinutes: 0.05, // ~3 s: enough for many polls against a frozen board
      pollIntervalMs: 2,
      onEvent: (event) => {
        if (event.type === "note") notes.push(event.message);
      },
    });

    expect(stats.decisions).toBe(1);
    expect(stats.jevCalls).toBe(1);
    expect(stats.debounced).toBeGreaterThan(0);
    expect(notes.some((note) => note.includes("reused the previous answer"))).toBe(true);

    // A reused answer must not be counted as spend again: the first record carries the tokens, the
    // later ones carry zero plus the flag that explains why.
    const lines = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    const reused = lines.filter((line) => line.reused_answer === true);
    for (const line of reused) expect(line.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
    const totalLogged = lines.reduce((sum, line) => sum + line.usage.input_tokens, 0);
    expect(totalLogged).toBe(stats.inputTokens);
    expect(lines[0]?.request_ids).toEqual(["req_stub_1"]);
  });

  it("skips the Jev call when the board moves while it is still planning", async () => {
    const config = testConfig();
    const first = combatPayload();
    const second = combatPayload({ noPlayableCards: true });
    let reads = 0;
    const server = await startTestServer((req, res) => {
      if (req.url === "/state") {
        reads += 1;
        // Strictly alternate, so the re-read before asking always disagrees with the planned state.
        return sendJson(res, 200, envelope(reads % 2 === 1 ? first : second));
      }
      return sendJson(res, 200, envelope({ action: "x", status: "completed", stable: true, message: "", state: first }));
    });
    servers.push(server);
    const jev = stubJev();

    const stats = await runLoop({
      config,
      mode: "shadow",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxMinutes: 0.05,
      pollIntervalMs: 2,
    });

    expect(stats.jevCalls).toBe(0);
    expect(stats.staleSkips).toBeGreaterThan(0);
  });

  it("waits for a pending action to settle before planning again", async () => {
    const config = testConfig();
    const before = combatPayload();
    const after = combatPayload({ noPlayableCards: true });
    let served = before;
    let pendingOnce = false;
    const server = await startTestServer((req, res) => {
      if (req.url === "/state") return sendJson(res, 200, envelope(served));
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        // The first action reports "pending"; the board only moves a beat later.
        if (!pendingOnce) {
          pendingOnce = true;
          setTimeout(() => {
            served = after;
          }, 120);
          return sendJson(
            res,
            200,
            envelope({ action: "end_turn", status: "pending", stable: false, message: "animating", state: before }),
          );
        }
        served = after;
        sendJson(res, 200, envelope({ action: "end_turn", status: "completed", stable: true, message: "ok", state: served }));
      });
    });
    servers.push(server);
    const jev = stubJev();
    const notes: string[] = [];

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxDecisions: 2,
      pollIntervalMs: 5,
      onEvent: (event) => {
        if (event.type === "note") notes.push(event.message);
      },
    });

    expect(stats.acts).toBeGreaterThanOrEqual(1);
    expect(notes.some((note) => note.includes("waited for the board to settle"))).toBe(true);
  });

  it("falls back to the code choice when the shortlist answer is still a guess", async () => {
    const config = { ...testConfig(), strictJev: false };
    const { server, actions } = await scriptedMod({ sequence: [combatPayload(), mainMenuPayload()] });
    // Every answer is deliberately uncertain, and every confidence is far below the act threshold.
    const unsure = {
      model: "stub",
      async ask(_state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> | string[] }>) {
        const answers: AnswerSet = {};
        for (const [id, question] of Object.entries(questions)) {
          const criteria = question.criteria;
          const keys = criteria && !Array.isArray(criteria) ? Object.keys(criteria) : ["a", "b"];
          const first = keys[0] ?? "";
          answers[id] = { type: "choice", choice: first, probabilities: { [first]: 0.4 }, confidence: 0.11, raw: {} };
        }
        return { model: "stub", answers, inputTokens: 10, outputTokens: 5, latencyMs: 1, requestId: "req_unsure" };
      },
    } as unknown as JevClient;

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: unsure,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 3,
      pollIntervalMs: 1,
    });

    expect(actions).toHaveLength(1);
    const firstLine = readFileSync(config.log.decisionLog, "utf8").trim().split("\n")[0] ?? "";
    const record = JSON.parse(firstLine) as { fallback: boolean; rationale: string; confidence: number };
    expect(record.fallback).toBe(true);
    expect(record.rationale).toContain("still below the act threshold");
    expect(record.confidence).toBeCloseTo(0.11, 5);
    expect(stats.acts).toBe(1);
    // The shortlist round trip is a second call, and both are counted.
    expect(stats.jevCalls).toBe(2);
    expect(stats.inputTokens).toBe(20);
    expect(stats.outputTokens).toBe(10);
  });

  it("survives a planner that refuses to build an over-large question", async () => {
    const config = testConfig();
    // 52 cards x 5 targets = 260 options, past the 255-option cap a Choice may carry. The planner
    // throws; the loop must report it and stop, not crash or send an illegal request.
    const huge = combatPayload();
    const combat = huge["combat"] as Record<string, unknown>;
    combat["enemies"] = Array.from({ length: 5 }, (_, index) => ({
      index,
      enemy_id: "JAW_WORM",
      name: `Enemy ${index}`,
      current_hp: 40,
      max_hp: 40,
      block: 0,
      is_alive: true,
      is_hittable: true,
      powers: [],
      intent: "ATTACK",
      move_id: "ATTACK",
      intents: [{ index: 0, intent_type: "Attack", label: "5", damage: 5, hits: 1, total_damage: 5, status_card_count: null }],
    }));
    combat["hand"] = Array.from({ length: 52 }, (_, index) => ({
      index,
      card_id: "STRIKE_R",
      name: "Strike",
      upgraded: false,
      target_type: "AnyEnemy",
      requires_target: true,
      target_index_space: "combat.enemies[].index",
      valid_target_indices: [0, 1, 2, 3, 4],
      costs_x: false,
      star_costs_x: false,
      energy_cost: 0,
      star_cost: 0,
      rules_text: "",
      resolved_rules_text: "Deal 6 damage.",
      dynamic_values: [{ name: "Damage", base_value: 6, current_value: 6 }],
      playable: true,
      can_play_result: true,
      unplayable_reason: null,
    }));

    const { server, actions } = await scriptedMod({ sequence: [huge] });
    const jev = stubJev();
    const notes: string[] = [];
    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxDecisions: 20,
      pollIntervalMs: 1,
      onEvent: (event) => {
        if (event.type === "note") notes.push(event.message);
      },
    });

    expect(actions).toHaveLength(0);
    expect(stats.acts).toBe(0);
    expect(stats.errors).toBeGreaterThanOrEqual(3);
    expect(stats.stoppedBecause).toContain("planner failed");
    expect(notes.some((note) => note.includes("above the 255 limit"))).toBe(true);
  });

  it("the time cap waits for the fight to end, up to a grace period (TQX5: stopped before the boss's turn)", async () => {
    const run = async (payload: Record<string, unknown>) => {
      const { server } = await scriptedMod({ sequence: [payload] });
      const started = Date.now();
      const stats = await runLoop({
        config: testConfig(),
        mode: "shadow",
        client: new ModClient({ baseUrl: server.url }),
        jev: null,
        knowledge: testKnowledge,
        maxMinutes: 0.005, // 0.3 s
        combatGraceMinutes: 0.01, // 0.6 s more
        pollIntervalMs: 2,
      });
      return { stats, elapsed: Date.now() - started };
    };
    const map = await run(mapPayload());
    expect(map.stats.stoppedBecause).toBe("time cap reached (0.005 min)");
    expect(map.elapsed).toBeLessThan(850);
    const fight = await run(combatPayload());
    expect(fight.stats.stoppedBecause).toContain("still in combat after the grace period");
    expect(fight.elapsed).toBeGreaterThanOrEqual(850);
  });

  it("stops when the run ends, after saving the result", async () => {
    const config = testConfig();
    const { server, actions } = await scriptedMod({
      sequence: [combatPayload(), gameOverPayload(), gameOverSavedPayload(false), afterRunPayload()],
    });
    const jev = stubJev();

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: jev.client,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 20,
      pollIntervalMs: 1,
    });

    // It plays, then clicks continue_game_over once (that is what writes the score/unlock save),
    // then stops instead of walking back through the menus.
    expect(actions.map((intent) => intent["action"])).toEqual(["play_card", "continue_game_over"]);
    expect(stats.runsCompleted).toBe(1);
    expect(stats.stoppedBecause).toContain("ended (defeat)");
  });

  it("reports a victory as such", async () => {
    const config = testConfig();
    const { server } = await scriptedMod({ sequence: [combatPayload(), gameOverSavedPayload(true)] });

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: stubJev().client,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 20,
      pollIntervalMs: 1,
    });

    expect(stats.runsCompleted).toBe(1);
    expect(stats.stoppedBecause).toContain("ended (victory)");
  });

  it("stops when the run disappears even without a score screen", async () => {
    const config = testConfig();
    const { server } = await scriptedMod({ sequence: [combatPayload(), afterRunPayload()] });

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: stubJev().client,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 20,
      pollIntervalMs: 1,
    });

    expect(stats.runsCompleted).toBe(1);
    expect(stats.stoppedBecause).toContain("run ended");
  });

  it("keeps going when more runs were requested", async () => {
    const config = testConfig();
    const { server } = await scriptedMod({
      sequence: [combatPayload(), gameOverPayload(), gameOverSavedPayload(false), mainMenuPayload()],
    });

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: stubJev().client,
      knowledge: testKnowledge,
      maxRuns: 2,
      maxDecisions: 6,
      pollIntervalMs: 1,
    });

    expect(stats.runsCompleted).toBe(1);
    expect(stats.stoppedBecause).toContain("decision cap");
  });

  it("walks through a shop once instead of flapping open and closed", async () => {
    // The live sequence that started the flap: arrive, open, close, and then keep re-opening because
    // affordable stock still existed. With nothing affordable the whole visit should be two actions.
    const config = testConfig();
    const { server, actions } = await scriptedMod({
      sequence: [
        shopPayload(false, { broke: true }),
        shopPayload(true, { broke: true }),
        shopPayload(false, { broke: true }),
        mapPayload(),
      ],
    });

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: stubJev().client,
      knowledge: testKnowledge,
      maxDecisions: 4,
      pollIntervalMs: 1,
    });

    expect(actions.slice(0, 3).map((intent) => intent["action"])).toEqual([
      "open_shop_inventory",
      "close_shop_inventory",
      "proceed",
    ]);
    // And the next step is a map choice, not another shop interaction.
    expect(actions[3]?.["action"]).toBe("choose_map_node");
    expect(stats.stoppedBecause).toContain("decision cap");
  });

  it("skips a card reward once instead of claiming and skipping forever", async () => {
    const config = testConfig();
    const { server, actions } = await scriptedMod({
      sequence: [rewardCardPayload(), rewardAfterSkipPayload(), mapPayload()],
    });
    // A model that always wants to skip, which is what triggered the loop on a live run.
    const skipper = {
      model: "stub",
      async ask(
        _state: unknown,
        questions: Record<string, { type: string; criteria?: Record<string, unknown> | string[] }>,
      ): Promise<JevAskResult> {
        const answers: AnswerSet = {};
        for (const [id, question] of Object.entries(questions)) {
          const criteria = question.criteria;
          const keys = criteria && !Array.isArray(criteria) ? Object.keys(criteria) : [];
          const pick = keys.includes("skip") ? "skip" : keys[0] ?? "";
          answers[id] = { type: "choice", choice: pick, probabilities: { [pick]: 0.9 }, confidence: 0.9, raw: {} };
        }
        return { model: "stub", answers, inputTokens: 10, outputTokens: 5, latencyMs: 1, requestId: null };
      },
    } as unknown as JevClient;

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: skipper,
      knowledge: testKnowledge,
      maxDecisions: 4,
      pollIntervalMs: 1,
    });

    const taken = actions.map((intent) => intent["action"]);
    expect(taken.slice(0, 3)).toEqual(["skip_reward_cards", "collect_rewards_and_proceed", "choose_map_node"]);
    // The loop this test guards against was skip -> claim_reward -> skip -> ...
    expect(taken).not.toContain("claim_reward");
    expect(stats.stoppedBecause).toContain("decision cap");
  });

  it("reports the running session total when combat ends", async () => {
    const config = testConfig();
    const { server } = await scriptedMod({
      sequence: [combatPayload(), combatPayload(), mapPayload(), mapPayload()],
    });
    const events: LoopEvent[] = [];

    await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: stubJev().client,
      knowledge: testKnowledge,
      maxDecisions: 3,
      pollIntervalMs: 1,
      onEvent: (event) => events.push(event),
    });

    const ended = events.filter((event): event is Extract<LoopEvent, { type: "combat_end" }> => event.type === "combat_end");
    expect(ended).toHaveLength(1);
    const report = ended[0];
    if (!report) throw new Error("no combat_end event");
    // The line prints the session totals, not the fight's own cost: two decisions, both asks.
    expect(report.totals.decisions).toBe(2);
    expect(report.totals.jevCalls).toBe(2);
    expect(report.totals.inputTokens).toBe(200);
    expect(report.totals.outputTokens).toBe(20);
  });

  it("asks the planner for the run plan with no escalation chain, and never escalates a low-confidence Jev pick", async () => {
    const base = testConfig();
    const runPlanLog = join(tmpdir(), `run-plans-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
    logs.push(runPlanLog);
    // Default config: the escalation chain is empty (Jev is the final decider).
    expect(base.escalation.chain).toEqual([]);
    const config: AppConfig = { ...base, runPlan: "v1", runPlanLog, deepseek: { maxCalls: 5 } as AppConfig["deepseek"] };
    const { server } = await scriptedMod({ sequence: [mapPayload(), mapPayload(), mainMenuPayload()] });
    const labels: string[] = [];
    const planner = {
      async askJson(_payload: unknown, label: string) {
        labels.push(label);
        return { json: { archetype: "Strength", hp_policy: "preserve", route_risk: "avoid_elites", summary: "careful" }, meta: { latencyMs: 1, inputTokens: 10, outputTokens: 5 } };
      },
    };
    // Jev near-guesses every pick (0.1): nothing escalates, code's rank 1 is the fallback.
    const unsure = {
      model: "stub",
      async ask(_state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> }>): Promise<JevAskResult> {
        const answers: AnswerSet = {};
        for (const [id, question] of Object.entries(questions)) {
          const first = Object.keys(question.criteria ?? {})[0] ?? "";
          answers[id] = { type: "choice", choice: first, probabilities: { [first]: 0.1 }, confidence: 0.1, raw: {} };
        }
        return { model: "stub", answers, inputTokens: 1, outputTokens: 1, latencyMs: 1, requestId: null };
      },
    } as unknown as JevClient;

    const stats = await runLoop({
      config,
      mode: "play",
      client: new ModClient({ baseUrl: server.url }),
      jev: unsure,
      planner: planner as never,
      knowledge: testKnowledge,
      maxRuns: 1,
      maxDecisions: 5,
      pollIntervalMs: 1,
    });

    expect(labels).toEqual(["run-plan"]);
    expect(stats.deepseekCalls).toBe(1);
    const planLine = JSON.parse(readFileSync(runPlanLog, "utf8").trim().split("\n")[0]!);
    expect(planLine).toMatchObject({ version: 1, plan: { hpPolicy: "preserve", routeRisk: "avoid_elites" }, validator: [], changes: [] });
    const decisions = readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(decisions.length).toBeGreaterThan(0);
    for (const record of decisions) expect(record.escalation).toBeUndefined();
    // avoid_elites: the Elite next node was not among the map options.
    const route = decisions.find((record) => record.label === "map/route");
    expect(route.chosen).not.toEqual({ action: "choose_map_node", option_index: 0 });
    expect(JSON.stringify(route.questions ?? {})).not.toMatch(/Elite/);
  });
});
