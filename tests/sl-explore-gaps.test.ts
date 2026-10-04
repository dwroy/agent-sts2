/**
 * The V4.6 SL explore gaps (docs/sl.md §11.14-11.16):
 * - SL_RETRY_EXPLORE_REPLAY_ORDER, ABCJ0TZ6MD06 F48 attempt 4 T4: attempt 2's line there was not among the options; a shown
 *   line with its turn's plays in another order (防御+, 打击, 铁斩波, 耸肩无视+) was taken for it, the boss came out at 372 not
 *   376, Pen Nib at 0 not 9, and T5's board was not attempt 2's. Now attempt 2's logged plays are played in their order.
 * - SL_RETRY_EXPLORE_TARGET_TURN, the same attempt at T5: off the path on a board no failed attempt had decided on, it played
 *   the point's excluded 「绯红披风, 血墙+」 again. Now the point's turn still deviates.
 * - SL_RETRY_EXPLORE_REARM, AKK09TEEEXKD F17 attempts 3 and 5: the T10 deviation's turn still ended with attempt 2's plays;
 *   the attempt then played attempt 2's fight on. Now a later point of the path is aimed at in the same attempt.
 * - SL_RETRY_EXPLORE_ANCHOR: the reference path is the failed attempt that lived longest (attempt 1 among them once it
 *   records its decision points, which changes none of its decisions).
 * The logged boards are planned with knowledge pinned at 1bd1ff1 (tests/sl-explore-gaps-data/make-fixtures.ts), the rollout
 * and B2 off; the controller is driven over scripted boards (testKnowledge). Nothing under logs/ or .cache is read, nothing
 * outside a temp directory is written.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "sl-explore-gaps-data");
/** Paths under logs/ or .cache touched in any way: must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(HERE, "sl-explore-gaps-data", "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
  const shared = [join(ROOT, "logs"), join(ROOT, ".cache")];
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
      const name = resolve(path).slice(KNOWLEDGE.length + 1);
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
const { planCombatTurn, slPointOf } = await import("../src/screens/combat-plan.js");
const { previousAttemptsJson } = await import("../src/sl/attempts.js");
const { SlController } = await import("../src/sl/controller.js");
const { anchorRank, enemyHpLeft, exploreTarget, replayPlays, replayPoints, slBoardKey, triedHas, turnCanon } = await import("../src/sl/explore.js");
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
type SlExploreEnv = import("../src/sl/explore.js").SlExploreEnv;
type ExploreRow = import("../src/sl/explore.js").ExploreRow;
type ExploreTargetOptions = import("../src/sl/explore.js").ExploreTargetOptions;
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
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  expect([...touched]).toEqual([]);
});

const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as unknown as AnswerSet;
/** The switches on by default (as the gaps tools take them). */
const OPTIONS: ExploreTargetOptions = { aliveFirst: true, canon: true, tried: true, whole: true, where: true, potion: true };
interface Board {
  source: string;
  decision: { label: string; answers: Raw; chosen: Raw; sl_explore: Raw | null };
  state: Raw;
  knownDraws: NonNullable<SlEnv["knownDraws"]> | null;
}
const boardOf = (name: string): Board => JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
const abcj = (): SlAttemptRow[] => JSON.parse(readFileSync(join(DATA, "abcj-rows.json"), "utf8")) as SlAttemptRow[];
const akk0 = (): SlAttemptRow[] => JSON.parse(readFileSync(join(DATA, "akk0-rows.json"), "utf8")) as SlAttemptRow[];

/** A logged board planned as attempt `attempt` of ABCJ (the rows before it, its known draws), the rollout and B2 off. */
function plan(name: string, attempt: number, explore: SlExploreEnv | null, record?: SlExploreEnv): { decision: Decision; env: DecisionEnv } {
  rolloutLiveOptions.enabled = false;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  const fx = boardOf(name);
  const state = parseGameState(fx.state);
  const before = abcj().filter((row) => row.attempt < attempt);
  const sl: SlEnv | undefined = explore ? { attempt, maxAttempts: 6, previousAttempts: previousAttemptsJson(before, attempt, 6, { knownDraws: true }), showSim: true, ...(fx.knownDraws ? { knownDraws: fx.knownDraws } : {}), explore } : undefined;
  const env: DecisionEnv = {
    state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], jevContext: "v1",
    ...(sl ? { sl } : {}), ...(record ? { slRecord: record } : {}),
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  };
  return { decision: planCombatTurn(env)!, env };
}
const optionTexts = (decision: Decision): Record<string, string> =>
  Object.fromEntries(Object.entries(((decision as AskDecision).questions["plan"] as { criteria: Record<string, string | null> }).criteria).map(([key, text]) => [key, text ? String((JSON.parse(text) as Raw)["plays"]).replace(/, then /g, ", ") : ""]));
