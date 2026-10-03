/**
 * SL_RETRY_EXPLORE (docs/sl.md §11, src/sl/explore.ts): retries try a different line at one decision point.
 *
 * - exploreTarget: attempt 3 deviates at the latest question of attempt 2's path with a line no failed attempt played,
 *   attempt 4 at the one before it (backtracking), round again once each had its turn; code's own turns are never a
 *   deviation point; a deviation whose board never came up does not count.
 * - exploreReplacement: the best untried line by the question's ranking, preferring those not worse than the pick (the
 *   rollout's share of samples dead; SL_RETRY_EXPLORE_B2: B2's win rate where B2 has the pick's numbers, picking another
 *   line than the rollout's gate would); never a line dying this turn while one survives, never a winning pick, never a
 *   drink the pick does not drink (SL_RETRY_EXPLORE_BOSS_POTIONS in a boss fight: drinking lines too). exploreTarget keeps
 *   the rollout's numbers where B2 gates the replacement.
 * - The planner on logged SL retry boards (tests/sl-retry-data, pinned knowledge as tests/sl-retry-planner.test.ts): with
 *   the switch recording (env.sl.explore without a deviation) every decision is v4 3488dc5's byte for byte (the same golden
 *   digests); on the deviation point's board Jev's line played in a failed attempt gives way to the rollout's best untried
 *   line, and the row says so (sl_explore); code's own turns, a lethal among them, are never changed. The sub-switches off:
 *   the points and deviations are bc8c9bc's; on: a listed elite's the same (no added drink), the Test Subject's (a boss)
 *   replacement may drink. B2 on boss boards: tests/sl-explore-b2.test.ts.
 * - The controller with the planner, a scripted boss fight played four times: the points recorded from attempt 2, attempt 3
 *   changes the latest question, attempt 4 the one before it and plays the rest as answered, a board that differs is not
 *   changed, a restarted process picks the same point from the log, and with the switch off nothing is recorded or changed.
 * Nothing under logs/ or .cache is read, nothing outside a temp directory is written.
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "sl-retry-data");
/** Paths under logs/ or .cache touched in any way: must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
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
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { loadConfig } = await import("../src/config.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { planCombatTurn, slPointOf } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { previousAttemptsJson } = await import("../src/sl/attempts.js");
const { explorePoint, exploreReplacement, exploreTarget, pointLost, rankByOrder, replayChoice, replayPath, slBoardKey } = await import("../src/sl/explore.js");
const { SlController } = await import("../src/sl/controller.js");
const { RunJournal } = await import("../src/project/run-journal.js");
const { combatPayload, testKnowledge } = await import("./scenarios.js");
const { bossBoard, menuBoard } = await import("./sl-support.js");
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type AskDecision = import("../src/project/types.js").AskDecision;
type Decision = import("../src/project/types.js").Decision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;
type GameState = import("../src/mod/schema.js").GameState;
type SlAttemptRow = import("../src/sl/attempts.js").SlAttemptRow;
type SlConfig = import("../src/config.js").SlConfig;
type SlEnv = import("../src/project/types.js").SlEnv;
type SlPoint = import("../src/sl/explore.js").SlPoint;
type ExploreRow = import("../src/sl/explore.js").ExploreRow;
type Raw = Record<string, unknown>;

const config = loadConfig({} as NodeJS.ProcessEnv);
const pick = (key: string, confidence = 0.9): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

/** Fake clocks: the rollout and the random potions' Monte Carlo run their full schedules, the same every time. */
function frozen(): void {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
}

