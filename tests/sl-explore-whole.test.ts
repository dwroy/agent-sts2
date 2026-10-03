/**
 * SL_RETRY_EXPLORE_WHOLE (docs/sl.md §11.8, src/sl/explore.ts), PW7Y9EWUW8SB F48 (Test Subject): the deviation's turn judged
 * by its whole plays.
 *
 * - Attempt 3 T1: Jev's Blood Wall, Pommel Strike+, Stomp was "not played on this board before" (attempts 1-2: Blood Wall,
 *   Rampage, Pommel Strike+, Stomp); Pommel Strike+ drew, and the re-plan (code's "only distinct line": Rampage, Stomp)
 *   ended the turn as attempts 1-2's. The avoid could not act: no other line was shown. Attempt 4 T2: the replacement opened
 *   with Battle Trance+, which drew, and code's "only distinct line" played attempts 2-3's whole turn again. Both rows:
 *   differs false.
 * - Now: a line that draws before its turn is over is judged by the plays it is sure to make (mayRepeat); the avoid reaches
 *   every surviving line (the re-plans above become Jev's question, the answer kept off the failed turns); where it cannot
 *   act the decision row and the attempt's deviation say so (avoid_failed); a wasted deviation is not a use of its point.
 * - Off (env.sl.explore without `whole`, the controller with the switch off): the planner's decisions on these boards are
 *   e0fa69b's (digests captured there with tests/sl-explore-whole-views.ts), the controller tells it nothing new.
 * Nothing under logs/ or .cache is read, nothing outside a temp directory is written.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
/** Paths under logs/ or .cache touched in any way: must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(HERE, "sl-explore-whole-data", "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
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
const { boardOf, envOf, fightRows, frozen, knowledge, offViews, ON, optionsOf, pick, playsOf, triedAt } = await import("./sl-explore-whole-views.js");
const { modelHandCard } = await import("../src/strategy/card-model.js");
const { planCombatTurn, slAvoidFailedOf, slPointOf, thiefTrace, turnKeys, turnOpen } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { canonWithin, exploreReplacement, exploreTarget, mayRepeat, triedHas, turnCanon } = await import("../src/sl/explore.js");
const { SlController } = await import("../src/sl/controller.js");
const { RunJournal } = await import("../src/project/run-journal.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { loadConfig } = await import("../src/config.js");
const { testKnowledge } = await import("./scenarios.js");
const { bossBoard, menuBoard } = await import("./sl-support.js");
type AskDecision = import("../src/project/types.js").AskDecision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;
type SlEnv = import("../src/project/types.js").SlEnv;
type SlConfig = import("../src/config.js").SlConfig;
type SlAttemptRow = import("../src/sl/attempts.js").SlAttemptRow;
type GameState = import("../src/mod/schema.js").GameState;
type Plan = import("../src/strategy/turn-solver.js").Plan;
type Raw = Record<string, unknown>;

const config = loadConfig({} as NodeJS.ProcessEnv);
const dirs: string[] = [];
afterEach(() => {
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
  thiefTrace.enabled = false;
  thiefTrace.last = null;
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const BW_RAMPAGE_PS_STOMP = "BLOOD_WALL, POMMEL_STRIKE+>实验体 #C42, RAMPAGE>实验体 #C42, STOMP";

// ---------------------------------------------------------------- the turn a line may end with

describe("canonWithin / mayRepeat: the plays a drawing line is sure to make, within a failed turn", () => {
  it("multisets: a part grows into the whole; two of a card are not one", () => {
    expect(canonWithin("BLOOD_WALL, POMMEL_STRIKE+>实验体 #C42", BW_RAMPAGE_PS_STOMP)).toBe(true);
    expect(canonWithin(BW_RAMPAGE_PS_STOMP, BW_RAMPAGE_PS_STOMP)).toBe(true);
    expect(canonWithin("nothing", "A")).toBe(true);
    expect(canonWithin("A, A", "A, B")).toBe(false);
    expect(canonWithin("A, B, C", "A, B")).toBe(false);
    // The same card on another enemy is another play.
    expect(canonWithin("HEMOKINESIS>火箭", "HEMOKINESIS>碾碎爪, STRIKE")).toBe(false);
  });

  it("only a line that draws before its turn is over; its sure plays within some failed turn", () => {
    const tried = { canon: [BW_RAMPAGE_PS_STOMP], loose: [] };
    // Attempt 3 T1: Blood Wall, Pommel Strike+ (draws), Stomp: sure only up to the draw.
    expect(mayRepeat(tried, { open: true, committed: "BLOOD_WALL, POMMEL_STRIKE+>实验体 #C42" })).toBe(true);
    // A line that does not draw ends the turn as planned (its own canon decides).
    expect(mayRepeat(tried, { open: false, committed: "BLOOD_WALL, POMMEL_STRIKE+>实验体 #C42" })).toBe(false);
    // Sure plays no failed turn has: whatever the draw brings, the turn differs (Bash is in none).
    expect(mayRepeat(tried, { open: true, committed: "BASH>实验体 #C42, POMMEL_STRIKE+>实验体 #C42" })).toBe(false);
    expect(mayRepeat(null, { open: true, committed: "BLOOD_WALL" })).toBe(false);
    expect(mayRepeat(tried, {})).toBe(false);
  });
});

describe("exploreReplacement with `whole`", () => {
  /** A line as the planner gives it: its turn (canon) and, with whole, whether it draws and its sure plays. */
  const line = (text: string, canon: string, extra: { open?: boolean; committed?: string; dies?: boolean } = {}) => ({ plan: text, text, dies: extra.dies ?? false, wins: false, potions: [], canon, ...(extra.open !== undefined ? { open: extra.open, committed: extra.committed ?? canon } : {}) });
  const tried = { canon: ["A, B, C"], loose: [] };
  // "A, B": A draws, so only A is sure (within A, B, C). "D": closed, untried. "A, E": A draws too. "F": dies this turn.
  const shown = [
    line("A, B", "A, B", { open: true, committed: "A" }),
    line("D", "D", { open: false }),
    line("A, E", "A, E", { open: true, committed: "A" }),
    line("F", "F", { open: false, dies: true }),
    line("A, B, C", "A, B, C", { open: false }),
  ];
  const choose = (pickText: string, opts: { whole?: boolean; avoid?: boolean; deaths?: Record<string, number> } = {}) => {
    const own = shown.find((entry) => entry.text === pickText)!;
    return exploreReplacement({
      pick: { plan: own.plan, text: own.text, potions: [], wins: false, canon: own.canon, ...(own.open !== undefined ? { open: own.open, committed: own.committed } : {}) },
      shown,
      excluded: [],
      deathShare: (plan) => opts.deaths?.[plan] ?? 0.5,
      // The question's order.
      rank: (plans) => plans[0] ?? null,
      tried,
      ...(opts.avoid ? { avoid: true } : {}),
      ...(opts.whole ? { whole: true } : {}),
    });
  };

  it("a pick whose sure plays are within a failed turn gives way to a not-worse line known to end otherwise", () => {
    const got = choose("A, B", { whole: true });
    expect(got.replacement?.text).toBe("D");
    expect(got.reason).toMatch(/^the pick's turn may end as a failed attempt's after its draw \(its plays up to the draw are within one\); the best untried line/);
    // Without `whole` (off): "not played on this board before", as before.
    expect(choose("A, B")).toEqual({ replacement: null, reason: "the pick was not played on this board before: played as answered", gate: null });
    // The same in the avoid (later in the turn).
    expect(choose("A, B", { whole: true, avoid: true }).replacement?.text).toBe("D");
  });

  it("kept (played as answered, the avoid after the draw then) when every such line is worse; never a line dying this turn", () => {
    const worse = choose("A, B", { whole: true, deaths: { "A, B": 0.25, D: 0.5, "A, E": 0.25 } });
    expect(worse.replacement).toBeNull();
    expect(worse.reason).toMatch(/none known to end it otherwise is not worse \(every such line dies more often in the rollout\): played as answered, the rest of the turn kept off the failed turns$/);
    // D dies more often; F dies this turn (never taken, even not worse by the rollout).
    expect(choose("A, B", { whole: true, deaths: { "A, B": 0.5, D: 0.75, F: 0 } }).replacement).toBeNull();
  });

  it("a tried pick's replacement prefers a line known to end otherwise, within the gate's pool", () => {
    // Off: the first untried by the ranking ("A, B": tried? no, its canon is not a failed turn) is taken.
    expect(choose("A, B, C").replacement?.text).toBe("A, B");
    const got = choose("A, B, C", { whole: true });
    expect(got.replacement?.text).toBe("D");
    expect(got.reason).toMatch(/; of them, one whose turn cannot end as a failed attempt's after a draw$/);
    // A winning pick is never changed.
    expect(exploreReplacement({ pick: { plan: "A, B, C", text: "A, B, C", potions: [], wins: true, canon: "A, B, C" }, shown, excluded: [], deathShare: () => null, rank: () => null, tried, whole: true }).replacement).toBeNull();
  });
});

