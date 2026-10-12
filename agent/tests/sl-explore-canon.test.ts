/**
 * SL_RETRY_EXPLORE_CANON and SL_RETRY_EXPLORE_TURN (docs/sl.md §11.7, src/sl/explore.ts), the A9 runs 10-12 postmortem:
 *
 * - The turn's plays as one key (turnCanon over playKey): the same cards in another order are the same turn, the same cards
 *   on another enemy another; potions count, with their targets.
 * - CANON: attempt 1 counts as tried. UK7R9A0NMCXL F33 attempt 5 T1 (logged): Jev's Hemokinesis -> Crusher was attempt 1's
 *   play there (the row without `explore`, rebuilt from its summary; and as a new attempt-1 record would have it), so it
 *   gives way to Hemokinesis -> Rocket (the same card on the other enemy: untried); 08ec8f9 played it as answered.
 * - TURN: UK7R F33 attempt 4 T2 (logged): the replacement opened with Shrug It Off, which drew; on the re-plan Jev answered
 *   Defend, Defend, attempt 2's turn in another order. Kept off it now: the turn's plays differ from the failed one's.
 *   Code's own line too (JSA5K8YZ9RXV F48 T1, logged: Demon Form "dominates every other line"): it becomes Jev's question.
 * - The controller: attempt 1 is recorded (each action's board and play), the deviation point's `tried` has its turn, a
 *   restarted process reads it back, the deviation's turn carries `avoid` (and only that turn), the row says whether the
 *   turn differed.
 * - Both off: the planner's decisions on these boards are 08ec8f9's (digests captured there with
 *   tests/sl-explore-canon-views.ts), and the controller records and tells the planner nothing new.
 * Nothing under logs/ or .cache is read, nothing outside a temp directory is written.
 */
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "..", "knowledge");
/** Paths under logs/ or .cache touched in any way: must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(HERE, "sl-explore-canon-data", "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
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
const { potionCostOptions } = await import("../src/reflex/potion-cost.js");
potionCostOptions.enabled = true;
const { boardOf, envOf, frozen, offViews, ON, optionsOf, pick, playsOf } = await import("./sl-explore-canon-views.js");
const { planCombatTurn, slPointOf } = await import("../src/reflex/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/reflex/rollout-live.js");
const { potionMcOptions } = await import("../src/reflex/potion-mc.js");
const { exploreReplacement, exploreTarget, exploreTried, legacyTried, playKey, slBoardKey, triedHas, turnCanon } = await import("../src/sl/explore.js");
const { SlController } = await import("../src/sl/controller.js");
const { RunJournal } = await import("../src/memory/run-journal.js");
const { createScreenMemory } = await import("../src/memory/types.js");
const { parseGameState } = await import("../src/hand/mod/schema.js");
const { buildRunBrief } = await import("../src/memory/run-brief.js");
const { loadConfig } = await import("../src/core/config.js");
const { testKnowledge } = await import("./scenarios.js");
const { bossBoard, menuBoard } = await import("./sl-support.js");
type AskDecision = import("../src/memory/types.js").AskDecision;
type DecisionEnv = import("../src/memory/types.js").DecisionEnv;
type SlEnv = import("../src/memory/types.js").SlEnv;
type SlConfig = import("../src/core/config.js").SlConfig;
type SlAttemptRow = import("../src/sl/attempts.js").SlAttemptRow;
type SlPoint = import("../src/sl/explore.js").SlPoint;
type ExploreRow = import("../src/sl/explore.js").ExploreRow;
type GameState = import("../src/hand/mod/schema.js").GameState;
type Raw = Record<string, unknown>;

const config = loadConfig({} as NodeJS.ProcessEnv);
const dirs: string[] = [];
afterEach(() => {
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------- the turn's plays as one key

describe("turnCanon / playKey: the turn's plays, whatever their order", () => {
  it("the same plays in another order are one turn; the same card on another enemy, or upgraded, is another play", () => {
    const defend = playKey({ card: "DEFEND_IRONCLAD", upgraded: false }, null);
    const shrug = playKey({ card: "SHRUG_IT_OFF", upgraded: false }, null);
    // UK7R F33 attempt 2 T2 against attempt 4's: Defend, Defend, Shrug It Off / Shrug It Off, Defend, Defend.
    expect(turnCanon([defend, defend, shrug])).toBe(turnCanon([shrug, defend, defend]));
    expect(turnCanon([defend, defend, shrug])).toBe("DEFEND_IRONCLAD, DEFEND_IRONCLAD, SHRUG_IT_OFF");
    // A multiset: two Defends are not one.
    expect(turnCanon([defend, shrug])).not.toBe(turnCanon([defend, defend, shrug]));
    const crusher = playKey({ card: "HEMOKINESIS", upgraded: false }, "碾碎爪");
    const rocket = playKey({ card: "HEMOKINESIS", upgraded: false }, "火箭");
    expect(crusher).toBe("HEMOKINESIS>碾碎爪");
    expect(turnCanon([crusher])).not.toBe(turnCanon([rocket]));
    expect(playKey({ card: "TWIN_STRIKE", upgraded: true }, "碾碎爪")).not.toBe(playKey({ card: "TWIN_STRIKE", upgraded: false }, "碾碎爪"));
    // Potions count, with their target.
    expect(playKey({ potion: "WEAK_POTION" }, "碾碎爪")).toBe("potion:WEAK_POTION>碾碎爪");
    expect(turnCanon([playKey({ potion: "WEAK_POTION" }, "碾碎爪")])).not.toBe(turnCanon([playKey({ potion: "WEAK_POTION" }, "火箭")]));
    expect(turnCanon([])).toBe("nothing");
  });

  it("triedHas: a line is tried by its turn's plays (exact) or as a rebuilt summary has them (loose)", () => {
    const tried = { canon: ["A, B"], loose: ["x -> y"] };
    expect(triedHas(tried, { text: "B, A", canon: "A, B" })).toBe(true);
    expect(triedHas(tried, { text: "A, C", canon: "A, C", loose: "x -> y" })).toBe(true);
    expect(triedHas(tried, { text: "A, C", canon: "A, C", loose: "x -> z" })).toBe(false);
    expect(triedHas(null, { text: "A", canon: "A, B" })).toBe(false);
  });
});

// ---------------------------------------------------------------- tried: the records, attempt 1, the rows from before

/** A question point with each line's turn (canon), on a board. */
const q = (board: string, turn: number, line: string, alternatives: string[], canon: Record<string, string>): SlPoint => ({ board, turn, kind: "question", label: "combat/plan-choice", line, alternatives, canon });
const row = (attempt: number, points: SlPoint[], turns: { turn: number; plays: string[]; boards: { board: string; at: number }[] }[], extra: Partial<NonNullable<ExploreRow["explore"]>> = {}): ExploreRow => ({
  attempt,
  turns: 3,
  result: "predicted_death",
  explore: { points, target: null, turns, ...extra },
});

