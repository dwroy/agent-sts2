/**
 * The turn-start settle (src/act/turn-start.ts, loop.ts before the re-read that precedes a dispatch): at the start of our turn
 * the mod reads ready between two hooks (Hellraiser's auto-played Strikes, Inferno's loss and sweep), so the turn's first
 * combat action holding Inferno or Hellraiser goes out only once its board has stood the power's settle time since it was
 * read. C4F14F3XPN0N F33 attempt 1 T7 (2026-10-03): the least-loss Anger went out 3 ms after a frame read mid-draw (4 HP, one
 * card), before Inferno's 2. The logged boards are tests/sl-inferno-judge-data's (C4F1 F33 attempt 5, two Inferno+ and
 * Hellraiser up); the loop runs on a scripted mod server. No model call, nothing under logs/ or .cache read.
 */
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { noteTurnActed, settlePowersOf, TURN_START_SETTLE_MS, turnKeyOf, turnStartSettleMs } from "../src/act/turn-start.js";
import { loadConfig, type AppConfig } from "../src/config.js";
import type { AnswerSet } from "../src/jev/answers.js";
import type { JevAskResult, JevClient } from "../src/jev/client.js";
import { resetFightMemory, runLoop } from "../src/loop.js";
import { ModClient } from "../src/mod/client.js";
import { parseGameState } from "../src/mod/schema.js";
import { createScreenMemory } from "../src/project/types.js";
import { combatPayload, mainMenuPayload, testKnowledge } from "./scenarios.js";
import { envelope, sendJson, startTestServer, type TestServer } from "./support.js";

type Raw = Record<string, unknown>;
const DATA = join(dirname(fileURLToPath(import.meta.url)), "sl-inferno-judge-data");
const BOARDS = JSON.parse(readFileSync(join(DATA, "boards.json"), "utf8")) as { states: Record<string, Raw> };
const board = (key: string): Raw => structuredClone(BOARDS.states[key]!);
const playerOf = (raw: Raw) => (raw["combat"] as Raw)["player"] as Raw;
const setPower = (raw: Raw, id: string, amount: number): void => {
  const player = playerOf(raw);
  const powers = (player["powers"] as Raw[]).filter((power) => power["power_id"] !== id);
  if (amount !== 0) powers.push({ index: powers.length, power_id: id, name: id, amount, is_debuff: false });
  player["powers"] = powers;
};
const PLAY = { action: "play_card", card_index: 0, target_index: 0 };

describe("turnStartSettleMs on C4F14F3XPN0N F33 attempt 5 T7 (Hellraiser + two Inferno+, the least-loss Anger 2 ms after the read)", () => {
  const read = Date.parse("2026-10-03T14:46:12.045Z");
  const decided = Date.parse("2026-10-03T14:46:12.047Z");

  it("the turn's first combat action waits what is left of Hellraiser's 1000 ms; Inferno alone 500 ms", () => {
    const raw = board("c4f1_a5_t7");
    const state = parseGameState(raw);
    expect(settlePowersOf(state).sort()).toEqual(["HELLRAISER_POWER", "INFERNO_POWER"]);
    expect(turnKeyOf(state)).toBe("C4F14F3XPN0N:1:33:7");
    expect(TURN_START_SETTLE_MS).toEqual({ INFERNO_POWER: 500, HELLRAISER_POWER: 1000 });
    const memory = createScreenMemory("COMBAT");
    expect(turnStartSettleMs(state, PLAY, memory, read, decided)).toBe(998);
    for (const action of ["use_potion", "end_turn"]) expect(turnStartSettleMs(state, { action }, memory, read, decided)).toBe(998);
    setPower(raw, "HELLRAISER_POWER", 0);
    expect(turnStartSettleMs(parseGameState(raw), PLAY, memory, read, decided)).toBe(498);
    // Planned for longer than the settle: nothing more.
    expect(turnStartSettleMs(parseGameState(raw), PLAY, memory, read, read + 640)).toBe(0);
  });

  it("not held: neither power up (Crimson Mantle alone), a later action of the turn, a choice screen's action, or out of combat", () => {
    const raw = board("c4f1_a5_t7");
    setPower(raw, "HELLRAISER_POWER", 0);
    setPower(raw, "INFERNO_POWER", 0);
    setPower(raw, "CRIMSON_MANTLE_POWER", 7);
    const memory = createScreenMemory("COMBAT");
    expect(turnStartSettleMs(parseGameState(raw), PLAY, memory, read, decided)).toBe(0);
    const held = parseGameState(board("c4f1_a5_t7"));
    noteTurnActed(memory, held, PLAY);
    expect(memory.turnActed).toBe("C4F14F3XPN0N:1:33:7");
    expect(turnStartSettleMs(held, PLAY, memory, read, decided)).toBe(0);
    // The next turn waits again; an SL reload (resetFightMemory) forgets the turn.
    const next = board("c4f1_a5_t7");
    next["turn"] = 8;
    expect(turnStartSettleMs(parseGameState(next), PLAY, memory, read, decided)).toBe(998);
    resetFightMemory(memory);
    expect(turnStartSettleMs(held, PLAY, memory, read, decided)).toBe(998);
    expect(turnStartSettleMs(held, { action: "select_deck_card", option_index: 0 }, createScreenMemory("COMBAT"), read, decided)).toBe(0);
    const selection = board("c4f1_a5_t7");
    selection["screen"] = "CARD_SELECTION";
    expect(turnStartSettleMs(parseGameState(selection), PLAY, createScreenMemory("CARD_SELECTION"), read, decided)).toBe(0);
  });
});

