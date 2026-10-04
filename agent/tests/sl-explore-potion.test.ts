/**
 * SL_RETRY_EXPLORE_POTION (docs/sl.md §11.10, src/sl/explore.ts cardsOf / potionsOf / cardsRepeat / triedHas / mayRepeat,
 * exploreTarget `potion`): a line is tried on a board by its cards (card and target, as _CANON), unless it drinks a potion
 * the failed attempt with those cards never drank from that turn on.
 *
 * - P68P7CDJRDH3 F48 (Test Subject, V4.5, 2026-10-03, console 20261003-160630 :2157/:2198/:2225/:2256): attempt 2 died on
 *   T3 at 1 HP + 24 block against 44 after Defend, Defend, Strike+ and Powdered Demise on T2. Attempt 3 deviated at T2 with
 *   the same three cards and no potion (drunk on T3 instead); attempt 4 at T1 with attempt 2's cards and the potion drunk
 *   there (attempts 2-3: T2, T3). Both counted as new lines (the turn key had the potion in it); all three ended at 1 HP +
 *   24 block against 44.
 * - GQ5H73A1VCL8 F48 attempts 4-6 (attempt 3's or attempt 2's cards on T1, the Block Potion or the Potion of Binding moved
 *   from or to T4-T5) and Z4UK0CA16THF F33 attempt 6 (attempt 2's T1 cards, the two potions a turn early) are the other
 *   logged deviations that moved only a potion: the new rule calls all six tried.
 * - Off: exploreTarget, exploreTried and triedHas make what v4 ff66eb2 made of every logged fight (a digest captured there);
 *   the planner on the logged boards as live.
 * - Fixed data only: tests/sl-explore-potion-data (make-fixtures.ts: P68P F48's two deviation boards and its six rows, from
 *   the logs) and tests/sl-explore-where-data/sl-attempts.jsonl (the 11 fights to 10-03 16:00); the knowledge pinned
 *   (pinned-knowledge.json), testKnowledge for the controller. Nothing under logs/ or .cache is touched (checked).
 */
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "..", "knowledge");
const DATA = join(HERE, "sl-explore-potion-data");
/** Paths under logs/ or .cache touched in any way: must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(HERE, "sl-explore-potion-data", "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
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
const { readFileSync } = await import("node:fs");
const { potionCostOptions } = await import("../src/strategy/potion-cost.js");
potionCostOptions.enabled = true;
const explore = await import("../src/sl/explore.js");
const { cardsOf, cardsRepeat, exploreReplacement, exploreTarget, exploreTried, mayRepeat, potionOfPlay, potionsOf, POTION_ONLY, slBoardKey, triedHas, triedHow, turnCanon } = explore;
const { offView, digest } = await import("./sl-explore-potion-views.js");
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { planCombatTurn, slPointOf, thiefTrace } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { bossLinesOptions } = await import("../src/sim/boss-lines.js");
const { previousAttemptsJson } = await import("../src/sl/attempts.js");
const { RETRY_COMPUTE, SlController } = await import("../src/sl/controller.js");
const { RunJournal } = await import("../src/project/run-journal.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { loadConfig } = await import("../src/config.js");
const { testKnowledge } = await import("./scenarios.js");
const { bossBoard, state: scenarioState } = await import("./sl-support.js");
type AskDecision = import("../src/project/types.js").AskDecision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;
type SlEnv = import("../src/project/types.js").SlEnv;
type SlConfig = import("../src/config.js").SlConfig;
type SlAttemptRow = import("../src/sl/attempts.js").SlAttemptRow;
type ExploreRow = import("../src/sl/explore.js").ExploreRow;
type ExploreTargetOptions = import("../src/sl/explore.js").ExploreTargetOptions;
type SlPoint = import("../src/sl/explore.js").SlPoint;
type SlTarget = import("../src/sl/explore.js").SlTarget;
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type Raw = Record<string, unknown>;

const config = loadConfig({} as NodeJS.ProcessEnv);
afterEach(() => {
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
  bossLinesOptions.enabled = true;
  thiefTrace.enabled = false;
  thiefTrace.last = null;
});
afterAll(() => {
  expect([...touched]).toEqual([]);
});

// ---------------------------------------------------------------- the fixed data

const P68P: SlAttemptRow[] = JSON.parse(readFileSync(join(DATA, "p68p-f48-rows.json"), "utf8")) as SlAttemptRow[];
const WHERE_ROWS: SlAttemptRow[] = readFileSync(join(HERE, "sl-explore-where-data", "sl-attempts.jsonl"), "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line) as SlAttemptRow);
const fight = (run: string, floor: number): SlAttemptRow[] => WHERE_ROWS.filter((row) => row.run_id === run && row.floor === floor).sort((a, b) => a.attempt - b.attempt);
const GQ5H = fight("GQ5H73A1VCL8", 48);
const Z4UK = fight("Z4UK0CA16THF", 33);
const JKP6 = fight("JKP66TF39633", 17);
const R9175 = fight("9175DLPM2EFR", 33);
const JSA5 = fight("JSA5K8YZ9RXV", 33);

/** The live rules of P68P's run (v4-live ebb3710: ORDER, CANON, TURN, WHOLE), v4's (and WHERE), and each with the new switch. */
const EBB3710: ExploreTargetOptions = { aliveFirst: true, canon: true, tried: true, whole: true };
const V4: ExploreTargetOptions = { ...EBB3710, where: true };
const withPotion = (options: ExploreTargetOptions): ExploreTargetOptions => ({ ...options, potion: true });
const before = (rows: readonly ExploreRow[], attempt: number) => rows.filter((row) => row.attempt < attempt);