const keyOf = (decision: Decision, text: string): string => Object.entries(optionTexts(decision)).find(([, plays]) => plays === text)![0];
const handIndex = (raw: Raw, cardId: string): number => ((raw["combat"] as Raw)["hand"] as Raw[]).find((card) => card["card_id"] === cardId)!["index"] as number;

describe("ABCJ0TZ6MD06 F48 attempt 4, T4's first board: attempt 2's turn in another order", () => {
  const target = (): SlTarget => abcj().find((row) => row.attempt === 4)!.explore!.target as SlTarget;
  const board = () => slBoardKey(parseGameState(boardOf("abcj-a4-t4").state), { counters: true });
  const REFERENCE = "铁斩波 -> 永世沙漏, 防御+, 打击 -> 永世沙漏, 耸肩无视+";
  const REORDERED = "防御+, 打击 -> 永世沙漏, 铁斩波 -> 永世沙漏, 耸肩无视+";
  // Live, Jev answered 「防御+, 打击, 铁斩波, 防御+」 (the rollout's line, added; the rollout is off here): another turn, as this one.
  const ANSWER = "防御+, 打击 -> 永世沙漏, 耸肩无视+";
  const replayEnv = (extra: Record<string, unknown> = {}) => {
    const before = abcj().filter((row) => row.attempt < 4) as unknown as ExploreRow[];
    const ref = replayPoints(before, target()).get(board())!;
    const plays = replayPlays(before, target(), board())!;
    return { line: ref.line, reference: 2, point: target().point, canon: ref.canon![ref.line]!, plays, ...extra };
  };

  it("the cause: the board key matched (attempt 2's T4 board), the plays came in another order, and T5's board differed", () => {
    const rows = abcj();
    const two = rows.find((row) => row.attempt === 2)!;
    const four = rows.find((row) => row.attempt === 4)!;
    const t4 = (row: SlAttemptRow) => row.explore!.turns!.find((turn) => turn.turn === 4)!;
    expect(t4(two).boards[0]!.board).toBe(board());
    expect(t4(four).boards[0]!.board).toBe(board());
    expect(t4(two).plays).toEqual(["IRON_WAVE>永世沙漏", "DEFEND_IRONCLAD+", "STRIKE_IRONCLAD>永世沙漏", "SHRUG_IT_OFF+"]);
    expect(t4(four).plays).toEqual(["DEFEND_IRONCLAD+", "STRIKE_IRONCLAD>永世沙漏", "IRON_WAVE>永世沙漏", "SHRUG_IT_OFF+"]);
    expect(turnCanon(t4(two).plays)).toBe(turnCanon(t4(four).plays));
    // The order is not idle: the boss at 376 against 372 at T5, and T5's first board not attempt 2's.
    const t5 = (row: SlAttemptRow) => row.summary!.turns.find((turn) => turn.turn === 5)!.enemies;
    expect([t5(two), t5(four)]).toEqual(["永世沙漏 376/535", "永世沙漏 372/535"]);
    expect(four.explore!.turns!.find((turn) => turn.turn === 5)!.boards[0]!.board).not.toBe(two.explore!.turns!.find((turn) => turn.turn === 5)!.boards[0]!.board);
    expect(four.explore!.replay!.stopped).toBe("T4: the board is not on attempt 2's path");
    expect(replayEnv()).toMatchObject({ line: REFERENCE, plays: ["IRON_WAVE>永世沙漏", "DEFEND_IRONCLAD+", "STRIKE_IRONCLAD>永世沙漏", "SHRUG_IT_OFF+"] });
  });

  it("off: as live, the first shown line with the turn's plays (another order) is taken for attempt 2's", () => {
    const { decision } = plan("abcj-a4-t4", 4, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replayEnv() });
    const texts = Object.values(optionTexts(decision));
    expect(texts).not.toContain(REFERENCE);
    expect(texts).toContain(REORDERED);
    const resolved = (decision as AskDecision).resolve(pick(keyOf(decision, ANSWER)));
    const log = (resolved.log as Raw)["sl_explore"] as Raw;
    expect(log["replay"]).toMatchObject({ line: REFERENCE, original: ANSWER, overridden: true, reason: "attempt 2's line on this board, replayed to reach T5" });
    expect(slPointOf(decision, resolved)?.line).toBe(REORDERED);
    // Its first play is Defend+, not attempt 2's Iron Wave.
    expect(resolved.intent).toEqual({ action: "play_card", card_index: handIndex(boardOf("abcj-a4-t4").state, "DEFEND_IRONCLAD") });
  });

  it("SL_RETRY_EXPLORE_REPLAY_ORDER: attempt 2's plays in their order (Iron Wave first), counted as its line", () => {
    const { decision, env } = plan("abcj-a4-t4", 4, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replayEnv({ order: true }) });
    const resolved = (decision as AskDecision).resolve(pick(keyOf(decision, ANSWER)));
    const log = (resolved.log as Raw)["sl_explore"] as Raw;
    expect(log["replay"]).toMatchObject({ line: REFERENCE, original: ANSWER, overridden: true, logged: true, reordered: true, plays: ["IRON_WAVE>永世沙漏", "DEFEND_IRONCLAD+", "STRIKE_IRONCLAD>永世沙漏", "SHRUG_IT_OFF+"] });
    expect(String((log["replay"] as Raw)["reason"])).toBe("attempt 2's line on this board, replayed to reach T5; in another order than its plays from this board (IRON_WAVE>永世沙漏, DEFEND_IRONCLAD+, STRIKE_IRONCLAD>永世沙漏, SHRUG_IT_OFF+): those replayed in their order to reach T5");
    expect(resolved.intent).toMatchObject({ action: "play_card", card_index: handIndex(boardOf("abcj-a4-t4").state, "IRON_WAVE") });
    const info = slPointOf(decision, resolved)!;
    expect(info.line).toBe(REFERENCE);
    expect(info.replay).toMatchObject({ overridden: true, logged: true });
    resolved.apply?.();
    expect(env.screenMemory.combatPlan?.remaining.map((step) => step.cardId)).toEqual(["DEFEND_IRONCLAD", "STRIKE_IRONCLAD", "SHRUG_IT_OFF"]);
  });

  it("the answer itself with attempt 2's turn in another order: kept off (as live), its plays in their order on", () => {
    const off = plan("abcj-a4-t4", 4, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replayEnv() });
    const kept = (off.decision as AskDecision).resolve(pick(keyOf(off.decision, REORDERED)));
    expect(slPointOf(off.decision, kept)?.replay).toEqual({ overridden: false, reason: "the answer plays attempt 2's turn here (its cards and targets, in another order or text)" });
    expect(kept.intent).toEqual({ action: "play_card", card_index: handIndex(boardOf("abcj-a4-t4").state, "DEFEND_IRONCLAD") });
    const on = plan("abcj-a4-t4", 4, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replayEnv({ order: true }) });
    const ordered = (on.decision as AskDecision).resolve(pick(keyOf(on.decision, REORDERED)));
    expect(slPointOf(on.decision, ordered)).toMatchObject({ line: REFERENCE, replay: { overridden: true, logged: true } });
    expect(ordered.intent).toMatchObject({ action: "play_card", card_index: handIndex(boardOf("abcj-a4-t4").state, "IRON_WAVE") });
    // Plays that cannot be played here: the line as before (no stop, no deviation).
    const bad = plan("abcj-a4-t4", 4, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replayEnv({ order: true, plays: ["BASH>永世沙漏"] }) });
    const asBefore = (bad.decision as AskDecision).resolve(pick(keyOf(bad.decision, ANSWER)));
    expect(slPointOf(bad.decision, asBefore)).toMatchObject({ line: REORDERED, replay: { overridden: true, reason: "attempt 2's line on this board, replayed to reach T5" } });
  });
});

