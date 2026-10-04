/**
 * SL_RETRY_EXPLORE_WHERE (docs/sl.md §11.9, src/sl/explore.ts hpLostByTurn / whereWeights / exploreTarget `where`): the
 * deviation point goes where the failed attempts lost their HP, a different turn each attempt.
 *
 * - GQ5H73A1VCL8 F48 (Aeonglass, 2026-10-03): attempts 3-6 all deviated at T1 while the HP went after T4 and T5 (20 after T4
 *   in five of the six, 21-25 after T5). Attempt 2's path had 10 questions: T1; three on T3 whose only other line was attempt 1's turn
 *   (SL_RETRY_EXPLORE_CANON: tried); six on T4-T6 where every line died in every rollout sample (the death on T7 within
 *   their 5-turn horizon); T1's line in none (its horizon ends on T5). SL_RETRY_EXPLORE_ORDER put the lost points after
 *   every other, and the uses counted only among the rest: T1, four times.
 * - Fixed data only: tests/sl-explore-where-data/sl-attempts.jsonl, the logged rows of the 11 SL fights with explore records
 *   up to 2026-10-03 16:00 (copied from logs/sl-attempts.jsonl, draws left out); testKnowledge for the controller. Nothing
 *   under logs/ or .cache is touched (checked), no knowledge file is read, nothing is written outside memory.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
/** Paths under logs/, data/ (.cache before the move) or knowledge/ touched in any way: must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const shared = [join(ROOT, "..", "logs"), join(ROOT, "..", "data"), join(ROOT, "..", "knowledge")];
  const wrapped: Record<string, unknown> = {};
  for (const name of ["existsSync", "statSync", "lstatSync", "readdirSync", "openSync", "readFileSync", "writeFileSync", "appendFileSync", "mkdirSync", "renameSync", "rmSync", "unlinkSync", "copyFileSync", "createWriteStream"]) {
    const original = (fs as unknown as Record<string, (...args: unknown[]) => unknown>)[name]!;
    wrapped[name] = (path: unknown, ...rest: unknown[]) => {
      const at = typeof path === "string" ? resolve(path) : String(path);
      // sl-elites.json and boss-trust.json sat outside knowledge before the move (src/sl, src/sim): not watched, as then.
      if (shared.some((dir) => at === dir || at.startsWith(dir + "/")) && !/\/(sl-elites|boss-trust)\.json$/.test(at)) touched.add(`${name} ${at}`);
      return original(path, ...rest);
    };
  }
  return { ...fs, ...wrapped, default: { ...fs, ...wrapped } };
});

vi.resetModules();
const { readFileSync } = await import("node:fs");
const { exploreTarget, exploreTried, hpLostByTurn, pointLost, whereWeights, WHERE_DECAY } = await import("../src/sl/explore.js");
const { SlController } = await import("../src/sl/controller.js");
const { RunJournal } = await import("../src/memory/run-journal.js");
const { createScreenMemory } = await import("../src/memory/types.js");
const { testKnowledge } = await import("./scenarios.js");
const { bossBoard, state } = await import("./sl-support.js");
type ExploreRow = import("../src/sl/explore.js").ExploreRow;
type ExploreTargetOptions = import("../src/sl/explore.js").ExploreTargetOptions;
type SlPoint = import("../src/sl/explore.js").SlPoint;
type SlTarget = import("../src/sl/explore.js").SlTarget;
type SlAttemptRow = import("../src/sl/attempts.js").SlAttemptRow;
type SlConfig = import("../src/core/config.js").SlConfig;

afterAll(() => {
  expect([...touched]).toEqual([]);
});

const ROWS: SlAttemptRow[] = readFileSync(join(HERE, "sl-explore-where-data", "sl-attempts.jsonl"), "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line) as SlAttemptRow);
const fight = (run: string, floor: number): SlAttemptRow[] => ROWS.filter((row) => row.run_id === run && row.floor === floor).sort((a, b) => a.attempt - b.attempt);
const GQ5H = fight("GQ5H73A1VCL8", 48);
const B3PJ = fight("B3PJGKHAQGK6", 17);
const JKP6 = fight("JKP66TF39633", 17);
const UK7R = fight("UK7R9A0NMCXL", 33);
const V7K = fight("9V7K1P899R5N", 45);
const Z4UK = fight("Z4UK0CA16THF", 33);
const PW7Y = fight("PW7Y9EWUW8SB", 48);
const R9175 = fight("9175DLPM2EFR", 33);
const JSA5 = fight("JSA5K8YZ9RXV", 33);

/** The live controller's options at v4 cd31bfe (ORDER, CANON, TURN, WHOLE on), and with SL_RETRY_EXPLORE_WHERE. */
const LIVE: ExploreTargetOptions = { aliveFirst: true, canon: true, tried: true, whole: true };
const WHERE: ExploreTargetOptions = { ...LIVE, where: true };
const before = (rows: readonly ExploreRow[], attempt: number) => rows.filter((row) => row.attempt < attempt);
const at = (rows: readonly ExploreRow[], attempt: number, options: ExploreTargetOptions) => exploreTarget(before(rows, attempt), attempt, options);