/** P68P F48's boards: T2 where attempt 3 deviated (attempt 2's Defend, Defend, Strike+, Powdered Demise), T1 where attempt 4 did. */
const T2_BOARD = "c54a67959ccce5cc";
const T1_BOARD = "4596458eacf1ea2f";
/** Attempt 2's (and 3's) T1 cards, and its T2 turn. */
const A2_T1 = "ANGER>实验体 #C46, ANGER>实验体 #C46, BLUDGEON>实验体 #C46, INFERNO+, MOLTEN_FIST>实验体 #C46, OFFERING, OFFERING+, POMMEL_STRIKE+>实验体 #C46, RUPTURE+, STRIKE_IRONCLAD>实验体 #C46, SWORD_BOOMERANG+";
const PD = "potion:POWDERED_DEMISE>实验体 #C46";
const A2_T2 = `DEFEND_IRONCLAD, DEFEND_IRONCLAD, STRIKE_IRONCLAD+>实验体 #C46, ${PD}`;

/** The deviation turn of a logged attempt as played (the row's plays; a row without a turn record: its summary's turn). */
function playedTurn(row: SlAttemptRow): { text: string; canon?: string; loose?: string } {
  const deviation = row.explore!.deviation!;
  // A row from before the turn record has no deviation turn: its target's.
  const turn = row.summary.turns.find((entry) => entry.turn === (deviation.turn ?? row.explore!.target!.turn));
  return { text: "", ...(deviation.plays !== undefined ? { canon: deviation.plays } : {}), ...(turn ? { loose: turnCanon(turn.plays) } : {}) };
}

// ---------------------------------------------------------------- the keys

describe("a turn's cards and potions (cardsOf, potionsOf, cardsRepeat)", () => {
  it("P68P F48's turns: the potion is left out of the cards, by id; a summary's by name", () => {
    expect(potionOfPlay(PD)).toBe("POWDERED_DEMISE");
    expect(potionOfPlay("potion 消亡粉末")).toBe("消亡粉末");
    expect(potionOfPlay("DEFEND_IRONCLAD")).toBeNull();
    expect(cardsOf(A2_T2)).toBe("DEFEND_IRONCLAD, DEFEND_IRONCLAD, STRIKE_IRONCLAD+>实验体 #C46");
    expect(potionsOf(A2_T2)).toEqual(["POWDERED_DEMISE"]);
    expect(cardsOf("nothing")).toBe("nothing");
    expect(cardsOf(turnCanon(["potion:BLOCK_POTION"]))).toBe("nothing");
    expect(potionsOf(turnCanon(["potion 格挡药水", "防御", "potion 缚魂药水"]))).toEqual(["格挡药水", "缚魂药水"]);
  });

  it("the same cards repeat a failed turn when every potion drunk was drunk by that attempt from there on (as many of each)", () => {
    // Attempt 2's T2 through the board: its cards, Powdered Demise drunk there.
    const a2 = { cards: cardsOf(A2_T2), drunk: ["POWDERED_DEMISE"] };
    // Attempt 3: the same cards without the potion; attempt 2's own turn.
    expect(cardsRepeat(a2, "DEFEND_IRONCLAD, DEFEND_IRONCLAD, STRIKE_IRONCLAD+>实验体 #C46")).toBe(true);
    expect(cardsRepeat(a2, A2_T2)).toBe(true);
    // Another card, or the potion twice: new.
    expect(cardsRepeat(a2, `DEFEND_IRONCLAD, STRIKE_IRONCLAD+>实验体 #C46, ${PD}`)).toBe(false);
    expect(cardsRepeat(a2, `${A2_T2}, ${PD}`)).toBe(false);
    // Attempt 2's T1 (no potion there, Powdered Demise on T2): attempt 4's T1 with it is the same line.
    expect(cardsRepeat({ cards: A2_T1, drunk: ["POWDERED_DEMISE"] }, turnCanon([...A2_T1.split(", "), PD]))).toBe(true);
    // A potion that attempt never drank from there (held to its end): new.
    expect(cardsRepeat({ cards: A2_T1, drunk: [] }, turnCanon([...A2_T1.split(", "), PD]))).toBe(false);
  });
});