describe("ABCJ0TZ6MD06 F48 attempt 4, T5 off the path: the point's turn", () => {
  const target = (): SlTarget => abcj().find((row) => row.attempt === 4)!.explore!.target as SlTarget;

  it("the cause: T5's board was on no failed attempt's path (no fallback), and the point's excluded turn was played again", () => {
    const rows = abcj();
    const four = rows.find((row) => row.attempt === 4)!;
    const board = slBoardKey(parseGameState(boardOf("abcj-a4-t5").state), { counters: true });
    expect(rows.filter((row) => row.attempt < 4).some((row) => row.explore?.turns?.some((turn) => turn.boards.some((entry) => entry.board === board)))).toBe(false);
    expect(four.explore!.fallback).toBeUndefined();
    expect(target()).toMatchObject({ turn: 5, excluded: ["绯红披风, 血墙+"] });
    const t5 = four.explore!.turns!.find((turn) => turn.turn === 5)!;
    expect(triedHas(target().tried, { text: "", canon: turnCanon(t5.plays) })).toBe(true);
  });

  it("SL_RETRY_EXPLORE_TARGET_TURN: the point's lines and turns kept off on this board too", () => {
    const deviate = { point: `T5, off attempt 2's path before T5: the point's turn (${target().point}), its lines and turns not again`, excluded: [...target().excluded], attempts: [...target().attempts], tried: structuredClone(target().tried!) };
    const { decision } = plan("abcj-a4-t5", 4, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, deviate });
    // 「绯红披风, 血墙+」 itself is the rollout's line, added live (the rollout is off here); this one ends T5 as attempt 2 did.
    const ANSWER = "绯红披风, 飞剑回旋镖, 血墙+";
    const resolved = (decision as AskDecision).resolve(pick(keyOf(decision, ANSWER)));
    const info = slPointOf(decision, resolved)!;
    expect(info.deviation).toMatchObject({ original: ANSWER });
    const replacement = info.deviation!.replacement!;
    expect(typeof replacement).toBe("string");
    expect(target().excluded).not.toContain(replacement);
    expect(triedHas(target().tried, { text: replacement, canon: info.canon![replacement]! })).toBe(false);
    // Without it (live): the answer kept.
    const off = plan("abcj-a4-t5", 4, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true });
    const kept = (off.decision as AskDecision).resolve(pick(keyOf(off.decision, ANSWER)));
    expect(slPointOf(off.decision, kept)).toMatchObject({ line: ANSWER });
    expect(slPointOf(off.decision, kept)?.deviation).toBeUndefined();
  });
});

