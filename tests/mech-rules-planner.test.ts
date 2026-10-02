/**
 * MECH_RULES on the combat planner (docs/mechanics-learning.md): the learned "stunned when a power is stripped to 0" rule
 * on logged A8 Thieving Hopper boards (tests/thief-data, the knowledge data pinned from 894f245, with a monster DB
 * `observed` block like the 2026-10-02 build's added: Flutter 41 of 41 strips stunned). With the switch off, and with the
 * switch on but no `observed` data, the question, Jev's view and every answer's resolution are byte for byte those of
 * v4 ffed0d4 (digests computed there on the same boards, fake clocks: CAPTURE=1 prints them, only meaningful on that
 * commit). With it on: a line stripping the Hopper's last Flutter leaves its attack out of hp_lost and says so, the
 * enemy's Flutter carries the observation, and the decision log records the rule. A failure reading the rules is the
 * question with the switch off. Nothing under logs/ or .cache is read, nothing is written.
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "thief-data");
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
const touched = new Set<string>();

/** The `observed` block the monster DB gets here: the Flutter rule as the 2026-10-02 build has it, and a non-rule. */
const OBSERVED = {
  note: "test",
  end_turn_check: true,
  powers_stripped: {
    FLUTTER_POWER: {
      n: 41, fights: 41, amount_before: { "1": 30, "2": 3, "3": 4, "4": 3, "5": 1 }, move_after: { STUNNED: 41 }, stunned_share: 1, co_removed: {},
      died_same_turn: 22, turn_end_unclear: 0, alive_at_turn_end: 19, stunned_at_turn_end: 19, attack_before: 10, attack_cancelled: 10,
      hp_check: { n: 9, landed: 0 }, evidence: ["JGJS7QE62GLD F19 T3", "K39JRY3WW4VM F19 T4", "VQSA3FRA2ML9 F20 T5"], monsters: { THIEVING_HOPPER: 41 },
    },
    SLIPPERY_POWER: { n: 233, fights: 128, move_after: { JAB_MOVE: 80 }, stunned_share: 0, attack_before: 133, attack_cancelled: 0, hp_check: { n: 47, landed: 44 }, evidence: [], monsters: { INKLET: 168 } },
  },
};

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
      if (name in pinned) return JSON.stringify(name === "monster-db.json" ? { ...pinned[name], observed: OBSERVED } : pinned[name]);
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
const { setMonsterDbForTests } = await import("../src/knowledge/monster-db.js");
const { loadConfig } = await import("../src/config.js");
const { parseGameState } = await import("../src/mod/schema.js");
const { buildRunBrief } = await import("../src/project/run-brief.js");
const { createScreenMemory } = await import("../src/project/types.js");
const { planCombatTurn } = await import("../src/screens/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/strategy/rollout-live.js");
const { potionMcOptions } = await import("../src/strategy/potion-mc.js");
type AnswerSet = import("../src/jev/answers.js").AnswerSet;
type AskDecision = import("../src/project/types.js").AskDecision;
type DecisionEnv = import("../src/project/types.js").DecisionEnv;

const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

interface Board {
  state: Record<string, unknown>;
  fightStart: { fight: string; deck: { card_id: string; name: string; upgraded: boolean }[]; gold: number };
}

function board(name: string): Board {
  return JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
}