// ---------------------------------------------------------------- P68P F48 (the live rows)

describe("P68P F48 (the live rows): attempts 3 and 4 only moved the Powdered Demise", () => {
  it("what attempts 2-4 played and how they ended", () => {
    expect(P68P.map((row) => [row.attempt, row.result, row.turns, row.end_hp, row.end_block, row.incoming])).toEqual([
      [1, "predicted_death", 6, 7, 22, 45],
      [2, "predicted_death", 3, 1, 24, 44],
      [3, "predicted_death", 3, 1, 24, 44],
      [4, "predicted_death", 3, 1, 24, 44],
      [5, "predicted_death", 6, 1, 24, 45],
      [6, "died", 6, 0, null, 45],
    ]);
    const [, a2, a3, a4] = P68P;
    const turn = (row: SlAttemptRow, n: number) => turnCanon(row.explore!.turns!.find((entry) => entry.turn === n)!.plays);
    // T1: attempts 2 and 3 the same cards, attempt 4 the same and the potion; T2: attempt 2 drank it, 3 and 4 did not.
    expect([turn(a2!, 1), turn(a3!, 1), cardsOf(turn(a4!, 1))]).toEqual([A2_T1, A2_T1, A2_T1]);
    expect(potionsOf(turn(a4!, 1))).toEqual(["POWDERED_DEMISE"]);
    expect([turn(a2!, 2), turn(a3!, 2), turn(a4!, 2)]).toEqual([A2_T2, cardsOf(A2_T2), cardsOf(A2_T2)]);
    // T3: attempt 3 drank it there, at its least-loss line.
    expect(potionsOf(turn(a3!, 3))).toEqual(["POWDERED_DEMISE"]);
    expect(a2!.summary.potions).toEqual(["T2 消亡粉末"]);
    expect(a3!.summary.potions).toEqual(["T3 消亡粉末"]);
    expect(a4!.summary.potions).toEqual(["T1 消亡粉末"]);
    // Live: both deviations counted as new turns (the potion in the key).
    expect([a3!.explore!.deviation, a4!.explore!.deviation]).toMatchObject([
      { reached: true, turn: 2, original: "防御, 防御, 打击+ -> 实验体 #C46, potion 消亡粉末 -> 实验体 #C46", replacement: "防御, 防御, 打击+ -> 实验体 #C46", differs: true },
      { reached: true, turn: 1, original: "熔融之拳 -> 实验体 #C46, 打击 -> 实验体 #C46, 愤怒 -> 实验体 #C46", replacement: "熔融之拳 -> 实验体 #C46, 打击 -> 实验体 #C46, potion 消亡粉末 -> 实验体 #C46, 愤怒 -> 实验体 #C46", differs: true },
    ]);
  });

  it("the live targets (ebb3710's rules); with the switch, attempts 3 and 4's turns are tried, 5 and 6's are not", () => {
    for (const k of [3, 4, 5, 6]) expect(exploreTarget(before(P68P, k), k, EBB3710).target).toEqual(P68P[k - 1]!.explore!.target);
    const how = (k: number, potion: boolean) => {
      const row = P68P[k - 1]!;
      return triedHow(exploreTried(before(P68P, k), k, row.explore!.target!.board, { canon: true, potion }).tried, playedTurn(row));
    };
    expect([3, 4, 5, 6].map((k) => how(k, false))).toEqual([null, null, null, null]);
    expect([3, 4, 5, 6].map((k) => how(k, true))).toEqual(["cards", "cards", null, null]);
  });

  it("the turns through T1's board by their cards: attempts 2-3's, Powdered Demise drunk after it", () => {
    const { tried, attempts } = exploreTried(before(P68P, 4), 4, T1_BOARD, { canon: true, potion: true });
    expect(attempts).toEqual([2, 3]);
    expect(tried).toEqual({ canon: [A2_T1], loose: [], cards: [{ cards: A2_T1, drunk: ["POWDERED_DEMISE"] }] });
    // Off: no cards, as before.
    expect(exploreTried(before(P68P, 4), 4, T1_BOARD, { canon: true }).tried).toEqual({ canon: [A2_T1], loose: [] });
    // Attempt 4's line (the potion added) is tried by its cards; the potion's option alone ("drink it, then re-plan") may
    // end the turn as attempts 2-3's (its sure plays: the cards so far and a potion they drank later).
    const a4 = turnCanon([...A2_T1.split(", "), PD]);
    expect(triedHas(tried, { text: "", canon: a4 })).toBe(true);
    expect(triedHas({ canon: tried.canon, loose: [] }, { text: "", canon: a4 })).toBe(false);
    const soFar = ["INFERNO+", "SWORD_BOOMERANG+", "POMMEL_STRIKE+>实验体 #C46", "RUPTURE+", "OFFERING+", "BLUDGEON>实验体 #C46", "ANGER>实验体 #C46", "OFFERING"];
    const drink = { open: true, committed: turnCanon([...soFar, PD]) };
    expect(mayRepeat(tried, drink)).toBe(true);
    expect(mayRepeat({ canon: tried.canon, loose: [] }, drink)).toBe(false);
    // A card no failed turn has there: the turn differs whatever comes after.
    expect(mayRepeat(tried, { open: true, committed: turnCanon([...soFar, "STONE_ARMOR", PD]) })).toBe(false);
  });

  it("T2's only other line is attempt 2's cards without the potion: not open; attempt 3 goes to T1 instead", () => {
    const { target: off } = exploreTarget(before(P68P, 3), 3, EBB3710);
    expect(off).toMatchObject({ board: T2_BOARD, turn: 2, back: 1 });
    const { target, why } = exploreTarget(before(P68P, 3), 3, withPotion(EBB3710));
    expect(target).toMatchObject({ board: T1_BOARD, turn: 1, back: 2, round: 0, point: "T1, the 2nd latest question before attempt 2's death on T3" });
    expect(why).toMatch(/^3 lines shown there never played on that board/);
    // T1's four other lines: attempt 4's (the potion added to attempt 2's cards) is tried now, the other three are open.
    const point = P68P[1]!.explore!.points.find((p) => p.board === T1_BOARD)!;
    expect(point.alternatives).toHaveLength(4);
    const open = (options: ExploreTargetOptions) => {
      const t = exploreTarget(before(P68P, 3), 3, options).target!;
      return point.alternatives!.filter((line) => !t.excluded.includes(line) && !triedHas(t.tried, { text: line, canon: point.canon![line]! }));
    };
    expect(open(withPotion(EBB3710))).toHaveLength(3);
    expect(open(withPotion(EBB3710))).not.toContain("熔融之拳 -> 实验体 #C46, 打击 -> 实验体 #C46, potion 消亡粉末 -> 实验体 #C46, 愤怒 -> 实验体 #C46");
    expect(target!.tried!.cards).toEqual([{ cards: A2_T1, drunk: ["POWDERED_DEMISE"] }]);
  });
});

