/**
 * SL_RETRY_EXPLORE_REPLAY_PLAYS and SL_RETRY_EXPLORE_REPLAY_DEVIATE (docs/sl.md §11.2, src/sl/explore.ts replayPlays /
 * boardTried, combat-plan loggedLine, the controller's fallback): J4S28FRQKD7G F33 (碾碎者 + 火箭).
 *
 * - The cause: attempt 2 knew 5 draws (attempt 1's, cut by its T1 reshuffle), none left at T2, so its line there,
 *   「防御, 剑柄打击 -> 火箭, 怨恨 -> 火箭」, did not see what Pommel Strike draws. Attempts 3-6 knew 11 (attempt 2's own), 烙印+
 *   next: every Pommel Strike line went on with it (「防御, 剑柄打击 -> 火箭, 烙印+, 怨恨 -> 火箭」), attempt 2's line was not
 *   among the options, and the replay stopped at T2 ("attempt 2's line is not among the options") in attempts 3, 4 and 6,
 *   before their T4 / T5 points; attempt 6 then played attempt 4's whole fight again.
 * - Now: attempt 2's plays from that board (its turn record: 防御, then 剑柄打击 -> 火箭, then the re-plan after the draw) are
 *   played as a line when they are legal there; where neither its line nor its plays can be played, the attempt deviates
 *   there (the lines failed attempts played on the board), and that is not a use of its point.
 * - Off: the planner's resolution on the board is the live one (the logged decision's sl_explore), the controller gives
 *   nothing new.
 * The logged board is planned with knowledge pinned at 6bd48a9 (tests/sl-replay-data/make-fixtures.ts), the rollout and B2
 * off. Nothing under logs/ or .cache is read, nothing outside a temp directory is written.
 */
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "..", "knowledge");
const DATA = join(HERE, "sl-replay-data");
/** Paths under logs/ or .cache touched in any way: must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(HERE, "sl-replay-data", "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
  const shared = [join(ROOT, "..", "logs"), join(ROOT, "..", "data")];
  const watch = (name: string) => {
    const original = (fs as unknown as Record<string, (...args: unknown[]) => unknown>)[name]!;
    return (path: unknown, ...rest: unknown[]) => {
      const at = typeof path === "string" ? resolve(path) : String(path);
      if (shared.some((dir) => at === dir || at.startsWith(dir + "/"))) touched.add(`${name} ${at}`);
      return original(path, ...rest);
    };
  };
  const wrapped: Record<string, unknown> = {};
  for (const name of ["existsSync", "statSync", "lstatSync", "readdirSync", "openSync", "writeFileSync", "appendFileSync", "mkdirSync", "renameSync", "rmSync", "unlinkSync", "copyFileSync", "createWriteStream"]) wrapped[name] = watch(name);
  const read = watch("readFileSync");
  wrapped["readFileSync"] = (path: unknown, ...rest: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(KNOWLEDGE + "/") && path.endsWith(".json")) {
      const name = basename(resolve(path));
      // Outside the knowledge directory before the move (src/sim, src/sl): read as they are.
      if (name === "boss-trust.json" || name === "sl-elites.json") return read(path, ...rest);
      if (name in pinned) return JSON.stringify(pinned[name]);
      throw Object.assign(new Error(`ENOENT: pinned test, ${name}`), { code: "ENOENT" });
    }
    return read(path, ...rest);
  };
  return { ...fs, ...wrapped, default: { ...fs, ...wrapped } };
});

vi.resetModules();
const { mkdtempSync, readFileSync, rmSync } = await import("node:fs");
const { tmpdir } = await import("node:os");
const { potionCostOptions } = await import("../src/strategy/potion-cost.js");
potionCostOptions.enabled = true;
const { loadConfig } = await import("../src/config.js");
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { RunJournal } = await import("../src/project/run-journal.js");
const { loggedLine, planCombatTurn, slPointOf, thiefTrace } = await import("../src/screens/combat-plan.js");
const { previousAttemptsJson } = await import("../src/sl/attempts.js");
const { SlController } = await import("../src/sl/controller.js");
const { boardTried, exploreTarget, replayPlays, replayPoints, slBoardKey } = await import("../src/sl/explore.js");
const { bossLinesOptions } = await import("../src/sim/boss-lines.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { rolloutLiveOptions } = await import("../src/strategy/rollout-live.js");
const { testKnowledge } = await import("./scenarios.js");
const { bossBoard, menuBoard } = await import("./sl-support.js");
type AskDecision = import("../src/project/types.js").AskDecision;
type Decision = import("../src/project/types.js").Decision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;
type SlEnv = import("../src/project/types.js").SlEnv;
type SlConfig = import("../src/config.js").SlConfig;
type SlAttemptRow = import("../src/sl/attempts.js").SlAttemptRow;
type SlTarget = import("../src/sl/explore.js").SlTarget;
type ExploreRow = import("../src/sl/explore.js").ExploreRow;
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type Raw = Record<string, unknown>;

const config = loadConfig({} as NodeJS.ProcessEnv);
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const dirs: string[] = [];
afterEach(() => {
  rolloutLiveOptions.enabled = true;
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
  bossLinesOptions.enabled = true;
  thiefTrace.enabled = false;
  thiefTrace.last = null;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  expect([...touched]).toEqual([]);
});

const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as unknown as AnswerSet;
interface Board {
  source: string;
  decision: { label: string; answers: Raw; chosen: Raw; sl_explore: Raw };
  state: Raw;
  knownDraws: NonNullable<SlEnv["knownDraws"]> | null;
}
const board = (): Board => JSON.parse(readFileSync(join(DATA, "j4s28-a3-t2.json"), "utf8")) as Board;
const rows = (): SlAttemptRow[] => JSON.parse(readFileSync(join(DATA, "j4s28-f33-rows.json"), "utf8")) as SlAttemptRow[];
const REFERENCE_LINE = "防御, 剑柄打击 -> 火箭, 怨恨 -> 火箭";

/** The logged board planned as attempt `attempt` (the rows before it, its known draws), the rollout and B2 off. */
function plan(attempt: number, explore: NonNullable<SlEnv["explore"]>): { decision: Decision; env: DecisionEnv } {
  rolloutLiveOptions.enabled = false;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  const fx = board();
  const state = parseGameState(fx.state);
  const before = rows().filter((row) => row.attempt < attempt);
  const env: DecisionEnv = {
    state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], jevContext: "v1",
    sl: { attempt, maxAttempts: 6, previousAttempts: previousAttemptsJson(before, attempt, 6, { knownDraws: true }), showSim: true, ...(fx.knownDraws ? { knownDraws: fx.knownDraws } : {}), explore },
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
  return { decision: planCombatTurn(env)!, env };
}
const optionTexts = (decision: Decision): Record<string, string> =>
  Object.fromEntries(Object.entries(((decision as AskDecision).questions["plan"] as { criteria: Record<string, string | null> }).criteria).map(([key, text]) => [key, text ? String((JSON.parse(text) as Raw)["plays"]).replace(/, then /g, ", ") : ""]));