/** The questions of a reference path, its latest record per board, in path order. */
function questions(reference: ExploreRow): SlPoint[] {
  const seen = new Set<string>();
  const out: SlPoint[] = [];
  const points = reference.explore!.points;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const point = points[i]!;
    if (point.kind !== "question" || !point.alternatives || seen.has(point.board)) continue;
    seen.add(point.board);
    out.push(point);
  }
  return out.reverse();
}

/**
 * A failed attempt `k` that deviated at `target` (the offline model of tools/sl-explore-where-replay.ts): the reference
 * path up to the board, the first open line there (in the question's order) the rollout does not see dying more often
 * played instead (else the first open one), its turn not a failed one; its HP not known (no summary).
 */
function failedAt(known: readonly ExploreRow[], k: number, target: SlTarget): ExploreRow {
  const reference = known.find((row) => row.attempt === target.reference)!;
  const points = reference.explore!.points;
  const end = points.map((point) => point.board).lastIndexOf(target.board);
  const point = points[end]!;
  const tried = exploreTried(known, k, target.board, { canon: true }).tried;
  const open = (point.alternatives ?? []).filter((line) => !target.excluded.includes(line) && !(point.canon?.[line] !== undefined && tried.canon.includes(point.canon[line])));
  const own = point.dead?.[point.line];
  const notWorse = open.filter((line) => own === undefined || (point.dead?.[line] ?? 2) <= own + 1e-9);
  const line = (notWorse.length > 0 ? notWorse : open)[0]!;
  return {
    attempt: k,
    turns: reference.turns,
    result: "predicted_death",
    summary: { turns: [] },
    explore: {
      points: [...points.slice(0, end).filter((p) => p.board !== target.board), { ...point, line, explored: true }],
      target,
      deviation: { reached: true, original: point.line, replacement: line, reason: "test", turn: target.turn, differs: true },
      turns: [],
    },
  };
}

/** Each rule's own sequence of targets from attempt 3 (failedAt for every simulated attempt). */
function chain(rows: readonly ExploreRow[], options: ExploreTargetOptions, last = 6): SlTarget[] {
  let known = before(rows, 3);
  const out: SlTarget[] = [];
  for (let k = 3; k <= last; k += 1) {
    const { target } = exploreTarget(known, k, options);
    if (!target) break;
    out.push(target);
    known = [...known, failedAt(known, k, target)];
  }
  return out;
}
const turns = (targets: readonly (SlTarget | null)[]) => targets.map((target) => target?.turn ?? null);