// ---------------------------------------------------------------- the other logged potion-only deviations

describe("the other logged deviations that only moved a potion (GQ5H F48 attempts 4-6, Z4UK F33 attempt 6)", () => {
  it("GQ5H: attempt 3's cards with Binding on T1 (drunk on T4 by attempt 3), attempt 2's cards with it (T5), attempt 3's without either", () => {
    const how = (k: number, potion: boolean) => {
      const row = GQ5H[k - 1]!;
      return triedHow(exploreTried(before(GQ5H, k), k, row.explore!.target!.board, { canon: true, potion }).tried, playedTurn(row));
    };
    expect([3, 4, 5, 6].map((k) => how(k, false))).toEqual([null, null, null, null]);
    expect([3, 4, 5, 6].map((k) => how(k, true))).toEqual([null, "cards", "cards", "cards"]);
    // Attempts 3 and 4 ended alike: 22 HP + 10 block against 34 on T5.
    expect([GQ5H[2], GQ5H[3]].map((row) => [row!.turns, row!.end_hp, row!.end_block, row!.incoming])).toEqual([[5, 22, 10, 34], [5, 22, 10, 34]]);
    // T1's board after attempt 3: the lines still open there all only move a potion.
    for (const k of [4, 5, 6]) {
      const board = GQ5H[k - 1]!.explore!.target!.board;
      const point = GQ5H[1]!.explore!.points.find((p) => p.board === board)!;
      const { tried } = exploreTried(before(GQ5H, k), k, board, { canon: true, potion: true });
      const excluded = GQ5H[k - 1]!.explore!.target!.excluded;
      expect(point.alternatives!.filter((line) => !excluded.includes(line) && !triedHas(tried, { text: line, canon: point.canon![line]! }))).toEqual([]);
    }
  });

  it("Z4UK (rows from before the turn record): attempt 6 drank both potions on T1 with attempt 2's T1 cards (rebuilt by name)", () => {
    const row = Z4UK[5]!;
    expect(row.explore!.turns).toBeUndefined();
    const { tried } = exploreTried(before(Z4UK, 6), 6, row.explore!.target!.board, { canon: true, potion: true });
    expect(tried.cards!.every((entry) => entry.loose === true)).toBe(true);
    expect(triedHow(tried, playedTurn(row))).toBe("cards");
    expect(triedHow(exploreTried(before(Z4UK, 6), 6, row.explore!.target!.board, { canon: true }).tried, playedTurn(row))).toBeNull();
  });
});