describe("exploreTarget with SL_RETRY_EXPLORE_CANON: tried by the turn's plays, attempt 1 counted", () => {
  // Attempt 2's path: T1 (board b1) a question with three lines, T2 (b2) one with two. Each line's turn as planned.
  const path = [
    q("b1", 1, "Strike, Defend", ["Defend, Strike", "Bash"], { "Strike, Defend": "DEFEND, STRIKE", "Defend, Strike": "DEFEND, STRIKE", Bash: "BASH" }),
    q("b2", 2, "Defend", ["Strike"], { Defend: "DEFEND", Strike: "STRIKE" }),
  ];
  const two = row(2, path, [
    { turn: 1, plays: ["STRIKE", "DEFEND"], boards: [{ board: "b1", at: 0 }, { board: "b1x", at: 2 }] },
    { turn: 2, plays: ["DEFEND"], boards: [{ board: "b2", at: 0 }] },
  ]);

  it("the same plays in another order are not an untried line (off: by text, they were)", () => {
    // T2's other line was played by attempt 1 (its record): with CANON every line of T2 is tried, T1's Bash is left.
    const one = row(1, [], [{ turn: 1, plays: ["STRIKE", "DEFEND"], boards: [{ board: "b1", at: 0 }] }, { turn: 2, plays: ["STRIKE"], boards: [{ board: "b2", at: 0 }] }]);
    const canon = exploreTarget([one, two], 3, { canon: true });
    expect(canon.target).toMatchObject({ board: "b1", turn: 1, attempts: [1, 2] });
    expect(canon.why).toBe("1 line shown there never played on that board");
    expect(canon.target!.tried).toEqual({ canon: ["DEFEND, STRIKE"], loose: [] });
    // Off: attempt 1 does not count and lines are their text: T2's Strike is untried, and T1 has two untried lines.
    const off = exploreTarget([one, two], 3);
    expect(off.target).toMatchObject({ board: "b2", attempts: [2] });
    expect(off.target).not.toHaveProperty("tried");
    // SL_RETRY_EXPLORE_TURN alone: the point as before, its `tried` from the 2nd on.
    expect(exploreTarget([one, two], 3, { tried: true }).target).toMatchObject({ board: "b2", attempts: [2], tried: { canon: ["DEFEND"], loose: [] } });
  });

  it("exploreTried: the turns through a board (the record's every board, each point's planned line)", () => {
    const one = row(1, [], [{ turn: 1, plays: ["BASH"], boards: [{ board: "b1", at: 0 }] }]);
    expect(exploreTried([two, one], 3, "b1", { canon: true })).toEqual({ tried: { canon: ["BASH", "DEFEND, STRIKE"], loose: [] }, attempts: [1, 2] });
    // The board after T1's two plays (an end of turn there): the whole turn's plays.
    expect(exploreTried([one, two], 3, "b1x", { canon: true })).toEqual({ tried: { canon: ["DEFEND, STRIKE"], loose: [] }, attempts: [2] });
    expect(exploreTried([one, two], 3, "b1", { canon: false })).toEqual({ tried: { canon: ["DEFEND, STRIKE"], loose: [] }, attempts: [2] });
  });
});

