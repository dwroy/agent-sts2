/**
 * THIEF_COST (docs/thief.md §7, Roy 2026-10-02): the thieves' loot as HP in the rollout's ranking, like a potion's cost.
 * With the switch off (THIEF_FACTS on) every logged thief board's question, Jev's view and every answer's resolution are
 * byte for byte the planner of ffed0d4 (the commit this branch started from; digests computed there with this file's
 * harness, CAPTURE=1 -t "THIEF_COST off"), on the boards and pinned knowledge of tests/thief.test.ts. With it on: the
 * Hopper's card (a fixed value in screen memory, as the loop leaves it) and the gold (a fixed gold rate in the pinned
 * potion table) in thief_context and each option's thief fact, the loot cost in the ranking (a line that stuns the Hopper
 * on its Escape turn and kills it a turn later comes first), the decision log, the fallback, the HP guard's swap rule,
 * the fail safe, the journal replay. Nothing under logs/ or .cache is read, nothing is written.
 */

import { createHash } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "..", "knowledge");
const DATA = join(HERE, "thief-data");
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
const touched = new Set<string>();

/** The gold rate the cost-on boards read (a fixed one: 51 gold a potion, 5.7 HP held in act 1 at A8, as built on 2026-10-02). */
const GOLD_HP = {
  price: { median: 51, n: 2031, visits: 677, min_asc: 8 },
  by_asc: {
    "8": { "1": { per_gold: 0.1118, hold_hp: 5.7, n: 2031, formula: "5.7 ÷ 51" }, "2": { per_gold: 0.1412, hold_hp: 7.2, n: 2031, formula: "7.2 ÷ 51" } },
    "9": { "1": { per_gold: 0.1235, hold_hp: 6.3, n: 2031, formula: "6.3 ÷ 51" }, "2": { per_gold: 0.1902, hold_hp: 9.7, n: 2031, formula: "9.7 ÷ 51" } },
  },
};

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  const pinned = JSON.parse(fs.readFileSync(join(DATA, "pinned-knowledge.json"), "utf8")) as Record<string, Record<string, Record<string, unknown>>>;
  // The pinned potion table (894f245's) with a gold rate: read only with THIEF_COST on (ffed0d4 never reads it).
  pinned["potion-equivalents.json"]!["meta"]!["gold_hp"] = GOLD_HP;
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
const { potionCostOptions } = await import("../src/reflex/potion-cost.js");
potionCostOptions.enabled = true;
// PASSIVE_PIECES (src/reflex/passive-pieces.ts) postdates these digests: off here, on the fresh module (the boards holding
// Orichalcum, Ripple Basin or Ornamental Fan change with it on: tests/passive-pieces-planner.test.ts).
const { passivePiecesOptions } = await import("../src/reflex/passive-pieces.js");
passivePiecesOptions.enabled = false;
const { makeKnowledge } = await import("../src/knowledge/index.js");
const { loadConfig } = await import("../src/core/config.js");
const { parseGameState } = await import("../src/hand/mod/schema.js");
const { buildRunBrief } = await import("../src/memory/run-brief.js");
const { createScreenMemory } = await import("../src/memory/types.js");
const { planCombatTurn } = await import("../src/reflex/combat-plan.js");
const { rolloutLiveOptions, ROLLOUT_BUDGET_MS } = await import("../src/reflex/rollout-live.js");
const { potionMcOptions } = await import("../src/reflex/potion-mc.js");
type AnswerSet = import("../src/reflex/jev/answers.js").AnswerSet;
type AskDecision = import("../src/memory/types.js").AskDecision;
type DecisionEnv = import("../src/memory/types.js").DecisionEnv;

const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const config = loadConfig({} as NodeJS.ProcessEnv);

interface Board {
  source: string;
  state: Record<string, unknown>;
  fightStart: { fight: string; deck: { card_id: string; name: string; upgraded: boolean }[]; gold: number };
}

function board(name: string): Board {
  return JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
}

function startMemory(fx: Board): Record<string, unknown> {
  return { thiefStart: { fight: fx.fightStart.fight, deck: fx.fightStart.deck.map((card) => `${card.card_id}${card.upgraded ? "+" : ""}|${card.name}`), gold: fx.fightStart.gold } };
}

function envOf(name: string, over: Partial<DecisionEnv> = {}, memory: Record<string, unknown> = {}): DecisionEnv {
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
    screenMemory: { ...createScreenMemory(state.screen), ...startMemory(fx), ...memory },
    shopDiscardPotions: [],
    ...over,
  };
}

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