// ---------------------------------------------------------------- the chains and the wins

/**
 * A failed attempt `k` that deviated at `target` (the offline model of tools/sl-explore-potion-replay.ts): the reference path
 * up to the board, the first open line there (in the question's order) the rollout does not see dying more often (else the
 * first open one), its turn the line as planned.
 */
function openAt(reference: ExploreRow, target: SlTarget): { point: SlPoint; open: string[] } {
  const point = [...reference.explore!.points].reverse().find((p) => p.board === target.board)!;
  return { point, open: (point.alternatives ?? []).filter((line) => !target.excluded.includes(line) && !triedHas(target.tried, { text: line, ...(point.canon?.[line] !== undefined ? { canon: point.canon[line] } : {}) })) };
}
function modelLine(point: SlPoint, open: readonly string[]): string {
  const own = point.dead?.[point.line];
  const notWorse = open.filter((line) => own === undefined || (point.dead?.[line] ?? 2) <= own + 1e-9);
  return (notWorse.length > 0 ? notWorse : open)[0] ?? point.line;
}
function chain(rows: readonly ExploreRow[], options: ExploreTargetOptions, last = 6): { target: SlTarget; line: string }[] {
  let known = before(rows, 3);
  const reference = known.find((row) => row.attempt === 2)!;
  const out: { target: SlTarget; line: string }[] = [];
  for (let k = 3; k <= last; k += 1) {
    const { target } = exploreTarget(known, k, options);
    if (!target) break;
    const { point, open } = openAt(reference, target);
    const line = modelLine(point, open);
    out.push({ target, line });
    const points = reference.explore!.points;
    const end = points.map((p) => p.board).lastIndexOf(target.board);
    known = [...known, { attempt: k, turns: reference.turns, result: "predicted_death", summary: { turns: [] }, explore: { points: [...points.slice(0, end).filter((p) => p.board !== target.board), { ...point, line, explored: true }], target, deviation: { reached: true, original: point.line, replacement: line, reason: "test", turn: target.turn, differs: true }, turns: [] } }];
  }
  return out;
}
const at = (steps: readonly { target: SlTarget }[]) => steps.map(({ target }) => `T${target.turn}/${target.back}${target.round > 0 ? `r${target.round}` : ""}`);

describe("each rule's own chain from attempt 3 (v4's rules: WHERE on)", () => {
  it("P68P: without the switch attempt 4 still goes to T2 for attempt 2's cards without the potion; with it never", () => {
    const off = chain(P68P, V4);
    expect(at(off)).toEqual(["T1/5", "T2/1", "T1/4", "T1/3"]);
    expect(off[1]).toMatchObject({ target: { board: T2_BOARD }, line: "防御, 防御, 打击+ -> 实验体 #C46" });
    const on = chain(P68P, withPotion(V4));
    expect(at(on)).toEqual(["T1/5", "T1/4", "T1/3", "T1/2"]);
    expect(on.some(({ target }) => target.board === T2_BOARD)).toBe(false);
  });

  it("JKP6 F17: T1's only line left drinks the Weak Potion later (attempt 1: T4); the chain goes to T5 instead", () => {
    expect(at(chain(JKP6, V4))).toEqual(["T8/1", "T4/3", "T1/4", "T5/2"]);
    expect(at(chain(JKP6, withPotion(V4)))).toEqual(["T8/1", "T4/3", "T5/2", "T8/1r1"]);
  });

  it("the two explore wins are still reached, as early, with the winning line open (9175 F33 T2, JSA5 F33 T7)", () => {
    for (const [rows, won] of [[R9175, 6], [JSA5, 3]] as const) {
      const winner = rows.find((row) => row.attempt === won)!;
      expect(winner.result).toBe("won");
      const board = winner.explore!.target!.board;
      const line = winner.explore!.deviation!.replacement!;
      for (const options of [V4, withPotion(V4)]) {
        const steps = chain(rows, options);
        const first = steps.findIndex(({ target }) => target.board === board);
        expect(first + 3).toBe(rows === R9175 ? 4 : 3);
        expect(steps[first]!.line).toBe(line);
      }
      expect(at(chain(rows, withPotion(V4)))).toEqual(at(chain(rows, V4)));
    }
  });
});