describe("rows from before the record (no turns): rebuilt from their summary where their history is the reference's", () => {
  it("UK7R9A0NMCXL F33 (logged rows): attempt 1's T1 and T2 come in on attempt 2's boards; a turn played otherwise ends it", () => {
    const fx = boardOf("uk7r-a5-t1-hemokinesis");
    const rows = fx.rows;
    const reference = rows.find((r) => r.attempt === 2)!;
    const one = rows.find((r) => r.attempt === 1)!;
    expect(one.explore).toBeUndefined();
    const got = legacyTried(one, reference);
    // T1: attempt 1 played Hemokinesis after the same four plays: it was on all three of attempt 2's T1 boards (the
    // reference has no turn record either: its boards' places from its points' lines and its summary, 0, 3 and 4 plays in);
    // its T1 differs from attempt 2's (one more card), so its T2 is another board: nothing after.
    const t1 = reference.explore!.points.filter((point) => point.turn === 1).map((point) => point.board);
    expect(t1).toHaveLength(3);
    expect(got.map((entry) => entry.board)).toEqual(t1);
    expect(new Set(got.map((entry) => entry.loose)).size).toBe(1);
    expect(got[0]!.loose).toBe(turnCanon(["potion 缚魂药水", "欺凌 -> 碾碎爪", "potion 虚弱药水", "双重打击+ -> 碾碎爪", "御血术 -> 碾碎爪"]));
    // A row from before is its own reference: each of its turns on every board of it.
    expect(legacyTried(reference, reference).map((entry) => entry.board)).toEqual(reference.explore!.points.map((point) => point.board));
    // A play logged without its card: unknown there, not untried.
    const unread: ExploreRow = { ...one, summary: { turns: one.summary.turns.map((turn, i) => (i === 0 ? { ...turn, plays: [...turn.plays.slice(0, 4), "card 0 -> 碾碎爪"] } : turn)) } };
    expect(legacyTried(unread, reference).map((entry) => entry.loose)).toEqual([null, null, null]);
  });

  it("exploreReplacement: a pick an unreadable attempt may have played gives way; one known untried is played", () => {
    const line = (text: string, canon: string) => ({ plan: text, text, dies: false, wins: false, potions: [], canon });
    const choose = (tried: { canon: string[]; loose: string[]; unknown?: number[] }, pickText: string, pickCanon: string, avoid = false) =>
      exploreReplacement({
        pick: { plan: pickText, text: pickText, potions: [], wins: false, canon: pickCanon },
        shown: [line("A, B", "A, B"), line("B, A", "A, B"), line("C", "C"), line("D", "D")],
        excluded: [],
        deathShare: () => null,
        rank: (plans) => [...plans].sort()[0] ?? null,
        tried,
        avoid,
      });
    // The pick's turn tried in another order: B, A (the same turn) is tried too; C ranks first among the rest.
    expect(choose({ canon: ["A, B"], loose: [] }, "A, B", "A, B").replacement?.text).toBe("C");
    expect(choose({ canon: ["A, B"], loose: [] }, "C", "C")).toMatchObject({ replacement: null, reason: "the pick was not played on this board before: played as answered" });
    expect(choose({ canon: ["A, B"], loose: [] }, "C", "C", true)).toMatchObject({ replacement: null, reason: expect.stringMatching(/does not end the turn as a failed attempt's did/) });
    const unknown = choose({ canon: ["A, B"], loose: [], unknown: [1] }, "C", "C");
    expect(unknown.replacement?.text).toBe("D");
    expect(unknown.reason).toMatch(/attempt 1 may have played the pick here/);
    // A winning pick is never changed.
    expect(exploreReplacement({ pick: { plan: "A, B", text: "A, B", potions: [], wins: true, canon: "A, B" }, shown: [], excluded: [], deathShare: () => null, rank: () => null, tried: { canon: ["A, B"], loose: [] } }).replacement).toBeNull();
  });
});

// ---------------------------------------------------------------- the planner on logged boards

/**
 * 08ec8f9's views of the boards (tests/sl-explore-canon-views.ts offViews, captured on 08ec8f9).
 * 2026-10-04 (v4-asc-facts, Roy: experience by ascension): the UK7R boards (A8 and up) whose question carries a counted record
 * (a Jev hint's or a lesson's {CRAB_KILLS_EN}, {QUEEN_AMALGAM_EN}, {CRAB_KILL_ORDER}, …) re-pinned: those records now give A8's fights
 * and A9's apart (boss-clock recordBand). With the band switched off (RECORD_BAND_FROM above every ascension) every
 * earlier digest held: nothing else in the decision moved.
 */
const GOLDEN_08EC8F9: Record<string, string> = {
  "uk7r-a5-t1-hemokinesis:record": "4a5ae97675fc27d2841ced71207305dc",
  "uk7r-a5-t1-hemokinesis:deviate": "e64cec8dbc1ed68c4d77aee21ee6ea3e",
  "uk7r-a4-t2-deviation:record": "d9928a4bc4473e4949b0cbf454eac06d",
  "uk7r-a4-t2-deviation:deviate": "341913fe0e16275e801933e5ca499db1",
  "uk7r-a4-t2-replan:record": "d50485aa02106077db2dc2a4b1c2b88e",
  "uk7r-a4-t2-replan:deviate": "ba18cb02ab3e3a9925dabfcd10f151fc",
  "jsa5-f48-t1-demon-form:record": "5a1085d031a0c1dd3bf7e819dec0d5c4",
};

describe("the planner, both switches off: 08ec8f9's decisions on the logged boards", () => {
  it("every answer's resolution and point, recording and with a deviation, as 08ec8f9", () => {
    expect(offViews()).toEqual(GOLDEN_08EC8F9);
    expect([...touched]).toEqual([]);
  }, 300_000);
});

/** env.sl.explore on a logged board with the plays already made that turn (the switches on). */
const withPlayed = (name: string, explore: SlEnv["explore"] = {}): DecisionEnv => envOf(name, { explore: { ...ON, played: boardOf(name).played, ...explore } });

describe("SL_RETRY_EXPLORE_CANON on the planner: attempt 1's play counts as tried (UK7R9A0NMCXL F33 attempt 5 T1)", () => {
  it("Hemokinesis -> Crusher, attempt 1's, gives way to Hemokinesis -> Rocket (the same card on the other enemy: untried)", () => {
    frozen();
    const fx = boardOf("uk7r-a5-t1-hemokinesis");
    const plain = planCombatTurn(withPlayed("uk7r-a5-t1-hemokinesis")) as AskDecision;
    expect(plain.kind).toBe("ask");
    const options = optionsOf(plain);
    const byText = (text: string) => Object.keys(options).find((key) => playsOf(options[key]!) === text)!;
    expect(Object.values(options).map(playsOf).sort()).toEqual(["end turn", "御血术 -> 火箭", "御血术 -> 碾碎爪"]);
    // The point records each line's turn: the four plays already made and the line's.
    const point = slPointOf(plain, plain.resolve(pick(byText("御血术 -> 碾碎爪"))))!;
    expect(point.canon).toEqual({
      "御血术 -> 碾碎爪": turnCanon([...fx.played.canon, "HEMOKINESIS>碾碎爪"]),
      "end turn": turnCanon(fx.played.canon),
      "御血术 -> 火箭": turnCanon([...fx.played.canon, "HEMOKINESIS>火箭"]),
    });
    // What the live controller's target had there (attempts 2-4 ended the turn), and with CANON attempt 1's turn, rebuilt
    // from its row (no record then).
    const { tried, attempts } = exploreTried(fx.rows, 5, slBoardKey(parseGameState(fx.state)), { canon: true });
    expect(attempts).toEqual([1, 2, 3, 4]);
    expect(tried.loose).toContain(turnCanon([...fx.played.text, "御血术 -> 碾碎爪"]));
    const deviate = { point: "T1, the 3rd latest question before attempt 2's death on T5", excluded: ["end turn"], attempts };
    // 08ec8f9: not played there by attempts 2-4: played as answered (attempt 5 then replayed attempt 1).
    const before = planCombatTurn(envOf("uk7r-a5-t1-hemokinesis", { explore: { ...ON, deviate: { ...deviate, attempts: [2, 3, 4] } } })) as AskDecision;
    expect((before.resolve(pick(byText("御血术 -> 碾碎爪"))).log as Raw)["sl_explore"]).toMatchObject({ replacement: null, reason: "the pick was not played on this board before: played as answered" });
    for (const record of [tried, { canon: [turnCanon([...fx.played.canon, "HEMOKINESIS>碾碎爪"])], loose: [] }]) {
      const ask = planCombatTurn(withPlayed("uk7r-a5-t1-hemokinesis", { deviate: { ...deviate, tried: record } })) as AskDecision;
      const resolved = ask.resolve(pick(byText("御血术 -> 碾碎爪")));
      expect((resolved.log as Raw)["sl_explore"]).toMatchObject({ original: "御血术 -> 碾碎爪", replacement: "御血术 -> 火箭", played_in: attempts, turn_instead: turnCanon([...fx.played.canon, "HEMOKINESIS>火箭"]) });
      expect(resolved.intent).toEqual(plain.resolve(pick(byText("御血术 -> 火箭"))).intent);
      expect(slPointOf(ask, resolved)).toMatchObject({ line: "御血术 -> 火箭", explored: true });
      // Jev's Hemokinesis -> Rocket itself: untried, played as answered.
      expect((ask.resolve(pick(byText("御血术 -> 火箭"))).log as Raw)["sl_explore"]).toMatchObject({ replacement: null, reason: expect.stringMatching(/played as answered/) });
    }
    expect([...touched]).toEqual([]);
  }, 300_000);
});

describe("SL_RETRY_EXPLORE_TURN on the planner: the deviation holds for its turn (UK7R9A0NMCXL F33 attempt 4 T2)", () => {
  it("on the deviation point the replacement's turn is no failed attempt's; it opens with Shrug It Off, which draws", () => {
    frozen();
    const fx = boardOf("uk7r-a4-t2-deviation");
    const board = slBoardKey(parseGameState(fx.state));
    const { tried, attempts } = exploreTried(fx.rows, 4, board, { canon: true });
    // Attempts 2 and 3 played Defend, Defend, Shrug It Off here (rebuilt from their summaries); attempt 1's T2 was another
    // board (its T1 played Hemokinesis too: 49 HP and the Crusher at 151 on T2, not 51 and 175).
    expect(attempts).toEqual([2, 3]);
    expect(tried.loose).toEqual([turnCanon(["防御", "防御", "耸肩无视"])]);
    const ask = planCombatTurn(withPlayed("uk7r-a4-t2-deviation", { deviate: { point: "T2", excluded: ["防御, 防御, 耸肩无视"], attempts, tried } })) as AskDecision;
    const options = optionsOf(ask);
    const failed = Object.keys(options).find((key) => playsOf(options[key]!) === "防御, 防御, 耸肩无视")!;
    const resolved = ask.resolve(pick(failed));
    const log = (resolved.log as Raw)["sl_explore"] as Raw;
    expect(log).toMatchObject({ original: "防御, 防御, 耸肩无视", turn: "DEFEND_IRONCLAD, DEFEND_IRONCLAD, SHRUG_IT_OFF" });
    const replacement = String(log["replacement"]);
    expect(replacement).not.toBe("防御, 防御, 耸肩无视");
    expect(log["turn_instead"]).not.toBe(log["turn"]);
    expect(triedHas(tried, { text: replacement, canon: String(log["turn_instead"]), loose: turnCanon(replacement.split(", ")) })).toBe(false);
  }, 300_000);

  it("the re-plan after the draw: Jev's Defend, Defend would end the turn as attempts 2-3's; it gives way, the turn differs", () => {
    frozen();
    const fx = boardOf("uk7r-a4-t2-replan");
    expect(fx.played).toEqual({ canon: ["SHRUG_IT_OFF"], text: ["耸肩无视"] });
    const deviationBoard = slBoardKey(parseGameState(boardOf("uk7r-a4-t2-deviation").state));
    const { tried, attempts } = exploreTried(fx.rows, 4, deviationBoard, { canon: true });
    const plain = planCombatTurn(withPlayed("uk7r-a4-t2-replan")) as AskDecision;
    const options = optionsOf(plain);
    const defends = Object.keys(options).find((key) => playsOf(options[key]!) === "防御, 防御")!;
    // As logged: Jev picked Defend, Defend (plan2 of 3).
    expect(defends).toBe("plan2");
    const point = "T2, the 2nd latest question before attempt 2's death on T5";
    for (const record of [tried, { canon: [turnCanon(["DEFEND_IRONCLAD", "DEFEND_IRONCLAD", "SHRUG_IT_OFF"])], loose: [] }]) {
      const ask = planCombatTurn(withPlayed("uk7r-a4-t2-replan", { avoid: { point, tried: record, attempts } })) as AskDecision;
      // The question is the same: the turn is kept after the answer.
      expect(JSON.stringify(ask.questions)).toBe(JSON.stringify(plain.questions));
      const resolved = ask.resolve(pick(defends));
      const log = ((resolved.log as Raw)["sl_explore"] as Raw)["avoid"] as Raw;
      expect(log).toMatchObject({ point, original: "防御, 防御", played_in: attempts, turn: "DEFEND_IRONCLAD, DEFEND_IRONCLAD, SHRUG_IT_OFF" });
      expect(["痛击 -> 火箭", "痛击 -> 碾碎爪"]).toContain(log["replacement"]);
      expect(log["turn_instead"]).toMatch(/^BASH>.*, SHRUG_IT_OFF$/);
      const key = Object.keys(options).find((k) => playsOf(options[k]!) === log["replacement"])!;
      expect(resolved.intent).toEqual(plain.resolve(pick(key)).intent);
      expect(resolved.rationale).toMatch(new RegExp(`SL explore \\(the deviation's turn, T2\\): playing 痛击 -> .* instead of 防御, 防御, which ends the turn with the plays attempts ${attempts.join(", ")} had through the deviation point`));
      expect(slPointOf(ask, resolved)).toMatchObject({ line: log["replacement"], explored: true, avoided: { original: "防御, 防御" } });
      // A line ending the turn otherwise: played as answered, logged.
      const other = ask.resolve(pick(key));
      expect(other.intent).toEqual(plain.resolve(pick(key)).intent);
      expect((((other.log as Raw)["sl_explore"] as Raw)["avoid"] as Raw)["replacement"]).toBeNull();
    }
    // Without `avoid` (off, or another turn): as before.
    expect(plain.resolve(pick(defends)).intent).toEqual(planCombatTurn(envOf("uk7r-a4-t2-replan", { explore: { ...ON } }))!.kind === "ask" ? (planCombatTurn(envOf("uk7r-a4-t2-replan", { explore: { ...ON } })) as AskDecision).resolve(pick(defends)).intent : null);
    expect([...touched]).toEqual([]);
  }, 300_000);

  it("code's own line ending the turn as a failed attempt's becomes Jev's question (JSA5K8YZ9RXV F48 T1: Demon Form)", () => {
    frozen();
    const plain = planCombatTurn(withPlayed("jsa5-f48-t1-demon-form"))!;
    expect(plain).toMatchObject({ kind: "act", label: "combat/plan" });
    const line = slPointOf(plain, { intent: null, rationale: "", confidence: null, fallback: false })!;
    expect(line).toMatchObject({ kind: "code", line: "恶魔形态" });
    const turn = line.canon![line.line]!;
    expect(turn).toBe(turnCanon([...boardOf("jsa5-f48-t1-demon-form").played.canon, "DEMON_FORM"]));
    const avoid = { point: "T1", tried: { canon: [turn], loose: [] }, attempts: [2] };
    const ask = planCombatTurn(withPlayed("jsa5-f48-t1-demon-form", { avoid })) as AskDecision;
    expect(ask.kind).toBe("ask");
    const options = optionsOf(ask);
    const demon = Object.keys(options).find((key) => playsOf(options[key]!) === "恶魔形态")!;
    const resolved = ask.resolve(pick(demon));
    const log = ((resolved.log as Raw)["sl_explore"] as Raw)["avoid"] as Raw;
    expect(log).toMatchObject({ original: "恶魔形态", turn });
    expect(log["replacement"]).not.toBeNull();
    expect(log["turn_instead"]).not.toBe(turn);
    // A turn that is no failed attempt's: code's own line, as before.
    expect(planCombatTurn(withPlayed("jsa5-f48-t1-demon-form", { avoid: { ...avoid, tried: { canon: ["nothing"], loose: [] } } }))).toMatchObject({ kind: "act", label: "combat/plan", intent: (plain as { intent: unknown }).intent });
    expect([...touched]).toEqual([]);
  }, 300_000);
});

// ---------------------------------------------------------------- the controller

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

/** The scripted fight (tests/sl-explore.test.ts): T1 at 60 HP, T2 at 45 and again after a Defend, T3 a certain death. */
const Q1 = (): Raw => bossBoard({ turn: 1, hp: 60, playable: true, lethal: false });
const Q2 = (): Raw => bossBoard({ turn: 2, hp: 45, playable: true, lethal: false });
/** T2 again after a play (a re-plan: another board of the same turn, 5 block up; the same hand, so that it is a question). */
function Q2b(): Raw {
  const raw = Q2();
  ((raw["combat"] as Raw)["player"] as Raw)["block"] = 5;
  return raw;
}
const DEATH = (): Raw => bossBoard({ turn: 3, hp: 10 });

function slConfig(log: string, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 3, eliteRetries: 1, act3LowHp: true, act3LowHpPct: 40, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw: true, reloadEarly: true, retryKnownInserts: true, retryKnownTop: true, retryExplore: true, retryExploreB2: true, retryExploreBossPotions: true, retryExploreOrder: true, retryExploreReplay: true, retryExploreCanon: true, retryExploreTurn: true, retryExploreWhole: true, retryExploreWhere: false, retryExplorePotion: false, retryKnownPicks: true, log, stepTimeoutMs: 5_000, ...overrides };
}
function tempLog(): string {
  const dir = mkdtempSync(join(tmpdir(), "sl-canon-"));
  dirs.push(dir);
  return join(dir, "sl-attempts.jsonl");
}
const logRows = (path: string): SlAttemptRow[] => readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line) as SlAttemptRow);

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
  line: string;
  intent: unknown;
  explore: unknown;
  env: SlEnv | undefined;
}