/** The lines open on a target's board (the reference point's alternatives not excluded, nor tried by their turn). */
function openAt(reference: ExploreRow, target: SlTarget): string[] {
  const point = [...reference.explore!.points].reverse().find((p) => p.board === target.board)!;
  return (point.alternatives ?? []).filter((line) => !target.excluded.includes(line) && !(point.canon?.[line] !== undefined && target.tried?.canon.includes(point.canon[line])));
}

// ---------------------------------------------------------------- why GQ5H deviated only at T1

describe("GQ5H F48 (the live rows): why attempts 3-6 all deviated at T1", () => {
  it("the live rule picks T1 every time, as the rows say", () => {
    for (const k of [3, 4, 5, 6]) {
      const { target } = at(GQ5H, k, LIVE);
      expect(target).toEqual(GQ5H.find((row) => row.attempt === k)!.explore!.target);
      expect(target).toMatchObject({ turn: 1, back: 10, round: k - 3 });
      expect(target).not.toHaveProperty("where");
    }
  });

  it("off: the other fights' live targets too (the turn, the question and the round; all of it on the latest two)", () => {
    for (const rows of [UK7R, V7K, JSA5, B3PJ, Z4UK, JKP6]) {
      for (const row of rows.filter((r) => r.attempt >= 3 && r.explore?.target)) {
        const { target } = at(rows, row.attempt, LIVE);
        expect([row.run_id, row.attempt, target?.board, target?.back, target?.round]).toEqual([row.run_id, row.attempt, row.explore!.target!.board, row.explore!.target!.back, row.explore!.target!.round]);
        if (rows === JKP6) expect(target).toEqual(row.explore!.target);
      }
    }
  });

  it("attempt 2's path: T1 alive (dead in no sample), T3's lines all attempt 1's, every line on T4-T6 dead in every sample", () => {
    const path = questions(GQ5H[1]!);
    expect(path.map((point) => point.turn)).toEqual([1, 3, 3, 3, 4, 4, 5, 5, 5, 6]);
    expect(path.map((point) => pointLost(point))).toEqual([false, false, false, false, true, true, true, true, true, true]);
    expect(path[0]!.dead![path[0]!.line]).toBe(0);
    // T3: each question's one other line is attempt 1's turn there (it drank the Potion of Binding on T3).
    for (const point of path.filter((p) => p.turn === 3)) {
      const { tried, attempts } = exploreTried(before(GQ5H, 3), 3, point.board, { canon: true });
      expect(attempts).toEqual([1, 2]);
      expect(point.alternatives!.every((line) => tried.canon.includes(point.canon![line]!))).toBe(true);
    }
  });

  it("where the HP went: after T4 and T5, every attempt", () => {
    expect(hpLostByTurn(GQ5H, 3)).toEqual([
      { turn: 1, mean: 4, attempts: 2 },
      { turn: 2, mean: 0, attempts: 2 },
      { turn: 3, mean: 0, attempts: 2 },
      { turn: 4, mean: 20, attempts: 2 },
      { turn: 5, mean: 21, attempts: 2 },
      { turn: 6, mean: 0, attempts: 2 },
      // The death: the 6 HP left.
      { turn: 7, mean: 6, attempts: 2 },
    ]);
    const all = hpLostByTurn(GQ5H, 7);
    expect(all.find((loss) => loss.turn === 4)).toEqual({ turn: 4, mean: 18, attempts: 6 });
    expect(all.find((loss) => loss.turn === 5)!.mean).toBeCloseTo(133 / 6, 9);
    expect(all.find((loss) => loss.turn === 7)).toEqual({ turn: 7, mean: 14 / 3, attempts: 3 });
    const weights = whereWeights(hpLostByTurn(GQ5H, 3));
    expect(weights.get(4)).toBeCloseTo(20 + 21 / 2 + 0 + 6 / 8, 9);
    expect(weights.get(5)).toBeCloseTo(21 + 0 + 6 / 4, 9);
    expect(weights.get(1)).toBeCloseTo(4 + 20 / 8 + 21 / 16 + 6 / 64, 9);
  });
});

