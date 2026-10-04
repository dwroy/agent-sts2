/**
 * SL in the play loop (docs/sl.md), against a scripted game: a boss turn that certainly kills us is not ended; the
 * loop sends save_and_quit and continue_run, logs the reload, and plays attempt 2 with the previous attempt in Jev's
 * question. With SL_ENABLED off the same game gets end_turn, and the logs and Jev's questions carry nothing of SL;
 * with SL on and no reload, the decision rows differ only by the sl_* fields. SL_RELOAD_EARLY: the turn planner's
 * least-loss verdict reloads before its line's first card; off, after the line at end_turn.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { AppConfig } from "../src/core/config.js";
import { loadConfig } from "../src/core/config.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import type { JevAskResult, JevClient } from "../src/reflex/jev/client.js";
import { runLoop } from "../src/hand/loop.js";
import { ModClient } from "../src/hand/mod/client.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";
import { gameOverPayload, testKnowledge } from "./scenarios.js";
import { bossBoard, menuBoard } from "./sl-support.js";

type Raw = Record<string, unknown>;

const servers: TestServer[] = [];
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function config(sl: boolean): AppConfig {
  const dir = mkdtempSync(join(tmpdir(), "sl-loop-"));
  dirs.push(dir);
  const base = loadConfig({ DECISION_LOG: join(dir, "decisions.jsonl"), RUN_CONFIG_LOG: join(dir, "run-config.jsonl"), JEV_PROMPT_LOG: "off" } as NodeJS.ProcessEnv);
  return { ...base, combatPlanner: "card", sl: { ...base.sl, enabled: sl, stepTimeoutMs: 5_000 } };
}

/** Jev picks the first option; the state of every question is kept. */
function stubJev() {
  const seen: unknown[] = [];
  const client = {
    model: "stub",
    async ask(state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> }>): Promise<JevAskResult> {
      seen.push(state);
      const answers: AnswerSet = {};
      for (const [id, question] of Object.entries(questions)) {
        const first = Object.keys(question.criteria ?? {})[0] ?? "";
        answers[id] = { type: "choice", choice: first, probabilities: { [first]: 0.9 }, confidence: 0.9, raw: {} };
      }
      return { model: "stub", answers, inputTokens: 100, outputTokens: 10, latencyMs: 1, requestId: `req_${seen.length}` };
    },
  } as unknown as JevClient;
  return { client, seen };
}

/**
 * The game: T3 of a boss fight where ending the turn kills us (end_turn: the score screen). save_and_quit: the main
 * menu; continue_run: the fight's T1 with a card to play; then T1 with nothing left, whose end_turn ends the session
 * (a main menu with no run to continue).
 */
async function bossGame(start: Raw = bossBoard({ turn: 3, hp: 10 })) {
  let current: Raw = start;
  const actions: string[] = [];
  const server = await startTestServer((req, res) => {
    if (req.method === "GET" && req.url === "/state") return sendJson(res, 200, envelope(current));
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      const action = String((JSON.parse(raw || "{}") as Raw)["action"]);
      actions.push(action);
      if (action === "save_and_quit") current = menuBoard();
      else if (action === "continue_run") current = bossBoard({ turn: 1, hp: 60, lethal: false, playable: true });
      else if (action === "play_card") current = bossBoard({ turn: 1, hp: 60, lethal: false });
      else if (action === "end_turn") current = current["turn"] === 3 && (current["combat"] as Raw)["end_turn_will_kill_player"] === true ? gameOverPayload() : menuBoard(false);
      else if (action === "continue_game_over") current = menuBoard(false);
      sendJson(res, 200, envelope({ action, status: "completed", stable: true, message: "scripted", state: current }));
    });
  });
  servers.push(server);
  return { server, actions };
}

function readRows(path: string): Raw[] {
  return existsSync(path) ? readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Raw) : [];
}

async function play(cfg: AppConfig, game: Awaited<ReturnType<typeof bossGame>>, jev = stubJev()) {
  const stats = await runLoop({ config: cfg, mode: "play", client: new ModClient({ baseUrl: game.server.url }), jev: jev.client, knowledge: testKnowledge, maxRuns: 1, maxDecisions: 20, pollIntervalMs: 1, slPollMs: 1, restoreRun: false });
  return { stats, jev };
}