/** A logged board's decision environment (THIEF_FACTS as configured live: on), the fight's first frame noted. */
function envOf(name: string, over: Record<string, unknown> = {}): DecisionEnv {
  const fx = board(name);
  const state = parseGameState(fx.state);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
    strictJev: true, combatPlanner: "turn", shopDiscardPotions: [],
    screenMemory: { ...createScreenMemory(state.screen), thiefStart: { fight: fx.fightStart.fight, deck: fx.fightStart.deck.map((card) => `${card.card_id}${card.upgraded ? "+" : ""}|${card.name}`), gold: fx.fightStart.gold } },
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

const BOARDS = ["rpc6-f20-t3-hopper", "rpc6-f20-t4-hopper", "rpc6-f20-t5-hopper-escape", "8v0h-f19-t5-hopper-escape", "4lc3-f21-t4-hopper", "jf8n-f9-t3-gremlins"] as const;

/** Digests of v4 ffed0d4's planner on the boards above (JEV_CONTEXT off and v1, THIEF_FACTS on). */
const GOLDEN: Record<string, string> = {
  "rpc6-f20-t3-hopper:off": "5c205aa8cb08ac26f726b3a3c03da85f",
  "rpc6-f20-t3-hopper:v1": "6ba59423258646b2272db82709ae6687",
  "rpc6-f20-t4-hopper:off": "2941865d9f864b4b8f7936113634e342",
  "rpc6-f20-t4-hopper:v1": "e4fd7f95d063a98fd41d13697b433df7",
  "rpc6-f20-t5-hopper-escape:off": "f7f2e4ce610c5f8ad081eb7085e61602",
  "rpc6-f20-t5-hopper-escape:v1": "03e5ab3b9b98f09ced6fbe27ca405de3",
  "8v0h-f19-t5-hopper-escape:off": "a4fd37500760c817b46e117f94b5d053",
  "8v0h-f19-t5-hopper-escape:v1": "81eb906e12075d55a889771021ee3d32",
  "4lc3-f21-t4-hopper:off": "3df091c621b1f89949cb2e4c320588b3",
  "4lc3-f21-t4-hopper:v1": "7d8b9007a258dfe3fe13c3ef2ad36624",
  "jf8n-f9-t3-gremlins:off": "1d23cf0e0867217387209b2d72860b8f",
  "jf8n-f9-t3-gremlins:v1": "9660f4117a48657ce5d254e906c11c20",
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

function digests(over: Record<string, unknown>): Record<string, string> {
  frozen();
  const got: Record<string, string> = {};
  for (const name of BOARDS) for (const ctx of ["off", "v1"] as const) got[`${name}:${ctx}`] = digest(viewOf(envOf(name, { jevContext: ctx, ...over })));
  return got;
}

describe("MECH_RULES off: the combat question as at v4 ffed0d4", () => {
  it("with the observed data in the monster DB, every logged Hopper board's decision is the pre-change one, byte for byte", () => {
    const got = digests({ mechRules: false });
    if (process.env["CAPTURE"] === "1") console.log(JSON.stringify(got, null, 2));
    expect(got).toEqual(GOLDEN);
    expect([...touched]).toEqual([]);
  }, 600_000);

  it("on, but a monster DB without the observed data: the same", () => {
    const pinned = JSON.parse(readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Parameters<typeof setMonsterDbForTests>[0]>;
    setMonsterDbForTests(pinned["monster-db.json"]!);
    expect(digests({ mechRules: true })).toEqual(GOLDEN);
  }, 600_000);

  it("on, and reading the rules fails: the same (fail safe)", () => {
    const pinned = JSON.parse(readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Record<string, unknown>>;
    const broken = {
      ...pinned["monster-db.json"]!,
      observed: {
        get powers_stripped(): never {
          throw new Error("broken observed block");
        },
      },
    };
    setMonsterDbForTests(broken as unknown as Parameters<typeof setMonsterDbForTests>[0]);
    expect(digests({})).toEqual(GOLDEN);
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

describe("MECH_RULES on: the Hopper's last Flutter", () => {
  it("RPC6X61N9FQ0 F20 T3 (Flutter 5, Hat Trick 21): the line with five hits leaves the attack out of hp_lost and says so", () => {
    const off = jevOptions(askOf("rpc6-f20-t3-hopper", { mechRules: false }));
    const strip = (options: Record<string, Record<string, unknown>>) => Object.values(options).find((option) => String(option["plays"]).startsWith("双重打击 -> 偷窃草蜢") && String(option["plays"]).includes("飞剑回旋镖"));
    // Off: the stripping line still counts Hat Trick (13 lost), and its thief fact says so.
    expect(strip(off)?.["hp_lost"]).toBe(13);
    expect(String(strip(off)?.["thief"])).toContain("hp_lost above still counts its attack");
    const ask = askOf("rpc6-f20-t3-hopper");
    const on = jevOptions(ask);
    const line = strip(on)!;
    expect(line["hp_lost"]).toBe(0);
    expect(line["stripped_stun"]).toBe("stuns 偷窃草蜢 (its last 振翅 stripped): its attack this turn (21) is cancelled, already left out of hp_lost");
    expect(String(line["thief"])).toContain("hp_lost above leaves its attack out");
    // No other option carries the fact.
    expect(Object.values(on).filter((option) => option["stripped_stun"] !== undefined).every((option) => String(option["plays"]).includes("双重打击"))).toBe(true);
    // The enemy's Flutter in the question carries the observation; the other powers do not.
    const powers = ((ask.jevView!.state as Record<string, unknown>)["enemies"] as { powers: string[] }[])[0]!.powers;
    expect(powers.find((text) => text.startsWith("FLUTTER_POWER"))).toContain("observed in the logs, not in its text: when its last stack is stripped on my turn it is stunned at once and its move this turn is cancelled, 41 of 41 strips in 41 fights");
    expect(powers.filter((text) => text.includes("observed in the logs"))).toHaveLength(1);
    // The decision log: the rule, the shown lines setting it off, and whether the chosen one does.
    const key = Object.entries(on).find(([, option]) => option === line)![0];
    const log = ask.resolve(pickAnswer(key)).log as Record<string, unknown>;
    expect(log["mech"]).toEqual({ rules: [{ enemy: "偷窃草蜢", power: "FLUTTER_POWER", n: 41 }], stuns_now: expect.arrayContaining([key]), chosen_stuns: true });
  }, 600_000);

  it("8V0HD9Y207WY F19 T5 (its Escape turn, Flutter 2): the stripping line cancels its move, the Escape a turn later", () => {
    const on = jevOptions(askOf("8v0h-f19-t5-hopper-escape"));
    const stripping = Object.values(on).filter((option) => option["stripped_stun"] !== undefined);
    expect(stripping.length).toBeGreaterThan(0);
    for (const option of stripping) {
      expect(option["stripped_stun"]).toBe("stuns 偷窃草蜢 (its last 振翅 stripped): its move this turn is cancelled");
      expect(String(option["thief"])).toContain("(its Escape: one more turn)");
    }
  }, 600_000);
});
