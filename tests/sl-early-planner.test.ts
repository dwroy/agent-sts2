/**
 * The turn planner's least-loss facts for the SL judge (combat-plan leastLossFactsOf; SL_RELOAD_EARLY and
 * SL_JUDGE_KNOWN_DRAWS, docs/sl.md §2) and the known draws with cards added at random places (SL_RETRY_KNOWN_INSERTS,
 * §10), on logged boards (tests/sl-early-data, make-fixtures.ts), with the knowledge data the planner reads pinned from
 * v4 26a50b1 (pinned-knowledge.json) and fake clocks, as tests/sl-retry-planner.test.ts does. Dai 2026-10-02: an early
 * reload only on a verdict with nothing left to chance, so each random case here must carry its chance (and the judge
 * then keeps the end_turn timing); a clean one carries none and the judge reloads early. The facts sit beside the
 * decision: the decision itself (and so the question, the log, the digests) is as before. Nothing under logs/ or .cache
 * is read, nothing is written.
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "sl-early-data");
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, unknown>;
  const shared = [join(ROOT, "logs"), join(ROOT, ".cache")];
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
      const name = resolve(path).slice(KNOWLEDGE.length + 1);
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
const { leastLossFactsOf, planCombatTurn } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { judgeLeastLossNow } = await import("../src/sl/judge.js");
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type AskDecision = import("../src/project/types.js").AskDecision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;
type SlKnownDraws = import("../src/project/types.js").SlKnownDraws;

const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

interface Board {
  source: string;
  state: Record<string, unknown>;
  knownDraws: SlKnownDraws | null;
}
const board = (name: string): Board => JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;

/** A logged board's decision environment; `sl` makes it a retry (attempt 2) with these known draws. */
function envOf(name: string, knownDraws?: SlKnownDraws): DecisionEnv {
  const state = parseGameState(board(name).state);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], jevContext: "v1",
    ...(knownDraws ? { sl: { attempt: 2, maxAttempts: 4, previousAttempts: { note: "test" }, showSim: false, knownDraws } } : {}),
    thiefFacts: config.thiefFacts, thiefCost: config.thiefFacts && config.thiefCost, mechRules: config.mechRules,
  } as DecisionEnv;
}

function frozen(): void {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
}
afterEach(() => {
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
});

/** The decision and its facts, and the early judge on the board (nothing added to the pile, no relic data beyond the state's). */
function planned(name: string, knownDraws?: SlKnownDraws) {
  const env = envOf(name, knownDraws);
  const decision = planCombatTurn(env);
  const facts = leastLossFactsOf(decision);
  const early = judgeLeastLossNow(env.state, { revives: [], facts, knownDrawsJudge: true, addedToPile: false, knowledge });
  return { env, decision, facts, early };
}

describe("least-loss facts on logged boards: nothing left to chance, or what is", () => {
  it("P57H F22 T5 (the Obscura's Parafright, 38 incoming): every line dies, nothing random: the judge reloads early", () => {
    frozen();
    const { decision, facts, early } = planned("p57h-f22-t5-certain");
    expect(decision?.label).toBe("combat/least-loss");
    expect(decision?.kind === "act" && decision.intent.action).toBe("play_card");
    expect(facts).toMatchObject({ draws: false, drawsKnown: false, chance: null });
    expect(early).toMatchObject({ certain: true, tier: "least-loss", early: true });
    expect([...touched]).toEqual([]);
  }, 120_000);

  it("90JG F17 T12: True Grit (a random exhaust) in the hand: chance, so not early", () => {
    frozen();
    const { decision, facts, early } = planned("90jg-f17-t12-true-grit");
    expect(decision?.label).toBe("combat/least-loss");
    expect(facts?.chance).toMatch(/has a random effect$/);
    expect(early.certain).toBe(false);
  }, 120_000);

  it("Z7D7 F28 T6: a random potion (Gambler's Brew) held: its samples are chance, so not early", () => {
    frozen();
    const { decision, facts, early } = planned("z7d7-f28-t6-gamblers-brew");
    expect(decision?.label).toBe("combat/least-loss");
    expect(facts?.chance).toMatch(/^a random potion \(.+\): its samples$/);
    expect(early.certain).toBe(false);
  }, 120_000);

  it("5BXM F31 T6: Pommel Strike draws cards nobody knows on a first attempt: not early, and the end_turn veto stays", () => {
    frozen();
    const { decision, facts, early } = planned("5bxm-f31-t6-pommel");
    expect(decision?.label).toBe("combat/least-loss");
    expect(facts).toMatchObject({ draws: true, drawsKnown: false, chance: "a line draws cards not exactly known" });
    expect(early.certain).toBe(false);
    expect(early.reason).toMatch(/draws \(unknown cards\)$/);
  }, 120_000);
});

describe("SL_RETRY_KNOWN_INSERTS: the Insatiable's Frantic Escape added at random places (EJXC F33 T2, the fight as its own retry)", () => {
  const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;

  it("the known order rides with the added cards: the question says so, the log counts them, the solver draws as without them", () => {
    frozen();
    const fx = board("ejxc-f33-t2-frantic");
    expect(fx.knownDraws?.added?.cards).toEqual(["FRANTIC_ESCAPE", "FRANTIC_ESCAPE"]);
    expect(fx.knownDraws?.exact).toBe(0);
    const on = planCombatTurn(envOf("ejxc-f33-t2-frantic", fx.knownDraws!)) as AskDecision;
    expect(String(on.state["known_draws"])).toMatch(/^SL retry: the next 9 cards of the draw pile's own, in the order they come \(the next first\), are known from attempt 1: .*; 狂乱逃离 x2 added to the pile are at random places among them\. The rollout draws them so; this turn's options and past them the draws are random\.$/);
    expect((on.resolve(pick("plan1")).log as Record<string, unknown>)["sl_retry"]).toEqual({ known_draws: 9, added: 2 });
    // The options' numbers come from the solver, which draws as without known cards: the same as no known draws at all
    // (the rollout, with them placed at random, is off here).
    rolloutLiveOptions.enabled = false;
    try {
      const without = planCombatTurn(envOf("ejxc-f33-t2-frantic")) as AskDecision;
      const again = planCombatTurn(envOf("ejxc-f33-t2-frantic", fx.knownDraws!)) as AskDecision;
      const plays = (decision: AskDecision) => JSON.stringify(Object.values((decision.questions["plan"] as { criteria: Record<string, unknown> }).criteria));
      expect(plays(again)).toBe(plays(without));
    } finally {
      rolloutLiveOptions.enabled = true;
    }
  }, 300_000);

  it("an `exact` count alone (what the tracker gives without the switch after a status drawn at once) changes no decision", () => {
    frozen();
    rolloutLiveOptions.enabled = false;
    try {
      const fx = board("ejxc-f33-t2-frantic");
      const { added: _added, exact: _exact, ...plain } = fx.knownDraws!;
      const digest = (env: DecisionEnv) => {
        const decision = planCombatTurn(env) as AskDecision;
        const { resolve: _r, ...rest } = decision;
        return createHash("sha256").update(JSON.stringify(rest)).digest("hex");
      };
      expect(digest(envOf("ejxc-f33-t2-frantic", { ...plain, exact: 0 }))).toBe(digest(envOf("ejxc-f33-t2-frantic", plain)));
    } finally {
      rolloutLiveOptions.enabled = true;
    }
  }, 300_000);
});