// ---------------------------------------------------------------- off: as before

/** offView over every fixed fight (tests/sl-explore-potion-views.ts), captured on v4 ff66eb2. */
const OFF_FF66EB2 = "9b5bf2d37a911f6aab821ef7ffe80301";

describe("off: what ff66eb2 made of every logged fight", () => {
  it("the targets, the turns tried through them and whether each deviation's turn was one (12 fights, two rule sets)", () => {
    const keys = [...new Set(WHERE_ROWS.map((row) => `${row.run_id}|${row.floor}`))];
    const fights = [...keys.map((key) => WHERE_ROWS.filter((row) => `${row.run_id}|${row.floor}` === key).sort((a, b) => a.attempt - b.attempt)), P68P];
    expect(fights).toHaveLength(12);
    expect(digest(offView(explore, fights))).toBe(OFF_FF66EB2);
  });

  it("a tried set without cards: triedHas, mayRepeat and the replacement as before", () => {
    const tried = { canon: [A2_T2], loose: [] };
    expect(triedHow(tried, { text: "", canon: cardsOf(A2_T2) })).toBeNull();
    expect(triedHow(tried, { text: "", canon: A2_T2 })).toBe("exact");
    expect(mayRepeat(tried, { open: true, committed: PD })).toBe(true);
    expect(mayRepeat(tried, { open: true, committed: "DEFEND_IRONCLAD, DEFEND_IRONCLAD, DEFEND_IRONCLAD" })).toBe(false);
  });
});

// ---------------------------------------------------------------- the replacement

describe("exploreReplacement with the turns by their cards", () => {
  const line = (text: string, canon: string, potions: string[] = []) => ({ plan: text, text, dies: false, wins: false, potions, canon });
  // P68P F48 T2: Jev's answer (attempt 2's turn) and the one other line shown, the same cards without the potion.
  const shown = [line("防御, 防御, 打击+, potion", A2_T2, ["POWDERED_DEMISE"]), line("防御, 防御, 打击+", cardsOf(A2_T2))];
  const choose = (tried: { canon: string[]; loose: string[]; cards?: { cards: string; drunk: string[] }[] }, pick = shown[0]!) =>
    exploreReplacement({ pick: { plan: pick.plan, text: pick.text, potions: pick.potions, wins: false, canon: pick.canon }, shown, excluded: [], deathShare: () => 1, rank: (plans) => plans[0] ?? null, drinks: true, tried });

  it("P68P T2: off, the line without the potion replaces it (as live); on, nothing is left there", () => {
    expect(choose({ canon: [A2_T2], loose: [] }).replacement?.text).toBe("防御, 防御, 打击+");
    expect(choose({ canon: [A2_T2], loose: [], cards: [{ cards: cardsOf(A2_T2), drunk: ["POWDERED_DEMISE"] }] })).toEqual({ replacement: null, reason: "no shown line left that no failed attempt played here", gate: null });
  });

  it("a pick tried only by its cards says so", () => {
    const got = choose({ canon: [cardsOf(A2_T2)], loose: [], cards: [{ cards: cardsOf(A2_T2), drunk: ["POWDERED_DEMISE"] }] });
    expect(got.replacement).toBeNull();
    expect(got.reason).toBe(`no shown line left that no failed attempt played here; ${POTION_ONLY}`);
    // A potion that attempt never drank from there: the pick is new, played as answered.
    expect(choose({ canon: [cardsOf(A2_T2)], loose: [], cards: [{ cards: cardsOf(A2_T2), drunk: [] }] })).toEqual({ replacement: null, reason: "the pick was not played on this board before: played as answered", gate: null });
  });
});

// ---------------------------------------------------------------- the planner on the logged boards