/** A cooperative Jev: the first option of every choice (the per-card planner asks one). */
function stubJev(): JevClient {
  let calls = 0;
  return {
    model: "stub",
    async ask(_state: unknown, questions: Record<string, { type: string; criteria?: Record<string, unknown> | string[] }>): Promise<JevAskResult> {
      calls += 1;
      const answers: AnswerSet = {};
      for (const [id, question] of Object.entries(questions)) {
        const first = question.criteria && !Array.isArray(question.criteria) ? Object.keys(question.criteria)[0] ?? "" : "";
        answers[id] = question.type === "choice" ? { type: "choice", choice: first, probabilities: { [first]: 0.9 }, confidence: 0.9, raw: {} } : { type: "noul", noul: 0.5, raw: {} };
      }
      return { model: "stub", answers, inputTokens: 100, outputTokens: 10, latencyMs: 1, requestId: `req_stub_${calls}` };
    },
  } as unknown as JevClient;
}

const servers: TestServer[] = [];
const logs: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  for (const path of logs.splice(0)) rmSync(path, { force: true });
});

function testConfig(): AppConfig {
  const path = join(tmpdir(), `jev-sts2-settle-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`);
  logs.push(path);
  const config = loadConfig({} as NodeJS.ProcessEnv);
  return { ...config, combatPlanner: "card", log: { ...config.log, decisionLog: path } };
}

/**
 * A turn start whose hooks are not done: for `staleMs` after the first read the mod serves `stale` (ready, but Inferno's 2
 * and the last draw still to come), then `settled`; an action ends the run (the main menu next).
 */
async function turnStartMod(stale: Raw, settled: Raw, staleMs: number): Promise<{ server: TestServer; sent: { intent: Raw; at: number }[] }> {
  let first: number | null = null;
  let acted = false;
  const sent: { intent: Raw; at: number }[] = [];
  const server = await startTestServer((req, res) => {
    if (req.method === "GET" && req.url === "/state") {
      first ??= Date.now();
      return sendJson(res, 200, envelope(acted ? mainMenuPayload() : Date.now() - first < staleMs ? stale : settled));
    }
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      sent.push({ intent: JSON.parse(raw || "{}") as Raw, at: Date.now() - (first ?? Date.now()) });
      acted = true;
      sendJson(res, 200, envelope({ action: "play_card", status: "completed", stable: true, message: "scripted", state: mainMenuPayload() }));
    });
  });
  servers.push(server);
  return { server, sent };
}

/** The scripted turn start: Inferno (two copies) up or not; the settled board 2 HP lower with one more card drawn. */
function turnStart(inferno: boolean): { stale: Raw; settled: Raw } {
  const stale = combatPayload();
  const settled = combatPayload();
  if (inferno) for (const raw of [stale, settled]) setPower(raw, "INFERNO_POWER", 18);
  (settled["run"] as Raw)["current_hp"] = 53;
  playerOf(settled)["current_hp"] = 53;
  const hand = (settled["combat"] as Raw)["hand"] as Raw[];
  hand.push({ ...structuredClone(hand[1]!), index: 3 });
  return { stale, settled };
}

const recordsOf = (config: AppConfig): Raw[] => readFileSync(config.log.decisionLog, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Raw);

describe("the loop at a turn start still settling", () => {
  it("Inferno up: the first action is not sent on the stale board; the re-read after 500 ms re-plans on the settled one", async () => {
    const config = testConfig();
    const { stale, settled } = turnStart(true);
    const { server, sent } = await turnStartMod(stale, settled, 150);
    const notes: string[] = [];
    await runLoop({ config, mode: "play", client: new ModClient({ baseUrl: server.url }), jev: stubJev(), knowledge: testKnowledge, maxRuns: 1, maxDecisions: 10, pollIntervalMs: 1, onEvent: (event) => {
      if (event.type === "note") notes.push(event.message);
    } });
    expect(sent).toHaveLength(1);
    // Planned at ~0 on the stale board, re-read at ~500 (moved), planned again, sent once that board had stood 500 ms.
    expect(sent[0]!.at).toBeGreaterThanOrEqual(2 * TURN_START_SETTLE_MS["INFERNO_POWER"]! - 50);
    const records = recordsOf(config).filter((record) => record["screen"] === "COMBAT");
    expect(records.map((record) => String(record["result"]))).toEqual([
      "not dispatched: state changed while deciding (turn start still settling: INFERNO_POWER up)",
      "completed: scripted",
    ]);
    expect(notes).toContain("state changed while deciding (turn start still settling: INFERNO_POWER up); re-planning");
    expect(records[1]!["fingerprint"]).not.toBe(records[0]!["fingerprint"]);
  }, 30_000);

  it("neither power up: not held, the action goes out on the first board read (as before)", async () => {
    const config = testConfig();
    const { stale, settled } = turnStart(false);
    // The board moves at 1000 ms (400 before: the first read's planning alone took ~500 ms at load ~20 while live play ran).
    const { server, sent } = await turnStartMod(stale, settled, 1000);
    await runLoop({ config, mode: "play", client: new ModClient({ baseUrl: server.url }), jev: stubJev(), knowledge: testKnowledge, maxRuns: 1, maxDecisions: 10, pollIntervalMs: 1 });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.at).toBeLessThan(1000);
    expect(recordsOf(config).filter((record) => record["screen"] === "COMBAT").map((record) => record["result"])).toEqual(["completed: scripted"]);
  }, 30_000);
});