describe("SL in the play loop", () => {
  it("SL on: the certain death is not played; the fight is reloaded and attempt 2 is played with attempt 1 in Jev's question", async () => {
    const cfg = config(true);
    const game = await bossGame();
    const { stats, jev } = await play(cfg, game);
    expect(game.actions).toEqual(["save_and_quit", "continue_run", "play_card", "end_turn"]);
    expect(stats.stoppedBecause).toContain("run 1 ended");

    const decisions = readRows(cfg.log.decisionLog);
    expect(decisions[0]).toMatchObject({ chosen: { action: "end_turn" }, sl_attempt: 1, sl_reloads: 0, result: expect.stringMatching(/^not dispatched: SL reloaded the fight/) });
    expect(decisions.slice(1).every((row) => row["sl_attempt"] === 2 && row["sl_reloads"] === 1)).toBe(true);

    const attempts = readRows(cfg.sl.log!);
    expect(attempts).toHaveLength(2);
    expect(attempts[0]).toMatchObject({ attempt: 1, result: "predicted_death", fight_kind: "boss", reload: { ok: true, resumed_turn: 1 } });
    // The session ends on the main menu in the middle of attempt 2.
    expect(attempts[1]).toMatchObject({ attempt: 2, result: "unfinished", from: expect.stringMatching(/room-entry save/) });

    // Jev's one question (attempt 2, T1) carries the previous attempt.
    expect(jev.seen).toHaveLength(1);
    const asked = jev.seen[0] as Raw;
    expect(JSON.stringify(asked["previous_attempts"])).toContain("certain death at the end of T3");

    const runConfig = readRows(cfg.log.runConfigLog!);
    expect(runConfig[0]?.["sl"]).toMatchObject({ enabled: true, boss_retries: 5, elite_retries: 3 });
  });

  it("SL off: the same game gets end_turn, and nothing of SL is in the logs or the question", async () => {
    const cfg = config(false);
    const game = await bossGame();
    await play(cfg, game);
    expect(game.actions).toEqual(["end_turn", "continue_game_over"]);
    const decisions = readRows(cfg.log.decisionLog);
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.some((row) => "sl_attempt" in row || "sl_reloads" in row)).toBe(false);
    expect(existsSync(cfg.sl.log!)).toBe(false);
    expect(readRows(cfg.log.runConfigLog!).some((row) => "sl" in row)).toBe(false);
  });

  it("SL on without a reload: the decision rows and Jev's questions are SL off's, plus the sl_* fields", async () => {
    const normalize = (rows: Raw[]) =>
      rows.map((row) => {
        const { ts: _ts, observed_ts: _o, decision_id: _d, latency_ms: _l, sl_attempt: _a, sl_reloads: _r, ...rest } = row;
        return rest;
      });
    // A board the enemy turn does not kill us on: no SL step, the same plays.
    const start = bossBoard({ turn: 1, hp: 60, lethal: false, playable: true });
    const off = config(false);
    const offGame = await bossGame(start);
    const offRun = await play(off, offGame);
    const on = config(true);
    const onGame = await bossGame(start);
    const onRun = await play(on, onGame);
    expect(onGame.actions).toEqual(offGame.actions);
    const onRows = readRows(on.log.decisionLog);
    expect(onRows.every((row) => row["sl_attempt"] === 1 && row["sl_reloads"] === 0)).toBe(true);
    expect(normalize(onRows)).toEqual(normalize(readRows(off.log.decisionLog)));
    expect(JSON.stringify(onRun.jev.seen)).toBe(JSON.stringify(offRun.jev.seen));
    // SL on tracked the fight as attempt 1 and logged its end (the session ended in it: unfinished).
    expect(readRows(on.sl.log!).map((row) => row["attempt"])).toEqual([1]);
  });

  it("SL_RELOAD_EARLY: every line dies with nothing left to chance: reloaded before the least-loss line's first card; off: after the line", async () => {
    // T3, 10 HP against 30 with Strike, Defend and Bash: the turn planner finds every line dying (least-loss, Defend first).
    // A card played leaves nothing playable (the end_turn then judged by the rules tier).
    const earlyGame = async () => {
      let current: Raw = bossBoard({ turn: 3, hp: 10, playable: true });
      const actions: string[] = [];
      const server = await startTestServer((req, res) => {
        if (req.method === "GET" && req.url === "/state") return sendJson(res, 200, envelope(current));
        let raw = "";
        req.on("data", (chunk) => {
          raw += chunk;
        });
        req.on("end", () => {
          const action = String((JSON.parse(raw || "{}") as Raw)["action"]);
          actions.push(action);
          if (action === "save_and_quit") current = menuBoard();
          else if (action === "continue_run") current = bossBoard({ turn: 1, hp: 60, lethal: false });
          else if (action === "play_card") current = bossBoard({ turn: 3, hp: 10 });
          else if (action === "end_turn") current = menuBoard(false);
          sendJson(res, 200, envelope({ action, status: "completed", stable: true, message: "scripted", state: current }));
        });
      });
      servers.push(server);
      return { server, actions };
    };
    const turnConfig = (early: boolean): AppConfig => {
      const cfg = config(true);
      return { ...cfg, combatPlanner: "turn", sl: { ...cfg.sl, reloadEarly: early } };
    };
    const on = turnConfig(true);
    const onGame = await earlyGame();
    await play(on, onGame);
    expect(onGame.actions).toEqual(["save_and_quit", "continue_run", "end_turn"]);
    const onRows = readRows(on.log.decisionLog);
    expect(onRows[0]).toMatchObject({ label: "combat/least-loss", chosen: { action: "play_card" }, result: expect.stringMatching(/^not dispatched: SL reloaded the fight \(certain death foreseen at the least-loss verdict, before its line; back on T1/) });
    expect(readRows(on.sl.log!)[0]).toMatchObject({ attempt: 1, result: "predicted_death", judge: { tier: "least-loss", early: true } });

    const off = turnConfig(false);
    const offGame = await earlyGame();
    await play(off, offGame);
    expect(offGame.actions).toEqual(["play_card", "save_and_quit", "continue_run", "end_turn"]);
    const offRows = readRows(off.log.decisionLog);
    expect(offRows[0]).toMatchObject({ label: "combat/least-loss", chosen: { action: "play_card" }, result: expect.stringMatching(/^completed/) });
    expect(offRows[1]).toMatchObject({ chosen: { action: "end_turn" }, result: expect.stringMatching(/^not dispatched: SL reloaded the fight \(certain death foreseen; back on T1/) });
    expect(readRows(off.sl.log!)[0]).toMatchObject({ attempt: 1, result: "predicted_death", judge: { tier: "rules" } });
  }, 60_000);
});