describe("J4S28FRQKD7G F33 attempt 3, T2's first board: attempt 2's line is not among the options", () => {
  const target = (): SlTarget => rows().find((row) => row.attempt === 3)!.explore!.target as SlTarget;
  const replayEnv = (extra: Record<string, unknown> = {}) => {
    const before = rows().filter((row) => row.attempt < 3) as unknown as ExploreRow[];
    const ref = replayPoints(before, target()).get(slBoardKey(parseGameState(board().state)))!;
    return { line: ref.line, reference: 2, point: target().point, canon: ref.canon![ref.line]!, ...extra };
  };

  it("the cause: attempt 3 knows 烙印+ is Pommel Strike's draw, and attempt 2's line with it played beats attempt 2's line", () => {
    const fx = board();
    expect(fx.knownDraws).toMatchObject({ cards: ["BRAND+"], attempts: [1, 2] });
    // The reference attempt (2) knew attempt 1's 5 draws only (attempt 1 reshuffled on T1): none left by T2.
    expect(rows()[0]!.draws).toMatchObject({ clean: 5 });
    expect(rows()[1]!.draws).toMatchObject({ clean: 11 });
    thiefTrace.enabled = true;
    const { decision } = plan(3, { played: { canon: [], text: [] } });
    expect(decision.kind).toBe("ask");
    const texts = Object.values(optionTexts(decision));
    // Attempt 2's line with the drawn 烙印+ played too is shown; attempt 2's own is not: still one of the solver's lines (none
    // beats it on every axis), but scored far down now that the card Pommel Strike draws is known (live attempt 2 saw it at
    // 21 HP lost, an expected draw; here 29), out of the ones shown.
    expect(texts).toContain("防御, 剑柄打击 -> 火箭, 烙印+, 怨恨 -> 火箭");
    expect(texts).not.toContain(REFERENCE_LINE);
    const trace = thiefTrace.last!;
    const ref = trace.plans.find((line) => line.steps.map((step) => (step.targetName ? `${step.name} -> ${step.targetName}` : step.name)).join(", ") === REFERENCE_LINE)!;
    expect(ref).toBeDefined();
    expect(ref.outcome.hpLoss).toBe(29);
    expect(trace.plans.indexOf(ref)).toBeGreaterThan(trace.shown.length * 10);
    // The replay's board on the reference path, and its line there.
    expect(replayEnv()).toMatchObject({ line: REFERENCE_LINE, reference: 2 });
  });

  it("attempt 2's plays from the board: its turn record up to its next decision (Pommel Strike's draw re-planned)", () => {
    const before = rows().filter((row) => row.attempt < 3) as unknown as ExploreRow[];
    const boardKey = slBoardKey(parseGameState(board().state));
    expect(replayPlays(before, target(), boardKey)).toEqual(["DEFEND_IRONCLAD", "POMMEL_STRIKE>火箭"]);
    // A board not on the path, or a row without a turn record: none.
    expect(replayPlays(before, target(), "0000000000000000")).toBeNull();
    expect(replayPlays(before.map((row) => ({ ...row, explore: { ...row.explore!, turns: undefined } })) as ExploreRow[], target(), boardKey)).toBeNull();
  });

  it("off (no plays): as live, the answer kept and the replay stops (the logged decision's sl_explore)", () => {
    const explore = { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replayEnv() };
    const { decision } = plan(3, explore);
    const answer = (board().decision.answers["plan"] as Raw)["choice"] as string;
    expect(answer).toBe("plan2");
    const resolved = (decision as AskDecision).resolve(pick(answer));
    expect((resolved.log as Raw)["sl_explore"]).toEqual(board().decision.sl_explore);
    expect(resolved.intent).toEqual(board().decision.chosen);
    expect(slPointOf(decision, resolved)?.replay).toEqual({ overridden: false, reason: "attempt 2's line is not among the options" });
  });

  it("SL_RETRY_EXPLORE_REPLAY_PLAYS: attempt 2's plays are played as a line (防御 first, 剑柄打击 -> 火箭 next)", () => {
    const explore = { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replayEnv({ plays: ["DEFEND_IRONCLAD", "POMMEL_STRIKE>火箭"] }) };
    const { decision, env } = plan(3, explore);
    const resolved = (decision as AskDecision).resolve(pick("plan2"));
    const log = (resolved.log as Raw)["sl_explore"] as Raw;
    expect(log["replay"]).toMatchObject({ line: REFERENCE_LINE, overridden: true, logged: true, plays: ["DEFEND_IRONCLAD", "POMMEL_STRIKE>火箭"], reason: "attempt 2's line is not among the options: its plays from this board (DEFEND_IRONCLAD, POMMEL_STRIKE>火箭), replayed to reach T4" });
    expect(resolved.intent).toEqual({ action: "play_card", card_index: 0 });
    const info = slPointOf(decision, resolved)!;
    expect(info.line).toBe("防御, 剑柄打击 -> 火箭");
    expect(info.replay).toMatchObject({ overridden: true, logged: true });
    // Played as a committed line: Pommel Strike next (then the re-plan after its draw, as attempt 2's was).
    resolved.apply?.();
    expect(env.screenMemory.combatPlan?.remaining.map((step) => `${step.name}${step.targetName ? ` -> ${step.targetName}` : ""}`)).toEqual(["剑柄打击 -> 火箭"]);
  });

  it("loggedLine: a play whose card (id and upgrade) or enemy is not on the board: none", () => {
    // A solver input of two cards and two enemies (the plays are matched before anything is played).
    const hand = [
      { index: 0, key: "c0", cardId: "DEFEND_IRONCLAD", upgraded: false, name: "防御", type: "Skill", cost: 1, target: "none", validTargets: [], playable: true },
      { index: 1, key: "c1", cardId: "POMMEL_STRIKE", upgraded: false, name: "剑柄打击", type: "Attack", cost: 1, target: "single", validTargets: [0, 1], playable: true },
    ];
    const input = { hand, enemies: [{ index: 0, name: "碾碎爪" }, { index: 1, name: "火箭" }] } as never;
    expect(loggedLine(input, ["BASH>火箭"])).toBeNull();
    expect(loggedLine(input, ["POMMEL_STRIKE>无人"])).toBeNull();
    expect(loggedLine(input, ["POMMEL_STRIKE+>火箭"])).toBeNull();
    expect(loggedLine(input, ["DEFEND_IRONCLAD", "DEFEND_IRONCLAD"])).toBeNull();
    expect(loggedLine(input, ["potion:VULNERABLE_POTION>火箭"])).toBeNull();
  });

  it("SL_RETRY_EXPLORE_REPLAY_DEVIATE: neither its line nor its plays can be played: the deviation is made here", () => {
    // Attempt 6 there: attempts 2-5 had been on this board (4's line was Jev's answer of attempt 6, plan3).
    const before = rows().filter((row) => row.attempt < 6) as unknown as ExploreRow[];
    const boardKey = slBoardKey(parseGameState(board().state));
    const tried = boardTried(before, 6, boardKey, { canon: true, potion: true })!;
    expect(tried.attempts).toEqual(expect.arrayContaining([2, 3, 4, 5]));
    expect(tried.excluded).toEqual(expect.arrayContaining([REFERENCE_LINE, "防御, potion 易伤药水 -> 火箭, 剑柄打击 -> 火箭, 烙印+, 怨恨 -> 火箭"]));
    const fallback = { point: "T2, where the replay of attempt 2's path could not go on", excluded: tried.excluded, attempts: tried.attempts, ...(tried.tried ? { tried: tried.tried } : {}) };
    const explore = { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replayEnv({ plays: ["BASH>火箭"], fallback }) };
    const { decision } = plan(6, explore);
    const texts = optionTexts(decision);
    expect(texts["plan3"]).toBe("防御, potion 易伤药水 -> 火箭, 剑柄打击 -> 火箭, 烙印+, 怨恨 -> 火箭");
    const resolved = (decision as AskDecision).resolve(pick("plan3"));
    const log = (resolved.log as Raw)["sl_explore"] as Raw;
    expect(log).toMatchObject({ point: fallback.point, original: texts["plan3"], fallback: true, replay_stopped: "attempt 2's line is not among the options, and its plays from this board (BASH>火箭) cannot be played here" });
    expect(typeof log["replacement"]).toBe("string");
    expect(tried.excluded).not.toContain(log["replacement"]);
    const info = slPointOf(decision, resolved)!;
    expect(info.deviation).toMatchObject({ original: texts["plan3"], replacement: log["replacement"] });
    expect(info.replay?.reason).toMatch(/: deviated here instead$/);
    // Off (no fallback): the answer kept, the replay stops as before.
    const off = plan(6, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replayEnv({ plays: ["BASH>火箭"] }) });
    const kept = (off.decision as AskDecision).resolve(pick("plan3"));
    expect(slPointOf(off.decision, kept)).toMatchObject({ line: texts["plan3"], replay: { overridden: false } });
    expect(slPointOf(off.decision, kept)?.deviation).toBeUndefined();
  });
});