// ---------------------------------------------------------------- the new rule

describe("SL_RETRY_EXPLORE_WHERE: the deviation goes where the failed attempts lost their HP, another turn each attempt", () => {
  it("GQ5H: attempt 3 at T4's first question; the chain T4, T5, T1, T6", () => {
    const { target, why } = at(GQ5H, 3, WHERE);
    expect(target).toMatchObject({ turn: 4, back: 6, round: 0, point: "T4, the 6th latest question before attempt 2's death on T7", where: { weight: 31.3, turnRound: 0, lost: { T4: 20, T5: 21, T1: 4, T7: 6 }, weights: { T1: 7.9, T4: 31.3, T5: 22.5, T6: 3 } } });
    expect(why).toBe(
      "9 lines shown there never played on that board; where the failed attempts lost their HP: T4 weighs 31.3 (20 lost on it on average, the later turns' losses at 0.5 a turn), the most of the turns deviated at the fewest times (none); every line loses in every sample here (the rollout's horizon: it does not order the turns); the other turns: T5 22.5, T1 7.9, T6 3",
    );
    expect(turns(chain(GQ5H, WHERE))).toEqual([4, 5, 1, 6]);
    expect(turns(chain(GQ5H, LIVE))).toEqual([1, 1, 1, 1]);
  });

  it("B3PJ F17 (T1 four times; 17 HP lost after T3): T3, T1, T5, then T3's other question", () => {
    expect(turns(B3PJ.filter((row) => row.attempt >= 3).map((row) => row.explore!.target))).toEqual([1, 1, 1, 1]);
    const targets = chain(B3PJ, WHERE);
    expect(targets.map((target) => [target.turn, target.back, target.round])).toEqual([[3, 3, 0], [1, 6, 0], [5, 1, 0], [3, 2, 0]]);
    expect(targets[3]!.point).toBe("T3, the 2nd latest question before attempt 2's death on T6 (T3 deviated at 1 other question before)");
    expect(targets[3]!.where).toMatchObject({ turnRound: 1 });
  });

  it("JKP6 F17 (T4 four times; 21 HP lost after T8): T8, T4, T1, T5", () => {
    expect(turns(JKP6.filter((row) => row.attempt >= 3).map((row) => row.explore!.target))).toEqual([4, 4, 4, 4]);
    expect(turns(chain(JKP6, WHERE))).toEqual([8, 4, 1, 5]);
  });

  it("PW7Y F48 (T1, T2, T1, T1; 28 and 24 HP lost after T3 and T4): T4, T3, T1, T5", () => {
    expect(turns(chain(PW7Y, WHERE))).toEqual([4, 3, 1, 5]);
  });

  it("T1 from the data: first where the first turns lost the most (UK7R F33, 9V7K F45), else in its turn", () => {
    // UK7R: 17 and 15 HP lost after T1 and T2; the 29 after T4 is on a turn with no question (T3 gets half of it).
    expect([...whereWeights(hpLostByTurn(UK7R, 3))].map(([turn, weight]) => [turn, Math.round(weight * 10) / 10])).toEqual([[1, 28.5], [2, 23], [3, 16], [4, 32], [5, 6]]);
    expect(turns(chain(UK7R, WHERE))).toEqual([1, 2, 3, 1]);
    // 9V7K (listed elite, 2 deviations): 21 HP after T2, which has no question: T1 carries half of it.
    expect(turns(chain(V7K, WHERE, 4))).toEqual([1, 4]);
    // Z4UK: 19 after T2 first, then T1 (4 of its own and the T2 hit at half) before T3.
    expect(turns(chain(Z4UK, WHERE))).toEqual([2, 1, 3, 2]);
  });

  it("the winning points are still reached: 9175 F33 at attempt 4 (live: 6), JSA5 F33 at attempt 3, the same lines open there", () => {
    // 9175: attempt 6 won at T2 (every line dead in every sample there); the live chain had gone T4, T3, T3 first.
    const won = R9175.find((row) => row.result === "won")!;
    expect(won).toMatchObject({ attempt: 6, explore: { target: { turn: 2, back: 4, round: 0 }, deviation: { reached: true } } });
    const targets = chain(R9175, WHERE);
    expect(turns(targets)).toEqual([3, 2, 4, 3]);
    expect(targets[1]!.board).toBe(won.explore!.target!.board);
    expect(openAt(R9175[1]!, targets[1]!)).toEqual(openAt(R9175[1]!, won.explore!.target!));
    expect(openAt(R9175[1]!, targets[1]!)).toContain(won.explore!.deviation!.replacement);
    // JSA5: attempt 3 won at T7, which lost the most (24 HP on average): the same board, the same line open.
    const jsa5 = JSA5.find((row) => row.result === "won")!;
    const { target } = at(JSA5, 3, WHERE);
    expect(target).toMatchObject({ board: jsa5.explore!.target!.board, turn: 7, excluded: jsa5.explore!.target!.excluded });
    expect(openAt(JSA5[1]!, target!)).toEqual([jsa5.explore!.deviation!.replacement]);
  });
});