// ---------------------------------------------------------------- the deviation point: a wasted deviation

describe("exploreTarget with `whole`: a deviation whose turn ended as a failed one is not a use of its point", () => {
  const rows = fightRows();
  it("PW7Y F48 (the live rows): attempts 3 and 4 deviated with differs false; the targets, and why", () => {
    expect(rows.map((row) => [row.attempt, row.explore?.deviation?.differs ?? null])).toEqual([[1, null], [2, null], [3, false], [4, false], [5, true], [6, true]]);
    const at = (attempt: number, whole: boolean) => exploreTarget(rows.filter((row) => row.attempt < attempt), attempt, { aliveFirst: true, canon: true, tried: true, ...(whole ? { whole: true } : {}) }).target!;
    // Attempt 5: as live (T1, its second round) off; with `whole` T1 too, but attempt 3's deviation there does not count.
    expect(at(5, false).point).toBe("T1, the 8th latest question before attempt 2's death on T6 (deviated at 1 time before: another untried line)");
    expect(at(5, true)).toMatchObject({ turn: 1, round: 0, point: "T1, the 8th latest question before attempt 2's death on T6 (attempt 3 deviated there but ended the turn as a failed attempt's: again, another line)" });
    // The line attempt 3 played there is tried now (by its text and its turn): the next one is another.
    expect(at(5, true).excluded).toContain("血墙, 剑柄打击+ -> 实验体 #C42, 踩踏");
    expect(at(5, true).tried!.canon).toContain("BLOOD_WALL, POMMEL_STRIKE+>实验体 #C42, STOMP");
    // Attempt 4: T2 either way (T1's untried lines all die more often now, as T2's: the latest of the two).
    expect(at(4, true)).toMatchObject({ turn: 2, round: 0 });
    expect(at(4, false)).toMatchObject({ turn: 2, round: 0 });
  });

  it("a wasted deviation at the only point left: the next attempt goes back to it (off: it moves on)", () => {
    // Attempt 2's path: two questions, T1 (b1) and T2 (b2), each with two untried lines, no numbers.
    const q = (board: string, turn: number, alternatives: string[]) => ({ board, turn, kind: "question" as const, label: "combat/plan-choice", line: "X", alternatives, canon: Object.fromEntries(["X", ...alternatives].map((text) => [text, text])) });
    const path = [q("b1", 1, ["A", "B"]), q("b2", 2, ["C", "D"])];
    const two = { attempt: 2, turns: 3, result: "predicted_death", explore: { points: path, target: null, turns: [] } };
    // Attempt 3 deviated at T2 (the latest) and played C there, but its turn ended as a failed one.
    const target3 = exploreTarget([two], 3, { canon: true, tried: true, whole: true }).target!;
    expect(target3).toMatchObject({ board: "b2" });
    const three = (differs: boolean) => ({ attempt: 3, turns: 3, result: "predicted_death", explore: { points: [path[0]!, { ...path[1]!, line: "C", explored: true as const }], target: target3, deviation: { reached: true, original: "X", replacement: "C", reason: "", turn: 2, plays: "X", differs }, turns: [] } });
    const wasted = exploreTarget([two, three(false)], 4, { canon: true, tried: true, whole: true }).target!;
    expect(wasted).toMatchObject({ board: "b2", round: 0, excluded: ["X", "C"] });
    expect(wasted.point).toMatch(/\(attempt 3 deviated there but ended the turn as a failed attempt's: again, another line\)$/);
    // Off, or a deviation whose turn differed: a use, the next attempt moves on to T1.
    expect(exploreTarget([two, three(false)], 4, { canon: true, tried: true }).target).toMatchObject({ board: "b1" });
    expect(exploreTarget([two, three(true)], 4, { canon: true, tried: true, whole: true }).target).toMatchObject({ board: "b1" });
  });
});

// ---------------------------------------------------------------- the planner on the logged boards

/** e0fa69b's views of the boards (tests/sl-explore-whole-views.ts offViews, captured on e0fa69b). */
const GOLDEN_E0FA69B: Record<string, string> = {
  "pw7y-a3-t1-deviation:record": "5863b637cca316cfb904f1c3f2443693",
  "pw7y-a3-t1-deviation:explore": "5a91f2e34ca4229db1ed4e52ded967b2",
  "pw7y-a3-t1-replan:record": "a29059726bd3c80f152da7d892d404b5",
  "pw7y-a3-t1-replan:explore": "a29059726bd3c80f152da7d892d404b5",
  "pw7y-a4-t2-deviation:record": "2fe1c64b6c3621a67587252d9bab481b",
  "pw7y-a4-t2-deviation:explore": "c02e58a078919e0fdee34fbdff8d30da",
  "pw7y-a4-t2-replan:record": "fdf378c59f5851800c5363dfa93ecf59",
  "pw7y-a4-t2-replan:explore": "fdf378c59f5851800c5363dfa93ecf59",
};

describe("the planner without `whole`: e0fa69b's decisions on the logged boards", () => {
  it("every answer's resolution and point, recording, deviating and avoiding, as e0fa69b", () => {
    expect(offViews()).toEqual(GOLDEN_E0FA69B);
    expect([...touched]).toEqual([]);
  }, 300_000);
});

/** env.sl.explore on a logged board: the plays already made that turn, the switches on, and `explore` added. */
const withPlayed = (name: string, explore: SlEnv["explore"] = {}): DecisionEnv => envOf(name, { explore: { ...ON, played: boardOf(name).played, whole: true, ...explore } });

describe("the avoid reaches every surviving line: the re-plans after the draw (PW7Y F48 attempts 3 and 4)", () => {
  for (const name of ["pw7y-a3-t1-replan", "pw7y-a4-t2-replan"] as const) {
    it(`${name}: code's "only distinct line" ended the turn as a failed one; now Jev's question, the answer kept off`, () => {
      frozen();
      const fx = boardOf(name);
      const { tried, attempts } = triedAt(name);
      const avoid = { point: "T?", tried, attempts };
      // As live (e0fa69b, and without `whole`): code's own line, which ends the turn as a failed attempt's.
      const live = planCombatTurn(envOf(name, { explore: { ...ON, played: fx.played, avoid } }))!;
      expect(live).toMatchObject({ kind: "act", label: "combat/plan", rationale: expect.stringMatching(/^code plan \(only distinct line\)/) });
      const codeLine = slPointOf(live, { intent: null, rationale: "", confidence: null, fallback: false })!;
      expect(tried.canon).toContain(codeLine.canon![codeLine.line]);
      expect(live).not.toHaveProperty("log");
      // With `whole`: a question; code's line is shown with the best surviving line ending the turn otherwise.
      const ask = planCombatTurn(withPlayed(name, { avoid })) as AskDecision;
      expect(ask.kind).toBe("ask");
      const options = optionsOf(ask);
      const top = Object.keys(options).find((key) => playsOf(options[key]!) === codeLine.line)!;
      expect(top).toBeDefined();
      const resolved = ask.resolve(pick(top));
      const log = ((resolved.log as Raw)["sl_explore"] as Raw)["avoid"] as Raw;
      expect(log).toMatchObject({ original: codeLine.line, turn: codeLine.canon![codeLine.line], played_in: attempts });
      expect(log["replacement"]).not.toBeNull();
      expect(triedHas(tried, { text: "", canon: String(log["turn_instead"]) })).toBe(false);
      expect((resolved.log as Raw)["sl_explore"]).not.toHaveProperty("avoid_failed");
      expect(slPointOf(ask, resolved)).toMatchObject({ explored: true, avoided: { original: codeLine.line } });
      // Every answer ends the turn otherwise than a failed attempt's.
      for (const key of Object.keys(options)) {
        const out = ask.resolve(pick(key));
        const entry = ((out.log as Raw)["sl_explore"] as Raw)["avoid"] as Raw;
        const turn = String(entry["turn_instead"] ?? entry["turn"]);
        expect(triedHas(tried, { text: "", canon: turn })).toBe(false);
      }
      expect([...touched]).toEqual([]);
    }, 300_000);
  }

  it("pw7y-a3-t1-replan: where no surviving line ends the turn otherwise, code plays its line and says so (avoid_failed)", () => {
    frozen();
    const fx = boardOf("pw7y-a3-t1-replan");
    // Every line the solver finds that survives this turn, as the turn it ends with: all tried.
    thiefTrace.enabled = true;
    planCombatTurn(withPlayed("pw7y-a3-t1-replan"));
    const plans = (thiefTrace.last!.plans as Plan[]).filter((plan) => !plan.outcome.dies);
    expect(plans.length).toBeGreaterThan(1);
    const all = { canon: [...new Set(plans.map((plan) => turnKeys(fx.played, plan.steps).canon!))], loose: [] };
    const avoid = { point: "T1, the 8th latest question before attempt 2's death on T6", tried: all, attempts: [1, 2] };
    const decision = planCombatTurn(withPlayed("pw7y-a3-t1-replan", { avoid }))!;
    expect(decision).toMatchObject({ kind: "act", label: "combat/plan" });
    const point = slPointOf(decision, { intent: null, rationale: "", confidence: null, fallback: false })!;
    expect(point.avoidFailed).toEqual({ line: point.line, reason: "every other line that survives this turn ends it as a failed attempt's too" });
    expect((decision as { log?: Raw }).log).toEqual({
      sl_explore: { avoid_failed: { point: avoid.point, played_in: [1, 2], line: point.line, reason: "every other line that survives this turn ends it as a failed attempt's too", turn: point.canon![point.line] } },
    });
    // Without `whole`: the same line, nothing said (as before).
    const before = planCombatTurn(envOf("pw7y-a3-t1-replan", { explore: { ...ON, played: fx.played, avoid } }))!;
    expect(before).not.toHaveProperty("log");
    expect(slPointOf(before, { intent: null, rationale: "", confidence: null, fallback: false })).not.toHaveProperty("avoidFailed");
    expect([...touched]).toEqual([]);
  }, 300_000);

  it("pw7y-a3-t1-deviation as a later board of the turn: a question whose every line ends as a failed turn says so", () => {
    frozen();
    const fx = boardOf("pw7y-a3-t1-deviation");
    thiefTrace.enabled = true;
    planCombatTurn(withPlayed("pw7y-a3-t1-deviation"));
    const plans = (thiefTrace.last!.plans as Plan[]).filter((plan) => !plan.outcome.dies);
    const all = { canon: [...new Set(plans.map((plan) => turnKeys(fx.played, plan.steps).canon!))], loose: [] };
    const ask = planCombatTurn(withPlayed("pw7y-a3-t1-deviation", { avoid: { point: "T1", tried: all, attempts: [1, 2] } })) as AskDecision;
    expect(ask.kind).toBe("ask");
    const resolved = ask.resolve(pick("plan1"));
    const log = (resolved.log as Raw)["sl_explore"] as Raw;
    expect(log["avoid"]).toMatchObject({ replacement: null, reason: "no shown line left that ends the turn otherwise than a failed attempt's" });
    expect(log["avoid_failed"]).toMatchObject({ point: "T1", played_in: [1, 2], reason: "no shown line left that ends the turn otherwise than a failed attempt's" });
    expect(slPointOf(ask, resolved)!.avoidFailed).toMatchObject({ reason: "no shown line left that ends the turn otherwise than a failed attempt's" });
    expect([...touched]).toEqual([]);
  }, 300_000);
});

describe("the deviation point judged by the whole turn (PW7Y F48 attempt 3 T1)", () => {
  it("Blood Wall, Pommel Strike+, Stomp: may end as attempts 1-2's after Pommel Strike+'s draw; not 'not played here'", () => {
    frozen();
    const fx = boardOf("pw7y-a3-t1-deviation");
    const { tried, attempts } = triedAt("pw7y-a3-t1-deviation");
    expect(tried.canon).toEqual([BW_RAMPAGE_PS_STOMP]);
    const deviate = { point: "T1, the 8th latest question before attempt 2's death on T6", excluded: ["血墙, 暴走 -> 实验体 #C42, 剑柄打击+ -> 实验体 #C42, 踩踏"], attempts, tried };
    const ask = planCombatTurn(withPlayed("pw7y-a3-t1-deviation", { deviate })) as AskDecision;
    const options = optionsOf(ask);
    const jev = Object.keys(options).find((key) => playsOf(options[key]!) === "血墙, 剑柄打击+ -> 实验体 #C42, 踩踏")!;
    expect(jev).toBeDefined();
    // Its sure plays: Blood Wall and Pommel Strike+ (which draws), within attempts 1-2's turn.
    const log = (ask.resolve(pick(jev)).log as Raw)["sl_explore"] as Raw;
    // The lines known to end the turn otherwise (Blood Wall, Bash, Stomp...) all die more often in the rollout here: it is
    // played as answered, and the re-plan after the draw is kept off attempts 1-2's turn (the avoid, above).
    expect(log).toMatchObject({
      original: "血墙, 剑柄打击+ -> 实验体 #C42, 踩踏",
      replacement: null,
      reason: "the pick's turn may end as a failed attempt's after its draw (its plays up to the draw are within one), but none known to end it otherwise is not worse (every such line dies more often in the rollout): played as answered, the rest of the turn kept off the failed turns",
      gate: "rollout",
      turn: "BLOOD_WALL, POMMEL_STRIKE+>实验体 #C42, STOMP",
    });
    // Without `whole`: as live (e0fa69b), "not played on this board before".
    const before = planCombatTurn(envOf("pw7y-a3-t1-deviation", { explore: { ...ON, played: fx.played, deviate } })) as AskDecision;
    expect((before.resolve(pick(jev)).log as Raw)["sl_explore"]).toMatchObject({ replacement: null, reason: "the pick was not played on this board before: played as answered" });
    expect([...touched]).toEqual([]);
  }, 300_000);

  it("turnOpen: the sure plays of a line stop at its first card that draws; a potion option is open with its drink", () => {
    const fx = boardOf("pw7y-a3-t1-deviation");
    frozen();
    thiefTrace.enabled = true;
    planCombatTurn(withPlayed("pw7y-a3-t1-deviation"));
    const plans = thiefTrace.last!.plans as Plan[];
    const line = plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "BLOOD_WALL,POMMEL_STRIKE,STOMP")!;
    expect(line).toBeDefined();
    // The hand as the planner models it (card-model), from the board.
    const cards = ((fx.state["combat"] as Raw)["hand"] as Raw[]).map((card, i) => modelHandCard(card, i, knowledge));
    expect(turnOpen(fx.played, line.steps, cards)).toEqual({ open: true, committed: "BLOOD_WALL, POMMEL_STRIKE+>实验体 #C42" });
    const closed = plans.find((plan) => plan.steps.map((step) => step.cardId).join(",") === "BLOOD_WALL,BASH,STOMP")!;
    expect(turnOpen(fx.played, closed.steps, cards)).toEqual({ open: false, committed: turnCanon(["BLOOD_WALL", "BASH>实验体 #C42", "STOMP"]) });
    expect(turnOpen(fx.played, [], cards, { canon: "potion:X" })).toEqual({ open: true, committed: "potion:X" });
    expect(turnOpen(undefined, line.steps, cards)).toEqual({});
  });
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

/** The scripted fight (tests/sl-explore-canon.test.ts): T1 at 60 HP, T2 at 45 and again after a Defend, T3 a certain death. */
const Q1 = (): Raw => bossBoard({ turn: 1, hp: 60, playable: true, lethal: false });
const Q2 = (): Raw => bossBoard({ turn: 2, hp: 45, playable: true, lethal: false });
function Q2b(): Raw {
  const raw = Q2();
  ((raw["combat"] as Raw)["player"] as Raw)["block"] = 5;
  return raw;
}
const DEATH = (): Raw => bossBoard({ turn: 3, hp: 10 });

function slConfig(log: string, overrides: Partial<SlConfig> = {}): SlConfig {
  return { enabled: true, bossRetries: 3, eliteRetries: 1, act3LowHp: true, act3LowHpPct: 40, retryShowSim: false, retryKnownDraws: true, retryCompute: false, judgeKnownDraws: true, judgeAnyDraw: true, reloadEarly: true, retryKnownInserts: true, retryKnownTop: true, retryExplore: true, retryExploreB2: true, retryExploreBossPotions: true, retryExploreOrder: true, retryExploreReplay: true, retryExploreCanon: true, retryExploreTurn: true, retryExploreWhole: true, retryKnownPicks: true, log, stepTimeoutMs: 5_000, ...overrides };
}
function tempLog(): string {
  const dir = mkdtempSync(join(tmpdir(), "sl-whole-"));
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

/**
 * One attempt as the loop plays it: each board observed, planned, Jev picks plan1, dispatched; then the death. `edit` may
 * change a board's env before it is planned (the test's own `tried`).
 */
async function playAttempt(t: ReturnType<typeof controller>, boards: Raw[], last = false, edit?: (i: number, env: SlEnv | undefined, raw: Raw) => void): Promise<{ env: SlEnv | undefined; explore: unknown }[]> {
  const played: { env: SlEnv | undefined; explore: unknown }[] = [];
  for (const [i, raw] of boards.entries()) {
    const state: GameState = parseGameState(raw);
    t.sl.observe(state, t.memory);
    const env = t.sl.envFor(state);
    edit?.(i, env, raw);
    const decision = planCombatTurn(scenarioEnv(raw, env))!;
    const resolved = decision.kind === "ask" ? (decision as AskDecision).resolve(pick("plan1")) : { intent: decision.intent, rationale: decision.rationale, confidence: null, fallback: false, ...(decision.log ? { log: decision.log } : {}) };
    t.sl.noteAction(state, resolved.intent!);
    t.sl.notePoint(state, decision, resolved);
    played.push({ env, explore: (resolved.log as Raw | undefined)?.["sl_explore"] ?? null });
  }
  const death = parseGameState(DEATH());
  t.sl.observe(death, t.memory);
  const outcome = await t.sl.beforeEndTurn(death, { label: "combat/end_turn", screenMemory: t.memory.screenMemory, journal: t.memory.journal });
  expect(outcome).toMatchObject(last ? { handled: false } : { handled: true, ok: true });
  return played;
}

describe("an end of turn with nothing to play, the turn so far a failed one", () => {
  it("is said (avoid_failed) with `whole`; without it, as before", () => {
    // 60 HP against a 30 hit (no line dies: least-loss would be code's own line, a point), the hand's one card unplayable
    // (not for want of energy): "no playable cards; ending the turn", no line chosen.
    const raw = bossBoard({ turn: 2, hp: 60, lethal: false });
    ((raw["combat"] as Raw)["hand"] as Raw[])[0]!["unplayable_reason"] = "unplayable";
    const avoid = { point: "T2", tried: { canon: ["STRIKE_IRONCLAD>Test Subject"], loose: [] }, attempts: [2, 3] };
    const sl = (whole: boolean): SlEnv => ({ attempt: 4, maxAttempts: 6, previousAttempts: [], showSim: false, explore: { played: { canon: ["STRIKE_IRONCLAD>Test Subject"], text: ["打击 -> Test Subject"] }, avoid, ...(whole ? { whole: true } : {}) } });
    const on = planCombatTurn(scenarioEnv(raw, sl(true)))!;
    expect(on).toMatchObject({ kind: "act", label: "combat/end_turn", intent: { action: "end_turn" }, rationale: "no playable cards; ending the turn" });
    expect((on as { log?: Raw }).log).toEqual({ sl_explore: { avoid_failed: { point: "T2", played_in: [2, 3], line: "end turn", reason: "nothing can be played this turn", turn: "STRIKE_IRONCLAD>Test Subject" } } });
    expect(slAvoidFailedOf(on, { intent: null, rationale: "", confidence: null, fallback: false })).toEqual({ line: "end turn", reason: "nothing can be played this turn" });
    // A turn that is no failed one, or the switch off: nothing said.
    expect(planCombatTurn(scenarioEnv(raw, { ...sl(true), explore: { ...sl(true).explore!, avoid: { ...avoid, tried: { canon: ["DEFEND_IRONCLAD"], loose: [] } } } }))).not.toHaveProperty("log");
    expect(planCombatTurn(scenarioEnv(raw, sl(false)))).not.toHaveProperty("log");
  });
});

describe("the controller with SL_RETRY_EXPLORE_WHOLE", () => {
  it("tells the planner (`whole`), says so in the run config; off: nothing new", async () => {
    const log = tempLog();
    const t = controller(log);
    expect(t.sl.describe()).toMatchObject({ retry_explore_turn: true, retry_explore_whole: true });
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    const a2 = await playAttempt(t, [Q1(), Q2(), Q2b()]);
    expect(a2.every((p) => p.env?.explore?.whole === true)).toBe(true);
    const off = controller(tempLog(), { retryExploreWhole: false });
    expect(off.sl.describe()).toMatchObject({ retry_explore_turn: true, retry_explore_whole: false });
    await playAttempt(off, [Q1(), Q2(), Q2b()]);
    const b2 = await playAttempt(off, [Q1(), Q2(), Q2b()]);
    expect(b2.every((p) => p.env?.explore !== undefined && !("whole" in p.env.explore))).toBe(true);
    // _TURN off: no `whole` either.
    expect(controller(tempLog(), { retryExploreTurn: false }).sl.describe()).toMatchObject({ retry_explore_whole: false });
  }, 300_000);

  it("an avoid that cannot act later in the deviation's turn is on the row's deviation, and said", async () => {
    const log = tempLog();
    // Five attempts: attempt 4's row is written at its reload.
    const t = controller(log, { bossRetries: 4 });
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    await playAttempt(t, [Q1(), Q2(), Q2b()]);
    // Attempt 4 deviates at T2's first board; on T2's second board (its turn, `avoid`) every surviving line is made tried.
    const a4 = await playAttempt(t, [Q1(), Q2(), Q2b()], false, (i, env, raw) => {
      if (i !== 2 || !env?.explore?.avoid) return;
      thiefTrace.enabled = true;
      planCombatTurn(scenarioEnv(raw, env));
      const plans = (thiefTrace.last!.plans as Plan[]).filter((plan) => !plan.outcome.dies);
      env.explore.avoid.tried = { canon: [...new Set(plans.map((plan) => turnKeys(env.explore!.played, plan.steps).canon!))], loose: [] };
      thiefTrace.enabled = false;
    });
    expect(a4[2]!.env!.explore).toHaveProperty("avoid");
    expect(a4[2]!.explore).toHaveProperty("avoid_failed");
    const row = logRows(log)[3]!;
    expect(row.explore!.deviation).toMatchObject({ reached: true, turn: 2, differs: expect.any(Boolean), avoidFailed: [{ turn: 2, label: expect.stringMatching(/^combat\//), line: expect.any(String), reason: expect.any(String) }] });
    expect(t.notes.join("\n")).toMatch(/SL: could not keep the deviation's turn off the failed ones at F17 T2 attempt 4\/5: .* ends it as attempts 1, 2, 3 had it \(/);
  }, 300_000);
});