const BOARDS = [
  "rpc6-f20-t2-hopper",
  "rpc6-f20-t3-hopper",
  "rpc6-f20-t4-hopper",
  "rpc6-f20-t5-hopper-escape",
  "8v0h-f19-t5-hopper-escape",
  "4lc3-f21-t4-hopper",
  "rpc6-f8-t2-merc",
  "rpc6-f8-t4-gremlins",
  "jf8n-f9-t3-gremlins",
] as const;

/** Digests of the planner of ffed0d4 (THIEF_FACTS on, its default) on the boards above (JEV_CONTEXT off and v1). */
const GOLDEN_FACTS_ON: Record<string, string> = {
  "rpc6-f20-t2-hopper:off": "b595a87357e349a0f0ca3e56a29ff1c6",
  "rpc6-f20-t2-hopper:v1": "805866fca41fc0380222b65ce1b93546",
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
  "rpc6-f8-t2-merc:off": "ac2c94dc5bfa8df34aadfd15d5cf2ec6",
  "rpc6-f8-t2-merc:v1": "45bb471b382bc89b737207655702ccf2",
  "rpc6-f8-t4-gremlins:off": "fcd465247a280103578dcde147b97b71",
  "rpc6-f8-t4-gremlins:v1": "8e96a7fc8ddf440e2adab4b931b63ac6",
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
});

describe("THIEF_COST off: the combat question as with THIEF_FACTS alone (ffed0d4)", () => {
  it("every logged thief board's decision is ffed0d4's, byte for byte (the switch absent, and false)", () => {
    frozen();
    const got: Record<string, string> = {};
    for (const name of BOARDS) for (const ctx of ["off", "v1"] as const) got[`${name}:${ctx}`] = digest(viewOf(envOf(name, { jevContext: ctx })));
    if (process.env["CAPTURE"] === "1") console.log(JSON.stringify(got, null, 2));
    expect(got).toEqual(GOLDEN_FACTS_ON);
    const off: Record<string, string> = {};
    for (const name of BOARDS) off[`${name}:v1`] = digest(viewOf(envOf(name, { jevContext: "v1", thiefCost: false } as Partial<DecisionEnv>)));
    for (const [key, value] of Object.entries(off)) expect(value).toBe(GOLDEN_FACTS_ON[key]);
    expect([...touched]).toEqual([]);
  }, 300_000);
});

const { cardValueText } = await import("../src/sim/thief-card-hp.js");
type ThiefCardValue = import("../src/sim/thief-card-hp.js").ThiefCardValue;

/** A stolen card's value as the loop leaves it in screen memory (fixed numbers: 46% → 38% without it, 1 HP ≈ 0.7 points). */
function cardValue(fight: string, card: string, hp: number): ThiefCardValue {
  return {
    fight, card, cardId: "X", boss: "KNOWLEDGE_DEMON", bossName: "知识恶魔", lowTrust: null, entryHp: 61, maxHp: 80, entrySource: "fixed", step: 10,
    samples: 1000, requested: 1000, timedOut: false, ms: 9000,
    measures: { win: { with: 0.46, without: 0.38, lower: 0.39 }, cardDiff: { value: 0.08, se: 0.014 }, perHp: { value: 0.007, se: 0.0012 }, bossLeft: { with: 20, card: { value: 9, se: 1 }, perHp: { value: 1, se: 0.1 } }, hpLost: { with: 40, card: { value: 3, se: 1 } } },
    route: "win", ratio: hp, hp, status: "ok", why: null,
  };
}

function jevOptions(decision: AskDecision): Record<string, Record<string, unknown>> {
  const criteria = (decision.jevView!.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(criteria).map(([key, text]) => [key, text ? (JSON.parse(text) as Record<string, unknown>) : {}]));
}

const pickAnswer = (key: string, confidence = 0.9): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: confidence }, confidence, raw: {} } }) as AnswerSet;

function askOf(name: string, cost: boolean | undefined, memory: Record<string, unknown> = {}): AskDecision {
  frozen();
  const decision = planCombatTurn(envOf(name, { jevContext: "v1", ...(cost === undefined ? {} : { thiefCost: cost }) } as Partial<DecisionEnv>, memory));
  expect(decision?.kind).toBe("ask");
  return decision as AskDecision;
}

/** The rollout_best option's key, or null (tied, none). */
function bestKey(decision: AskDecision): string | null {
  return Object.entries(jevOptions(decision)).find(([, option]) => option["rollout_best"] === true)?.[0] ?? null;
}

const RPC6_ROCK = () => cardValue("RPC6X61N9FQ0:1:20", "岩石铠甲", 12);
const V8_INFLAME = () => cardValue("8V0HD9Y207WY:1:19", "燃烧", 12);