// ---------------------------------------------------------------- the rule's parts on a small path

describe("hpLostByTurn and whereWeights", () => {
  const summary = (hps: (number | null)[]) => ({ turns: hps.map((hp, i) => ({ turn: i + 1, hp, block: 0, enemies: "", plays: [] })) });
  it("a turn's loss is its start HP less the next one's; a heal 0; the death all the HP left; an unfinished last turn left out", () => {
    const rows: ExploreRow[] = [
      { attempt: 1, turns: 3, result: "predicted_death", summary: summary([50, 40, 45]) },
      { attempt: 2, turns: 3, result: "unfinished", summary: summary([50, 30, 20]) },
      { attempt: 3, turns: 2, result: "won", summary: summary([50, 49]) },
      { attempt: 4, turns: 2, result: "died", summary: summary([50, null]) },
    ];
    // T1: 10 and 20 (attempt 4's T2 HP unknown); T2: a heal (0) and 10; T3: attempt 1's death (attempt 2 unfinished there).
    expect(hpLostByTurn(rows, 5)).toEqual([
      { turn: 1, mean: 15, attempts: 2 },
      { turn: 2, mean: 5, attempts: 2 },
      { turn: 3, mean: 45, attempts: 1 },
    ]);
    // Rows of the attempt itself and later ones do not count; a finished row of an attempt over its unfinished one.
    expect(hpLostByTurn(rows, 2)).toEqual([{ turn: 1, mean: 10, attempts: 1 }, { turn: 2, mean: 0, attempts: 1 }, { turn: 3, mean: 45, attempts: 1 }]);
    const twice: ExploreRow[] = [{ ...rows[1]!, attempt: 1 }, rows[0]!];
    expect(hpLostByTurn(twice, 2)).toEqual(hpLostByTurn([rows[0]!], 2));
  });

  it("a turn weighs its loss and the later turns' at the decay per turn", () => {
    const losses = [{ turn: 1, mean: 10, attempts: 1 }, { turn: 2, mean: 0, attempts: 1 }, { turn: 3, mean: 20, attempts: 1 }];
    expect(WHERE_DECAY).toBe(0.5);
    expect([...whereWeights(losses)]).toEqual([[1, 15], [2, 10], [3, 20]]);
    expect([...whereWeights(losses, 0)]).toEqual([[1, 10], [2, 0], [3, 20]]);
    expect([...whereWeights(losses, 1)]).toEqual([[1, 30], [2, 20], [3, 20]]);
  });
});

