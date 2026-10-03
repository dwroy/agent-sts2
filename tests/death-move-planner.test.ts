/**
 * MECH_DEATH_MOVE on the combat planner (docs/mechanics-learning.md §9): the learned "an ally's death changes a survivor's
 * move" rules on logged A8 boards (tests/death-move-data: the Queen's kill turn beside an 11-HP Torch Head Amalgam, her
 * You Are Mine turn, a Living Shield beside the Turret Operator; the Kaiser Crab as the rule-free control; the knowledge data
 * pinned from the 2026-10-03 build with the ally-death counters). With MECH_DEATH_MOVE off, with MECH_RULES off, with a DB
 * without the counters, and on the rule-free board, the question, Jev's view and every answer's resolution are byte for
 * byte those of v4 0f63d28 (digests computed there on the same boards and data, fake clocks, the whole-fight boss lines off:
 * CAPTURE=1 with vitest --disableConsoleIntercept prints them, only meaningful on that commit). A failure reading the rules is the question with the switch off.
 * With it on: a line killing the ally says what the survivor does now and next turn, the survivor carries the observation,
 * this turn's hp_lost is unchanged where the new move has no attack (the Queen's Enrage), and the decision log records it.
 * Nothing under logs/ or .cache is read, nothing is written.
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "death-move-data");
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Record<string, unknown>>;
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
// PASSIVE_PIECES (src/strategy/passive-pieces.ts) postdates these digests: off here, on the fresh module (the boards holding
// Orichalcum, Ripple Basin or Ornamental Fan change with it on: tests/passive-pieces-planner.test.ts).
const { passivePiecesOptions } = await import("../src/strategy/passive-pieces.js");
passivePiecesOptions.enabled = false;
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { setMonsterDbForTests } = await import("../src/knowledge/monster-db.js");
const { loadConfig } = await import("../src/config.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { planCombatTurn } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
const { bossLinesOptions } = await import("../src/sim/boss-lines.js");
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type AskDecision = import("../src/project/types.js").AskDecision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;

// The whole-fight boss lines (B2) are a worker pool on a wall clock: off here, the rest of the question is pinned.
bossLinesOptions.enabled = false;
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

interface Board {
  state: Record<string, unknown>;
  screenMemory: { facing?: number; facingFight?: string };
}

function board(name: string): Board {
  return JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
}

/** A logged board's decision environment, with the Surrounded facing the loop had noted then. */
function envOf(name: string, over: Record<string, unknown> = {}): DecisionEnv {
  const fx = board(name);
  const state = parseGameState(fx.state);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [], screenMemory: { ...createScreenMemory(state.screen), ...fx.screenMemory },
    ...over,
  } as DecisionEnv;
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
    label: ask.label, state: ask.state, questions: ask.questions, jevView: ask.jevView ?? null,
    resolved: Object.fromEntries([...keys.map((key) => [key, res(pick(key, 0.9))]), ...keys.map((key) => [`${key}@0.3`, res(pick(key, 0.3))]), ["none", res({} as AnswerSet)], ["bad", res(pick("nope", 0.9))]]),
  };
}

function digest(view: unknown): string {
  return createHash("sha256").update(JSON.stringify(view)).digest("hex").slice(0, 32);
}

const BOARDS = ["0u96-f48-t5-queen-kill", "5gka-f48-t2-queen-mine", "y3xt-f37-t1-shield", "nx48-f33-t7-crab"] as const;
const RULED = BOARDS.filter((name) => name !== "nx48-f33-t7-crab");

/**
 * Digests of v4 0f63d28's planner on the boards above (JEV_CONTEXT off and v1), MECH_RULES on (its default). 0U96's are
 * re-pinned at v4-inferno-planner: its draw pile holds both Infernos (none up), and the rollout's later turns now lose 1 HP
 * per Inferno played at each turn's start (strategy/start-loss.ts; a second one had looked free): its numbers moved and the
 * rollout's best (all three lines 5-8/8 dead) became Blood Wall, then Uppercut+; the rest of the question as at 0f63d28.
 */