describe("THIEF_COST on: the Hopper's card", () => {
  it("T2: thief_context gives the card's HP and its derivation; each option's loot cost is its value x the samples losing it", () => {
    const decision = askOf("rpc6-f20-t2-hopper", true, { thiefCardValue: RPC6_ROCK() });
    const context = decision.state["thief_context"] as Record<string, Record<string, unknown>>;
    expect(context["偷窃草蜢"]!["loot_hp"]).toBe(cardValueText(RPC6_ROCK()));
    expect(String(context["loot_cost"])).toContain("deaths first, then further HP loss + potion cost + loot cost");
    let checked = 0;
    for (const [key, option] of Object.entries(jevOptions(decision))) {
      if (!key.startsWith("plan")) continue;
      const fact = /; loot cost ([\d.]+) HP: 岩石铠甲 ≈ 12 HP \(boss win 46% → 38% without it, 1 HP ≈ 0\.7 points\) × lost in (\d)\/8 samples/.exec(String(option["thief"]));
      expect(fact).not.toBeNull();
      expect(Number(fact![1])).toBeCloseTo((12 * Number(fact![2])) / 8, 1);
      expect(String(option["rollout"])).toContain(`loot cost ${fact![1]}`);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(1);
    // The decision log: the card's HP, each shown line's loot cost and the chosen one's.
    const log = decision.resolve(pickAnswer("plan1")).log as { thief: Record<string, unknown> };
    expect((log.thief["thieves"] as Record<string, unknown>[])[0]!["loot_hp"]).toBe(12);
    expect(Object.keys(log.thief["loot_cost"] as Record<string, number>)).toContain("plan1");
    expect(typeof log.thief["chosen_loot_cost"]).toBe("number");
  });

  it("its Escape turn (8V0HD9Y207WY F19 T5): the line stunning it, killed next turn 8/8, is the rollout's best and code's fallback", () => {
    const off = askOf("8v0h-f19-t5-hopper-escape", false, { thiefCardValue: V8_INFLAME() });
    const on = askOf("8v0h-f19-t5-hopper-escape", true, { thiefCardValue: V8_INFLAME() });
    const stun = Object.entries(jevOptions(on)).find(([, option]) => String(option["thief"]).includes("stunned"))![0];
    expect(bestKey(off)).not.toBe(stun);
    expect(bestKey(on)).toBe(stun);
    expect(String(jevOptions(on)[stun]!["thief"])).toContain("loot cost 0 HP");
    // No answer: off plays code's best line, on the rollout's (its ranking counts the card).
    expect(off.resolve({} as AnswerSet).rationale).toContain("using the code-best plan");
    expect(on.resolve({} as AnswerSet).rationale).toContain("using the rollout's best plan (its ranking counts the thief's loot)");
  });

  it("no value computed for this fight (another fight's, or none): no cost, the facts say why, every choice as with the switch off", () => {
    for (const memory of [{}, { thiefCardValue: V8_INFLAME() }]) {
      const off = askOf("rpc6-f20-t3-hopper", false, memory);
      const on = askOf("rpc6-f20-t3-hopper", true, memory);
      expect((on.state["thief_context"] as Record<string, Record<string, unknown>>)["偷窃草蜢"]!["loot_hp"]).toBe("no HP value: the stolen card's worth has not been computed for this fight");
      expect(bestKey(on)).toBe(bestKey(off));
      const keys = Object.keys(jevOptions(off));
      expect(Object.keys(jevOptions(on))).toEqual(keys);
      for (const key of [...keys, "none"]) {
        const answers = key === "none" ? ({} as AnswerSet) : pickAnswer(key);
        expect(on.resolve(answers).intent).toEqual(off.resolve(answers).intent);
        expect(on.resolve(answers).rationale).toBe(off.resolve(answers).rationale);
      }
    }
  });

  it("fail safe: a value that throws when read leaves the decision exactly as with THIEF_COST off", () => {
    const broken = new Proxy({}, { get: () => { throw new Error("broken value"); } });
    for (const name of ["rpc6-f20-t3-hopper", "8v0h-f19-t5-hopper-escape"] as const) {
      frozen();
      expect(digest(viewOf(envOf(name, { jevContext: "v1", thiefCost: true } as Partial<DecisionEnv>, { thiefCardValue: broken })))).toBe(GOLDEN_FACTS_ON[`${name}:v1`]);
    }
  });
});

describe("THIEF_COST on: the gold", () => {
  it("the Merc's take so far at the potion table's gold rate, and the Fat Gremlin's on its Flee turn", () => {
    const merc = askOf("rpc6-f8-t2-merc", true);
    const asc = parseGameState(board("rpc6-f8-t2-merc").state).run?.ascension;
    const rate = GOLD_HP.by_asc[String(asc) as "8" | "9"]["1"];
    const hp = Math.round(20 * rate.per_gold * 10) / 10;
    expect((merc.state["thief_context"] as Record<string, Record<string, unknown>>)["地精佣兵"]!["loot_hp"]).toBe(
      `20 gold ≈ ${hp} HP: 20 ÷ 51 gold a potion (median shop price, A8+ n=2031), a potion's held value ${rate.hold_hp} HP in act 1 (A${asc})`,
    );
    expect(String(jevOptions(merc)["plan1"]!["thief"])).toMatch(new RegExp(`; loot cost [\\d.]+ HP: 20 gold ≈ ${hp} HP \\(20 gold ÷ 51 a potion × ${rate.hold_hp} HP\\) × lost in \\d/8 samples`));
    const fat = askOf("rpc6-f8-t4-gremlins", true);
    expect(String((fat.state["thief_context"] as Record<string, Record<string, unknown>>)["胖地精"]!["loot_hp"])).toMatch(/^40 gold ≈ [\d.]+ HP: /);
  });
});

const { lootSwapOk } = await import("../src/reflex/combat-plan.js");
const { goldLoot, lastTurnLoot } = await import("../src/reflex/thief.js");
const { pickRolloutBest } = await import("../src/reflex/rollout-live.js");
const { replayRun } = await import("../src/memory/journal-replay.js");

describe("THIEF_COST: code's own choices", () => {
  const plan = (hpLoss: number) => ({ steps: [], outcome: { hpLoss } }) as never;

  it("the HP guard swaps only when the extra loot lost is no more than the HP the swap saves", () => {
    const pick = plan(15);
    const cheap = plan(5);
    // The cheap line loses 8 HP of loot more than the pick: it saves 10 HP, the swap is allowed; 12 more, it is not.
    expect(lootSwapOk(pick, cheap, (line) => (line === cheap ? 8 : 0))).toBe(true);
    expect(lootSwapOk(pick, cheap, (line) => (line === cheap ? 12 : 0))).toBe(false);
    expect(lootSwapOk(pick, cheap, () => 3)).toBe(true);
  });

  it("this turn's certain loss: a thief on its last turn the line neither kills nor stuns", () => {
    const thief = { index: 0, id: "THIEVING_HOPPER", name: "偷窃草蜢", hp: 30, maxHp: 84, block: 0, cards: ["燃烧"], turnsLeft: 1, flutter: 1, loot: { hp: 12, text: "", short: "" } };
    const line = (hp: number, flutter: number) => ({ steps: [], outcome: { winsFight: false, enemyHpAfter: [{ index: 0, hp, flutter }] } }) as never;
    expect(lastTurnLoot(line(10, 1), [thief])).toBe(12);
    expect(lastTurnLoot(line(10, 0), [thief])).toBe(0);
    expect(lastTurnLoot(line(0, 1), [thief])).toBe(0);
    expect(lastTurnLoot(line(10, 1), [{ ...thief, turnsLeft: 2 }])).toBe(0);
  });

  it("the ranking: deaths first when some line pays a loot cost, then the value with it taken off", () => {
    const base = { samples: 8, wins: 8, hpLoss: 2, enemyHpLeft: 0, turnsSurvived: 5, leaderHpLeft: null };
    const safe = { ...base, plan: plan(2), deaths: 0, thiefCost: 12, value: -14 } as never;
    const risky = { ...base, plan: plan(2), deaths: 1, thiefCost: 0, value: -7 } as never;
    expect(pickRolloutBest([safe, risky], 60).best).toBe(safe);
    const costly = { ...base, plan: plan(2), deaths: 0, thiefCost: 12, value: -14 } as never;
    const cheap = { ...base, plan: plan(3), deaths: 0, thiefCost: 0, value: -3 } as never;
    expect(pickRolloutBest([costly, cheap], 60).best).toBe(cheap);
  });

  it("gold without a rate in the table, or unknown gold: no value, said", () => {
    expect(goldLoot(40, 1, 8, { meta: { generated: "x", min_n: 5, ascensions: [8] }, rates: { "8": {} }, potions: {} } as never)).toMatchObject({ hp: null, short: "no gold rate" });
    expect(goldLoot(null, 1, 8, null)).toMatchObject({ hp: null, short: "gold unknown" });
  });
});

describe("THIEF_COST: a restart", () => {
  it("the journal replay takes the stolen card's value back from the decision row it was logged with", () => {
    const fx = board("rpc6-f20-t2-hopper");
    const value = RPC6_ROCK();
    const replay = replayRun(
      { runId: "RPC6X61N9FQ0", states: [{ ts: "2026-10-01T07:54:52.380Z", state: fx.state as never }], decisions: [{ ts: "2026-10-01T07:54:52.380Z", fingerprint: undefined, label: "combat/plan-choice", result: "ok", thief_card_value: value as never } as never], runPlans: [] },
      knowledge,
    );
    expect(replay.thiefCardValue).toEqual(value);
  });
});