describe("exploreTarget with `where` on a small path", () => {
  /** A question: `dead` the rollout's share dead of the line played and of each alternative. */
  const q = (board: string, turn: number, alternatives: string[], dead?: number[]): SlPoint => ({
    board,
    turn,
    kind: "question",
    label: "combat/plan-choice",
    line: `X${board}`,
    alternatives,
    ...(dead ? { dead: Object.fromEntries([`X${board}`, ...alternatives].map((line, i) => [line, dead[i]!])) } : {}),
  });
  /** Attempt 2: the path, HP 60 / 50 / 20 / 10 at T1-T4 (10, 30 and 10 lost; the death on T4). */
  const hp = (hps: number[]) => ({ turns: hps.map((value, i) => ({ turn: i + 1, hp: value, block: 0, enemies: "", plays: [] })) });
  const two = (path: SlPoint[]): ExploreRow => ({ attempt: 2, turns: 4, result: "predicted_death", summary: hp([60, 50, 20, 10]), explore: { points: path, target: null } });
  const deviated = (attempt: number, path: SlPoint[], target: SlTarget, differs = true): ExploreRow => ({ attempt, turns: 4, result: "predicted_death", explore: { points: path, target, deviation: { reached: true, original: "X", replacement: "Y", reason: "test", turn: target.turn, differs } } });

  it("the heaviest turn first, then another turn each time, back round to the heaviest", () => {
    const path = [q("b1", 1, ["A", "B"]), q("b2", 2, ["C", "D"]), q("b3", 3, ["E", "F"])];
    const rows = [two(path)];
    // Weights: T1 10 + 15 + 2.5 + 1.25 = 28.75, T2 30 + 5 + 2.5 = 37.5, T3 10 + 5 = 15, T4 10.
    const first = exploreTarget(rows, 3, { where: true }).target!;
    expect(first).toMatchObject({ board: "b2", where: { weight: 37.5, turnRound: 0 } });
    rows.push(deviated(3, path, first));
    const second = exploreTarget(rows, 4, { where: true }).target!;
    expect(second).toMatchObject({ board: "b1", where: { turnRound: 0 } });
    rows.push(deviated(4, path, second));
    expect(exploreTarget(rows, 5, { where: true }).target).toMatchObject({ board: "b3" });
    rows.push(deviated(5, path, exploreTarget(rows, 5, { where: true }).target!));
    expect(exploreTarget(rows, 6, { where: true }).target).toMatchObject({ board: "b2", round: 1, where: { turnRound: 1 } });
    // Off: the latest first, then back (as before).
    expect(exploreTarget([two(path)], 3).target).toMatchObject({ board: "b3" });
  });

  it("within a turn its first question; a turn deviated at already waits for the others", () => {
    const path = [q("b1", 1, ["A"]), q("b2a", 2, ["C"]), q("b2b", 2, ["D"]), q("b3", 3, ["E"])];
    const rows = [two(path)];
    const first = exploreTarget(rows, 3, { where: true }).target!;
    expect(first).toMatchObject({ board: "b2a", back: 3 });
    rows.push(deviated(3, path, first));
    // T2's other question is not next: T1 and T3 have not been deviated at.
    expect(exploreTarget(rows, 4, { where: true }).target).toMatchObject({ board: "b1" });
  });

  it("a point whose untried lines all die more often waits for the others of its round (as before)", () => {
    const path = [q("b1", 1, ["A"], [0.5, 0.5]), q("b2", 2, ["C"], [0.5, 0.9]), q("b3", 3, ["E"], [0.5, 0.5])];
    const { target, why } = exploreTarget([two(path)], 3, { where: true });
    expect(target).toMatchObject({ board: "b1" });
    expect(why).toMatch(/; passed over T2, whose untried lines all die more often in the rollout/);
  });

  it("ties: a point not lost first (SL_RETRY_EXPLORE_ORDER), then the latest turn", () => {
    // No HP numbers: every weight 0.
    const flat: ExploreRow = { attempt: 2, turns: 4, result: "predicted_death", explore: { points: [q("b1", 1, ["A"], [0.2, 0.2]), q("b2", 2, ["C"], [1, 1]), q("b3", 3, ["E"], [1, 1])], target: null } };
    expect(exploreTarget([flat], 3, { where: true }).target).toMatchObject({ board: "b3" });
    expect(exploreTarget([flat], 3, { where: true, aliveFirst: true }).target).toMatchObject({ board: "b1" });
  });

  it("a deviation whose turn ended as a failed one (`whole`) is no use of its turn", () => {
    const path = [q("b1", 1, ["A", "B"]), q("b2", 2, ["C", "D"])];
    const rows = [two(path)];
    const first = exploreTarget(rows, 3, { where: true, whole: true }).target!;
    expect(first).toMatchObject({ board: "b2" });
    expect(exploreTarget([...rows, deviated(3, path, first, false)], 4, { where: true, whole: true }).target).toMatchObject({ board: "b2", where: { turnRound: 0 } });
    expect(exploreTarget([...rows, deviated(3, path, first, true)], 4, { where: true, whole: true }).target).toMatchObject({ board: "b1" });
  });
});