describe("SL_RETRY_EXPLORE_REPLAY_CODE: ABCJ0TZ6MD06 F48 attempt 1's T7 board as attempt 3 plans it on attempt 1's path", () => {
  const LINE = "防御, 探寻打击 -> 永世沙漏";
  const PLAYS = ["DEFEND_IRONCLAD", "SEEKER_STRIKE>永世沙漏"];
  const replay = (extra: Record<string, unknown> = {}) => ({ line: LINE, reference: 1, point: "T8, the latest question before attempt 1's death on T10", plays: PLAYS, order: true, ...extra });

  it("off: code's own line there (another order and cards than attempt 1 played): the replay would stop", () => {
    const { decision } = plan("abcj-a1-t7", 3, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replay() });
    expect(decision).toMatchObject({ kind: "act", label: "combat/plan" });
    expect((decision as { rationale: string }).rationale).toMatch(/^code plan \(only distinct line\): 防御, 被遗忘的仪式, 探寻打击 -> 永世沙漏, 头槌 -> 永世沙漏;/);
    const info = slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false })!;
    expect(info).toMatchObject({ kind: "code", line: "防御, 被遗忘的仪式, 探寻打击 -> 永世沙漏, 头槌 -> 永世沙漏" });
    expect(info.replay).toBeUndefined();
    // Attempt 1's own record of that turn: Defend, then Seeker Strike (its pick), then a new decision.
    expect(abcj()[0]!.explore!.turns!.find((turn) => turn.turn === 7)!.plays.slice(0, 2)).toEqual(PLAYS);
  });

  it("on: attempt 1's plays from the board instead, counted as its line (the decision row says so)", () => {
    const { decision, env } = plan("abcj-a1-t7", 3, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replay({ code: true }) });
    expect(decision).toMatchObject({ kind: "act", label: "combat/plan" });
    const act = decision as Extract<Decision, { kind: "act" }>;
    expect(act.rationale).toBe("SL explore: replaying attempt 1's plays from this board, 防御, 探寻打击 -> 永世沙漏, instead of code's 防御, 被遗忘的仪式, 探寻打击 -> 永世沙漏, 头槌 -> 永世沙漏 before T8");
    expect(act.intent).toMatchObject({ action: "play_card", card_index: handIndex(boardOf("abcj-a1-t7").state, "DEFEND_IRONCLAD") });
    expect(env.screenMemory.combatPlan?.remaining.map((step) => step.cardId)).toEqual(["SEEKER_STRIKE"]);
    const info = slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false })!;
    expect(info).toMatchObject({ kind: "code", line: LINE, replay: { overridden: true, logged: true } });
    expect(((act.log as Raw)["sl_explore"] as Raw)["replay"]).toMatchObject({ reference: 1, line: LINE, original: "防御, 被遗忘的仪式, 探寻打击 -> 永世沙漏, 头槌 -> 永世沙漏", overridden: true, logged: true, code: true, plays: PLAYS });
    // Plays that cannot be played here: code's line, as without it.
    const bad = plan("abcj-a1-t7", 3, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true, whole: true, replay: replay({ code: true, plays: ["BASH>永世沙漏"] }) });
    expect((bad.decision as { rationale: string }).rationale).toMatch(/^code plan \(only distinct line\)/);
  });
});

describe("SL_RETRY_EXPLORE_ANCHOR's recording on a first attempt (env.slRecord): no decision changes", () => {
  it("the same question and resolution; the point recorded", () => {
    const without = plan("abcj-a4-t4", 1, null);
    const withRecord = plan("abcj-a4-t4", 1, null, { played: { canon: [], text: [] }, b2Gate: true, bossPotions: true });
    expect((withRecord.decision as AskDecision).questions).toEqual((without.decision as AskDecision).questions);
    const key = Object.keys(optionTexts(without.decision))[1]!;
    const a = (without.decision as AskDecision).resolve(pick(key));
    const b = (withRecord.decision as AskDecision).resolve(pick(key));
    expect(b.intent).toEqual(a.intent);
    expect(b.log).toEqual(a.log);
    expect(b.rationale).toBe(a.rationale);
    expect(slPointOf(without.decision, a)).toBeUndefined();
    const info = slPointOf(withRecord.decision, b)!;
    expect(info).toMatchObject({ kind: "question", line: optionTexts(without.decision)[key] });
    expect(info.alternatives!.length).toBeGreaterThan(0);
    expect(info.canon![info.line]).toBeDefined();
  });
});

