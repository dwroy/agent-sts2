/**
 * SL_RETRY_EXPLORE_KEY_COUNTERS and SL_RETRY_EXPLORE_SECOND (docs/sl.md §11.12–11.13, src/sl/explore.ts slBoardKey /
 * secondPlan, the controller), on 7TQFLQBKRE4S F33 / F39 as logged (tests/sl-second-data) and a scripted fight.
 * - 7TQF F33 attempt 3: replaying attempt 2's path to its T4 point, T4's first board was "not on attempt 2's path": the two
 *   boards differ only by 开心小花's counter, 3 on attempt 3's frame and 0 on attempt 2's (energy 4 on both: the flower had
 *   given its energy, its counter not yet shown back at 0). With the counters read at their count as 0 the board is the point.
 * - 7TQF F39: attempt 2 (known draws, no explore) played attempt 1's fight again. Attempt 2 now deviates where it is still on
 *   attempt 1's path, from the turn attempt 1 lost the most HP; an attempt 2 already playing otherwise is left as it is.
 * No logs/ or .cache, no model.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig, type SlConfig } from "../src/core/config.js";
import type { AnswerSet } from "../src/reflex/jev/answers.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { buildRunBrief } from "../src/memory/run-brief.js";
import { RunJournal } from "../src/memory/run-journal.js";
import { createScreenMemory, type AskDecision, type DecisionEnv, type SlEnv } from "../src/memory/types.js";
import { planCombatTurn } from "../src/reflex/combat-plan.js";
import type { SlAttemptRow } from "../src/sl/attempts.js";
import { SlController, slRoomOf } from "../src/sl/controller.js";
import { boardTried, exploreTarget, RELIC_COUNTER_WRAPS, replayPoints, secondPlan, slBoardKey, type ExploreRow, type SlTarget } from "../src/sl/explore.js";
import { testKnowledge } from "./scenarios.js";
import { bossBoard, menuBoard } from "./sl-support.js";

type Raw = Record<string, unknown>;
const DATA = join(dirname(fileURLToPath(import.meta.url)), "sl-second-data");
const config = loadConfig({} as NodeJS.ProcessEnv);
const t4 = (): { attempt2: { state: Raw }; attempt3: { state: Raw } } => JSON.parse(readFileSync(join(DATA, "7tqf-f33-t4.json"), "utf8"));
const rows = (): SlAttemptRow[] => JSON.parse(readFileSync(join(DATA, "7tqf-rows.json"), "utf8")) as SlAttemptRow[];
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("SL_RETRY_EXPLORE_KEY_COUNTERS: 7TQFLQBKRE4S F33 attempt 3, T4's first board", () => {
  const f33 = () => rows().filter((row) => row.floor === 33);

  it("the live stop: the boards differ only by 开心小花's counter (3 against 0), the energy the same", () => {
    const { attempt2, attempt3 } = t4();
    const relic = (raw: Raw) => ((raw["run"] as Raw)["relics"] as Raw[]).find((entry) => entry["relic_id"] === "HAPPY_FLOWER")!["stack"];
    expect([relic(attempt2.state), relic(attempt3.state)]).toEqual([0, 3]);
    const energy = (raw: Raw) => ((raw["combat"] as Raw)["player"] as Raw)["energy"];
    expect([energy(attempt2.state), energy(attempt3.state)]).toEqual([4, 4]);
    const a2 = parseGameState(attempt2.state);
    const a3 = parseGameState(attempt3.state);
    expect(slBoardKey(a3)).not.toBe(slBoardKey(a2));
    const row3 = f33().find((row) => row.attempt === 3)!;
    expect(row3.explore?.replay?.stopped).toBe("T4: the board is not on attempt 2's path");
    // Attempt 2's T4 board is attempt 3's deviation point.
    expect(row3.explore?.target?.board).toBe(slBoardKey(a2));
  });

  it("read at its count as 0, the counter makes the two boards one: attempt 3 is on its point; nothing else changes", () => {
    const { attempt2, attempt3 } = t4();
    const a2 = parseGameState(attempt2.state);
    const a3 = parseGameState(attempt3.state);
    expect(slBoardKey(a3, { counters: true })).toBe(slBoardKey(a2));
    expect(slBoardKey(a2, { counters: true })).toBe(slBoardKey(a2));
    const target = f33().find((row) => row.attempt === 3)!.explore!.target as SlTarget;
    expect(slBoardKey(a3, { counters: true })).toBe(target.board);
    // The boards before it on the path were the same with or without (the replay had gone through 7 of them).
    expect(replayPoints(f33().filter((row) => row.attempt < 3) as unknown as ExploreRow[], target).size).toBe(7);
    // Any other difference still tells the boards apart (the energy here), and so does a counter below its count.
    const other = structuredClone(attempt3.state);
    ((other["combat"] as Raw)["player"] as Raw)["energy"] = 3;
    expect(slBoardKey(parseGameState(other), { counters: true })).not.toBe(slBoardKey(a2));
    const below = structuredClone(attempt3.state);
    ((below["run"] as Raw)["relics"] as Raw[]).find((entry) => entry["relic_id"] === "HAPPY_FLOWER")!["stack"] = 2;
    expect(slBoardKey(parseGameState(below), { counters: true })).not.toBe(slBoardKey(a2));
    expect(RELIC_COUNTER_WRAPS.get("HAPPY_FLOWER")).toBe(3);
  });
});

describe("SL_RETRY_EXPLORE_SECOND: attempt 2's plan from attempt 1", () => {
  it("the turn attempt 1 lost the most HP to its last turn (7TQF F33: T4 to T7; F39: T1 to T4)", () => {
    const f33 = rows().filter((row) => row.floor === 33) as unknown as ExploreRow[];
    expect(secondPlan(f33.filter((row) => row.attempt < 2))).toMatchObject({ turn: 4, until: 7, weights: { T4: 44.6 } });
    const f39 = rows().filter((row) => row.floor === 39) as unknown as ExploreRow[];
    expect(secondPlan(f39.filter((row) => row.attempt < 2))).toMatchObject({ turn: 1, until: 4 });
    // Attempt 2 of F39 played attempt 1's fight again: its turns are attempt 1's, turn by turn.
    const turns = (attempt: number) => (f39.find((row) => row.attempt === attempt)!.explore!.turns ?? []).map((turn) => [...turn.plays].sort().join(", "));
    expect(turns(2)).toEqual(turns(1));
    // A won attempt 1, or none with a turn record: no plan.
    expect(secondPlan(f39.filter((row) => row.attempt < 2).map((row) => ({ ...row, result: "won" })))).toBeNull();
    expect(secondPlan(f39.filter((row) => row.attempt < 2).map((row) => ({ ...row, explore: { points: [], target: null } })))).toBeNull();
  });

  it("on a board of attempt 1's path, attempt 1's turn through it is what attempt 2 must not play again", () => {
    const f39 = rows().filter((row) => row.floor === 39) as unknown as ExploreRow[];
    const one = f39.find((row) => row.attempt === 1)!;
    const board = one.explore!.turns![0]!.boards[0]!.board;
    const tried = boardTried(f39.filter((row) => row.attempt < 2), 2, board, { canon: true })!;
    expect(tried).toMatchObject({ excluded: [], attempts: [1] });
    expect(tried.tried?.canon).toEqual([[...one.explore!.turns![0]!.plays].sort().join(", ")]);
  });
});

describe("fight_kind: the room (slRoomOf)", () => {
  it("a boss; else the map's node; else by the enemies", () => {
    expect(slRoomOf({ kind: "boss" }, ["TEST_SUBJECT"], "Monster", testKnowledge)).toBe("boss");
    expect(slRoomOf({ kind: "elite" }, ["OWL_MAGISTRATE"], "Monster", testKnowledge)).toBe("hallway");
    expect(slRoomOf({ kind: "elite" }, ["OWL_MAGISTRATE"], "Unknown", testKnowledge)).toBe("event");
    expect(slRoomOf({ kind: "elite" }, ["OWL_MAGISTRATE"], "Elite", testKnowledge)).toBe("elite");
    expect(slRoomOf({ kind: "elite" }, ["CULTIST"], null, testKnowledge)).toBe("hallway");
    const elites = { monster: (id: string) => (id === "GREMLIN_NOB" ? ({ type: "Elite" } as never) : undefined) };
    expect(slRoomOf({ kind: "elite" }, ["GREMLIN_NOB"], null, elites)).toBe("elite");
  });
});

// ---------------------------------------------------------------- the controller (a scripted fight, testKnowledge)

const Q1 = (): Raw => bossBoard({ turn: 1, hp: 60, playable: true, lethal: false });
const Q2 = (): Raw => bossBoard({ turn: 2, hp: 45, playable: true, lethal: false });
const DEATH = (): Raw => bossBoard({ turn: 3, hp: 10 });
const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as unknown as AnswerSet;

function slConfig(log: string, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 4, eliteRetries: 1, act3LowHp: true, act3LowHpPct: 40, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw: true, reloadEarly: true, retryKnownInserts: true, retryKnownTop: true, retryExplore: true, retryExploreB2: true, retryExploreBossPotions: true, retryExploreOrder: true, retryExploreReplay: true, retryExploreReplayPlays: true, retryExploreReplayDeviate: true, retryExploreKeyCounters: true, retryExploreSecond: true, retryExploreCanon: true, retryExploreTurn: true, retryExploreWhole: true, retryExploreWhere: true, retryExplorePotion: true, retryKnownPicks: true, retryKnownOffTop: true, retryKnownHandOrder: true, log, stepTimeoutMs: 5_000, ...overrides };
}
function tempLog(): string {
  const dir = mkdtempSync(join(tmpdir(), "sl-second-"));
  dirs.push(dir);
  return join(dir, "sl-attempts.jsonl");
}
const logRows = (path: string): SlAttemptRow[] => readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line) as SlAttemptRow);
function scenarioEnv(raw: Raw, sl?: SlEnv): DecisionEnv {
  const state = parseGameState(raw);
  return { state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], ...(sl ? { sl } : {}) };
}
function controller(log: string, overrides: Partial<SlConfig> = {}) {
  let current: Raw = Q1();
  let clock = 0;
  const notes: string[] = [];
  const client = {
    state: async () => parseGameState(current),
    act: async (intent: { action: string }) => {
      current = intent.action === "save_and_quit" ? menuBoard() : intent.action === "continue_run" ? Q1() : current;
      return { action: intent.action, status: "completed", stable: true, message: "", state: null, raw: {} };
    },
  };
  const sl = new SlController({ config: slConfig(log, overrides), knowledge: testKnowledge, client: client as never, note: (m) => notes.push(m), sleep: async (ms) => void (clock += ms), now: () => clock });
  return { sl, notes, memory: { journal: new RunJournal(), screenMemory: createScreenMemory() } };
}
/**
 * One attempt: each board observed, planned, Jev picks `answer(i)`, dispatched, the rest of its line noted as sent on the same
 * board (the turn record holds the turn's plays, as a live turn's); then the death.
 */
