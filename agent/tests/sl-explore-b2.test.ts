/**
 * SL_RETRY_EXPLORE in boss fights (docs/sl.md §11.3, Roy 2026-10-02), with B2 on: logged boss boards (tests/logged-states,
 * the knowledge pinned as tests/boss-lines-planner.test.ts pins it), B2's samples in this thread, few of them, the fake
 * clocks of the other planner tests (B2's too: its times are in the question and the log).
 *
 * - The sub-switches off: every answer's point and, with a deviation, every answer's resolution, log and point are
 *   bc8c9bc's (the digests below were captured on bc8c9bc).
 * - SL_RETRY_EXPLORE_B2 (a boss B2 is trusted on): B2's win rate gates the replacement, not the rollout's death share; on
 *   Ceremonial Beast T1 it picks another line than the rollout gate would. A low-trust boss (the Queen, simulated on an
 *   SL retry) keeps the rollout gate.
 * - SL_RETRY_EXPLORE_BOSS_POTIONS: in a boss fight a replacement may drink a potion the pick does not (a shown potion
 *   line, a random potion's Monte Carlo line).
 * Nothing under logs/ or .cache is read, nothing is written.
 */

import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "..", "knowledge");
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(HERE, "boss-lines-data", "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
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
      if (name in pinned) return JSON.stringify(pinned[name]);
      throw Object.assign(new Error(`ENOENT: pinned test, ${name}`), { code: "ENOENT" });
    }
    return read(path, ...rest);
  };
  return { ...fs, ...wrapped, default: { ...fs, ...wrapped } };
});

// Every module again under the mock (tests/boss-lines-planner.test.ts); potion costs on, as live.
vi.resetModules();
const { potionCostOptions } = await import("../src/reflex/potion-cost.js");
potionCostOptions.enabled = true;
const { logged, loggedEnv } = await import("./logged.js");
const { planCombatTurn, slPointOf } = await import("../src/reflex/combat-plan.js");
const { rolloutLiveOptions } = await import("../src/reflex/rollout-live.js");
const { potionMcOptions } = await import("../src/reflex/potion-mc.js");
const { bossLinesOptions, BOSS_LINES_SAMPLES } = await import("../src/sim/boss-lines.js");
type AnswerSet = import("../src/reflex/jev/answers.js").AnswerSet;
type AskDecision = import("../src/memory/types.js").AskDecision;
type DecisionEnv = import("../src/memory/types.js").DecisionEnv;
type SlEnv = import("../src/memory/types.js").SlEnv;

const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;
const digest = (view: unknown): string => createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);

/** B2's samples per line on each board (the Queen's are slow: her board's lines take ~1.5 s a sample in this thread). */
const SAMPLES: Record<string, number> = { "k8tc-f17-t5": 16, "xmy2-f17-t1": 16, "ez2l-f48-t2": 4 };

/** A logged boss board as an SL retry's question (attempt 3), B2 on in this thread; `explore` is env.sl.explore. */
function envOf(name: string, explore: SlEnv["explore"]): DecisionEnv {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  bossLinesOptions.enabled = true;
  bossLinesOptions.serial = true;
  bossLinesOptions.samples = SAMPLES[name] ?? 16;
  bossLinesOptions.holdHp = () => null;
  bossLinesOptions.now = () => 0;
  return loggedEnv(logged(name), { jevContext: "off", sl: { attempt: 3, maxAttempts: 6, previousAttempts: { note: "earlier attempts" }, showSim: true, explore } });
}

afterEach(() => {
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
  bossLinesOptions.enabled = false;
  bossLinesOptions.serial = false;
  bossLinesOptions.samples = BOSS_LINES_SAMPLES;
  bossLinesOptions.holdHp = null;
  bossLinesOptions.now = null;
});

/** As tests/sl-explore.test.ts exploreView: the points recorded, then with plan1's and plan2's lines excluded every answer's resolution. */
function exploreView(name: string, explore: Record<string, unknown> = {}): unknown {
  const plain = planCombatTurn(envOf(name, { ...explore })) as AskDecision;
  const keys = Object.keys((plain.questions["plan"] as { criteria: Record<string, unknown> }).criteria);
  const excluded = ["plan1", "plan2"].filter((key) => keys.includes(key)).map((key) => slPointOf(plain, plain.resolve(pick(key)))!.line);
  const ask = planCombatTurn(envOf(name, { ...explore, deviate: { point: "T?", excluded, attempts: [2] } })) as AskDecision;
  const resolved = (decision: AskDecision, key: string) => {
    const out = decision.resolve(pick(key));
    const { apply: _apply, ...rest } = out;
    return { ...rest, point: slPointOf(decision, out) ?? null };
  };
  return { excluded, points: keys.map((key) => slPointOf(plain, plain.resolve(pick(key))) ?? null), deviated: keys.map((key) => resolved(ask, key)) };
}