describe("SL_RETRY_EXPLORE_ANCHOR over the logged rows", () => {
  it("ABCJ: attempt 1 lived longest (T10, 211 left) but recorded no decision points; of the rest attempt 3 (T8, 241 left)", () => {
    const rows = abcj() as unknown as ExploreRow[];
    expect(rows.map((row) => [row.attempt, row.turns, enemyHpLeft(row)])).toEqual([[1, 10, 211], [2, 8, 274], [3, 8, 241], [4, 8, 270], [5, 8, 269], [6, 8, 266]]);
    expect(anchorRank(rows, 4).map((row) => row.attempt)).toEqual([3, 2]);
    const live = rows.find((row) => row.attempt === 4)!.explore!.target!;
    expect(live.reference).toBe(2);
    const off = exploreTarget(rows.filter((row) => row.attempt < 4), 4, OPTIONS);
    expect(off.target?.reference).toBe(2);
    const on = exploreTarget(rows.filter((row) => row.attempt < 4), 4, { ...OPTIONS, anchor: true });
    expect(on.target).toMatchObject({ reference: 3, anchor: { ranked: [{ attempt: 3, turns: 8, enemyHp: 241 }, { attempt: 2, turns: 8, enemyHp: 274 }] } });
    expect(on.why).toMatch(/attempt 3's path, not attempt 2's: it lived longest \(attempt 3 T8 \(enemy HP 241\), attempt 2 T8 \(enemy HP 274\)\)$/);
    // With attempt 1's decision points (as the switch records them from now on): its path.
    const withOne = rows.map((row) => (row.attempt === 1 ? { ...row, explore: { ...row.explore!, points: rows.find((other) => other.attempt === 2)!.explore!.points } } : row));
    expect(anchorRank(withOne, 4).map((row) => row.attempt)).toEqual([1, 3, 2]);
    expect(exploreTarget(withOne.filter((row) => row.attempt < 4), 4, { ...OPTIONS, anchor: true }).target?.reference).toBe(1);
  });

  it("enemyHpLeft: the last turn's enemies summed; none left 0; unreadable null", () => {
    const row = (enemies: string) => ({ summary: { turns: [{ turn: 1, hp: 1, block: 0, enemies, plays: [] }] } });
    expect(enemyHpLeft(row("同族信徒 15/63, 同族信徒 18/62, 同族神官 150/199"))).toBe(183);
    expect(enemyHpLeft(row(""))).toBe(0);
    expect(enemyHpLeft(row("某物 ?/??"))).toBeNull();
    expect(enemyHpLeft({})).toBeNull();
  });
});

describe("SL_RETRY_EXPLORE_REARM over the logged rows: AKK09TEEEXKD F17", () => {
  it("attempts 3 and 5 deviated at T10 and ended it with attempt 2's plays; T11 was still on attempt 2's path", () => {
    const rows = akk0();
    const two = rows.find((row) => row.attempt === 2)!;
    const path = new Set(two.explore!.turns!.flatMap((turn) => turn.boards.map((entry) => entry.board)));
    for (const attempt of [3, 5]) {
      const row = rows.find((other) => other.attempt === attempt)!;
      expect(row.explore!.deviation).toMatchObject({ reached: true, turn: 10, differs: false, plays: turnCanon(two.explore!.turns!.find((turn) => turn.turn === 10)!.plays) });
      expect(path.has(row.explore!.turns!.find((turn) => turn.turn === 11)!.boards[0]!.board)).toBe(true);
    }
  });

  it("the later point a re-arm aims at: T14 for attempt 3, T12 for attempt 5 (both came up in the attempt's own play)", () => {
    const rows = akk0() as unknown as ExploreRow[];
    for (const [attempt, turn] of [[3, 14], [5, 12]] as const) {
      const row = rows.find((other) => other.attempt === attempt)!;
      const wasted = row.explore!.target!;
      const { target } = exploreTarget(rows.filter((other) => other.attempt < attempt), attempt, { ...OPTIONS, rearm: { reference: 2, fromTurn: 11, skip: [wasted.board] } });
      expect(target).toMatchObject({ reference: 2, turn });
      expect(target!.board).not.toBe(wasted.board);
      expect(row.explore!.turns!.some((entry) => entry.boards.some((board) => board.board === target!.board))).toBe(true);
    }
    // Nothing from a turn past the last question: none.
    expect(exploreTarget(rows.filter((other) => other.attempt < 3), 3, { ...OPTIONS, rearm: { reference: 2, fromTurn: 99, skip: [] } }).target).toBeNull();
  });
});

// ---------------------------------------------------------------- the controller (scripted fights, testKnowledge)