async function playAttempt(t: ReturnType<typeof controller>, boards: Raw[], answer: (i: number) => string = () => "plan1"): Promise<{ env: SlEnv | undefined; log: unknown }[]> {
  const played: { env: SlEnv | undefined; log: unknown }[] = [];
  for (const [i, raw] of boards.entries()) {
    const state = parseGameState(raw);
    t.sl.observe(state, t.memory);
    const env = t.sl.envFor(state);
    const planEnv = scenarioEnv(raw, env);
    const decision = planCombatTurn(planEnv)!;
    const resolved = decision.kind === "ask" ? (decision as AskDecision).resolve(pick(answer(i))) : { intent: decision.intent, rationale: decision.rationale, confidence: null, fallback: false, ...(decision.log ? { log: decision.log } : {}) };
    t.sl.noteAction(state, resolved.intent!);
    resolved.apply?.();
    for (const step of planEnv.screenMemory.combatPlan?.remaining ?? []) t.sl.noteAction(state, step.target === null ? { action: "play_card", card_index: step.cardIndex } : { action: "play_card", card_index: step.cardIndex, target_index: step.target });
    t.sl.notePoint(state, decision, resolved);
    played.push({ env: env ? structuredClone(env) : undefined, log: (resolved.log as Raw | undefined)?.["sl_explore"] ?? null });
  }
  const death = parseGameState(DEATH());
  t.sl.observe(death, t.memory);
  await t.sl.beforeEndTurn(death, { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
  return played;
}

describe("the controller with SL_RETRY_EXPLORE_SECOND", () => {
  it("attempt 2 repeating attempt 1 at the turn attempt 1 lost the most HP deviates there, as an attempt 3 would", async () => {
    const log = tempLog();
    const t = controller(log);
    expect(t.sl.describe()).toMatchObject({ retry_explore_second: true, retry_explore_key_counters: true });
    await playAttempt(t, [Q1(), Q2()]);
    // Attempt 1 lost 15 on T1, 35 on T2, its last 10 on T3: T2 weighs the most (35 + 10/2).
    const a2 = await playAttempt(t, [Q1(), Q2()]);
    expect(t.notes.some((note) => /^SL: attempt 2 deviates if it is still on attempt 1's path from T2 \(where attempt 1 lost the most HP: T1 [\d.]+, T2 40, T3 10\) to T3$/.test(note))).toBe(true);
    // T1 plays as usual (attempt 1's line); T2's board is attempt 1's: the line attempt 1 played there gives way.
    expect(a2[0]!.env?.explore?.deviate).toBeUndefined();
    expect(a2[1]!.env?.explore?.deviate).toMatchObject({ point: "T2, attempt 2 still on attempt 1's path (from T2, where attempt 1 lost the most HP)", excluded: [], attempts: [1] });
    expect(a2[1]!.env?.explore?.deviate?.tried?.canon).toEqual(["BASH>Test Subject, DEFEND_R"]);
    expect(a2[1]!.log).toMatchObject({ original: "DEFEND_R, BASH -> Test Subject", replacement: "STRIKE_R -> Test Subject, BASH -> Test Subject" });
    const row2 = logRows(log)[1]!;
    expect(row2.explore).toMatchObject({ second: { turn: 2, until: 3 }, target: { turn: 2, reference: 1, attempts: [1] }, deviation: { reached: true, replacement: "STRIKE_R -> Test Subject, BASH -> Test Subject", turn: 2, differs: true } });
    // Attempt 3: attempt 2's deviation is a use of its board (attempt 2 is the path, as before).
    const { target } = exploreTarget(logRows(log) as unknown as ExploreRow[], 3, { aliveFirst: true, canon: true, tried: true, whole: true, where: true, potion: true });
    expect(target?.reference).toBe(2);
    expect(target?.board).not.toBe(row2.explore!.target!.board);
  });

  it("an attempt 2 that already plays otherwise there is left as it is; off: attempt 2 as before", async () => {
    const log = tempLog();
    const t = controller(log);
    await playAttempt(t, [Q1(), Q2()]);
    // Jev's own T2 answer is not attempt 1's line: played as answered.
    const a2 = await playAttempt(t, [Q1(), Q2()], (i) => (i === 1 ? "plan2" : "plan1"));
    expect(a2[1]!.log).toMatchObject({ original: "STRIKE_R -> Test Subject, BASH -> Test Subject", replacement: null, reason: "the pick was not played on this board before: played as answered" });
    expect(logRows(log)[1]!.explore?.deviation).toMatchObject({ reached: true, replacement: null });
    const offLog = tempLog();
    const off = controller(offLog, { retryExploreSecond: false });
    expect(off.sl.describe()).toMatchObject({ retry_explore_second: false });
    await playAttempt(off, [Q1(), Q2()]);
    const offA2 = await playAttempt(off, [Q1(), Q2()]);
    expect(offA2.every((entry) => entry.env?.explore?.deviate === undefined)).toBe(true);
    expect(offA2[1]!.log).toBeNull();
    expect(logRows(offLog)[1]!.explore).not.toHaveProperty("second");
    expect(logRows(offLog)[1]!.explore?.target).toBeNull();
  });
});
