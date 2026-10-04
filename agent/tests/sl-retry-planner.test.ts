/**
 * SL_RETRY_KNOWN_DRAWS and SL_RETRY_COMPUTE in the combat planner (docs/sl.md §10), on logged SL retry boards
 * (tests/sl-retry-data: VNKN9952ZNA0 F25 and F33 and JW925EDF9ZTQ F48, attempt 2; make-fixtures.ts). With neither on the
 * board (switches off, or the first attempt) the question, Jev's view and every answer's resolution are byte for byte
 * what v4 3488dc5 asked: digests captured on 3488dc5's planner (a git archive of it with these fixtures, CAPTURE=1),
 * with fake clocks and the knowledge data the planner reads pinned from 3488dc5 (pinned-knowledge.json), as
 * tests/thief.test.ts does. The setup files load some planner modules with the real node:fs before this file's mock is in
 * place: the module registry is reset so every module loads again under it. Nothing under logs/ or .cache is read,
 * nothing is written. With the known draws on: the solver's lines draw the known cards (Burning Pact, Offering, Shrug It
 * Off draw the cards the earlier attempt drew), the rollout's and the random potions' samples draw them first, the
 * question carries one known_draws line, the decision log an sl_retry record; with the compute on, the rollout's 24
 * samples; and a retry step that throws leaves the decision exactly as with both switches off.
 */

import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "..", "knowledge");
const DATA = join(HERE, "sl-retry-data");
const unpinned = new Set<string>();
const pinnedRead = new Set<string>();
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
  const shared = [join(ROOT, "..", "logs"), join(ROOT, "..", "data")];
  const watch = (name: string, write: boolean) => {
    const original = (fs as unknown as Record<string, (...args: unknown[]) => unknown>)[name]!;
    return (path: unknown, ...rest: unknown[]) => {
      const at = typeof path === "string" ? resolve(path) : String(path);
      if (write || shared.some((dir) => at === dir || at.startsWith(dir + "/"))) touched.add(`${name} ${at}`);
      return original(path, ...rest);
    };
  };
  const wrapped: Record<string, unknown> = {};
  for (const name of ["existsSync", "statSync", "lstatSync", "readdirSync", "openSync"]) wrapped[name] = watch(name, false);
  for (const name of ["writeFileSync", "appendFileSync", "mkdirSync", "renameSync", "rmSync", "unlinkSync", "copyFileSync", "createWriteStream"]) wrapped[name] = watch(name, true);
  const read = watch("readFileSync", false);
  wrapped["readFileSync"] = (path: unknown, ...rest: unknown[]) => {
    if (typeof path === "string" && resolve(path).startsWith(KNOWLEDGE + "/") && path.endsWith(".json")) {
      const name = basename(resolve(path));
      // Outside the knowledge directory before the move (src/sim, src/sl): read as they are.
      if (name === "boss-trust.json" || name === "sl-elites.json") return read(path, ...rest);
      if (name in pinned) {
        pinnedRead.add(name);
        return JSON.stringify(pinned[name]);
      }
      unpinned.add(name);
      throw Object.assign(new Error(`ENOENT: pinned test, ${name}`), { code: "ENOENT" });
    }
    return read(path, ...rest);
  };
  return { ...fs, ...wrapped, default: { ...fs, ...wrapped } };
});

vi.resetModules();
const { readFileSync } = await import("node:fs");
const { potionCostOptions } = await import("../src/reflex/potion-cost.js");
potionCostOptions.enabled = true;
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { loadConfig } = await import("../src/core/config.js");
const { parseGameState } = await import("../src/hand/mod/schema.js");
const { buildRunBrief } = await import("../src/memory/run-brief.js");
const { createScreenMemory } = await import("../src/memory/types.js");
const { planCombatTurn } = await import("../src/reflex/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/reflex/rollout-live.js");
const { potionMcOptions } = await import("../src/reflex/potion-mc.js");
const { previousAttemptsJson } = await import("../src/sl/attempts.js");
type AnswerSet = import("../src/reflex/jev/answers.js").AnswerSet;
type AskDecision = import("../src/memory/types.js").AskDecision;
type DecisionEnv = import("../src/memory/types.js").DecisionEnv;
type SlAttemptRow = import("../src/sl/attempts.js").SlAttemptRow;

const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

interface Board {
  source: string;
  state: Record<string, unknown>;
  knownDraws: { cards: string[]; names: string[]; attempts: number[] } | null;
  rows: SlAttemptRow[];
}

function board(name: string): Board {
  return JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
}

