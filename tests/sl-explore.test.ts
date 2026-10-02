/**
 * SL_RETRY_EXPLORE (docs/sl.md §11, src/sl/explore.ts): retries try a different line at one decision point.
 *
 * - exploreTarget: attempt 3 deviates at the latest question of attempt 2's path with a line no failed attempt played,
 *   attempt 4 at the one before it (backtracking), round again once each had its turn; code's own turns are never a
 *   deviation point; a deviation whose board never came up does not count.
 * - exploreReplacement: the best untried line by the question's ranking, preferring those the rollout does not see dying
 *   more often; never a line dying this turn while one survives, never a drink the pick does not drink, never a winning pick.
 * - The planner on logged SL retry boards (tests/sl-retry-data, pinned knowledge as tests/sl-retry-planner.test.ts): with
 *   the switch recording (env.sl.explore without a deviation) every decision is v4 3488dc5's byte for byte (the same golden
 *   digests); on the deviation point's board Jev's line played in a failed attempt gives way to the rollout's best untried
 *   line, and the row says so (sl_explore); code's own turns, a lethal among them, are never changed.
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
const { exploreReplacement, exploreTarget, rankByOrder, slBoardKey } = await import("../src/sl/explore.js");
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

function slConfig(log: string, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 3, eliteRetries: 1, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, reloadEarly: true, retryKnownInserts: true, retryKnownTop: true, retryExplore: true, log, stepTimeoutMs: 5_000, ...overrides };
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
async function playAttempt(t: ReturnType<typeof controller>, boards: Raw[], last = false): Promise<Played[]> {
  const played: Played[] = [];
  for (const raw of boards) {
    const state: GameState = parseGameState(raw);
    t.sl.observe(state, t.memory);
    const decision = planCombatTurn(scenarioEnv(raw, t.sl.envFor(state))) as AskDecision;
    expect(decision.kind).toBe("ask");
    const resolved = decision.resolve(pick("plan1"));
    t.sl.noteAction(state, resolved.intent!);
    t.sl.notePoint(state, decision, resolved);
    played.push({ turn: state.turn, label: decision.label, line: playsOf(optionsOf(decision)["plan1"]!), intent: resolved.intent, explore: (resolved.log as Raw | undefined)?.["sl_explore"] ?? null });
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
    expect(a3[0]!.explore).toBeNull();
    expect(a3[1]!.intent).not.toEqual(a2[1]!.intent);
    expect(a3[1]!.explore).toMatchObject({ original: a2[1]!.line, played_in: [2] });
    const row3 = logRows(log)[2]!;
    expect(row3.explore!.target).toMatchObject({ turn: 2, back: 1, excluded: [a2[1]!.line], attempts: [2] });
    expect(row3.explore!.deviation).toMatchObject({ reached: true, original: a2[1]!.line, replacement: (a3[1]!.explore as Raw)["replacement"] });
    expect(row3.explore!.points[1]).toMatchObject({ turn: 2, explored: true, line: (a3[1]!.explore as Raw)["replacement"] });

    // Attempt 4: the question one back (T1) changed; T2, where attempt 3 deviated, played as answered.
    const a4 = await playAttempt(t, [Q1(), Q2()], true);
    expect(a4[0]!.intent).not.toEqual(a2[0]!.intent);
    expect(a4[0]!.explore).toMatchObject({ point: "T1, the 2nd latest question before attempt 2's death on T3", original: a2[0]!.line });
    expect(a4[1]!.intent).toEqual(a2[1]!.intent);
    expect(a4[1]!.explore).toBeNull();
  }, 300_000);

  it("no deviation when the board differs from the failed attempts': played as answered, the point kept for the next attempt", async () => {
    const log = tempLog();
    const t = controller(log);
    await playAttempt(t, [Q1(), Q2()]);
    const a2 = await playAttempt(t, [Q1(), Q2()]);
    const a3 = await playAttempt(t, [Q1(), Q2(44)]);
    expect(a3.map((p) => p.intent)).toEqual(a2.map((p) => p.intent));
    expect(a3.every((p) => p.explore === null)).toBe(true);
    expect(logRows(log)[2]!.explore!.deviation).toBeUndefined();
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
    expect(env.explore).toEqual({ deviate: { point: "T1, the 2nd latest question before attempt 2's death on T3", excluded: [a2[0]!.line], attempts: [2, 3] } });
    expect(again.notes.join("\n")).toMatch(/SL: attempt 4 deviates at T1/);
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
