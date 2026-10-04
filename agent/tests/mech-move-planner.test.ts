/**
 * MECH_MOVE_RULES on the combat planner (docs/mechanics-learning.md §8): the learned move changes and the Kaiser Crab's back
 * attack needing both claws, on logged A8 boards (tests/mech-move-data: two Crab boards, two Axebot boards; the knowledge
 * data pinned from v4 3488dc5 with the monster DB's `observed` blocks of the 2026-10-02 build). With MECH_MOVE_RULES off,
 * and with MECH_RULES off, the question, Jev's view and every answer's resolution are byte for byte those of v4 3488dc5
 * with MECH_RULES on / off (digests computed there on the same boards, fake clocks, the whole-fight boss lines off:
 * CAPTURE=1 prints them, only meaningful on that commit). A failure reading the rules is the question with the switch off.
 * With it on: the line killing a claw counts the survivor's hit without the x1.5 from behind, a lone claw's hit as shown,
 * an Axebot killed with Stock left comes back in Boot Up and the option says so, and the decision log records the rules.
 * Nothing under logs/ or .cache is read, nothing is written.
 */

import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "..", "knowledge");
const DATA = join(HERE, "mech-move-data");
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
const touched = new Set<string>();

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Record<string, unknown>>;
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

const BOARDS = ["nx48-f33-t7-crab-death", "8l29-f33-t5-crab-alone", "y3xt-f45-t5-axebot-stock1", "8l29-f39-t3-axebot-stock2"] as const;

/**
 * Digests of v4 3488dc5's planner on the boards above (JEV_CONTEXT off and v1), MECH_RULES on (its default). The 8L29
 * run held Lost Wisp, which the solver models since (fix-queue-v4 fix2: 8 to every enemy per Power): its two boards
 * are 3488dc5's plus that (with the relic's lines off they read 3488dc5's bc13d834…, f69d22f6…, 21324a53…, e1f0817c…).
 * 2026-10-04 (v4-asc-facts, Dai: experience by ascension): the boards at A8 and up whose question carries a counted record
 * (a Jev hint's or a lesson's {CRAB_KILLS_EN}, {QUEEN_AMALGAM_EN}, {CRAB_KILL_ORDER}, …) re-pinned: those records now give A8's fights
 * and A9's apart (boss-clock recordBand). With the band switched off (RECORD_BAND_FROM above every ascension) every
 * earlier digest held: nothing else in the decision moved.
 */
const GOLDEN_ON: Record<string, string> = {
  "nx48-f33-t7-crab-death:off": "1e916a66856f00fbeef0ec59d3168d15",
  "nx48-f33-t7-crab-death:v1": "58f682b783ec4fb6cb190c594f077683",
  "8l29-f33-t5-crab-alone:off": "1a1eae7813ea0328f9920e8bb1640aec",
  "8l29-f33-t5-crab-alone:v1": "76ff44399ce497a3bc3f22ec49b186c1",
  "y3xt-f45-t5-axebot-stock1:off": "40399a49c414cf8c9768f1802bcbfbd6",
  "y3xt-f45-t5-axebot-stock1:v1": "55148044f38ebd91f93c25280b10de6a",
  "8l29-f39-t3-axebot-stock2:off": "71009ab06986ebeb3cd29453338e4d5b",
  "8l29-f39-t3-axebot-stock2:v1": "f33b7b050f05afe75c809e0db7d686c2",
};
/** ... and MECH_RULES off: the same there (no Flutter on these boards). */
const GOLDEN_OFF: Record<string, string> = { ...GOLDEN_ON };

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