const GOLDEN_ON: Record<string, string> = {
  "0u96-f48-t5-queen-kill:off": "47e0f43e56058400f3f8ed3a861e1dac",
  "0u96-f48-t5-queen-kill:v1": "3a068a1fd19acd2277d8089a802e9aa2",
  "5gka-f48-t2-queen-mine:off": "ea2d21a53876060cc500968ffa4ae855",
  "5gka-f48-t2-queen-mine:v1": "4c620f5b109262d63c4d0d2cb209dc55",
  "y3xt-f37-t1-shield:off": "99fa9d304089373588a420e810956b13",
  "y3xt-f37-t1-shield:v1": "866cff99296cb892e28b46ad4ebedb05",
  "nx48-f33-t7-crab:off": "51ca5092a06f92a1789ab8afd13bc944",
  "nx48-f33-t7-crab:v1": "1387c42705c390cc9895f176e4c16daa",
};
/** ... and MECH_RULES off: the same but on the Crab (its back attack needing both claws is MECH_MOVE_RULES's). */
const GOLDEN_OFF: Record<string, string> = {
  ...GOLDEN_ON,
  "nx48-f33-t7-crab:off": "a0327bd97bf9678cbc54766f04e31e17",
  "nx48-f33-t7-crab:v1": "f7a5d967c694758c969b07689bd59674",
};

function frozen(): void {
  rolloutLiveOptions.now = () => 0;
  potionMcOptions.now = () => 0;
}

afterEach(() => {
  rolloutLiveOptions.now = null;
  rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
  potionMcOptions.now = null;
  setMonsterDbForTests(null);
});

function digests(over: Record<string, unknown>, boards: readonly string[] = BOARDS): Record<string, string> {
  frozen();
  const got: Record<string, string> = {};
  for (const name of boards) for (const ctx of ["off", "v1"] as const) got[`${name}:${ctx}`] = digest(viewOf(envOf(name, { jevContext: ctx, ...over })));
  return got;
}

const only = (golden: Record<string, string>, boards: readonly string[]) => Object.fromEntries(Object.entries(golden).filter(([key]) => boards.includes(key.split(":")[0]!)));

