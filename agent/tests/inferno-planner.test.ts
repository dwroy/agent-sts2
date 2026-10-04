/**
 * Inferno's start-of-turn loss per copy on the combat planner (strategy/start-loss.ts; turn-solver Sim.infernos; rollout
 * SimPlayer.infernoCopies), on logged boards (tests/inferno-planner-data, make-fixtures.ts) with the knowledge data the
 * planner reads pinned from v4 02e2ca8 and frozen clocks (the rollout's full 5 turns x 8 samples), the whole-fight boss
 * lines (B2) off. Each copy loses 1 HP at the start of our turn (logged: two copies lost 2 42 times, never less); the planner
 * had counted 1 whatever the copies, and a second Inferno played looked free. Nothing under logs/ or .cache is read, nothing
 * is written.
 */

import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "..", "knowledge");
const DATA = join(HERE, "inferno-planner-data");
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
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { loadConfig } = await import("../src/config.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { planCombatTurn, thiefTrace } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { bossLinesOptions } = await import("../src/sim/boss-lines.js");
const { infernoCopies, startTurnHpLossOf } = await import("../src/strategy/start-loss.js");
type DecisionEnv = import("../src/project/types.js").DecisionEnv;
type Plan = import("../src/strategy/turn-solver.js").Plan;

bossLinesOptions.enabled = false;
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

type Raw = Record<string, unknown>;
const board = (name: string): Raw => (JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as { state: Raw }).state;

function envOf(raw: Raw): DecisionEnv {
  const state = parseGameState(raw);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], jevContext: "v1",
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  } as DecisionEnv;
}

afterEach(() => {
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
  thiefTrace.enabled = false;
  thiefTrace.last = null;
});

/** The planner on a board, frozen clocks: its decision, every solver line and the rollout's lines. */
function planned(raw: Raw) {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
  thiefTrace.enabled = true;
  thiefTrace.last = null;
  const decision = planCombatTurn(envOf(raw));
  const trace = thiefTrace.last as { plans: Plan[]; rollout: { available: boolean; result?: { lines: { plan: Plan; deaths: number; samples: number }[] } } | null } | null;
  return { decision, plans: trace?.plans ?? [], lines: trace?.rollout?.available ? trace.rollout.result!.lines : [] };
}
const playsOf = (plan: Plan) => plan.steps.map((step) => step.cardId).join(",");
const setPower = (raw: Raw, id: string, amount: number) => {
  const player = (raw["combat"] as Raw)["player"] as Raw;
  const powers = (player["powers"] as Raw[]).filter((power) => power["power_id"] !== id);
  if (amount !== 0) powers.push({ index: powers.length, power_id: id, name: id, amount, is_debuff: false });
  player["powers"] = powers;
};

describe("the copies counted off the state (strategy/start-loss.ts, the SL judge's count)", () => {
  it("two Inferno+ (18): 2; one (9, or 6): 1; 27: 3; none: 0; Crimson Mantle's per copy on top", () => {
    const raw = board("c4f1-f33-a5-t6");
    const state = () => parseGameState(raw);
    expect(infernoCopies(state(), 18)).toBe(2);
    expect(infernoCopies(state(), 9)).toBe(1);
    expect(infernoCopies(state(), 6)).toBe(1);
    expect(infernoCopies(state(), 27)).toBe(3);
    expect(infernoCopies(state(), 0)).toBe(0);
    expect(startTurnHpLossOf(state(), 18, 14)).toBe(4);
    expect([...touched]).toEqual([]);
  });
});

describe("C4F14F3XPN0N F33 (A9, the Knowledge Demon): two Inferno+ up take 2 at the next turn's start", () => {
  it("attempt 5 T6 (15 HP, the Slap 21 next): Breakthrough, Defend, Pillage+ (played, 2 HP after the enemy turn, T7's start took them) now dies; code plays Defend, Pillage+", () => {
    const { decision, plans } = planned(board("c4f1-f33-a5-t6"));
    const played = plans.find((plan) => playsOf(plan) === "BREAKTHROUGH,DEFEND_IRONCLAD,PILLAGE")!;
    expect(played).toBeDefined();
    // 1 for Breakthrough, 21 - 9 block after Defend: 12, 2 at T7's start: 15 of 15.
    expect(played.outcome.hpLoss).toBe(15);
    expect(played.outcome.dies).toBe(true);
    const kept = plans.find((plan) => playsOf(plan) === "DEFEND_IRONCLAD,PILLAGE")!;
    expect(kept.outcome).toMatchObject({ hpLoss: 14, dies: false });
    expect(decision).toMatchObject({ kind: "act", label: "combat/plan" });
    expect(decision?.kind === "act" && decision.rationale).toMatch(/防御, 劫掠\+ -> 知识恶魔; hp -14/);
    expect([...touched]).toEqual([]);
  }, 120_000);

  it("attempt 1 T6 (17 HP): every line's HP lost carries both copies; one copy (INFERNO_POWER 9) takes one less", () => {
    const two = planned(board("c4f1-f33-a1-t6")).plans;
    const raw = board("c4f1-f33-a1-t6");
    setPower(raw, "INFERNO_POWER", 9);
    const one = planned(raw).plans;
    const end = (plans: Plan[]) => plans.find((plan) => plan.steps.length === 0)!;
    expect(end(two).outcome.hpLoss - end(one).outcome.hpLoss).toBe(1);
    expect(two.filter((plan) => plan.outcome.dies).length).toBeGreaterThan(one.filter((plan) => plan.outcome.dies).length);
  }, 120_000);
});

describe("JGJS7QE62GLD F24 T2 (16 HP, the Spiny Toad): one Inferno up, the second in the hand", () => {
  it("playing the second costs 1 more at the next turn's start: every line dies, and least-loss now ends the turn instead of playing it (logged: played, lost on T2)", () => {
    const { decision, plans } = planned(board("jgjs-f24-t2-second"));
    const end = plans.find((plan) => plan.steps.length === 0)!;
    const second = plans.find((plan) => playsOf(plan) === "INFERNO")!;
    expect(second.outcome.hpLoss - end.outcome.hpLoss).toBe(1);
    expect(decision).toMatchObject({ kind: "act", label: "combat/least-loss", intent: { action: "end_turn" } });
  }, 120_000);
});

describe("A8ENYFR4ZWKG F33 T6 (34 HP, two Infernos up, won): the rollout's later turns lose 2 a turn", () => {
  it("more of the rollout's samples die than at 1 a turn, and its best line moves to Blood Wall+, Uppercut+", () => {
    const { decision, lines } = planned(board("a8en-f33-t6"));
    const raw = board("a8en-f33-t6");
    setPower(raw, "INFERNO_POWER", 9);
    const one = planned(raw).lines;
    const deaths = (list: typeof lines) => list.reduce((sum, line) => sum + line.deaths, 0);
    expect(deaths(lines)).toBeGreaterThan(deaths(one));
    expect(decision?.kind).toBe("ask");
    const criteria = decision?.kind === "ask" ? ((decision.questions["plan"] as { criteria: Record<string, string> }).criteria) : {};
    const best = Object.values(criteria).map((text) => JSON.parse(text) as Raw).find((option) => option["rollout_best"] === true);
    expect(best?.["plays"]).toMatch(/^血墙\+, then 上勾拳\+/);
  }, 120_000);
});