const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
interface Board {
  source: string;
  decision: { label: string; rationale: string; chosen: string };
  state: Raw;
  knownDraws: NonNullable<SlEnv["knownDraws"]> | null;
  played: { canon: string[]; text: string[] };
  rows: SlAttemptRow[];
}
const boardOf = (name: string): Board => JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
const pick = (key: string, confidence = 0.9): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;
function optionsOf(decision: AskDecision): Record<string, Raw> {
  const raw = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(raw).filter(([key]) => /^(plan|p)\d+$/.test(key)).map(([key, text]) => [key, text ? (JSON.parse(text) as Raw) : {}]));
}
const playsOf = (option: Raw): string => String(option["plays"] ?? "").replace(/, then /g, ", ").replace(/^nothing \(end the turn now\)$/, "end turn");

/**
 * A logged board's decision environment on its retry as the live loop made it (the known draws, RETRY_COMPUTE, the frozen
 * clock: the rollout's whole schedule; B2 off: the live gate there was the rollout's), the deviation there with `tried`
 * (the switches live: B2 gate, boss potions, whole).
 */
function deviationEnv(name: string, potion: boolean): { env: DecisionEnv; tried: ReturnType<typeof exploreTried>["tried"] } {
  const fx = boardOf(name);
  const state = parseGameState(fx.state);
  const attempt = fx.rows.length + 1;
  const target = P68P[attempt - 1]!.explore!.target!;
  const { tried, attempts } = exploreTried(fx.rows, attempt, target.board, { canon: true, potion });
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = false;
  const sl: SlEnv = {
    attempt,
    maxAttempts: 6,
    previousAttempts: previousAttemptsJson(fx.rows, attempt, 6, { knownDraws: true }),
    showSim: true,
    ...(fx.knownDraws ? { knownDraws: fx.knownDraws } : {}),
    // SL_RETRY_COMPUTE, as live.
    compute: { ...RETRY_COMPUTE },
    explore: { b2Gate: true, bossPotions: true, played: fx.played, whole: true, deviate: { point: target.point, excluded: [...target.excluded], attempts, tried } },
  };
  return {
    tried,
    env: {
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
      jevContext: "v1",
      sl,
      thiefFacts: config.thiefFacts,
      thiefCost: config.thiefFacts && config.thiefCost,
      mechRules: config.mechRules,
    },
  };
}

describe("the planner on P68P F48's logged deviation boards (Jev answering as logged)", () => {
  it("attempt 4 T1: off, Powdered Demise added to attempt 2's cards (as live); on, a line with other cards", () => {
    const name = "p68p-a4-t1-deviation";
    expect(slBoardKey(parseGameState(boardOf(name).state))).toBe(T1_BOARD);
    const POTION_LINE = "熔融之拳 -> 实验体 #C46, 打击 -> 实验体 #C46, potion 消亡粉末 -> 实验体 #C46, 愤怒 -> 实验体 #C46";
    const resolveJev = (potion: boolean) => {
      const { env, tried } = deviationEnv(name, potion);
      const ask = planCombatTurn(env) as AskDecision;
      expect(ask.kind).toBe("ask");
      const options = optionsOf(ask);
      // Jev's logged answer: the line with the potion (plan 5/5), swapped by dominance to attempt 2's (plan 1).
      const jev = Object.keys(options).find((key) => playsOf(options[key]!) === POTION_LINE)!;
      expect(jev).toBeDefined();
      const resolved = ask.resolve(pick(jev, 0.18));
      return { resolved, log: (resolved.log as Raw)["sl_explore"] as Raw, point: slPointOf(ask, resolved)!, tried, options };
    };
    const off = resolveJev(false);
    expect(off.log).toMatchObject({ original: "熔融之拳 -> 实验体 #C46, 打击 -> 实验体 #C46, 愤怒 -> 实验体 #C46", replacement: POTION_LINE, played_in: [2, 3] });
    const on = resolveJev(true);
    expect(on.log).toMatchObject({ original: "熔融之拳 -> 实验体 #C46, 打击 -> 实验体 #C46, 愤怒 -> 实验体 #C46", played_in: [2, 3] });
    expect(on.log["replacement"]).not.toBeNull();
    expect(on.log["replacement"]).not.toBe(POTION_LINE);
    const turn = String(on.log["turn_instead"]);
    expect(cardsOf(turn)).not.toBe(A2_T1);
    expect(triedHas(on.tried, { text: "", canon: turn })).toBe(false);
    expect(on.point).toMatchObject({ explored: true, deviation: { replacement: on.log["replacement"] } });
    // Every answer there ends its line off attempts 2-3's T1 cards (or with a potion they never drank: none here).
    const { env } = deviationEnv(name, true);
    const ask = planCombatTurn(env) as AskDecision;
    for (const key of Object.keys(optionsOf(ask))) {
      const log = (ask.resolve(pick(key)).log as Raw | undefined)?.["sl_explore"] as Raw | undefined;
      const final = String(log?.["turn_instead"] ?? log?.["turn"]);
      expect(triedHas(on.tried, { text: "", canon: final })).toBe(false);
    }
    expect([...touched]).toEqual([]);
  }, 300_000);

  it("attempt 3 T2: off, the same cards without the potion (as live); on, no other line there (the target never comes here)", () => {
    const name = "p68p-a3-t2-deviation";
    expect(slBoardKey(parseGameState(boardOf(name).state))).toBe(T2_BOARD);
    const JEV = "防御, 防御, 打击+ -> 实验体 #C46, potion 消亡粉末 -> 实验体 #C46";
    const resolveJev = (potion: boolean) => {
      const { env } = deviationEnv(name, potion);
      const ask = planCombatTurn(env) as AskDecision;
      const options = optionsOf(ask);
      const jev = Object.keys(options).find((key) => playsOf(options[key]!) === JEV)!;
      expect(jev).toBeDefined();
      return (ask.resolve(pick(jev, 0.6)).log as Raw)["sl_explore"] as Raw;
    };
    expect(resolveJev(false)).toMatchObject({ original: JEV, replacement: "防御, 防御, 打击+ -> 实验体 #C46", played_in: [2] });
    expect(resolveJev(true)).toMatchObject({ original: JEV, replacement: null, reason: "no shown line left that no failed attempt played here", played_in: [2] });
    expect([...touched]).toEqual([]);
  }, 300_000);
});