/** One attempt as the loop plays it: each board observed, planned, Jev picks plan1 (or `keys`), dispatched; then the death. */
async function playAttempt(t: ReturnType<typeof controller>, boards: Raw[], last = false, keys: string[] = []): Promise<Played[]> {
  const played: Played[] = [];
  for (const [i, raw] of boards.entries()) {
    const state: GameState = parseGameState(raw);
    t.sl.observe(state, t.memory);
    const env = t.sl.envFor(state);
    const decision = planCombatTurn(scenarioEnv(raw, env)) as AskDecision;
    expect(decision.kind).toBe("ask");
    const key = keys[i] ?? "plan1";
    const resolved = decision.resolve(pick(key));
    t.sl.noteAction(state, resolved.intent!);
    t.sl.notePoint(state, decision, resolved);
    played.push({ turn: state.turn, line: playsOf(optionsOf(decision)[key]!), intent: resolved.intent, explore: (resolved.log as Raw | undefined)?.["sl_explore"] ?? null, env });
  }
  const death = parseGameState(DEATH());
  t.sl.observe(death, t.memory);
  const outcome = await t.sl.beforeEndTurn(death, { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
  expect(outcome).toMatchObject(last ? { handled: false } : { handled: true, ok: true });
  return played;
}

describe("the controller: attempt 1 recorded, tried by the turn's plays, the deviation's turn kept", () => {
  it("attempt 1's row has its turns (each action's board and play); attempt 3's point has the turns through it, attempt 1's among them", async () => {
    const log = tempLog();
    const t = controller(log);
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    const rows1 = logRows(log);
    // Attempt 1: no points (the planner is not asked on attempt 1: no env.sl), its turns from the actions.
    expect(rows1[0]!.explore).toMatchObject({ points: [], target: null });
    const turns = rows1[0]!.explore!.turns!;
    expect(turns.map((turn) => turn.turn)).toEqual([1, 2]);
    expect(turns[1]!.boards.map((entry) => entry.board)).toEqual([slBoardKey(parseGameState(Q2())), slBoardKey(parseGameState(Q2b()))]);
    expect(turns[1]!.boards.map((entry) => entry.at)).toEqual([0, 1]);
    expect(turns[1]!.plays).toHaveLength(2);
    expect(rows1[0]!.summary.turns[1]!.plays).toHaveLength(2);
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    const rows2 = logRows(log);
    // Attempt 2: the points carry each line's turn (the plays already made counted in).
    const points = rows2[1]!.explore!.points;
    expect(points.map((point) => point.turn)).toEqual([1, 2, 2]);
    const turns2 = rows2[1]!.explore!.turns!;
    expect(points[2]!.canon![points[2]!.line]!.split(", ")).toContain(turns2[1]!.plays[0]);
    expect(Object.keys(points[2]!.canon!).sort()).toEqual([points[2]!.line, ...points[2]!.alternatives!].sort());
    // Attempt 3 deviates at the latest question (T2 after the Defend); its target has the turns through that board.
    const a3 = await playAttempt(t, [Q1(), Q2(), Q2b()]);
    const row3 = logRows(log)[2]!;
    expect(row3.explore!.target).toMatchObject({ turn: 2, back: 1, attempts: [1, 2] });
    expect(row3.explore!.target!.tried!.canon).toContain(turnCanon(turns[1]!.plays));
    expect(t.notes.join("\n")).toMatch(/SL: attempt 3 deviates at T2, the latest question .*turns? through it not again/);
    // The deviation's turn: what it played and whether it differs from every failed attempt's turn through the board.
    expect(row3.explore!.deviation).toMatchObject({ reached: true, turn: 2, differs: true });
    expect(row3.explore!.deviation!.plays).toBe(turnCanon(row3.explore!.turns!.find((turn) => turn.turn === 2)!.plays));
    expect(a3[2]!.explore).toMatchObject({ played_in: [1, 2] });
  }, 300_000);

  it("a restarted process deviates at the same point with the same turns; the deviation's turn carries `avoid` on its later boards only", async () => {
    const log = tempLog();
    const t = controller(log);
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    // Attempt 4 deviates at T2's first board (one question back), with the turns attempts 1-3 had through it.
    const q2 = parseGameState(Q2());
    const live = t.sl.envFor(q2)!.explore!;
    expect(live).toMatchObject({ deviate: { point: expect.stringMatching(/^T2, the 2nd latest question/), attempts: [1, 2, 3], tried: { canon: expect.any(Array), loose: [] } } });
    expect(live.deviate!.tried!.canon.length).toBeGreaterThan(0);
    // The process restarts there: the new controller reads the rows (attempt 1's turns among them) and has the same.
    const again = controller(log);
    again.sl.observe(parseGameState(Q1()), again.memory);
    expect(again.sl.decisionFields()).toEqual({ sl_attempt: 4, sl_reloads: 3 });
    expect(again.notes.join("\n")).toMatch(/SL: attempt 4 deviates at T2, the 2nd latest question/);
    again.sl.observe(q2, again.memory);
    expect(again.sl.envFor(q2)!.explore).toEqual(live);
    // Attempt 4 played: T2 after its point is its turn (avoid, with the plays made so far), T1 before it is not.
    const a4 = await playAttempt(t, [Q1(), Q2(), Q2b()], true);
    expect(a4[1]!.env!.explore).toMatchObject({ deviate: { point: live.deviate!.point } });
    expect(a4[2]!.env!.explore).toMatchObject({ avoid: { point: live.deviate!.point, attempts: [1, 2, 3], tried: live.deviate!.tried }, played: { canon: [expect.any(String)], text: [expect.any(String)] } });
    expect(a4[0]!.env!.explore).not.toHaveProperty("avoid");
    expect(a4[2]!.explore).toMatchObject({ avoid: { point: live.deviate!.point } });
    // The next turn is not the deviation's: no avoid.
    const t3 = parseGameState(bossBoard({ turn: 3, hp: 30, playable: true, lethal: false }));
    t.sl.observe(t3, t.memory);
    expect(t.sl.envFor(t3)!.explore).not.toHaveProperty("avoid");
  }, 300_000);

  it("both off: attempt 1 unrecorded, no turn record, the target and env.sl.explore as 08ec8f9", async () => {
    const log = tempLog();
    const t = controller(log, { retryExploreCanon: false, retryExploreTurn: false });
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    const a3 = await playAttempt(t, [Q1(), Q2(), Q2b()]);
    const rows = logRows(log);
    expect(rows[0]).not.toHaveProperty("explore");
    expect(rows[1]!.explore).not.toHaveProperty("turns");
    expect(rows[1]!.explore!.points.every((point) => !("canon" in point))).toBe(true);
    expect(rows[2]!.explore!.target).not.toHaveProperty("tried");
    expect(rows[2]!.explore!.deviation).not.toHaveProperty("turn");
    expect(rows[2]!.explore!.target).toMatchObject({ attempts: [2] });
    expect(a3.every((p) => p.env?.explore === undefined || (!("played" in p.env.explore) && !("avoid" in p.env.explore)))).toBe(true);
    expect(t.sl.describe()).toMatchObject({ retry_explore_canon: false, retry_explore_turn: false });
    expect(controller(tempLog()).sl.describe()).toMatchObject({ retry_explore_canon: true, retry_explore_turn: true });
  }, 300_000);
});