/** bc8c9bc's explore views (captured there with CAPTURE=1). */
const GOLDEN: Record<string, string> = {
  "k8tc-f17-t5": "9a1d0eaed10d97b8159ca0a91917c104",
  "xmy2-f17-t1": "7e3219eff659ae1a723d3fa2635018f9",
  "ez2l-f48-t2": "b51b5e905b9269d08905e93ae65a5ccb",
};

describe("the sub-switches off: the explore part as at bc8c9bc, B2 on", () => {
  it("a trusted boss (The Kin, Ceremonial Beast) and a low-trust one (the Queen): every point and deviated resolution is bc8c9bc's", () => {
    const got: Record<string, string> = {};
    for (const name of ["k8tc-f17-t5", "xmy2-f17-t1", "ez2l-f48-t2"]) got[name] = digest(exploreView(name));
    if (process.env["CAPTURE"] === "1") console.log(JSON.stringify(got, null, 2));
    expect(got).toEqual(GOLDEN);
    expect([...touched]).toEqual([]);
  }, 300_000);
});

/** The board's question (`explore` without a deviation) and, with `excluded` the lines of those keys, its answer to `key`. */
function deviated(name: string, explore: Record<string, unknown>, key: string, excludedKeys: string[]) {
  const plain = planCombatTurn(envOf(name, { ...explore })) as AskDecision;
  const lineOf = (k: string) => slPointOf(plain, plain.resolve(pick(k)))!.line;
  const askEnv = envOf(name, { ...explore, deviate: { point: "T?", excluded: excludedKeys.map(lineOf), attempts: [2] } });
  const ask = planCombatTurn(askEnv) as AskDecision;
  const resolved = ask.resolve(pick(key));
  const criteria = (plain.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  const textOf = (k: string) => (k.startsWith("plan") ? lineOf(k) : String(JSON.parse(criteria[k] ?? "{}")["plays"] ?? k));
  return { plain, ask, askEnv, resolved, log: (resolved.log as Record<string, unknown>)["sl_explore"] as Record<string, unknown>, point: slPointOf(plain, plain.resolve(pick(key)))!, explored: slPointOf(ask, resolved)!, sim: (resolved.log as Record<string, unknown>)["boss_sim"] as { ranked: string[]; low_trust: boolean }, textOf };
}

describe("SL_RETRY_EXPLORE_B2: on a boss B2 is trusted on, B2's win rate gates the replacement", () => {
  it("Ceremonial Beast T1: the pick (Mazaleth's Gift) played there; the rollout's gate takes the dry line, B2's the other Gift line the rollout sees dying more often", () => {
    // plan2 (薪火之源, 耸肩无视, the Gift) played there before. The rollout: plan1 (the Gift too) dies more often (2/8 against
    // 1/8), plan3 (dry) less; B2: plan1 wins as often, plan3 less but within 2 paired standard errors; B2 ranks plan1 first.
    const rollout = deviated("xmy2-f17-t1", {}, "plan2", ["plan2"]);
    const b2 = deviated("xmy2-f17-t1", { b2Gate: true }, "plan2", ["plan2"]);
    expect(rollout.log["replacement"]).toBe(rollout.textOf("plan3"));
    expect(b2.log["replacement"]).toBe(b2.textOf("plan1"));
    expect(b2.log["replacement"]).not.toBe(rollout.log["replacement"]);
    // The rollout's gate would not take B2's: it dies more often in the rollout than the pick.
    const dead = b2.point.dead!;
    expect(dead[String(b2.log["replacement"])]!).toBeGreaterThan(dead[b2.point.line]!);
    expect(dead[String(rollout.log["replacement"])]!).toBeLessThanOrEqual(dead[rollout.point.line]!);
    // The row: the gate, both lines' calibrated win rates and the paired difference (no worse: at most 2 standard errors below).
    expect(b2.log).toMatchObject({ gate: "b2", reason: expect.stringMatching(/among those B2 rates no worse \(win rate at most 2 paired standard errors below the pick's\)/) });
    const numbers = b2.log["b2"] as { original: number; replacement: number; diff: number; se: number };
    expect(numbers.diff).toBeGreaterThanOrEqual(-2 * numbers.se);
    expect(numbers.original).toBeGreaterThan(0);
    // The record: B2's win rates and the lines it rates no worse; the replacement is B2's first of those in its order.
    expect(b2.point.b2!.notWorse).toContain(b2.log["replacement"]);
    expect(Object.keys(b2.point.b2!.win).sort()).toEqual([b2.point.line, ...b2.point.alternatives!].sort());
    expect(b2.sim.low_trust).toBe(false);
    const order = b2.sim.ranked.map(b2.textOf).filter((text) => b2.point.b2!.notWorse.includes(text));
    expect(order[0]).toBe(b2.log["replacement"]);
    expect(b2.explored).toMatchObject({ line: b2.log["replacement"], explored: true });
    // Off: no b2 in the record, no gate in the row (as at bc8c9bc).
    expect(rollout.point.b2).toBeUndefined();
    expect(rollout.log["gate"]).toBeUndefined();
    expect([...touched]).toEqual([]);
  }, 300_000);

  it("a low-trust boss (the Queen, simulated on an SL retry): the rollout's gate, as without the sub-switch", () => {
    const off = deviated("ez2l-f48-t2", { bossPotions: true }, "plan5", ["plan5"]);
    const on = deviated("ez2l-f48-t2", { b2Gate: true, bossPotions: true }, "plan5", ["plan5"]);
    expect(on.sim.low_trust).toBe(true);
    expect(on.log).toMatchObject({ gate: "rollout", reason: expect.stringMatching(/rollout does not see dying more often/) });
    expect(on.log["b2"]).toBeUndefined();
    expect(on.point.b2).toBeUndefined();
    expect(on.log["replacement"]).toBe(off.log["replacement"]);
    expect(on.point.dead![String(on.log["replacement"])]!).toBeLessThanOrEqual(on.point.dead![on.point.line]!);
    expect([...touched]).toEqual([]);
  }, 300_000);
});

describe("SL_RETRY_EXPLORE_BOSS_POTIONS: in a boss fight the replacement may drink a potion the pick does not", () => {
  it("Ceremonial Beast T1, the dry line played there: off nothing is left; on, a Gift line or Gambler's Brew are alternatives, and B2's pick drinks", () => {
    const off = deviated("xmy2-f17-t1", { b2Gate: true }, "plan3", ["plan3"]);
    expect(off.log).toMatchObject({ replacement: null, reason: expect.stringMatching(/no shown line left/) });
    const on = deviated("xmy2-f17-t1", { b2Gate: true, bossPotions: true }, "plan3", ["plan3"]);
    expect(on.point.alternatives).toEqual(expect.arrayContaining([on.textOf("plan1"), on.textOf("plan2"), "drink 赌徒特酿, then re-plan"]));
    expect(String(on.log["replacement"])).toMatch(/potion 马萨雷斯的赠礼/);
    expect(on.log).toMatchObject({ gate: "b2" });
    expect([...touched]).toEqual([]);
  }, 300_000);

  it("The Kin T5: B2 ranks Snecko Oil (a random potion) first; the replacement drinks it, then re-plans, as Jev's pick of it would", () => {
    const on = deviated("k8tc-f17-t5", { b2Gate: true, bossPotions: true }, "plan1", ["plan1", "plan2"]);
    expect(on.log).toMatchObject({ replacement: "drink 异蛇之油, then re-plan", gate: "b2" });
    const potionPick = on.ask.resolve(pick("p1"));
    expect(on.resolved.intent).toEqual(potionPick.intent);
    expect(on.resolved.intent).toMatchObject({ action: "use_potion" });
    expect(on.resolved.rationale).toMatch(/SL explore \(T\?\): playing drink 异蛇之油, then re-plan instead of /);
    expect(on.explored).toMatchObject({ line: "drink 异蛇之油, then re-plan", explored: true });
    // Played: the turn is re-planned after the drink (no line committed).
    on.askEnv.screenMemory.combatPlan = { turn: 5 } as never;
    on.resolved.apply!();
    expect(on.askEnv.screenMemory.combatPlan).toBeNull();
    // Off (no added drink): a dry line.
    const off = deviated("k8tc-f17-t5", { b2Gate: true }, "plan1", ["plan1", "plan2"]);
    expect(String(off.log["replacement"])).not.toMatch(/drink|potion/);
    expect([...touched]).toEqual([]);
  }, 300_000);
});