// ---------------------------------------------------------------- the controller

describe("the controller with SL_RETRY_EXPLORE_POTION", () => {
  /** P68P's attempts 1-2 as this test fight's (the scenario's run, F17, the Test Subject). */
  const logged = P68P.filter((row) => row.attempt <= 2).map((row) => ({ ...row, run_id: "TESTRUN123", floor: 17, encounter: "TEST_SUBJECT" }));
  const slConfig = (overrides: Partial<SlConfig>): SlConfig => ({
    enabled: true, bossRetries: 5, eliteRetries: 3, act3LowHp: true, act3LowHpPct: 40, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw: true, reloadEarly: true,
    retryKnownInserts: true, retryKnownTop: true, retryExplore: true, retryExploreB2: true, retryExploreBossPotions: true, retryExploreOrder: true, retryExploreReplay: true, retryExploreCanon: true, retryExploreTurn: true,
    retryExploreWhole: true, retryExploreWhere: false, retryExplorePotion: true, retryKnownPicks: true, log: null, stepTimeoutMs: 5_000, ...overrides,
  });
  function attempt3(overrides: Partial<SlConfig> = {}) {
    const notes: string[] = [];
    const log = { path: null, write: () => undefined, readRun: (runId: string) => logged.filter((row) => row.run_id === runId) };
    const sl = new SlController({ config: slConfig(overrides), knowledge: testKnowledge, client: {} as never, note: (m) => notes.push(m), elites: { source: "test", date: "test", elites: [] }, log });
    sl.observe(scenarioState(bossBoard({ turn: 1, hp: 35, playable: true, lethal: false })), { journal: new RunJournal(), screenMemory: createScreenMemory() });
    return { sl, notes: notes.find((note) => note.startsWith("SL: attempt 3 deviates")) ?? "" };
  }

  it("on: attempt 3 aims at T1 (T2's only other line moves the potion); off: T2, as live; the run config says which", () => {
    const on = attempt3();
    expect(on.sl.describe()).toMatchObject({ retry_explore_potion: true });
    expect(on.notes).toMatch(/^SL: attempt 3 deviates at T1, the 2nd latest question before attempt 2's death on T3: /);
    const off = attempt3({ retryExplorePotion: false });
    expect(off.sl.describe()).toMatchObject({ retry_explore_potion: false });
    expect(off.notes).toBe("SL: attempt 3 deviates at T2, the latest question before attempt 2's death on T3: not 防御, 防御, 打击+ -> 实验体 #C46, potion 消亡粉末 -> 实验体 #C46 again there; 1 turn through it not again (1 line shown there never played on that board; every line loses in every sample here, as on every point left)");
    // It reads the turn keys: without SL_RETRY_EXPLORE_CANON and _TURN, off.
    expect(attempt3({ retryExploreCanon: false, retryExploreTurn: false }).sl.describe()).toMatchObject({ retry_explore_potion: false });
    expect(attempt3({ retryExplore: false }).sl.describe()).toMatchObject({ retry_explore: false, retry_explore_potion: false });
  });
});