const board = (turn: number, hp: number): Raw => bossBoard({ turn, hp, playable: true, lethal: false });
const death = (turn: number): Raw => bossBoard({ turn, hp: 10 });

function slConfig(log: string, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 4, eliteRetries: 1, act3LowHp: true, act3LowHpPct: 40, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw: true, reloadEarly: true, retryKnownInserts: true, retryKnownTop: true, retryExplore: true, retryExploreB2: true, retryExploreBossPotions: true, retryExploreOrder: true, retryExploreReplay: true, retryExploreReplayPlays: true, retryExploreReplayDeviate: true, retryExploreKeyCounters: true, retryExploreCanon: true, retryExploreTurn: true, retryExploreWhole: true, retryExploreWhere: true, retryExplorePotion: false, retryKnownPicks: true, retryKnownOffTop: true, retryKnownHandOrder: true, retryExploreReplayOrder: true, retryExploreReplayCode: true, retryExploreTargetTurn: true, retryExploreRearm: true, retryExploreAnchor: true, log, stepTimeoutMs: 5_000, ...overrides };
}
function tempLog(): string {
  const dir = mkdtempSync(join(tmpdir(), "sl-gaps-"));
  dirs.push(dir);
  return join(dir, "sl-attempts.jsonl");
}
const logRows = (path: string): SlAttemptRow[] => readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line) as SlAttemptRow);
function scenarioEnv(raw: Raw, sl?: SlEnv, slRecord?: SlExploreEnv): DecisionEnv {
  const state = parseGameState(raw);
  return { state, knowledge: testKnowledge, brief: buildRunBrief(state, testKnowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true, combatPlanner: "turn", screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], ...(sl ? { sl } : {}), ...(slRecord ? { slRecord } : {}) };
}
function controller(log: string, first: () => Raw, overrides: Partial<SlConfig> = {}) {
  let current: Raw = first();
  let clock = 0;
  const notes: string[] = [];
  const client = {
    state: async () => parseGameState(current),
    act: async (intent: { action: string }) => {
      current = intent.action === "save_and_quit" ? menuBoard() : intent.action === "continue_run" ? first() : current;
      return { action: intent.action, status: "completed", stable: true, message: "", state: null, raw: {} };
    },
  };
  const sl = new SlController({ config: slConfig(log, overrides), knowledge: testKnowledge, client: client as never, note: (m) => notes.push(m), sleep: async (ms) => void (clock += ms), now: () => clock });
  return { sl, notes, memory: { journal: new RunJournal(), screenMemory: createScreenMemory() } };
}
/** One attempt: each board observed, planned (with the loop's env and recording env), Jev picks plan1, dispatched; then the death. */
async function playAttempt(t: ReturnType<typeof controller>, boards: Raw[], end: Raw, edit?: (i: number, env: SlEnv | undefined) => void): Promise<{ env: SlEnv | undefined; record: SlExploreEnv | undefined; log: unknown; intent: unknown }[]> {
  const played: { env: SlEnv | undefined; record: SlExploreEnv | undefined; log: unknown; intent: unknown }[] = [];
  for (const [i, raw] of boards.entries()) {
    const state = parseGameState(raw);
    t.sl.observe(state, t.memory);
    const env = t.sl.envFor(state);
    const record = env ? undefined : t.sl.recordFor(state);
    played.push({ env: env ? structuredClone(env) : undefined, record: record ? structuredClone(record) : undefined, log: null, intent: null });
    edit?.(i, env);
    const decision = planCombatTurn(scenarioEnv(raw, env, record))!;
    const resolved = decision.kind === "ask" ? (decision as AskDecision).resolve(pick("plan1")) : { intent: decision.intent, rationale: decision.rationale, confidence: null, fallback: false, ...(decision.log ? { log: decision.log } : {}) };
    t.sl.noteAction(state, resolved.intent!);
    t.sl.notePoint(state, decision, resolved);
    played[i]!.log = (resolved.log as Raw | undefined)?.["sl_explore"] ?? null;
    played[i]!.intent = resolved.intent;
  }
  const dead = parseGameState(end);
  t.sl.observe(dead, t.memory);
  await t.sl.beforeEndTurn(dead, { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
  return played;
}

describe("the controller with SL_RETRY_EXPLORE_ANCHOR", () => {
  it("attempt 1 records its decision points (the same decisions as without); attempt 3 anchors to it when it lived longest", async () => {
    const log = tempLog();
    const t = controller(log, () => board(1, 60));
    expect(t.sl.describe()).toMatchObject({ retry_explore_anchor: true, retry_explore_rearm: true, retry_explore_target_turn: true, retry_explore_replay_order: true });
    // Attempt 1 lives to T4, attempt 2 dies at T3.
    const a1 = await playAttempt(t, [board(1, 60), board(2, 50), board(3, 40)], death(4));
    expect(a1.every((entry) => entry.env === undefined && entry.record !== undefined)).toBe(true);
    await playAttempt(t, [board(1, 60), board(2, 50)], death(3));
    const a3 = await playAttempt(t, [board(1, 60), board(2, 50), board(3, 40)], death(4));
    const rows = logRows(log);
    expect(rows[0]!.explore!.points.length).toBe(3);
    expect(rows[0]!.explore!.points.every((point) => point.kind === "question" && (point.alternatives?.length ?? 0) > 0)).toBe(true);
    expect(rows[2]!.explore!.target).toMatchObject({ reference: 1, anchor: { ranked: [{ attempt: 1, turns: 4 }, { attempt: 2, turns: 3 }] } });
    expect(t.notes.some((note) => /^SL: attempt 3 deviates at .*attempt 1's path, not attempt 2's: it lived longest/.test(note))).toBe(true);
    // The replay before its point is attempt 1's path.
    expect(a3.some((entry) => entry.env?.explore?.replay?.reference === 1)).toBe(true);
    // Off: attempt 1 records nothing, the decisions are the same, attempt 3 anchors to attempt 2.
    const offLog = tempLog();
    const off = controller(offLog, () => board(1, 60), { retryExploreAnchor: false });
    expect(off.sl.describe()).toMatchObject({ retry_explore_anchor: false });
    const o1 = await playAttempt(off, [board(1, 60), board(2, 50), board(3, 40)], death(4));
    expect(o1.every((entry) => entry.record === undefined)).toBe(true);
    expect(o1.map((entry) => entry.intent)).toEqual(a1.map((entry) => entry.intent));
    await playAttempt(off, [board(1, 60), board(2, 50)], death(3));
    await playAttempt(off, [board(1, 60), board(2, 50), board(3, 40)], death(4));
    const offRows = logRows(offLog);
    expect(offRows[0]!.explore!.points).toEqual([]);
    expect(offRows[2]!.explore!.target?.reference).toBe(2);
    expect(offRows[2]!.explore!.target?.anchor).toBeUndefined();
    // The known draws are the attempts' draw records, whatever the anchor: the same rows' draws on and off.
    expect(rows.map((row) => row.draws)).toEqual(offRows.map((row) => row.draws));
  });

  it("SL_RETRY_EXPLORE_SECOND with it: attempt 2 still deviates on attempt 1's path; attempt 1's point adds its planned turn to the tried", async () => {
    const runs = [] as { rows: SlAttemptRow[]; a2: Awaited<ReturnType<typeof playAttempt>>; notes: string[] }[];
    for (const anchor of [true, false]) {
      const log = tempLog();
      const t = controller(log, () => board(1, 60), { retryExploreSecond: true, retryExploreAnchor: anchor });
      await playAttempt(t, [board(1, 60), bossBoard({ turn: 2, hp: 20, playable: true, lethal: false, damage: 5 })], death(3));
      const a2 = await playAttempt(t, [board(1, 60), bossBoard({ turn: 2, hp: 20, playable: true, lethal: false, damage: 5 })], death(3));
      runs.push({ rows: logRows(log), a2, notes: t.notes });
    }
    const [on, off] = runs as [(typeof runs)[number], (typeof runs)[number]];
    // Either way the second plan's T1 (attempt 1 lost the most there) gives the deviation on attempt 1's board.
    expect(on.a2[0]!.env?.explore?.deviate).toMatchObject({ attempts: [1], excluded: ["DEFEND_R, BASH -> Test Subject"] });
    expect(off.a2[0]!.env?.explore?.deviate).toMatchObject({ attempts: [1], excluded: [] });
    // Its turn there as the record has it (a scripted attempt sends one action a board: DEFEND_R); with attempt 1's point,
    // also as its line planned the turn (DEFEND_R, BASH), so that line counts as tried.
    expect(off.a2[0]!.env?.explore?.deviate?.tried?.canon).toEqual(["DEFEND_R"]);
    expect(on.a2[0]!.env?.explore?.deviate?.tried?.canon).toEqual(expect.arrayContaining(["DEFEND_R", "BASH>Test Subject, DEFEND_R"]));
    expect(on.rows[1]!.explore!.target).toMatchObject({ reference: 1, turn: 1 });
    expect(on.rows[1]!.explore!.deviation).toMatchObject({ reached: true, turn: 1, original: "DEFEND_R, BASH -> Test Subject", replacement: "STRIKE_R -> Test Subject, BASH -> Test Subject", differs: true });
    // Without the point the answer was not known to be attempt 1's turn: played, wasted (its turn was attempt 1's), and the
    // second plan tried again on T2 (SL_RETRY_EXPLORE_REARM for attempt 2).
    expect(off.rows[1]!.explore!.wasted).toMatchObject([{ target: { turn: 1, reference: 1 }, deviation: { turn: 1, replacement: null, differs: false } }]);
    expect(off.rows[1]!.explore!.target).toMatchObject({ reference: 1, turn: 2 });
    expect(off.notes.some((note) => /^SL: attempt 2's deviation at T1 .* ended its turn as attempt 1's \(DEFEND_R\); the next board of attempt 1's path to T3 tries again$/.test(note))).toBe(true);
  });
});

describe("the controller with SL_RETRY_EXPLORE_REARM", () => {
  // T1 loses the most (60 -> 20): the point is T1's question; T2's (a light hit coming: a question, not least-loss) after it.
  const boards = () => [board(1, 60), bossBoard({ turn: 2, hp: 20, playable: true, lethal: false, damage: 5 })];

  it("a deviation whose turn ended as a failed attempt's: a later point of the path in the same attempt", async () => {
    const log = tempLog();
    const t = controller(log, () => board(1, 60));
    await playAttempt(t, boards(), death(3));
    await playAttempt(t, boards(), death(3));
    // At its point (T1) the deviation is taken away: attempt 2's line is played there, so the turn is attempt 2's.
    const a3 = await playAttempt(t, boards(), death(3), (i, env) => {
      if (i === 0 && env?.explore?.deviate) delete env.explore.deviate;
    });
    expect(a3[0]!.env?.explore?.deviate).toBeDefined();
    // T2: still on attempt 2's path, its question is the point now.
    expect(a3[1]!.env?.explore?.deviate?.point).toMatch(/^T2, /);
    expect(a3[1]!.log).toMatchObject({ played_in: [1, 2] });
    const row3 = logRows(log)[2]!;
    expect(row3.explore!.wasted).toHaveLength(1);
    expect(row3.explore!.wasted![0]).toMatchObject({ target: { turn: 1 }, deviation: { reached: true, turn: 1, replacement: null, differs: false } });
    expect(row3.explore!.target).toMatchObject({ turn: 2, reference: 2, rearmed: { after: row3.explore!.wasted![0]!.target.board, turn: 1 } });
    expect(row3.explore!.deviation).toMatchObject({ reached: true, turn: 2, differs: true });
    expect(t.notes.some((note) => /^SL: the deviation at T1 .* ended its turn as a failed attempt's .*still on attempt 2's path: deviates at T2, /.test(note))).toBe(true);
    // Attempt 4: the wasted T1 is not a use of its point.
    const rows4 = logRows(log) as unknown as ExploreRow[];
    expect(exploreTarget(rows4, 4, { aliveFirst: true, canon: true, tried: true, whole: true, where: true }).target).toMatchObject({ turn: 1, round: 0 });
    // Off: the attempt as before (no later point; the deviation's row says differs false).
    const offLog = tempLog();
    const off = controller(offLog, () => board(1, 60), { retryExploreRearm: false });
    await playAttempt(off, boards(), death(3));
    await playAttempt(off, boards(), death(3));
    const o3 = await playAttempt(off, boards(), death(3), (i, env) => {
      if (i === 0 && env?.explore?.deviate) delete env.explore.deviate;
    });
    expect(o3[1]!.env?.explore?.deviate).toBeUndefined();
    const offRow = logRows(offLog)[2]!;
    expect(offRow.explore!.wasted).toBeUndefined();
    expect(offRow.explore!.deviation).toMatchObject({ turn: 1, differs: false });
  });
});

describe("the controller with SL_RETRY_EXPLORE_TARGET_TURN", () => {
  it("off the path before the point, on a board no failed attempt decided on: the point's turn still deviates", async () => {
    const log = tempLog();
    const t = controller(log, () => board(1, 60));
    await playAttempt(t, [board(1, 60), board(2, 20)], death(3));
    await playAttempt(t, [board(1, 60), board(2, 20)], death(3));
    // Attempt 3 aims at T1 (see above): its boards differ from the start here (HP 59, 19), off the path, and no failed
    // attempt decided on them.
    const a3 = await playAttempt(t, [board(1, 59), board(2, 19)], death(3));
    const row3 = logRows(log)[2]!;
    expect(row3.explore!.target?.turn).toBe(1);
    expect(a3[0]!.env?.explore?.deviate?.point).toMatch(/^T1, off attempt 2's path before T1: the point's turn \(T1, .*\), its lines and turns not again$/);
    expect(row3.explore!.fallback).toMatchObject({ reached: true, turn: 1, attempts: [1, 2], differs: true });
    expect(typeof row3.explore!.fallback!.replacement).toBe("string");
    // Off: nothing there (as before).
    const offLog = tempLog();
    const off = controller(offLog, () => board(1, 60), { retryExploreTargetTurn: false });
    await playAttempt(off, [board(1, 60), board(2, 20)], death(3));
    await playAttempt(off, [board(1, 60), board(2, 20)], death(3));
    const o3 = await playAttempt(off, [board(1, 59), board(2, 19)], death(3));
    expect(o3[0]!.env?.explore?.deviate).toBeUndefined();
    expect(logRows(offLog)[2]!.explore!.fallback).toBeUndefined();
  });
});