// ---------------------------------------------------------------- the controller (a scripted fight, testKnowledge)

const Q1 = (): Raw => bossBoard({ turn: 1, hp: 60, playable: true, lethal: false });
const Q2 = (): Raw => bossBoard({ turn: 2, hp: 45, playable: true, lethal: false });
const DEATH = (): Raw => bossBoard({ turn: 3, hp: 10 });

function slConfig(log: string, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 4, eliteRetries: 1, act3LowHp: true, act3LowHpPct: 40, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw: true, reloadEarly: true, retryKnownInserts: true, retryKnownTop: true, retryExplore: true, retryExploreB2: true, retryExploreBossPotions: true, retryExploreOrder: true, retryExploreReplay: true, retryExploreReplayPlays: true, retryExploreReplayDeviate: true, retryExploreCanon: true, retryExploreTurn: true, retryExploreWhole: true, retryExploreWhere: false, retryExplorePotion: false, retryKnownPicks: true, retryKnownOffTop: true, retryKnownHandOrder: true, log, stepTimeoutMs: 5_000, ...overrides };
}
function tempLog(): string {
  const dir = mkdtempSync(join(tmpdir(), "sl-replay-"));
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
/** One attempt: each board observed, planned, Jev picks plan1, dispatched; then the death. `edit` may change a board's env. */
async function playAttempt(t: ReturnType<typeof controller>, boards: Raw[], edit?: (i: number, env: SlEnv | undefined) => void): Promise<{ env: SlEnv | undefined; log: unknown }[]> {
  const played: { env: SlEnv | undefined; log: unknown }[] = [];
  for (const [i, raw] of boards.entries()) {
    const state = parseGameState(raw);
    t.sl.observe(state, t.memory);
    const env = t.sl.envFor(state);
    played.push({ env: env ? structuredClone(env) : undefined, log: null });
    edit?.(i, env);
    const decision = planCombatTurn(scenarioEnv(raw, env))!;
    const resolved = decision.kind === "ask" ? (decision as AskDecision).resolve(pick("plan1")) : { intent: decision.intent, rationale: decision.rationale, confidence: null, fallback: false, ...(decision.log ? { log: decision.log } : {}) };
    t.sl.noteAction(state, resolved.intent!);
    t.sl.notePoint(state, decision, resolved);
    played[i]!.log = (resolved.log as Raw | undefined)?.["sl_explore"] ?? null;
  }
  const death = parseGameState(DEATH());
  t.sl.observe(death, t.memory);
  await t.sl.beforeEndTurn(death, { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
  return played;
}

describe("the controller with SL_RETRY_EXPLORE_REPLAY_PLAYS and _DEVIATE", () => {
  it("gives the reference's plays and the board's fallback with the replay; says the switches in the run config", async () => {
    const log = tempLog();
    const t = controller(log);
    expect(t.sl.describe()).toMatchObject({ retry_explore_replay: true, retry_explore_replay_plays: true, retry_explore_replay_deviate: true, retry_known_off_top: true, retry_known_hand_order: true });
    await playAttempt(t, [Q1(), Q2()]);
    await playAttempt(t, [Q1(), Q2()]);
    const a3 = await playAttempt(t, [Q1(), Q2()]);
    const row3 = logRows(log)[2]!;
    expect(row3.explore?.target).toMatchObject({ turn: 2, reference: 2 });
    // Q1 is on the path before the point (T2): its line, its plays, and the deviation to make there if neither can be played.
    expect(a3[0]!.env?.explore?.replay).toMatchObject({ reference: 2, plays: ["DEFEND_R"], fallback: { excluded: ["DEFEND_R, BASH -> Test Subject"], attempts: [1, 2] } });
    expect(row3.explore?.replay).toEqual({ replayed: 1, overridden: 0, stopped: null });
    expect(row3.explore?.deviation?.reached).toBe(true);
    // Off: the replay as before.
    const off = controller(tempLog(), { retryExploreReplayPlays: false, retryExploreReplayDeviate: false });
    expect(off.sl.describe()).toMatchObject({ retry_explore_replay_plays: false, retry_explore_replay_deviate: false });
    await playAttempt(off, [Q1(), Q2()]);
    await playAttempt(off, [Q1(), Q2()]);
    const offA3 = await playAttempt(off, [Q1(), Q2()]);
    expect(offA3[0]!.env?.explore?.replay).toEqual({ line: "DEFEND_R, BASH -> Test Subject", reference: 2, point: expect.any(String), canon: "BASH>Test Subject, DEFEND_R" });
  });

  it("a reference line not among the options: its plays are played, the board counts as replayed (logged)", async () => {
    const log = tempLog();
    const t = controller(log);
    await playAttempt(t, [Q1(), Q2()]);
    await playAttempt(t, [Q1(), Q2()]);
    // The line reads otherwise now (as a later attempt's known draws make it): its text and turn not among the options.
    const a3 = await playAttempt(t, [Q1(), Q2()], (i, env) => {
      if (i === 0 && env?.explore?.replay) env.explore.replay = { ...env.explore.replay, line: "DEFEND_R, STRIKE_R -> Test Subject, BASH -> Test Subject", canon: "BASH>Test Subject, DEFEND_R, STRIKE_R>Test Subject" };
    });
    expect(a3[0]!.log).toMatchObject({ replay: { overridden: true, logged: true, plays: ["DEFEND_R"] } });
    const row3 = logRows(log)[2]!;
    expect(row3.explore?.replay).toEqual({ replayed: 1, overridden: 1, stopped: null, logged: 1 });
    expect(row3.explore?.deviation?.reached).toBe(true);
    expect(row3.explore?.fallback).toBeUndefined();
  });

  it("neither can be played: the attempt deviates there, not at its point; the next attempt aims at the same point again", async () => {
    const log = tempLog();
    const t = controller(log);
    await playAttempt(t, [Q1(), Q2()]);
    await playAttempt(t, [Q1(), Q2()]);
    const a3 = await playAttempt(t, [Q1(), Q2()], (i, env) => {
      if (i === 0 && env?.explore?.replay) env.explore.replay = { ...env.explore.replay, line: "DEFEND_R, STRIKE_R -> Test Subject, BASH -> Test Subject", canon: "BASH>Test Subject, DEFEND_R, STRIKE_R>Test Subject", plays: ["NOT_IN_HAND"] };
    });
    expect(a3[0]!.log).toMatchObject({ original: "DEFEND_R, BASH -> Test Subject", replacement: "STRIKE_R -> Test Subject, BASH -> Test Subject", fallback: true });
    // The rest of the attempt is its own: no replay, no deviation point on T2.
    expect(a3[1]!.env?.explore?.replay).toBeUndefined();
    expect(a3[1]!.env?.explore?.deviate).toBeUndefined();
    const row3 = logRows(log)[2]!;
    // (The scripted attempt sends one action a board: its T1 is the Strike.)
    expect(row3.explore?.fallback).toMatchObject({ reached: true, turn: 1, original: "DEFEND_R, BASH -> Test Subject", replacement: "STRIKE_R -> Test Subject, BASH -> Test Subject", attempts: [1, 2], plays: "STRIKE_R>Test Subject", differs: true });
    expect(row3.explore?.deviation).toBeUndefined();
    expect(row3.explore?.replay?.stopped).toMatch(/^T1: STRIKE_R -> Test Subject, BASH -> Test Subject played where attempt 2 played DEFEND_R, BASH -> Test Subject \(.*deviated here instead\)$/);
    expect(t.notes.some((note) => /^SL: explored at F17 T1 attempt 3\/5 \(T1, where the replay of attempt 2's path could not go on\)/.test(note))).toBe(true);
    // Not a use of its point: attempt 4 aims at it again (round 0), as exploreTarget reads the rows.
    const rows4 = logRows(log) as unknown as ExploreRow[];
    const { target } = exploreTarget(rows4, 4, { aliveFirst: true, canon: true, tried: true, whole: true });
    expect(target).toMatchObject({ board: row3.explore!.target!.board, round: 0 });
    // Off: the answer played there as before (no deviation, no fallback).
    const offLog = tempLog();
    const off = controller(offLog, { retryExploreReplayDeviate: false });
    await playAttempt(off, [Q1(), Q2()]);
    await playAttempt(off, [Q1(), Q2()]);
    const offA3 = await playAttempt(off, [Q1(), Q2()], (i, env) => {
      expect(env?.explore?.replay?.fallback).toBeUndefined();
      if (i === 0 && env?.explore?.replay) env.explore.replay = { ...env.explore.replay, line: "DEFEND_R, STRIKE_R -> Test Subject, BASH -> Test Subject", canon: "BASH>Test Subject, DEFEND_R, STRIKE_R>Test Subject", plays: ["NOT_IN_HAND"] };
    });
    expect(offA3[0]!.log).toEqual({ replay: { point: expect.any(String), reference: 2, line: "DEFEND_R, STRIKE_R -> Test Subject, BASH -> Test Subject", original: "DEFEND_R, BASH -> Test Subject", overridden: false, reason: "attempt 2's line is not among the options, and its plays from this board (NOT_IN_HAND) cannot be played here" } });
    expect(logRows(offLog)[2]!.explore?.fallback).toBeUndefined();
  });
});