function pinnedDb(): { monsters: Record<string, Record<string, unknown>> } & Record<string, unknown> {
  const pinned = JSON.parse(readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Record<string, unknown>>;
  return pinned["monster-db.json"] as { monsters: Record<string, Record<string, unknown>> } & Record<string, unknown>;
}

describe("MECH_DEATH_MOVE off, MECH_RULES off, no data, no rule: the combat question as at v4 0f63d28", () => {
  it("MECH_DEATH_MOVE off: every logged board's decision is the pre-change one, byte for byte", () => {
    if (process.env["CAPTURE"] === "1") {
      console.log(JSON.stringify({ on: digests({}), off: digests({ mechRules: false }) }, null, 2));
      return;
    }
    expect(digests({ mechDeathMove: false })).toEqual(GOLDEN_ON);
    expect([...touched]).toEqual([]);
  }, 900_000);

  it("MECH_RULES off (MECH_DEATH_MOVE on): the pre-change one with MECH_RULES off", () => {
    if (process.env["CAPTURE"] === "1") return;
    expect(digests({ mechRules: false })).toEqual(GOLDEN_OFF);
  }, 900_000);

  it("on, the rule-free board (the Kaiser Crab, its ally-death counts in the DB): as before", () => {
    if (process.env["CAPTURE"] === "1") return;
    expect(digests({}, ["nx48-f33-t7-crab"])).toEqual(only(GOLDEN_ON, ["nx48-f33-t7-crab"]));
  }, 900_000);

  it("on, a monster DB without the ally-death counters (built before them): as before", () => {
    if (process.env["CAPTURE"] === "1") return;
    const db = pinnedDb();
    const bare = {
      ...db,
      monsters: Object.fromEntries(Object.entries(db.monsters).map(([id, entry]) => {
        const { ally_deaths: _gone, ...observed } = (entry["observed"] ?? {}) as Record<string, unknown>;
        return [id, { ...entry, observed }];
      })),
    };
    setMonsterDbForTests(bare as unknown as Parameters<typeof setMonsterDbForTests>[0]);
    expect(digests({}, RULED)).toEqual(only(GOLDEN_ON, RULED));
  }, 900_000);

  it("on, reading the rules fails: the switch off (fail safe)", () => {
    if (process.env["CAPTURE"] === "1") return;
    const db = pinnedDb();
    const queen = db.monsters["QUEEN"]!;
    const observed = Object.defineProperty({ ...(queen["observed"] as Record<string, unknown>) }, "ally_deaths", {
      get(): never {
        throw new Error("broken ally_deaths block");
      },
      enumerable: true,
    });
    setMonsterDbForTests({ ...db, monsters: { ...db.monsters, QUEEN: { ...queen, observed } } } as unknown as Parameters<typeof setMonsterDbForTests>[0]);
    const queens = RULED.filter((name) => name.includes("queen"));
    expect(digests({}, queens)).toEqual(only(GOLDEN_ON, queens));
  }, 900_000);
});

/** The question's options as Jev sees them (JEV_CONTEXT=v1), parsed. */
function jevOptions(decision: AskDecision): Record<string, Record<string, unknown>> {
  const criteria = (decision.jevView!.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(criteria).filter(([key]) => /^plan\d+$/.test(key)).map(([key, text]) => [key, text ? (JSON.parse(text) as Record<string, unknown>) : {}]));
}

function askOf(name: string, over: Record<string, unknown> = {}): AskDecision {
  frozen();
  const decision = planCombatTurn(envOf(name, { jevContext: "v1", ...over }));
  expect(decision?.kind).toBe("ask");
  return decision as AskDecision;
}

const pickAnswer = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;
const enemyPowers = (ask: AskDecision, i: number) => ((ask.jevView!.state as Record<string, unknown>)["enemies"] as { powers: string[] }[])[i]!.powers;

describe("MECH_DEATH_MOVE on: the Queen and the Torch Head Amalgam", () => {
  it("0U96U4D9Z3PP F48 T5: the killing lines say Enrage now and Off With Your Head next; hp_lost as without the rule; the Queen carries it; the log records it", () => {
    const off = jevOptions(askOf("0u96-f48-t5-queen-kill", { mechDeathMove: false }));
    const ask = askOf("0u96-f48-t5-queen-kill");
    const on = jevOptions(ask);
    const killing = Object.entries(on).filter(([, option]) => option["death_move"] !== undefined);
    expect(killing.length).toBeGreaterThan(0);
    for (const [, option] of killing) {
      expect(String(option["death_move"])).toMatch(/^kills 火炬头聚合体: 女王's move becomes ENRAGE_MOVE \(no attack this turn; 21 of 21 logged\) at once, already in hp_lost; next turn 女王 uses 将头砍下 \(OFF_WITH_YOUR_HEAD_MOVE, attack ~35 as priced now; 22 of 22 logged\), not in hp_lost \(the rollout counts it\)$/);
      expect(String(option["enemies_after"] ?? "")).not.toContain("火炬头聚合体");
    }
    // This turn: Enrage has no attack, Burn Bright For Me had none: every line shown both times reads the same hp_lost.
    const offBy = new Map(Object.values(off).map((option) => [String(option["plays"]), option]));
    for (const option of Object.values(on)) {
      const before = offBy.get(String(option["plays"]));
      if (before) expect(option["hp_lost"]).toBe(before["hp_lost"]);
    }
    const queen = ((ask.jevView!.state as Record<string, unknown>)["enemies"] as Record<string, unknown>[]).find((enemy) => String(enemy["name"]) === "女王")!;
    expect(String(queen["observed"])).toBe(
      "observed in the logs, not in its text: when 火炬头聚合体 dies on my turn its move changes at once to ENRAGE_MOVE (no attack this turn; 21 of 21 logged), then its next move is 将头砍下 (OFF_WITH_YOUR_HEAD_MOVE, attack ~35; 22 of 22 logged); the options' numbers and the rollout already count it",
    );
    const [key] = killing[0]!;
    const log = ask.resolve(pickAnswer(key)).log as Record<string, unknown>;
    expect(log["mech"]).toMatchObject({ death_rules: [{ enemy: "女王", ally: "火炬头聚合体", move: "ENRAGE_MOVE", next: "OFF_WITH_YOUR_HEAD_MOVE" }], deaths_now: expect.arrayContaining([key]), chosen_deaths: true });
  }, 900_000);

  it("5GKAR00L5AYV F48 T2 (You Are Mine): no change this turn, the head-chop next", () => {
    const on = jevOptions(askOf("5gka-f48-t2-queen-mine"));
    const killing = Object.values(on).filter((option) => option["death_move"] !== undefined);
    for (const option of killing) expect(String(option["death_move"])).toMatch(/^kills 火炬头聚合体: next turn 女王 uses 将头砍下 \(OFF_WITH_YOUR_HEAD_MOVE, attack ~\d+ as priced now; 22 of 22 logged\)/);
  }, 900_000);
});

describe("MECH_DEATH_MOVE on: the Living Shield and the Turret Operator", () => {
  it("Y3XT9EBS7U8B F37 T1: a line killing the Turret Operator says the Shield's Smash comes next", () => {
    const on = jevOptions(askOf("y3xt-f37-t1-shield"));
    const killing = Object.values(on).filter((option) => option["death_move"] !== undefined);
    expect(killing.length).toBeGreaterThan(0);
    for (const option of killing) expect(String(option["death_move"])).toMatch(/^kills 高塔炮手: next turn 活体盾 uses 砸击 \(SMASH_MOVE, attack ~\d+ as priced now; 5 of 5 logged\), not in hp_lost/);
  }, 900_000);
});