describe("MECH_MOVE_RULES off, or MECH_RULES off: the combat question as at v4 3488dc5", () => {
  it("MECH_MOVE_RULES off: every logged board's decision is the pre-change one (MECH_RULES on), byte for byte", () => {
    if (process.env["CAPTURE"] === "1") {
      console.log(JSON.stringify({ on: digests({}), off: digests({ mechRules: false }) }, null, 2));
      return;
    }
    expect(digests({ mechMoveRules: false })).toEqual(GOLDEN_ON);
    expect([...touched]).toEqual([]);
  }, 600_000);

  it("MECH_RULES off (MECH_MOVE_RULES on): the pre-change one with MECH_RULES off", () => {
    if (process.env["CAPTURE"] === "1") return;
    expect(digests({ mechRules: false })).toEqual(GOLDEN_OFF);
  }, 600_000);

  it("on, reading the rules fails: the switch off (fail safe), the Crab's back attack included", () => {
    if (process.env["CAPTURE"] === "1") return;
    const pinned = JSON.parse(readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Record<string, unknown>>;
    const db = pinned["monster-db.json"] as { monsters: Record<string, Record<string, unknown>> };
    const axebot = db.monsters["AXEBOT"]!;
    const broken = {
      ...db,
      monsters: {
        ...db.monsters,
        AXEBOT: Object.defineProperty({ ...axebot }, "observed", {
          get(): never {
            throw new Error("broken observed block");
          },
          enumerable: true,
        }),
      },
    };
    setMonsterDbForTests(broken as unknown as Parameters<typeof setMonsterDbForTests>[0]);
    expect(digests({})).toEqual(GOLDEN_ON);
  }, 600_000);

  it("on, a monster DB without the per-monster data: the Axebot boards as before (the Crab's back attack is no data rule)", () => {
    if (process.env["CAPTURE"] === "1") return;
    const pinned = JSON.parse(readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Record<string, unknown>>;
    const db = pinned["monster-db.json"] as { monsters: Record<string, Record<string, unknown>> };
    const bare = { ...db, monsters: Object.fromEntries(Object.entries(db.monsters).map(([id, entry]) => [id, { ...entry, observed: undefined }])) };
    setMonsterDbForTests(bare as unknown as Parameters<typeof setMonsterDbForTests>[0]);
    const axebots = BOARDS.filter((name) => name.includes("axebot"));
    expect(digests({}, axebots)).toEqual(only(GOLDEN_ON, axebots));
  }, 600_000);
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

describe("MECH_MOVE_RULES on: the Kaiser Crab", () => {
  it("NX48MBG3SPRJ F33 T7: a line killing the Rocket counts the Crusher's Enlarging Strike faced (6 + Crab Rage's 6), not from behind", () => {
    const off = jevOptions(askOf("nx48-f33-t7-crab-death", { mechMoveRules: false }));
    const ask = askOf("nx48-f33-t7-crab-death");
    const on = jevOptions(ask);
    // The same lines; a line that kills the Rocket reads 3 HP less now (9 + 6 from behind, 6 + 6 faced), the others as before.
    const byPlays = (options: Record<string, Record<string, unknown>>) => new Map(Object.values(options).map((option) => [String(option["plays"]), option]));
    const offBy = byPlays(off);
    const saved: number[] = [];
    for (const [plays, option] of byPlays(on)) {
      const before = offBy.get(plays);
      if (!before) continue;
      const kills = String(option["enemies_after"] ?? "").indexOf("火箭") < 0 && !option["wins_fight"];
      if (kills) saved.push(Number(before["hp_lost"]) - Number(option["hp_lost"]));
      else expect(option["hp_lost"]).toBe(before["hp_lost"]);
    }
    // Up to 3 HP less (block takes some of it), never more; at least one shown line reads less.
    expect(saved.length).toBeGreaterThan(0);
    expect(saved.every((x) => x >= 0 && x <= 3)).toBe(true);
    expect(saved.some((x) => x > 0)).toBe(true);
    // Both claws' Crab Rage carry the observation.
    expect(enemyPowers(ask, 0).find((text) => text.startsWith("CRAB_RAGE_POWER"))).toContain("observed in the logs: once its partner is dead its attacks no longer get the +50% from behind");
    expect(enemyPowers(ask, 1).find((text) => text.startsWith("CRAB_RAGE_POWER"))).toContain("no longer get the +50% from behind");
  }, 600_000);

  it("8L29N792FA45 F33 T5: the Crusher alone, the noted facing the dead Rocket's: its Guarded Strike lands as shown", () => {
    const off = jevOptions(askOf("8l29-f33-t5-crab-alone", { mechMoveRules: false }));
    const ask = askOf("8l29-f33-t5-crab-alone");
    const on = jevOptions(ask);
    // Off, a line turning to it took the x1.5 off a hit that never had it: the attacking lines read less than they cost.
    const attacking = (options: Record<string, Record<string, unknown>>) => Object.values(options).filter((option) => String(option["plays"]).includes("-> 碾碎爪"));
    expect(attacking(on).length).toBeGreaterThan(0);
    const offBy = new Map(attacking(off).map((option) => [String(option["plays"]), Number(option["hp_lost"])]));
    const more = attacking(on).filter((option) => offBy.has(String(option["plays"]))).map((option) => Number(option["hp_lost"]) - offBy.get(String(option["plays"]))!);
    expect(more.every((x) => x >= 0)).toBe(true);
    expect(more.some((x) => x > 0)).toBe(true);
    expect(enemyPowers(ask, 0).find((text) => text.startsWith("BACK_ATTACK_LEFT_POWER"))).toContain("its partner is dead: no back attack any more");
  }, 600_000);
});

describe("MECH_MOVE_RULES on: the Axebot's Stock", () => {
  it("Y3XT9EBS7U8B F45 T5 (Stock 1): a killing line says the Axebot is back in Boot Up; its Stock carries the observation; the log records it", () => {
    const ask = askOf("y3xt-f45-t5-axebot-stock1");
    const on = jevOptions(ask);
    const moving = Object.entries(on).filter(([, option]) => option["move_change"] !== undefined);
    expect(moving.length).toBeGreaterThan(0);
    for (const [, option] of moving) expect(String(option["move_change"])).toMatch(/^removes 巨斧机器人's 库存: its move becomes 启动 \(BOOT_UP_MOVE, no attack this turn instead of the \d+ shown; \d+ of \d+ logged\), already in hp_lost$/);
    expect(enemyPowers(ask, 0).find((text) => text.startsWith("STOCK_POWER"))).toMatch(/observed in the logs, not in its text: when it is removed on my turn its move changes at once to 启动 \(BOOT_UP_MOVE, no attack\), \d+ of \d+ times; when a stack of it is taken/);
    const [key] = moving[0]!;
    const log = ask.resolve(pickAnswer(key)).log as Record<string, unknown>;
    expect(log["mech"]).toMatchObject({ move_rules: expect.arrayContaining([{ enemy: "巨斧机器人", power: "STOCK_POWER", how: "removed", move: "BOOT_UP_MOVE", n: expect.any(Number) }]), moves_now: expect.arrayContaining([key]), chosen_moves: true });
  }, 600_000);

  it("8L29N792FA45 F39 T3 (Stock 2, 1 HP): the kill takes a stack, the lowered rule", () => {
    const moving = Object.values(jevOptions(askOf("8l29-f39-t3-axebot-stock2"))).filter((option) => option["move_change"] !== undefined);
    expect(moving.length).toBeGreaterThan(0);
    for (const option of moving) expect(String(option["move_change"])).toMatch(/^takes a stack of 巨斧机器人's 库存: its move becomes 启动/);
  }, 600_000);
});