// ---------------------------------------------------------------- the controller

describe("the controller with SL_RETRY_EXPLORE_WHERE", () => {
  /** GQ5H's attempts 1-2 as this test fight's (the scenario's run, F17, the Test Subject). */
  const logged = GQ5H.filter((row) => row.attempt <= 2).map((row) => ({ ...row, run_id: "TESTRUN123", floor: 17, encounter: "TEST_SUBJECT" }));
  const config = (overrides: Partial<SlConfig>): SlConfig => ({
    enabled: true, bossRetries: 5, eliteRetries: 3, act3LowHp: true, act3LowHpPct: 40, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw: true, reloadEarly: true,
    retryKnownInserts: true, retryKnownTop: true, retryExplore: true, retryExploreB2: true, retryExploreBossPotions: true, retryExploreOrder: true, retryExploreReplay: true, retryExploreCanon: true, retryExploreTurn: true,
    retryExploreWhole: true, retryExploreWhere: true, retryExplorePotion: false, retryKnownPicks: true, log: null, stepTimeoutMs: 5_000, ...overrides,
  });
  function attempt3(overrides: Partial<SlConfig> = {}) {
    const notes: string[] = [];
    const log = { path: null, write: () => undefined, readRun: (runId: string) => logged.filter((row) => row.run_id === runId) };
    const sl = new SlController({ config: config(overrides), knowledge: testKnowledge, client: {} as never, note: (m) => notes.push(m), elites: { source: "test", date: "test", elites: [] }, log });
    sl.observe(state(bossBoard({ turn: 1, hp: 51, playable: true, lethal: false })), { journal: new RunJournal(), screenMemory: createScreenMemory() });
    return { sl, notes };
  }

  it("attempt 3 aims where the HP went (T4), says why, and the run config has the switch", () => {
    const { sl, notes } = attempt3();
    expect(sl.describe()).toMatchObject({ retry_explore_where: true });
    expect(notes.find((note) => note.startsWith("SL: attempt 3 deviates"))).toMatch(/^SL: attempt 3 deviates at T4, the 6th latest question before attempt 2's death on T7: not .* again there; \d+ turns? through it not again \(9 lines shown there never played on that board; where the failed attempts lost their HP: T4 weighs 31\.3 /);
  });

  it("off (or SL_RETRY_EXPLORE off): as before, T1", () => {
    const { sl, notes } = attempt3({ retryExploreWhere: false });
    expect(sl.describe()).toMatchObject({ retry_explore_where: false });
    expect(notes.find((note) => note.startsWith("SL: attempt 3 deviates"))).toMatch(/^SL: attempt 3 deviates at T1, the 10th latest question before attempt 2's death on T7: /);
    expect(notes.join("\n")).not.toMatch(/where the failed attempts lost/);
    expect(attempt3({ retryExplore: false }).sl.describe()).toMatchObject({ retry_explore: false, retry_explore_where: false });
  });
});