const dirs: string[] = [];
afterEach(() => {
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------- the deviation point

/** A question point: its board, turn, the line played and the shown lines that could replace it. */
const q = (board: string, turn: number, line: string, alternatives: string[]): SlPoint => ({ board, turn, kind: "question", label: "combat/plan-choice", line, alternatives });
const code = (board: string, turn: number, line: string, label = "combat/plan"): SlPoint => ({ board, turn, kind: "code", label, line });

/** Attempt 2's path: questions on T1, T2 (three lines each) and T3 (two), code's turns between, every line dying on T4. */
const PATH: SlPoint[] = [
  q("b1", 1, "A1", ["B1", "C1"]),
  code("b1x", 1, "end turn"),
  q("b2", 2, "A2", ["B2", "C2"]),
  q("b3", 3, "A3", ["B3"]),
  code("b4", 4, "Defend, Defend", "combat/least-loss"),
];
const row = (attempt: number, points: SlPoint[], extra: Partial<NonNullable<ExploreRow["explore"]>> = {}): ExploreRow => ({ attempt, turns: 4, result: "predicted_death", explore: { points, target: null, ...extra } });
/** An exploring attempt: attempt 2's path with `line` played on `board` (its deviation), reached. */
function deviated(attempt: number, board: string, line: string, rows: ExploreRow[]): ExploreRow {
  const { target } = exploreTarget(rows, attempt);
  expect(target?.board).toBe(board);
  const points = PATH.map((point) => (point.board === board ? { ...point, line, explored: true as const } : point));
  return row(attempt, points, { target, deviation: { reached: true, original: PATH.find((point) => point.board === board)!.line, replacement: line, reason: "test" } });
}

describe("exploreTarget: one decision point per attempt, backtracking from the death", () => {
  it("attempt 2 plays as usual; attempt 3 deviates at the latest question with an untried line (code's turns are no deviation point)", () => {
    expect(exploreTarget([], 2).target).toBeNull();
    const { target, why } = exploreTarget([{ attempt: 1, turns: 4, result: "predicted_death" }, row(2, PATH)], 3);
    expect(target).toMatchObject({ board: "b3", turn: 3, reference: 2, back: 1, round: 0, excluded: ["A3"], attempts: [2] });
    expect(target!.point).toBe("T3, the latest question before attempt 2's death on T4");
    expect(why).toBe("1 line shown there never played on that board");
  });

  it("backtracking: attempt 4 deviates one question further back, attempt 5 the next; then the latest with a line still untried", () => {
    const rows: ExploreRow[] = [row(2, PATH)];
    rows.push(deviated(3, "b3", "B3", rows));
    rows.push(deviated(4, "b2", "B2", rows));
    expect(rows[2]!.explore!.target).toMatchObject({ back: 2, excluded: ["A2"], point: "T2, the 2nd latest question before attempt 2's death on T4" });
    rows.push(deviated(5, "b1", "B1", rows));
    expect(rows[3]!.explore!.target).toMatchObject({ back: 3, excluded: ["A1"] });
    // Every question had its turn: T3 has no line left (A3, B3 played), so T2 again, without its two lines played.
    const { target } = exploreTarget(rows, 6);
    expect(target).toMatchObject({ board: "b2", round: 1, attempts: [2, 3, 4, 5] });
    expect([...target!.excluded].sort()).toEqual(["A2", "B2"]);
    expect(target!.point).toMatch(/deviated at 1 time before: another untried line/);
  });

  it("a point whose untried lines all die more often in the rollout is passed over while another is not (63WB F33 T5)", () => {
    // T3's only other line dies in 24 of 24 samples against the played one's 20: T2 (no worse) goes first, T3 after it.
    const path: SlPoint[] = [q("b1", 1, "A1", ["B1"]), { ...q("b2", 2, "A2", ["B2", "C2"]), dead: { A2: 0.5, B2: 0.6, C2: 0.5 } }, { ...q("b3", 3, "A3", ["B3"]), dead: { A3: 0.83, B3: 1 } }];
    const first = exploreTarget([row(2, path)], 3);
    expect(first.target).toMatchObject({ board: "b2", back: 2 });
    expect(first.why).toMatch(/passed over T3, whose untried lines all die more often in the rollout/);
    const rows: ExploreRow[] = [row(2, path), row(3, path, { target: first.target, deviation: { reached: true, original: "A2", replacement: "C2", reason: "test" } })];
    // Then T1 (no numbers: not known to be worse), and only then T3.
    expect(exploreTarget(rows, 4).target).toMatchObject({ board: "b1" });
    rows.push(row(4, path, { target: exploreTarget(rows, 4).target, deviation: { reached: true, original: "A1", replacement: "B1", reason: "test" } }));
    const last = exploreTarget(rows, 5);
    expect(last.target).toMatchObject({ board: "b3", round: 0 });
    expect(last.why).toMatch(/all dying more often in the rollout than the one played, as on every other point left/);
  });

  it("the deviation point is chosen by the rollout's numbers also where B2 gates the replacement (its record is not read)", () => {
    // 63WBEEF2JVM5 F33 with 1200 B2 samples: B2 rates every untried line of every point worse than the one played, so by B2
    // no point would be passed over (Blood Wall's T5 included). T3: the rollout sees its other line dying no more often, B2
    // rates it worse: chosen. T2: the rollout sees both untried lines dying more often, B2 one no worse: passed over.
    const path: SlPoint[] = [
      q("b1", 1, "A1", ["B1"]),
      { ...q("b2", 2, "A2", ["B2", "C2"]), dead: { A2: 0.5, B2: 0.6, C2: 0.7 }, b2: { win: { A2: 0.3, B2: 0.28, C2: 0.1 }, notWorse: ["B2"] } },
      { ...q("b3", 3, "A3", ["B3"]), dead: { A3: 0.8, B3: 0.8 }, b2: { win: { A3: 0.36, B3: 0.06 }, notWorse: [] } },
    ];
    const plain = path.map(({ b2: _b2, ...point }) => point);
    for (const rows of [[row(2, path)], [row(2, plain)]]) {
      const first = exploreTarget(rows, 3);
      expect(first.target).toMatchObject({ board: "b3", back: 1 });
      const next = [...rows, row(3, rows[0]!.explore!.points, { target: first.target, deviation: { reached: true, original: "A3", replacement: "B3", reason: "test" } })];
      expect(exploreTarget(next, 4)).toMatchObject({ target: { board: "b1" }, why: expect.stringMatching(/passed over T2, whose untried lines all die more often in the rollout/) });
    }
  });

  it("SL_RETRY_EXPLORE_ORDER: points where every line loses in every sample come last (R1QJUBVBSSB2 F33: T5 on all dead)", () => {
    // T1 and T2 alive (some line dies in under every sample), T3 and T4 every line dead in every sample.
    const path: SlPoint[] = [
      { ...q("b1", 1, "A1", ["B1"]), dead: { A1: 0.33, B1: 0.5 } },
      { ...q("b2", 2, "A2", ["B2"]), dead: { A2: 0.71, B2: 0.71 } },
      { ...q("b3", 3, "A3", ["B3"]), dead: { A3: 1, B3: 1 } },
      { ...q("b4", 4, "A4", ["B4"]), dead: { A4: 1, B4: 1 } },
    ];
    // Off: the latest first, as before.
    expect(exploreTarget([row(2, path)], 3).target).toMatchObject({ board: "b4" });
    const order = { aliveFirst: true };
    const first = exploreTarget([row(2, path)], 3, order);
    expect(first.target).toMatchObject({ board: "b2", back: 3 });
    expect(first.why).toBe("1 line shown there never played on that board; passed over T4, T3, where every line loses in every sample");
    const playing = (board: string, line: string) => path.map((point) => (point.board === board ? { ...point, line, explored: true as const } : point));
    const rows: ExploreRow[] = [row(2, path), row(3, playing("b2", "B2"), { target: first.target, deviation: { reached: true, original: "A2", replacement: "B2", reason: "test" } })];
    const second = exploreTarget(rows, 4, order);
    expect(second.target).toMatchObject({ board: "b1" });
    rows.push(row(4, playing("b1", "B1"), { target: second.target, deviation: { reached: true, original: "A1", replacement: "B1", reason: "test" } }));
    // Every line of T1 and T2 played: the lost points, the latest first.
    const third = exploreTarget(rows, 5, order);
    expect(third.target).toMatchObject({ board: "b4" });
    expect(third.why).toMatch(/every line loses in every sample here, as on every point left/);
    // Where B2 weighed the point, its share won decides: a line B2 sees winning is alive though the rollout sees it dead.
    const b2Path: SlPoint[] = [path[0]!, { ...path[3]!, b2: { win: { A4: 0.05, B4: 0.02 }, notWorse: [], won: { A4: 0.01, B4: 0 } } }];
    expect(exploreTarget([row(2, b2Path)], 3, order).target).toMatchObject({ board: "b4" });
    expect(pointLost(b2Path[1]!)).toBe(false);
    expect(pointLost({ ...path[3]!, b2: { win: {}, notWorse: [], won: { A4: 0, B4: 0 } } })).toBe(true);
    // No numbers: not known to be lost; a line without numbers (a potion option played) is left out.
    expect(pointLost(q("x", 1, "A", ["B"]))).toBe(false);
    expect(pointLost({ ...q("x", 1, "drink X", ["B", "C"]), dead: { B: 1, C: 1 } })).toBe(true);
    expect(pointLost({ ...q("x", 1, "drink X", ["B", "C"]), dead: { B: 1, C: 0.9 } })).toBe(false);
  });

  it("SL_RETRY_EXPLORE_REPLAY: replayPath is the reference attempt's lines before the point, by board", () => {
    const { target } = exploreTarget([row(2, PATH)], 3);
    expect(target).toMatchObject({ board: "b3" });
    expect([...replayPath([row(2, PATH)], target!)]).toEqual([["b1", "A1"], ["b1x", "end turn"], ["b2", "A2"]]);
    // Another attempt's rows are not read.
    expect([...replayPath([row(3, PATH)], target!)]).toEqual([]);
  });

  it("a deviation whose board never came up does not count: the next attempt aims at the same point", () => {
    const rows: ExploreRow[] = [row(2, PATH)];
    const { target } = exploreTarget(rows, 3);
    // Attempt 3 left the path on T1 (Jev picked another line there): its own boards, the target never reached.
    rows.push(row(3, [q("b1", 1, "B1", ["A1", "C1"]), q("z2", 2, "X", ["Y"])], { target, deviation: { reached: false, original: null, replacement: null, reason: "" } }));
    expect(exploreTarget(rows, 4).target).toMatchObject({ board: "b3", round: 0 });
  });

  it("no recorded points (the switch was off, or rows from before it): no deviation point", () => {
    expect(exploreTarget([{ attempt: 1, turns: 4, result: "predicted_death" }, { attempt: 2, turns: 4, result: "predicted_death" }], 3)).toMatchObject({ target: null, why: expect.stringMatching(/recorded/) });
    // Every line of every question played: none either.
    const all = [q("b1", 1, "A1", ["B1"]), q("b2", 2, "A2", ["B2"])];
    expect(exploreTarget([row(2, all), row(3, [q("b1", 1, "B1", ["A1"]), q("b2", 2, "B2", ["A2"])])], 4).target).toBeNull();
  });
});

describe("exploreReplacement: the best untried line", () => {
  const line = (text: string, over: Partial<{ dies: boolean; wins: boolean; potions: string[] }> = {}) => ({ plan: text, text, dies: false, wins: false, potions: [], ...over });
  const deaths: Record<string, number> = { A: 0.75, B: 0.8, C: 0.5, D: 0.7 };
  const choose = (shown: ReturnType<typeof line>[], excluded: string[], pickText = "A", over: Partial<{ wins: boolean; potions: string[] }> = {}) =>
    exploreReplacement({
      pick: { plan: pickText, text: pickText, potions: [], wins: false, ...over },
      shown,
      excluded,
      deathShare: (plan) => deaths[plan] ?? null,
      // The ranking: alphabetical, as a stand-in for the rollout's.
      rank: (plans) => [...plans].sort()[0] ?? null,
    });

  it("among the lines no failed attempt played, those the rollout does not see dying more often, the ranking's first", () => {
    // B ranks first but dies more often than A (0.8 > 0.75): C and D do not; C ranks before D.
    expect(choose([line("A"), line("B"), line("C"), line("D")], ["A"]).replacement?.text).toBe("C");
    expect(choose([line("A"), line("B"), line("C"), line("D")], ["A", "C"]).replacement?.text).toBe("D");
  });

  it("every untried line dying more often still gives one: the pick is known to fail", () => {
    const choice = choose([line("A"), line("B")], ["A"]);
    expect(choice.replacement?.text).toBe("B");
    expect(choice.reason).toMatch(/every untried line dies more often/);
  });

  it("never a line dying this turn while one survives; never a drink the pick does not drink", () => {
    expect(choose([line("A"), line("C", { dies: true }), line("D")], ["A"]).replacement?.text).toBe("D");
    expect(choose([line("A"), line("C", { potions: ["FIRE_POTION"] }), line("D")], ["A"]).replacement?.text).toBe("D");
    expect(choose([line("A"), line("C", { potions: ["FIRE_POTION"] })], ["A"], "A", { potions: ["FIRE_POTION"] }).replacement?.text).toBe("C");
  });

  // SL_RETRY_EXPLORE_B2: B2 rates the pick and each line (no worse: within 2 paired standard errors, as B2's tie rule).
  const b2Rates = (notWorse: Record<string, boolean>, wins: Record<string, number> = { A: 0.3, B: 0.29, C: 0.06, D: 0.05, E: 0.4 }) => ({
    notWorse: (plan: string, than: string) => (than === "A" ? (notWorse[plan] ?? null) : null),
    win: (plan: string) => wins[plan] ?? null,
    rule: "2 paired standard errors",
  });
  const chooseWith = (shown: ReturnType<typeof line>[], excluded: string[], over: { b2?: ReturnType<typeof b2Rates> | null; drinks?: boolean; pick?: Partial<{ plan: string | null; text: string; wins: boolean; potions: string[]; rated: string | null }> } = {}) =>
    exploreReplacement({
      pick: { plan: "A", text: "A", potions: [], wins: false, ...over.pick },
      shown,
      excluded,
      deathShare: (plan) => deaths[plan] ?? null,
      rank: (plans) => [...plans].sort()[0] ?? null,
      ...(over.b2 !== undefined ? { b2: over.b2 } : {}),
      ...(over.drinks !== undefined ? { drinks: over.drinks } : {}),
    });

  it("SL_RETRY_EXPLORE_B2: on a trusted boss B2's win rate is the gate, and it picks another line than the rollout's gate (63WB F33 T2)", () => {
    const shown = [line("A"), line("B"), line("C"), line("D")];
    // The rollout: B dies more often than A (0.8 > 0.75), C and D do not: C. B2: C and D win far less (63WBEEF2JVM5 F33 T2:
    // 21.9% against 6.3%), B within the noise: B.
    expect(chooseWith(shown, ["A"])).toMatchObject({ replacement: { text: "C" }, gate: "rollout" });
    const b2 = b2Rates({ B: true, C: false, D: false });
    expect(chooseWith(shown, ["A"], { b2 })).toMatchObject({ replacement: { text: "B" }, gate: "b2", reason: expect.stringMatching(/among those B2 rates no worse \(win rate at most 2 paired standard errors below the pick's\)/) });
    // None B2 rates no worse: still a swap (the pick is known to fail), B2's ranking among every untried line.
    expect(chooseWith(shown, ["A", "B"], { b2 })).toMatchObject({ replacement: { text: "C" }, gate: "b2", reason: expect.stringMatching(/B2 rates every untried line worse.*the pick is known to fail/) });
    // No B2 numbers for the pick (a potion option with no Monte Carlo line): the rollout's gate.
    expect(chooseWith(shown, ["P"], { b2, pick: { plan: null, text: "P" } })).toMatchObject({ gate: "rollout" });
    // A random potion's option: its Monte Carlo line is the one B2 rated.
    expect(chooseWith(shown, ["P"], { b2: { ...b2, notWorse: (plan: string, than: string) => (than === "M" ? plan === "D" : null), win: () => 0.2 }, pick: { plan: null, text: "P", rated: "M" } })).toMatchObject({ replacement: { text: "D" }, gate: "b2" });
  });

  it("SL_RETRY_EXPLORE_BOSS_POTIONS (a boss fight): a line drinking a potion the pick does not is an alternative too; the guards hold", () => {
    const fire = line("C", { potions: ["FIRE_POTION"] });
    expect(chooseWith([line("A"), fire], ["A"]).replacement).toBeNull();
    expect(chooseWith([line("A"), fire], ["A"], { drinks: true }).replacement?.text).toBe("C");
    // Never a line dying this turn while one survives, drinking or not, whatever B2 says.
    const b2 = b2Rates({ C: true, D: true, E: true });
    expect(chooseWith([line("A"), line("E", { dies: true, potions: ["FIRE_POTION"] }), line("D")], ["A"], { drinks: true, b2 }).replacement?.text).toBe("D");
    expect(chooseWith([line("A"), line("E", { dies: true }), line("C", { potions: ["FIRE_POTION"] })], ["A"], { drinks: true, b2 }).replacement?.text).toBe("C");
    // A winning pick is never changed; nothing untried left: none.
    expect(chooseWith([line("A"), fire], ["A"], { drinks: true, b2, pick: { wins: true } })).toMatchObject({ replacement: null, gate: null, reason: expect.stringMatching(/wins the fight/) });
    expect(chooseWith([line("A"), fire], ["A", "C"], { drinks: true, b2 })).toMatchObject({ replacement: null, reason: expect.stringMatching(/no shown line left/) });
  });

  it("explorePoint: the record's alternatives, the rollout's deaths and, with B2, its win rates and the lines it rates no worse", () => {
    const shown = [line("A"), line("B"), line("C", { potions: ["FIRE_POTION"] })];
    expect(explorePoint({ plan: "A", text: "A", potions: [], wins: false }, shown, { deathShare: (plan) => deaths[plan] ?? null })).toEqual({ line: "A", alternatives: ["B"], dead: { A: 0.75, B: 0.8 } });
    expect(explorePoint({ plan: "A", text: "A", potions: [], wins: false }, shown, { drinks: true, deathShare: (plan) => deaths[plan] ?? null, b2: b2Rates({ B: false, C: true }) })).toEqual({
      line: "A",
      alternatives: ["B", "C"],
      dead: { A: 0.75, B: 0.8, C: 0.5 },
      b2: { win: { A: 0.3, B: 0.29, C: 0.06 }, notWorse: ["C"] },
    });
  });

  it("SL_RETRY_EXPLORE_REPLAY: the reference line instead of the answer, except a winning answer, a line not shown, or one dying where the answer does not", () => {
    const replay = { line: "C", reference: 2, point: "T4, the latest question before attempt 2's death on T5" };
    const shown = [line("A"), line("C"), line("D", { dies: true })];
    const answer = (over: Partial<{ text: string; wins: boolean }> = {}) => ({ plan: over.text ?? "A", text: over.text ?? "A", potions: [], wins: over.wins ?? false });
    expect(replayChoice(answer(), false, shown, replay)).toMatchObject({ line: { text: "C" }, reason: "attempt 2's line on this board, replayed to reach T4" });
    expect(replayChoice(answer({ text: "C" }), false, shown, replay)).toEqual({ line: null, reason: "the answer is attempt 2's line" });
    expect(replayChoice(answer({ wins: true }), false, shown, replay)).toMatchObject({ line: null, reason: expect.stringMatching(/wins the fight/) });
    expect(replayChoice(answer(), false, shown, { ...replay, line: "Z" })).toMatchObject({ line: null, reason: "attempt 2's line is not among the options" });
    // The reference line dies this turn: kept only where the answer does not.
    expect(replayChoice(answer(), false, shown, { ...replay, line: "D" })).toMatchObject({ line: null, reason: "attempt 2's line dies this turn, the answer does not" });
    expect(replayChoice(answer(), true, shown, { ...replay, line: "D" })).toMatchObject({ line: { text: "D" } });
  });

  it("a winning pick is never changed; a pick no failed attempt played there is played as answered; nothing left: none", () => {
    expect(choose([line("A"), line("C")], ["A"], "A", { wins: true })).toMatchObject({ replacement: null, reason: expect.stringMatching(/wins the fight/) });
    expect(choose([line("A"), line("C")], ["C"])).toMatchObject({ replacement: null, reason: expect.stringMatching(/not played on this board before/) });
    expect(choose([line("A"), line("C")], ["A", "C"])).toMatchObject({ replacement: null, reason: expect.stringMatching(/no shown line left/) });
  });
});

describe("rankByOrder: B2's order where it ranks the boss, the lines it cannot tell apart by the rollout", () => {
  const b2: Record<string, string> = { A: "357|90", B: "232|160", C: "232|160", D: "20|170" };
  const byRollout = (plans: string[]) => [...plans].sort().reverse()[0] ?? null;
  it("B2's first among the candidates; a tie on its numbers goes to the rollout", () => {
    expect(rankByOrder(["B", "D"], ["A", "B", "C", "D"], (plan) => b2[plan] ?? null, byRollout)).toBe("B");
    // B and C read the same in B2 (1YXM F33: every line 0% won): the rollout's pick between them.
    expect(rankByOrder(["B", "C", "D"], ["A", "B", "C", "D"], (plan) => b2[plan] ?? null, byRollout)).toBe("C");
    // No B2 numbers for any of them: the rollout's.
    expect(rankByOrder(["X", "Y"], ["A"], () => null, byRollout)).toBe("Y");
  });
});

describe("slBoardKey: the same board in every attempt, any change in it a different board", () => {
  const board = (): Raw => {
    const raw = bossBoard({ turn: 2, hp: 45, playable: true, lethal: false });
    raw["agent_view"] = { combat: { draw: [{ line: "打击*2 [1费]：造成6点伤害。", card_ids: ["STRIKE_R"] }], discard: [], exhaust: [] } };
    return raw;
  };
  const key = (raw: Raw) => slBoardKey(parseGameState(raw));

  it("ignores what differs from attempt to attempt on the same board", () => {
    const a = board();
    const b = board();
    (b["run"] as Raw)["gold"] = 999;
    b["ts"] = "later";
    expect(key(b)).toBe(key(a));
    expect(key(a)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("our HP, an enemy's intent, the hand and the piles are part of it", () => {
    const base = key(board());
    const hp = board();
    ((hp["combat"] as Raw)["player"] as Raw)["current_hp"] = 44;
    const intent = board();
    ((((intent["combat"] as Raw)["enemies"] as Raw[])[0]!["intents"] as Raw[])[0]!)["damage"] = 31;
    const hand = board();
    (hand["combat"] as Raw)["hand"] = ((hand["combat"] as Raw)["hand"] as Raw[]).slice(1);
    const pile = board();
    ((pile["agent_view"] as Raw)["combat"] as Raw)["draw"] = [];
    for (const other of [hp, intent, hand, pile]) expect(key(other)).not.toBe(base);
  });
});

// ---------------------------------------------------------------- the planner on logged SL retry boards

interface Board {
  state: Raw;
  knownDraws: { cards: string[]; names: string[]; attempts: number[] } | null;
  rows: SlAttemptRow[];
}
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const boardOf = (name: string): Board => JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;

/** A logged board's decision environment as the live loop makes it on the retry; `sl` adds to its env.sl. */
function envOf(name: string, jevContext: "off" | "v1", sl: Partial<SlEnv> = {}): DecisionEnv {
  const fx = boardOf(name);
  const state = parseGameState(fx.state);
  const max = fx.rows[0]!.max_attempts;
  return {
    state,
    knowledge,
    brief: buildRunBrief(state, knowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: [],
    jevContext,
    sl: { attempt: 2, maxAttempts: max, previousAttempts: previousAttemptsJson(fx.rows, 2, max), showSim: true, ...sl },
    thiefFacts: config.thiefFacts,
    thiefCost: config.thiefFacts && config.thiefCost,
    mechRules: config.mechRules,
  };
}

/** The whole decision as data (tests/sl-retry-planner.test.ts viewOf): the question, Jev's view, every answer's resolution. */
function viewOf(env: DecisionEnv): unknown {
  const decision = planCombatTurn(env);
  if (!decision || decision.kind !== "ask") return decision ?? null;
  const ask = decision as AskDecision;
  const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
  const res = (answers: AnswerSet) => {
    const { apply: _apply, ...rest } = ask.resolve(answers);
    return rest;
  };
  return {
    label: ask.label,
    state: ask.state,
    questions: ask.questions,
    jevView: ask.jevView ?? null,
    resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key, 0.9))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope", 0.9))]]),
  };
}
const digest = (view: unknown): string => createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
/** v4 3488dc5's digests (tests/sl-retry-planner.test.ts GOLDEN): the boards' decisions with the retry switches off. */
const GOLDEN: Record<string, string> = {
  "jw92-f48-a2-t3-offering:off": "1ba734936934487606db07981da88e0d",
  "jw92-f48-a2-t3-offering:v1": "4bf5f7a2421257b1a2d4203f18cff8e6",
  "vnkn-f25-a2-t1:off": "28ba1f00d76a84763bcb3f94e6a9b8fc",
  "vnkn-f25-a2-t1:v1": "d5319b0374ec2c03213a3bd82612865b",
  "vnkn-f25-a2-t3-pact:off": "313a52095d167bc32d5115c9fd482b70",
  "vnkn-f25-a2-t3-pact:v1": "2f1f9f3f4f48ecfb459929281d8da4b8",
  "vnkn-f33-a2-t4-shrug:off": "34e66aac3fed416a4d9a37acb6ff23ed",
  "vnkn-f33-a2-t4-shrug:v1": "34e66aac3fed416a4d9a37acb6ff23ed",
};
const BOARDS = ["vnkn-f25-a2-t1", "vnkn-f25-a2-t3-pact", "jw92-f48-a2-t3-offering", "vnkn-f33-a2-t4-shrug"] as const;

/** The ask decision's options by key (criteria parsed). */
function optionsOf(decision: AskDecision): Record<string, Raw> {
  const raw = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(raw).map(([key, text]) => [key, text ? (JSON.parse(text) as Raw) : {}]));
}
const playsOf = (option: Raw): string => String(option["plays"] ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn");

describe("the planner: the switch recording changes nothing; on the deviation point's board the failed line gives way", () => {
  it("recording (env.sl.explore without a deviation): every logged board's decision is 3488dc5's, byte for byte", () => {
    frozen();
    for (const name of BOARDS) for (const ctx of ["off", "v1"] as const) expect(digest(viewOf(envOf(name, ctx, { explore: {} }))), `${name}:${ctx}`).toBe(GOLDEN[`${name}:${ctx}`]);
    expect([...touched]).toEqual([]);
  }, 300_000);

  it("VNKN F25 T1: Jev's pick, played there in attempt 2, gives way to the rollout's best untried line; the row says so", () => {
    frozen();
    const plain = planCombatTurn(envOf("vnkn-f25-a2-t1", "off", { explore: {} })) as AskDecision;
    const options = optionsOf(plain);
    const played = plain.resolve(pick("plan1"));
    const point = slPointOf(plain, played)!;
    expect(point).toMatchObject({ kind: "question", label: plain.label, line: playsOf(options["plan1"]!) });
    // The rollout's share of samples dead, for the line played and each alternative.
    expect(Object.keys(point.dead ?? {}).sort()).toEqual([point.line, ...point.alternatives!].sort());
    expect(point.alternatives!.length).toBeGreaterThan(0);
    expect(point.alternatives).not.toContain(point.line);

    const deviate = { point: "T1, the latest question before attempt 2's death on T7", excluded: [point.line], attempts: [2] };
    const ask = planCombatTurn(envOf("vnkn-f25-a2-t1", "off", { explore: { deviate } })) as AskDecision;
    // Jev's question is the same: the deviation happens after the answer.
    expect(JSON.stringify(ask.questions)).toBe(JSON.stringify(plain.questions));
    expect(JSON.stringify(ask.state)).toBe(JSON.stringify(plain.state));
    const resolved = ask.resolve(pick("plan1"));
    const log = (resolved.log as Raw)["sl_explore"] as Raw;
    expect(log).toMatchObject({ point: deviate.point, original: point.line, played_in: [2] });
    const replacement = String(log["replacement"]);
    expect(point.alternatives).toContain(replacement);
    expect(replacement).not.toBe(point.line);
    // The rollout's numbers of both lines.
    expect((log["numbers"] as Raw)["original"]).toMatch(/^rollout dead \d+\/\d+, further loss [\d.]+, win ~\d+%; this turn hp -\d+, dmg \d+$/);
    expect((log["numbers"] as Raw)["replacement"]).toMatch(/^rollout dead \d+\/\d+/);
    // The replacement's first step is what goes out, and the line is committed for the steps after it.
    const key = Object.keys(options).find((k) => playsOf(options[k]!) === replacement)!;
    const same = plain.resolve(pick(key));
    expect(resolved.intent).toEqual(same.intent);
    expect(resolved.rationale).toMatch(/SL explore \(T1, the latest question .*\): playing .* instead of .*, played on this board in attempt 2/);
    expect(slPointOf(ask, resolved)).toMatchObject({ line: replacement, explored: true, deviation: { original: point.line, replacement } });
    // The rollout's best untried line: no other untried line ranks before it among those dying no more often.
    expect(String(log["reason"])).toMatch(/best untried line by the question's ranking/);
  }, 300_000);

  it("on the deviation point's board a pick no failed attempt played there is played as answered (logged, not changed)", () => {
    frozen();
    const plain = planCombatTurn(envOf("vnkn-f25-a2-t1", "off", { explore: {} })) as AskDecision;
    const options = optionsOf(plain);
    const ask = planCombatTurn(envOf("vnkn-f25-a2-t1", "off", { explore: { deviate: { point: "T1", excluded: [playsOf(options["plan2"]!)], attempts: [2] } } })) as AskDecision;
    const resolved = ask.resolve(pick("plan1"));
    const before = plain.resolve(pick("plan1"));
    expect(resolved.intent).toEqual(before.intent);
    expect(resolved.rationale).toBe(before.rationale);
    expect((resolved.log as Raw)["sl_explore"]).toMatchObject({ replacement: null, reason: expect.stringMatching(/not played on this board before/) });
  }, 300_000);

  it("code's own turns are never changed: VNKN F33 T4 (code plays it) and a lethal, with their lines excluded", () => {
    frozen();
    for (const ctx of ["off", "v1"] as const) {
      const env = envOf("vnkn-f33-a2-t4-shrug", ctx, { explore: {} });
      const decision = planCombatTurn(env) as Decision;
      expect(decision.kind).toBe("act");
      const line = slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false })!.line;
      expect(slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false })).toMatchObject({ kind: "code" });
      expect(digest(viewOf(envOf("vnkn-f33-a2-t4-shrug", ctx, { explore: { deviate: { point: "T4", excluded: [line], attempts: [2] } } })))).toBe(GOLDEN[`vnkn-f33-a2-t4-shrug:${ctx}`]);
      // The sub-switches on (a boss: the Kaiser Crab): the same.
      expect(digest(viewOf(envOf("vnkn-f33-a2-t4-shrug", ctx, { explore: { deviate: { point: "T4", excluded: [line], attempts: [2] }, b2Gate: true, bossPotions: true } })))).toBe(GOLDEN[`vnkn-f33-a2-t4-shrug:${ctx}`]);
    }
    // A lethal: Strike kills the 5 HP Jaw Worm and the Cultist is gone.
    const raw = combatPayload({ enemyHp: 5 });
    (((raw["combat"] as Raw)["enemies"] as Raw[])[1]!)["is_alive"] = false;
    const lethalEnv = (sl: Partial<SlEnv>): DecisionEnv => ({ ...scenarioEnv(raw), sl: { attempt: 3, maxAttempts: 4, previousAttempts: {}, showSim: false, ...sl } });
    const plain = planCombatTurn(lethalEnv({ explore: {} }));
    expect(plain).toMatchObject({ kind: "act", label: "combat/lethal" });
    const line = slPointOf(plain!, { intent: null, rationale: "", confidence: null, fallback: false })!.line;
    const deviated = planCombatTurn(lethalEnv({ explore: { deviate: { point: "T3", excluded: [line], attempts: [2] } } }));
    expect(JSON.stringify(deviated)).toBe(JSON.stringify(plain));
    const flagged = planCombatTurn(lethalEnv({ explore: { deviate: { point: "T3", excluded: [line], attempts: [2] }, b2Gate: true, bossPotions: true } }));
    expect(JSON.stringify(flagged)).toBe(JSON.stringify(plain));
  }, 300_000);
});

/**
 * The explore part of a board's decision (sl-explore-b2.test.ts has its own copy, on B2's boards): every answer's point as
 * recorded, then with plan1's and plan2's lines excluded on the board (a deviation), every answer's resolution (its log
 * with sl_explore) and point. `explore`: the switch's own settings (the sub-switches), added to env.sl.explore.
 */
function exploreView(env: (explore: SlEnv["explore"]) => DecisionEnv, explore: Record<string, unknown> = {}): unknown {
  const plain = planCombatTurn(env({ ...explore })) as AskDecision;
  const keys = Object.keys((plain.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
  const excluded = ["plan1", "plan2"].filter((key) => keys.includes(key)).map((key) => slPointOf(plain, plain.resolve(pick(key)))!.line);
  const ask = planCombatTurn(env({ ...explore, deviate: { point: "T?", excluded, attempts: [2] } })) as AskDecision;
  const resolved = (decision: AskDecision, key: string) => {
    const out = decision.resolve(pick(key));
    const { apply: _apply, ...rest } = out;
    return { ...rest, point: slPointOf(decision, out) ?? null };
  };
  return { excluded, points: keys.map((key) => slPointOf(plain, plain.resolve(pick(key))) ?? null), deviated: keys.map((key) => resolved(ask, key)) };
}
/** bc8c9bc's (SL_RETRY_EXPLORE before the B2 gate and the boss drinks) explore views of the logged retry boards. */
const EXPLORE_GOLDEN: Record<string, string> = {
  "vnkn-f25-a2-t1": "d6fd9e856b056d35af216bc99490b296",
  "vnkn-f25-a2-t3-pact": "7d5f823210777f6829098dac6d0179e8",
  "jw92-f48-a2-t3-offering": "1db00f9e87590d011addcda89c6a032a",
};

describe("the sub-switches off: the explore part as at bc8c9bc", () => {
  it("every answer's point and, with a deviation, every answer's resolution, log and point: bc8c9bc's", () => {
    frozen();
    const got: Record<string, string> = {};
    for (const name of ["vnkn-f25-a2-t1", "vnkn-f25-a2-t3-pact", "jw92-f48-a2-t3-offering"]) got[name] = digest(exploreView((explore) => envOf(name, "off", { explore })));
    if (process.env["CAPTURE"] === "1") console.log(JSON.stringify(got, null, 2));
    expect(got).toEqual(EXPLORE_GOLDEN);
    expect([...touched]).toEqual([]);
  }, 300_000);
});

describe("the sub-switches on: a listed elite as before (no added drink); a boss fight's replacement may drink", () => {
  const ON = { b2Gate: true, bossPotions: true };

  it("the Decimillipede (a listed elite): every point and deviation is bc8c9bc's; never a line drinking the Speed Potion the pick does not", () => {
    frozen();
    for (const name of ["vnkn-f25-a2-t1", "vnkn-f25-a2-t3-pact"]) expect(digest(exploreView((explore) => envOf(name, "off", { explore }), ON)), name).toBe(EXPLORE_GOLDEN[name]);
    // T1: plan2 drinks the Speed Potion; with every dry line played there, nothing is left (no drink added).
    const plain = planCombatTurn(envOf("vnkn-f25-a2-t1", "off", { explore: { ...ON } })) as AskDecision;
    const options = optionsOf(plain);
    const drink = playsOf(options["plan2"]!);
    expect(drink).toMatch(/potion 速度药水/);
    const point = slPointOf(plain, plain.resolve(pick("plan1")))!;
    expect(point.alternatives).not.toContain(drink);
    const dry = Object.keys(options).filter((key) => key !== "plan2").map((key) => playsOf(options[key]!));
    const ask = planCombatTurn(envOf("vnkn-f25-a2-t1", "off", { explore: { ...ON, deviate: { point: "T1", excluded: dry, attempts: [2, 3, 4] } } })) as AskDecision;
    expect((ask.resolve(pick("plan1")).log as Raw)["sl_explore"]).toMatchObject({ replacement: null, reason: expect.stringMatching(/no shown line left/) });
    expect([...touched]).toEqual([]);
  }, 300_000);

  it("SL_RETRY_EXPLORE_REPLAY on the Decimillipede T1: attempt 2's line is played instead of Jev's answer, as if Jev had picked it", () => {
    frozen();
    const plain = planCombatTurn(envOf("vnkn-f25-a2-t1", "off", { explore: {} })) as AskDecision;
    const options = optionsOf(plain);
    const reference = playsOf(options["plan3"]!);
    const replay = { line: reference, reference: 2, point: "T6, the latest question before attempt 2's death on T7" };
    const ask = planCombatTurn(envOf("vnkn-f25-a2-t1", "off", { explore: { ...ON, replay } })) as AskDecision;
    const resolved = ask.resolve(pick("plan1"));
    expect(resolved.intent).toEqual(plain.resolve(pick("plan3")).intent);
    expect(resolved.rationale).toMatch(/SL explore: replaying attempt 2's .* instead of .* before T6$/);
    expect((resolved.log as Raw)["sl_explore"]).toEqual({ replay: { ...replay, original: playsOf(options["plan1"]!), overridden: true, reason: "attempt 2's line on this board, replayed to reach T6" } });
    expect(slPointOf(ask, resolved)).toMatchObject({ line: reference, replay: { overridden: true } });
    // Jev's answer is the reference line: played as answered, counted.
    const same = ask.resolve(pick("plan3"));
    expect(same.intent).toEqual(plain.resolve(pick("plan3")).intent);
    expect(same.rationale).toBe(plain.resolve(pick("plan3")).rationale);
    expect(slPointOf(ask, same)).toMatchObject({ line: reference, replay: { overridden: false, reason: "the answer is attempt 2's line" } });
    expect([...touched]).toEqual([]);
  }, 300_000);

  it("the Test Subject (a boss; low trust, B2 off here: the rollout's gate): with every dry line played, a line drinking the Weak Potion", () => {
    frozen();
    const plain = planCombatTurn(envOf("jw92-f48-a2-t3-offering", "off", { explore: {} })) as AskDecision;
    const options = optionsOf(plain);
    const dry = Object.keys(options).filter((key) => !/potion /.test(playsOf(options[key]!))).map((key) => playsOf(options[key]!));
    expect(dry.length).toBeGreaterThan(0);
    const dryKey = Object.keys(options).find((key) => !/potion /.test(playsOf(options[key]!)))!;
    const deviate = { point: "T3", excluded: dry, attempts: [2, 3] };
    // Off: nothing left that drinks no more than the pick.
    const off = planCombatTurn(envOf("jw92-f48-a2-t3-offering", "off", { explore: { deviate } })) as AskDecision;
    expect((off.resolve(pick(dryKey)).log as Raw)["sl_explore"]).toMatchObject({ replacement: null, reason: expect.stringMatching(/no shown line left/) });
    // On: a drinking line, by the rollout's gate (B2 is not trusted on this boss), the row says so.
    const on = planCombatTurn(envOf("jw92-f48-a2-t3-offering", "off", { explore: { ...ON, deviate } })) as AskDecision;
    const resolved = on.resolve(pick(dryKey));
    const log = (resolved.log as Raw)["sl_explore"] as Raw;
    expect(String(log["replacement"])).toMatch(/potion 虚弱药水/);
    expect(log).toMatchObject({ original: playsOf(options[dryKey]!), gate: "rollout", reason: expect.stringMatching(/rollout does not see dying more often/) });
    const point = slPointOf(on, resolved)!;
    expect(point).toMatchObject({ line: log["replacement"], explored: true });
    expect(point.b2).toBeUndefined();
    // The record of the dry pick lists the drinking lines too.
    expect(slPointOf(plain, plain.resolve(pick(dryKey)))!.alternatives!.some((text) => /potion /.test(text))).toBe(false);
    const recorded = planCombatTurn(envOf("jw92-f48-a2-t3-offering", "off", { explore: { ...ON } })) as AskDecision;
    expect(slPointOf(recorded, recorded.resolve(pick(dryKey)))!.alternatives!.some((text) => /potion 虚弱药水/.test(text))).toBe(true);
    expect([...touched]).toEqual([]);
  }, 300_000);
});

// ---------------------------------------------------------------- the controller with the planner

/** A scenario board's decision environment (testKnowledge), as the loop makes it. */
function scenarioEnv(raw: Raw, sl?: SlEnv): DecisionEnv {
  const state = parseGameState(raw);
  return {
    state,
    knowledge: testKnowledge,
    brief: buildRunBrief(state, testKnowledge),
    thresholds: config.thresholds,
    runStart: "auto",
    characterPreference: null,
    allowFtueModals: false,
    strictJev: true,
    combatPlanner: "turn",
    screenMemory: createScreenMemory(state.screen),
    shopDiscardPotions: [],
    ...(sl ? { sl } : {}),
  };
}

/** The scripted fight: two questions (T1 at 60 HP, T2 at 45), then T3 at 10 HP with nothing to play against 30: certain death. */
const Q1 = (): Raw => bossBoard({ turn: 1, hp: 60, playable: true, lethal: false });
const Q2 = (hp = 45): Raw => bossBoard({ turn: 2, hp, playable: true, lethal: false });
const DEATH = (): Raw => bossBoard({ turn: 3, hp: 10 });

/**
 * SL_RETRY_EXPLORE_CANON and _TURN off here: these tests pin the record and the deviation as before them (08ec8f9); with
 * them on (the default), tests/sl-explore-canon.test.ts.
 */
function slConfig(log: string, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 3, eliteRetries: 1, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw: true, reloadEarly: true, retryKnownInserts: true, retryKnownTop: true, retryExplore: true, retryExploreB2: true, retryExploreBossPotions: true, retryExploreOrder: true, retryExploreReplay: true, retryExploreCanon: false, retryExploreTurn: false, retryExploreWhole: false, retryKnownPicks: true, log, stepTimeoutMs: 5_000, ...overrides };
}

function tempLog(): string {
  const dir = mkdtempSync(join(tmpdir(), "sl-explore-"));
  dirs.push(dir);
  return join(dir, "sl-attempts.jsonl");
}
const logRows = (path: string): SlAttemptRow[] => readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line) as SlAttemptRow);

/** A controller on a game whose reload lands on Q1 (save_and_quit: the menu, continue_run: the fight's first turn). */
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

interface Played {
  turn: number | null;
  label: string;
  line: string;
  intent: unknown;
  explore: unknown;
}

/**
 * One attempt as the loop plays it: each board observed, planned (env.sl from the controller), Jev picks plan1, dispatched;
 * then the certain death, reloaded (`last`: no retry left, the turn ends).
 */
async function playAttempt(t: ReturnType<typeof controller>, boards: Raw[], last = false, keys: string[] = []): Promise<Played[]> {
  const played: Played[] = [];
  for (const [i, raw] of boards.entries()) {
    const state: GameState = parseGameState(raw);
    t.sl.observe(state, t.memory);
    const decision = planCombatTurn(scenarioEnv(raw, t.sl.envFor(state))) as AskDecision;
    expect(decision.kind).toBe("ask");
    const key = keys[i] ?? "plan1";
    const resolved = decision.resolve(pick(key));
    t.sl.noteAction(state, resolved.intent!);
    t.sl.notePoint(state, decision, resolved);
    played.push({ turn: state.turn, label: decision.label, line: playsOf(optionsOf(decision)[key]!), intent: resolved.intent, explore: (resolved.log as Raw | undefined)?.["sl_explore"] ?? null });
  }
  const death = parseGameState(DEATH());
  t.sl.observe(death, t.memory);
  const outcome = await t.sl.beforeEndTurn(death, { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
  expect(outcome).toMatchObject(last ? { handled: false } : { handled: true, ok: true });
  return played;
}

describe("the controller: attempts record their lines, attempt 3 changes the latest question, attempt 4 the one before", () => {
  it("deviation at the latest point, then backtracking; every other board plays as answered; the rows keep it all", async () => {
    const log = tempLog();
    const t = controller(log);
    const a1 = await playAttempt(t, [Q1(), Q2()]);
    const a2 = await playAttempt(t, [Q1(), Q2()]);
    // Attempt 2 plays as attempt 1 did (nothing changed), and records its two questions.
    expect(a2.map((p) => p.intent)).toEqual(a1.map((p) => p.intent));
    expect(a2.every((p) => p.explore === null)).toBe(true);
    const rows2 = logRows(log);
    expect(rows2[0]!.explore).toBeUndefined();
    expect(rows2[1]!.explore!.points.map((p) => [p.turn, p.kind, p.line])).toEqual(a2.map((p) => [p.turn, "question", p.line]));
    expect(rows2[1]!.explore!.points[0]!.board).toBe(slBoardKey(parseGameState(Q1())));
    expect(rows2[1]!.explore!.target).toBeNull();

    // Attempt 3: T1 as answered, T2 (the latest question before the death) changed.
    const a3 = await playAttempt(t, [Q1(), Q2()]);
    expect(t.notes.join("\n")).toMatch(/SL: attempt 3 deviates at T2, the latest question before attempt 2's death on T3/);
    expect(a3[0]!.intent).toEqual(a2[0]!.intent);
    // SL_RETRY_EXPLORE_REPLAY: T1 is on attempt 2's path before the point; Jev's answer is its line already.
    expect(a3[0]!.explore).toEqual({ replay: { point: "T2, the latest question before attempt 2's death on T3", reference: 2, line: a2[0]!.line, original: a2[0]!.line, overridden: false, reason: "the answer is attempt 2's line" } });
    expect(a3[1]!.intent).not.toEqual(a2[1]!.intent);
    expect(a3[1]!.explore).toMatchObject({ original: a2[1]!.line, played_in: [2], replayed: 1 });
    const row3 = logRows(log)[2]!;
    expect(row3.explore!.replay).toEqual({ replayed: 1, overridden: 0, stopped: null });
    expect(row3.explore!.target).toMatchObject({ turn: 2, back: 1, excluded: [a2[1]!.line], attempts: [2] });
    expect(row3.explore!.deviation).toMatchObject({ reached: true, original: a2[1]!.line, replacement: (a3[1]!.explore as Raw)["replacement"] });
    expect(row3.explore!.points[1]).toMatchObject({ turn: 2, explored: true, line: (a3[1]!.explore as Raw)["replacement"] });

    // Attempt 4: the question one back (T1) changed; T2, where attempt 3 deviated, played as answered.
    const a4 = await playAttempt(t, [Q1(), Q2()], true);
    expect(a4[0]!.intent).not.toEqual(a2[0]!.intent);
    expect(a4[0]!.explore).toMatchObject({ point: "T1, the 2nd latest question before attempt 2's death on T3", original: a2[0]!.line, replayed: 0 });
    expect(a4[1]!.intent).toEqual(a2[1]!.intent);
    expect(a4[1]!.explore).toBeNull();
  }, 300_000);

  it("SL_RETRY_EXPLORE_REPLAY: Jev answers T1 otherwise in attempt 3 (R1QJUBVBSSB2 F33); attempt 2's line is played there, so the attempt reaches its T2 point", async () => {
    const log = tempLog();
    const t = controller(log);
    await playAttempt(t, [Q1(), Q2()]);
    const a2 = await playAttempt(t, [Q1(), Q2()]);
    const a3 = await playAttempt(t, [Q1(), Q2()], false, ["plan2", "plan1"]);
    expect(a3[0]!.intent).toEqual(a2[0]!.intent);
    expect(a3[0]!.explore).toMatchObject({ replay: { reference: 2, line: a2[0]!.line, overridden: true, reason: "attempt 2's line on this board, replayed to reach T2" } });
    expect((a3[0]!.explore as { replay: { original: string } }).replay.original).not.toBe(a2[0]!.line);
    expect(a3[1]!.explore).toMatchObject({ original: a2[1]!.line, replayed: 1 });
    const row3 = logRows(log)[2]!;
    expect(row3.explore!.replay).toEqual({ replayed: 1, overridden: 1, stopped: null });
    // The record keeps the line played (attempt 2's).
    expect(row3.explore!.points[0]!.line).toBe(a2[0]!.line);
    // Off: Jev's answer is played on T1.
    const offLog = tempLog();
    const off = controller(offLog, { retryExploreReplay: false });
    await playAttempt(off, [Q1(), Q2()]);
    const b2 = await playAttempt(off, [Q1(), Q2()]);
    const b3 = await playAttempt(off, [Q1(), Q2()], false, ["plan2", "plan1"]);
    expect(b3[0]!.intent).not.toEqual(b2[0]!.intent);
    expect(b3[0]!.explore).toBeNull();
    expect(b3[1]!.explore).not.toHaveProperty("replayed");
    expect(logRows(offLog)[2]!.explore).not.toHaveProperty("replay");
  }, 300_000);

  it("no deviation when the board differs from the failed attempts': played as answered, the point kept for the next attempt", async () => {
    const log = tempLog();
    const t = controller(log);
    await playAttempt(t, [Q1(), Q2()]);
    const a2 = await playAttempt(t, [Q1(), Q2()]);
    const a3 = await playAttempt(t, [Q1(), Q2(44)]);
    expect(a3.map((p) => p.intent)).toEqual(a2.map((p) => p.intent));
    // T1 on attempt 2's path (replayed, the same answer); T2 at 44 HP is not: the replay stops, no deviation.
    expect(a3[0]!.explore).toMatchObject({ replay: { overridden: false } });
    expect(a3[1]!.explore).toBeNull();
    expect(logRows(log)[2]!.explore!.deviation).toBeUndefined();
    expect(logRows(log)[2]!.explore!.replay).toMatchObject({ replayed: 1, stopped: expect.stringMatching(/^T2: the board is not on attempt 2's path/) });
    expect(t.notes.join("\n")).toMatch(/SL: attempt 3 stops replaying attempt 2's path before T2: T2: the board is not on attempt 2's path; played as usual/);
    // Not reached: attempt 4 aims at the same point.
    const a4 = await playAttempt(t, [Q1(), Q2()], true);
    expect(a4[1]!.explore).toMatchObject({ point: expect.stringMatching(/^T2, the latest question/) });
  }, 300_000);

  it("a restarted process reads the points back from the log and deviates at the same point", async () => {
    const log = tempLog();
    const t = controller(log);
    await playAttempt(t, [Q1(), Q2()]);
    const a2 = await playAttempt(t, [Q1(), Q2()]);
    await playAttempt(t, [Q1(), Q2()]);
    // The process restarts in attempt 4: the new controller's attempt count and deviation point come from the log.
    const again = controller(log);
    const q1 = parseGameState(Q1());
    again.sl.observe(q1, again.memory);
    expect(again.sl.decisionFields()).toEqual({ sl_attempt: 4, sl_reloads: 3 });
    const env = again.sl.envFor(q1)!;
    expect(env.explore).toEqual({ deviate: { point: "T1, the 2nd latest question before attempt 2's death on T3", excluded: [a2[0]!.line], attempts: [2, 3], replayed: 0 }, b2Gate: true, bossPotions: true });
    expect(again.notes.join("\n")).toMatch(/SL: attempt 4 deviates at T1/);
  }, 300_000);

  it("the sub-switches: on by default in env.sl.explore on every board; off, absent (the planner then as at bc8c9bc)", async () => {
    const on = controller(tempLog());
    await playAttempt(on, [Q1(), Q2()]);
    expect(on.sl.envFor(parseGameState(Q1()))!.explore).toEqual({ b2Gate: true, bossPotions: true });
    expect(on.sl.describe()).toMatchObject({ retry_explore: true, retry_explore_b2: true, retry_explore_boss_potions: true, retry_explore_order: true, retry_explore_replay: true, retry_known_picks: true });
    const off = controller(tempLog(), { retryExploreB2: false, retryExploreBossPotions: false, retryExploreOrder: false, retryExploreReplay: false });
    await playAttempt(off, [Q1(), Q2()]);
    expect(off.sl.envFor(parseGameState(Q1()))!.explore).toEqual({});
    expect(off.sl.describe()).toMatchObject({ retry_explore: true, retry_explore_b2: false, retry_explore_boss_potions: false, retry_explore_order: false, retry_explore_replay: false });
  }, 300_000);

  it("switch off: nothing recorded, no env.sl.explore, the same plays in every attempt (as before the switch)", async () => {
    const log = tempLog();
    const t = controller(log, { retryExplore: false });
    const a1 = await playAttempt(t, [Q1(), Q2()]);
    const a2 = await playAttempt(t, [Q1(), Q2()]);
    const a3 = await playAttempt(t, [Q1(), Q2()]);
    expect(a3.map((p) => p.intent)).toEqual(a1.map((p) => p.intent));
    expect(a2.map((p) => p.intent)).toEqual(a1.map((p) => p.intent));
    expect(logRows(log).some((row) => "explore" in row)).toBe(false);
    expect(t.sl.envFor(parseGameState(Q1()))).not.toHaveProperty("explore");
    expect(t.sl.describe()).toMatchObject({ retry_explore: false });
    // The planner's decision with the switch recording is the decision without it.
    const sl = t.sl.envFor(parseGameState(Q2()))!;
    expect(digest(viewOf(scenarioEnv(Q2(), { ...sl, explore: {} })))).toBe(digest(viewOf(scenarioEnv(Q2(), sl))));
  }, 300_000);
});