/** The retried fight's env.sl as v4 3488dc5's controller made it (attempt 2, the earlier rows' block, the sim shown). */
function slOf(fx: Board): Record<string, unknown> {
  const max = fx.rows[0]!.max_attempts;
  return { attempt: 2, maxAttempts: max, previousAttempts: previousAttemptsJson(fx.rows, 2, max), showSim: true };
}

/** A logged board's decision environment as the live loop makes it on the retry; `sl` adds to its env.sl. */
function envOf(name: string, jevContext: "off" | "v1", sl: Record<string, unknown> = {}): DecisionEnv {
  const fx = board(name);
  const state = parseGameState(fx.state);
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
    sl: { ...slOf(fx), ...sl } as unknown as DecisionEnv["sl"],
    thiefFacts: config.thiefFacts,
    thiefCost: config.thiefFacts && config.thiefCost,
    mechRules: config.mechRules,
  };
}

/** The whole decision as data: the question, Jev's view, and each option's (and no answer's) resolution. */
function viewOf(env: DecisionEnv): unknown {
  const decision = planCombatTurn(env);
  if (!decision || decision.kind !== "ask") return decision ?? null;
  const ask = decision as AskDecision;
  const keys = Object.keys((ask.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
  const pick = (key: string, confidence: number): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;
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

function digest(view: unknown): string {
  return createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
}

const BOARDS = ["vnkn-f25-a2-t1", "vnkn-f25-a2-t3-pact", "jw92-f48-a2-t3-offering", "vnkn-f33-a2-t4-shrug"] as const;

/**
 * Digests of v4 3488dc5's planner on the boards above (JEV_CONTEXT off and v1), captured on a git archive of it.
 * 2026-10-04 (v4-giant-potion follow-up, rollout.ts DEATH_MOVES / deathMoveOptions): the two Decimillipede boards (vnkn-f25)
 * re-pinned. A living segment no longer draws Reattach or Dead (Writhe -> Reattach 17-23 of 61-66 in the move model, never
 * seen on a living segment in the logs), so the rollout's segments attack every later turn instead of "reattaching" for 0
 * (vnkn-f25-a2-t1 plan1 T2: -14.1 -> -18.9 HP); the rollout's best moves (t1 plan6 -> plan1, t3-pact plan4 -> plan5). With
 * deathMoveOptions.others off every digest held; jw92 (the Test Subject on Multi Claw) and vnkn-f33 are unchanged.
 */
const GOLDEN: Record<string, string> = {
  "jw92-f48-a2-t3-offering:off": "1ba734936934487606db07981da88e0d",
  "jw92-f48-a2-t3-offering:v1": "4bf5f7a2421257b1a2d4203f18cff8e6",
  "vnkn-f25-a2-t1:off": "50274c5794d364f2585fb7a21915da0a",
  "vnkn-f25-a2-t1:v1": "35b605a22b4008a0a6c3c6e26d3c6312",
  "vnkn-f25-a2-t3-pact:off": "02c3ab4fb8490827e24ccf91790533be",
  "vnkn-f25-a2-t3-pact:v1": "e08897c0859c33c6025269b01ce81611",
  // Code plays this board itself (no question): the same decision whatever JEV_CONTEXT is.
  "vnkn-f33-a2-t4-shrug:off": "34e66aac3fed416a4d9a37acb6ff23ed",
  "vnkn-f33-a2-t4-shrug:v1": "34e66aac3fed416a4d9a37acb6ff23ed",
};

/** Fake clocks: the rollout and the random potions' Monte Carlo run their full schedules, the same every time. */
function frozen(): void {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
}

afterEach(() => {
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
});

describe("SL retry switches off: the combat question as v4 3488dc5 asked it", () => {
  it("every logged retry board's decision is 3488dc5's, byte for byte", () => {
    frozen();
    const got: Record<string, string> = {};
    for (const name of BOARDS) for (const ctx of ["off", "v1"] as const) got[`${name}:${ctx}`] = digest(viewOf(envOf(name, ctx)));
    if (process.env["CAPTURE"] === "1") console.log(JSON.stringify(got, null, 2));
    expect(got).toEqual(GOLDEN);
    expect([...pinnedRead].sort()).toEqual(["boss-damage.json", "experience.json", "monster-db.json", "move-model.json", "potion-equivalents.json"]);
    // monster-records.json: the character's monster records beside the pinned (combined, pre-split) monster DB, absent here.
    expect([...unpinned].sort()).toEqual(["fight-value-gates.json", "fight-value.json", "jev-hints.json", "monster-records.json"]);
    expect([...touched]).toEqual([]);
  }, 300_000);
});

/** The ask decision's options by key (their criteria parsed). */
function optionsOf(decision: AskDecision): Record<string, Record<string, unknown>> {
  const raw = (decision.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(raw).map(([key, text]) => [key, text ? (JSON.parse(text) as Record<string, unknown>) : {}]));
}
const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;

/** env.sl with the known draws the controller would give on this board (and the note that goes with them). */
function knownSl(name: string): Record<string, unknown> {
  const fx = board(name);
  const max = fx.rows[0]!.max_attempts;
  return { previousAttempts: previousAttemptsJson(fx.rows, 2, max, { knownDraws: true }), knownDraws: fx.knownDraws };
}

describe("SL_RETRY_KNOWN_DRAWS on: the lines draw the cards the earlier attempt drew", () => {
  it("VNKN F25 T3: Burning Pact draws the known Bash+ and Strike; the question says the next 10 cards; the log has sl_retry", () => {
    frozen();
    const fx = board("vnkn-f25-a2-t3-pact");
    expect(fx.knownDraws!.names.slice(0, 2)).toEqual(["痛击+", "打击"]);
    const off = planCombatTurn(envOf("vnkn-f25-a2-t3-pact", "off")) as AskDecision;
    const on = planCombatTurn(envOf("vnkn-f25-a2-t3-pact", "off", knownSl("vnkn-f25-a2-t3-pact"))) as AskDecision;
    expect(on.kind).toBe("ask");
    const plays = (decision: AskDecision) => Object.values(optionsOf(decision)).map((option) => String(option["plays"] ?? ""));
    // Bash+ is not in the hand: only a line that draws it can play it.
    expect(plays(off).some((text) => text.includes("痛击+"))).toBe(false);
    expect(plays(on).some((text) => /燃烧契约, then 痛击\+ ->/.test(text))).toBe(true);
    expect(on.state["known_draws"]).toBe(
      "SL retry: the next 10 cards of the draw pile, in the order they come (the next first), are known from attempt 1: 痛击+, 打击, 血墙, 熔融之拳, 防御, 剑柄打击+, 耸肩无视, 坚定不移, 重锤, 愤怒. The options' numbers and the rollout draw these first; past them the draws are random.",
    );
    expect(off.state["known_draws"]).toBeUndefined();
    expect(String((on.state["previous_attempts"] as Record<string, unknown>)["note"])).toContain("known_draws lists the next cards");
    const log = on.resolve(pick("plan1")).log as Record<string, unknown>;
    expect(log["sl_retry"]).toEqual({ known_draws: 10 });
    expect((off.resolve(pick("plan1")).log as Record<string, unknown>)["sl_retry"]).toBeUndefined();
    expect([...touched]).toEqual([]);
  }, 120_000);

  it("VNKN F33 T4 (the replay that died on T5): Shrug It Off draws the known Defend, so a line survives where every line died", () => {
    frozen();
    const off = planCombatTurn(envOf("vnkn-f33-a2-t4-shrug", "off"));
    const on = planCombatTurn(envOf("vnkn-f33-a2-t4-shrug", "off", knownSl("vnkn-f33-a2-t4-shrug")));
    expect(off?.kind === "act" && off.label).toBe("combat/least-loss");
    expect(on?.kind).toBe("act");
    expect(on?.label).not.toBe("combat/least-loss");
    expect(on?.kind === "act" ? on.rationale : "").toMatch(/耸肩无视.*防御/);
  }, 120_000);

  it("JW92 F48 T3: Offering draws the known Defend, Twin Strike and Shrug It Off+", () => {
    frozen();
    const on = planCombatTurn(envOf("jw92-f48-a2-t3-offering", "off", knownSl("jw92-f48-a2-t3-offering"))) as AskDecision;
    const plays = Object.values(optionsOf(on)).map((option) => String(option["plays"] ?? ""));
    expect(plays.some((text) => /祭品.*then (防御|耸肩无视\+)/.test(text))).toBe(true);
    expect(String(on.state["known_draws"])).toMatch(/^SL retry: the next 20 cards of the draw pile, in the order they come \(the next first\), are known from attempt 1: 防御, 双重打击, 耸肩无视\+, /);
    // The line names the next 10 (two hands) only; the planner uses all 20.
    expect(/attempt 1: (.*)\. The options/.exec(String(on.state["known_draws"]))![1]!.split(", ")).toHaveLength(11);
    expect(String(on.state["known_draws"])).toContain(", .... The options' numbers");
  }, 120_000);

  it("known draws the pile does not hold: none used, the decision as with the switch off", () => {
    frozen();
    const sl = { knownDraws: { cards: ["NOT_A_CARD"], names: ["?"], attempts: [1] } };
    expect(digest(viewOf(envOf("vnkn-f25-a2-t1", "v1", sl)))).toBe(GOLDEN["vnkn-f25-a2-t1:v1"]);
  }, 120_000);
});

describe("SL_RETRY_COMPUTE on: more samples on a retry", () => {
  it("the rollout runs 24 samples (frozen clock: the whole schedule); the log says so", async () => {
    frozen();
    const { RETRY_COMPUTE } = await import("../src/sl/controller.js");
    const on = planCombatTurn(envOf("vnkn-f25-a2-t1", "off", { compute: { ...RETRY_COMPUTE } })) as AskDecision;
    const options = optionsOf(on);
    expect(Object.values(options).filter((option) => /^5-turn rollout \(24 samples\)/.test(String(option["rollout"] ?? ""))).length).toBeGreaterThan(0);
    const log = on.resolve(pick("plan1")).log as { rollout: { samples: number; horizon: number }; sl_retry: unknown };
    expect(log.rollout).toMatchObject({ samples: 24, horizon: 5 });
    expect(log.sl_retry).toEqual({ known_draws: 0, compute: { rollout_samples: 24, rollout_budget_ms: RETRY_COMPUTE.rolloutBudgetMs, turn_spent_ms: 0, mc_samples: RETRY_COMPUTE.mcSamples, boss_sim_samples: RETRY_COMPUTE.bossSimSamples } });
  }, 300_000);

  it("a question's rollout budget is at most what is left of the turn's (re-plans after a draw), never below the usual", async () => {
    frozen();
    const { RETRY_COMPUTE } = await import("../src/sl/controller.js");
    const { fightKey } = await import("../src/memory/fight-plan.js");
    const budgetWith = (spentMs: number, attempt = 2): number => {
      const env = envOf("vnkn-f25-a2-t3-pact", "off", { compute: { ...RETRY_COMPUTE, rolloutSamples: 8 } });
      env.screenMemory.slRetryCompute = { turn: `${fightKey(env.state)}:${attempt}:${env.state.turn}`, spentMs };
      const ask = planCombatTurn(env) as AskDecision;
      const log = ask.resolve(pick("plan1")).log as { sl_retry: { compute: { rollout_budget_ms: number; turn_spent_ms: number } } };
      // The frozen clock spends nothing: the turn's record stays where it was.
      expect(env.screenMemory.slRetryCompute?.spentMs).toBe(attempt === 2 ? spentMs : 0);
      return log.sl_retry.compute.rollout_budget_ms;
    };
    expect(budgetWith(0)).toBe(20_000);
    expect(budgetWith(25_000)).toBe(5_000);
    expect(budgetWith(29_500)).toBe(ROLLOUT_BUDGET_MS);
    // Another attempt's record of the same turn is not this attempt's.
    expect(budgetWith(25_000, 1)).toBe(20_000);
  }, 300_000);

  it("B2 on a retried boss fight runs the compute's samples a line", async () => {
    frozen();
    const { bossLinesOptions, BOSS_LINES_SAMPLES } = await import("../src/sim/boss-lines.js");
    bossLinesOptions.enabled = true;
    bossLinesOptions.serial = true;
    bossLinesOptions.holdHp = () => null;
    try {
      const compute = { rolloutSamples: 8, rolloutBudgetMs: ROLLOUT_BUDGET_MS, mcSamples: 12, mcBudgetMs: 400, bossSimSamples: 12 };
      const on = planCombatTurn(envOf("jw92-f48-a2-t3-offering", "off", { compute })) as AskDecision;
      const log = on.resolve(pick("plan1")).log as { boss_sim: { samples: number; requested: number } };
      expect(log.boss_sim).toMatchObject({ samples: 12, requested: 12 });
    } finally {
      bossLinesOptions.enabled = false;
      bossLinesOptions.serial = false;
      bossLinesOptions.samples = BOSS_LINES_SAMPLES;
      bossLinesOptions.holdHp = null;
    }
  }, 300_000);
});

describe("SL retry fail safe (live play)", () => {
  it("a retry step that throws leaves the decision exactly as with both switches off", () => {
    frozen();
    const boom = new Proxy({}, { get: () => { throw new Error("broken compute"); } });
    const fx = board("vnkn-f25-a2-t3-pact");
    for (const ctx of ["off", "v1"] as const) {
      expect(digest(viewOf(envOf("vnkn-f25-a2-t3-pact", ctx, { compute: boom })))).toBe(GOLDEN[`vnkn-f25-a2-t3-pact:${ctx}`]);
      expect(digest(viewOf(envOf("vnkn-f25-a2-t3-pact", ctx, { compute: boom, knownDraws: fx.knownDraws })))).toBe(GOLDEN[`vnkn-f25-a2-t3-pact:${ctx}`]);
    }
    expect([...touched]).toEqual([]);
  }, 300_000);
});
