/**
 * THIEF_FACTS (docs/thief.md, src/strategy/thief.ts): the Thieving Hopper's stolen card and the Gremlin Merc's stolen
 * gold as facts on the combat question, the thieves' escape in the rollout, and the options kept for a kill before
 * they leave. With the switch off the question, Jev's view and every answer's resolution are byte for byte what they
 * were before (digests computed on the planner of 894f245, the commit this branch started from, on logged A8 boards,
 * with fake clocks and the knowledge data the planner reads pinned from that commit: tests/thief-data/make-fixtures.py).
 * The setup files load some planner modules with the real node:fs before this file's mock is in place: the module
 * registry is reset so every module loads again under it. Nothing under logs/ or .cache is read, nothing is written.
 * CAPTURE=1 prints new digests (only meaningful on the pre-change planner). With the switch on: thief_context and each
 * option's thief fact on the Hopper's boards (its theft from the fight's first frame, its last turn, a line stripping its
 * last Flutter), the Merc's and the Fat Gremlin's, the card unknown without the first frame and known again after a
 * restart (the journal replay), a killable Fat Gremlin's kill line shown, and the decision log's thief record.
 */

import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const KNOWLEDGE = join(ROOT, "src", "knowledge");
const DATA = join(HERE, "thief-data");
const unpinned = new Set<string>();
const pinnedRead = new Set<string>();
/** Paths under logs/ or .cache touched in any way, and every path written: both must stay empty. */
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
const { potionCostOptions } = await import("../src/strategy/potion-cost.js");
potionCostOptions.enabled = true;
const { makeKnowledge } = await import("../src/knowledge/index.js");
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
  source: string;
  state: Record<string, unknown>;
  fightStart: { fight: string; deck: { card_id: string; name: string; upgraded: boolean }[]; gold: number };
}

function board(name: string): Board {
  return JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8")) as Board;
}

/** The screen memory's note of the fight's first frame (thief.ts noteFightStart), from the board's logged first frame. */
function startMemory(fx: Board): Record<string, unknown> {
  return { thiefStart: { fight: fx.fightStart.fight, deck: fx.fightStart.deck.map((card) => `${card.card_id}${card.upgraded ? "+" : ""}|${card.name}`), gold: fx.fightStart.gold } };
}

/** A logged board's decision environment, with the fight's first frame noted; `memory` adds to its screen memory. */
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

/** Digests of the planner before THIEF_FACTS (894f245), on the boards above (JEV_CONTEXT off and v1). */
const GOLDEN: Record<string, string> = {
  "rpc6-f20-t2-hopper:off": "bbeb3e9d8e11e2a5584f4512f847af3a",
  "rpc6-f20-t2-hopper:v1": "95a78375dd9fb9cb64dc7cce43dfb67c",
  "rpc6-f20-t3-hopper:off": "55da5a71377f822be079e44789580725",
  "rpc6-f20-t3-hopper:v1": "23ce9973e8e8df02c91e31ed53197071",
  "rpc6-f20-t4-hopper:off": "277713e71df22fde2d4b66f727024d94",
  "rpc6-f20-t4-hopper:v1": "1bc2ed5be499bc16776cb773f4dcf715",
  "rpc6-f20-t5-hopper-escape:off": "9562f6dab38409ab7689d6084ea39e8e",
  "rpc6-f20-t5-hopper-escape:v1": "9e769628db5d163053a6f2ba40ac32f3",
  "8v0h-f19-t5-hopper-escape:off": "dd7cb595e0725206391c4f22e582959e",
  "8v0h-f19-t5-hopper-escape:v1": "67cde2d01f7751b757bb926e2bbeae33",
  "4lc3-f21-t4-hopper:off": "71cf857eec957ca3f67b55bd1bdeb625",
  "4lc3-f21-t4-hopper:v1": "e559259763a5b3691fbd9dce7bc8f7a8",
  "rpc6-f8-t2-merc:off": "ad9c4d95dfafdf445b2eef2183e9ec39",
  "rpc6-f8-t2-merc:v1": "73e2dbb49c848b86a946aeeedad38435",
  "rpc6-f8-t4-gremlins:off": "c0859e071aefde70cd9fcef0addf87d5",
  "rpc6-f8-t4-gremlins:v1": "3b60df447400a2b42288dcdbba574631",
  "jf8n-f9-t3-gremlins:off": "01d7fbe9a929cec11e10e4c606f2da86",
  "jf8n-f9-t3-gremlins:v1": "1a7c01185219bd4a461f487b536e7118",
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

describe("THIEF_FACTS off: the combat question as before", () => {
  it("every logged thief board's decision is the pre-change one, byte for byte", () => {
    frozen();
    const got: Record<string, string> = {};
    for (const name of BOARDS) for (const ctx of ["off", "v1"] as const) got[`${name}:${ctx}`] = digest(viewOf(envOf(name, { jevContext: ctx, thiefFacts: false })));
    if (process.env["CAPTURE"] === "1") console.log(JSON.stringify(got, null, 2));
    expect(got).toEqual(GOLDEN);
    expect([...touched]).toEqual([]);
  }, 300_000);
});

const { replayRun } = await import("../src/project/journal-replay.js");
const { noteFightStart, thievesOf } = await import("../src/strategy/thief.js");

/** The question's options as Jev sees them (JEV_CONTEXT=v1), parsed. */
function jevOptions(decision: AskDecision): Record<string, Record<string, unknown>> {
  const criteria = (decision.jevView!.questions["plan"] as { criteria: Record<string, string | null> }).criteria;
  return Object.fromEntries(Object.entries(criteria).map(([key, text]) => [key, text ? (JSON.parse(text) as Record<string, unknown>) : {}]));
}

function askOn(name: string, edit?: (state: Record<string, unknown>) => void): AskDecision {
  frozen();
  const env = envOf(name, { jevContext: "v1" });
  if (edit) {
    const fx = board(name);
    edit(fx.state);
    env.state = parseGameState(fx.state);
  }
  const decision = planCombatTurn(env);
  expect(decision?.kind).toBe("ask");
  return decision as AskDecision;
}

const pickAnswer = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;

describe("THIEF_FACTS on: the Thieving Hopper", () => {
  it("T2: what it carries (the card missing since the fight's first frame), turns left, HP; every option's thief fact", () => {
    const decision = askOn("rpc6-f20-t2-hopper");
    const context = decision.state["thief_context"] as Record<string, Record<string, unknown>>;
    expect(context["偷窃草蜢"]).toEqual({
      hp: "84/84",
      block: 0,
      carries: "岩石铠甲: the card it stole from your deck on turn 1; back in the deck if it is killed, gone for the run if it leaves",
      turns_left: "4, this one included: it leaves (Escape) at the end of turn 5",
    });
    expect(String(context["rollout"])).toContain("an enemy whose Escape/Flee resolves is gone");
    // Jev's view carries it too, and every plan option says what this turn leaves and how often the rollout kills it in time.
    expect(decision.jevView!.state["thief_context"]).toEqual(context);
    for (const [key, option] of Object.entries(jevOptions(decision))) {
      if (!key.startsWith("plan")) continue;
      expect(String(option["thief"])).toMatch(/^偷窃草蜢 left at \d+ HP, leaves at the end of turn 5; rollout: killed before it leaves in \d\/8 samples, left with it in \d\/8$/);
    }
    // The escalator's question (the decision's own) carries the same facts.
    const escalator = (decision.questions["plan"] as { criteria: Record<string, string> }).criteria;
    expect(JSON.parse(escalator["plan1"]!)["thief"]).toBe(jevOptions(decision)["plan1"]!["thief"]);
    // The decision log: the thief, no line killing it this turn, the rollout's line most often killing it in time (shown).
    const log = decision.resolve(pickAnswer("plan1")).log as { thief: Record<string, unknown> };
    expect(log.thief).toMatchObject({ thieves: [{ name: "偷窃草蜢", id: "THIEVING_HOPPER", carries: "岩石铠甲", turns_left: 4 }], kills_now: [], rollout_line_added: false, chosen_kills: false });
  });

  it("its Escape turn: this turn is the last; the lines that leave it alive say it leaves with the card", () => {
    const decision = askOn("rpc6-f20-t5-hopper-escape");
    const context = decision.state["thief_context"] as Record<string, Record<string, unknown>>;
    expect(context["偷窃草蜢"]!["turns_left"]).toBe("1: this turn is the last, it leaves (Escape) at the end of this turn");
    expect(context["偷窃草蜢"]!["flutter"]).toBe("5: each attack hit removes one; at 0 it is stunned and this turn's move is cancelled (its Escape too: it leaves a turn later)");
    expect(jevOptions(decision)["plan1"]!["thief"]).toBe("偷窃草蜢 left at 37 HP, leaves at the end of this turn with 岩石铠甲; rollout: killed before it leaves in 0/8 samples, left with it in 8/8");
  });

  it("a line stripping its last Flutter on the Escape turn: stunned, one more turn (8V0HD9Y207WY F19 T5)", () => {
    const decision = askOn("8v0h-f19-t5-hopper-escape");
    const facts = Object.values(jevOptions(decision)).map((option) => String(option["thief"] ?? ""));
    expect(facts).toContain("偷窃草蜢 left at 17 HP, leaves at the end of next turn; its last Flutter stripped: stunned, this turn's move cancelled (its Escape: one more turn); rollout: killed before it leaves in 8/8 samples, left with it in 0/8");
    expect(facts).toContain("偷窃草蜢 left at 25 HP, leaves at the end of this turn with 燃烧; rollout: killed before it leaves in 0/8 samples, left with it in 8/8");
  });

  it("the fight's first frame not seen (a restart with no logged frame): one card, unknown which", () => {
    frozen();
    const decision = planCombatTurn(envOf("rpc6-f20-t3-hopper", { jevContext: "v1" }, { thiefStart: undefined })) as AskDecision;
    expect((decision.state["thief_context"] as Record<string, Record<string, unknown>>)["偷窃草蜢"]!["carries"]).toBe(
      "one card from your deck (which one is unknown: the fight's start was not seen): the card it stole from your deck on turn 1; back in the deck if it is killed, gone for the run if it leaves",
    );
  });

  it("after a restart the journal replay notes the fight's first logged frame: the stolen card is known again", () => {
    const fx = board("rpc6-f20-t2-hopper");
    // The fight's first frame (turn 1, before the theft): the T2 board with the deck and gold logged at the start.
    const t1 = JSON.parse(JSON.stringify(fx.state)) as Record<string, Record<string, unknown>>;
    t1["turn"] = 1 as never;
    t1["run"]!["deck"] = fx.fightStart.deck;
    t1["run"]!["gold"] = fx.fightStart.gold;
    const replay = replayRun({ runId: "RPC6X61N9FQ0", states: [{ ts: "2026-10-01T07:54:41.018Z", observed: true, observed_ts: "2026-10-01T07:54:41.018Z", state: t1 as never }, { ts: "2026-10-01T07:54:52.380Z", state: fx.state as never }], decisions: [], runPlans: [] }, knowledge);
    expect(replay.thiefStart?.fight).toBe("RPC6X61N9FQ0:1:20");
    const memory = { ...createScreenMemory("COMBAT"), thiefStart: replay.thiefStart! };
    expect(thievesOf(parseGameState(fx.state), memory).map((thief) => thief.cards)).toEqual([["岩石铠甲"]]);
  });
});

describe("THIEF_FACTS on: the Gremlin Merc and the Fat Gremlin", () => {
  it("the Merc: gold stolen so far (the fight's first frame's gold less now), where it goes on death", () => {
    const decision = askOn("rpc6-f8-t2-merc");
    expect((decision.state["thief_context"] as Record<string, unknown>)["地精佣兵"]).toEqual({
      hp: "28/52",
      block: 0,
      carries: "20 gold stolen so far (it takes 20 more on each attack); when it dies the gold goes to the 胖地精 it spawns: back if that one is killed, gone if it flees",
      turns_left: "it does not leave; the 胖地精 it spawns on death flees at the end of the turn after it appears (that turn and the next to kill it)",
    });
    expect(String(jevOptions(decision)["plan1"]!["thief"])).toMatch(/^地精佣兵 left at \d+ HP, it keeps the 20 gold; rollout: its gold back \(the 胖地精 killed before it flees\) in \d\/8 samples, left with it in \d\/8/);
  });

  it("the Fat Gremlin on its Flee turn: no line kills it (14 HP), none added; killable, a line killing it is among the options", () => {
    const before = askOn("rpc6-f8-t4-gremlins");
    expect((before.state["thief_context"] as Record<string, Record<string, unknown>>)["胖地精"]!["turns_left"]).toBe("1: this turn is the last, it flees at the end of this turn");
    expect((before.resolve(pickAnswer("plan1")).log as { thief: Record<string, unknown> }).thief["kills_now"]).toEqual([]);
    // At 6 HP a Strike kills it: some option does, and says what comes back.
    const decision = askOn("rpc6-f8-t4-gremlins", (state) => {
      const fat = ((state["combat"] as Record<string, unknown>)["enemies"] as Record<string, unknown>[])[1]!;
      fat["current_hp"] = 6;
    });
    const kills = Object.entries(jevOptions(decision)).filter(([, option]) => String(option["thief"]).startsWith("kills 胖地精: its 40 gold comes back"));
    expect(kills.length).toBeGreaterThan(0);
    const log = decision.resolve(pickAnswer(kills[0]![0])).log as { thief: Record<string, unknown> };
    expect(log.thief["kills_now"]).toContain(kills[0]![0]);
    expect(log.thief["chosen_kills"]).toBe(true);
  });
});

describe("THIEF_FACTS off", () => {
  it("no thief_context, no thief fact, no thief log", () => {
    frozen();
    for (const name of ["rpc6-f20-t5-hopper-escape", "rpc6-f8-t2-merc"]) {
      const decision = planCombatTurn(envOf(name, { jevContext: "v1", thiefFacts: false })) as AskDecision;
      expect(decision.state["thief_context"]).toBeUndefined();
      expect(Object.values(jevOptions(decision)).some((option) => "thief" in option)).toBe(false);
      expect((decision.resolve(pickAnswer("plan1")).log ?? {})["thief"]).toBeUndefined();
    }
  });
});

describe("THIEF_FACTS fail safe (live play)", () => {
  it("a thief step that throws (a broken first-frame note) leaves the decision exactly as with the switch off", () => {
    frozen();
    for (const name of ["rpc6-f20-t3-hopper", "rpc6-f20-t5-hopper-escape"] as const) {
      const fight = board(name).fightStart.fight;
      const broken = { thiefStart: { fight, deck: null as never, gold: 0 } };
      expect(digest(viewOf(envOf(name, { jevContext: "v1" }, broken)))).toBe(GOLDEN[`${name}:v1`]);
    }
  });

  it("the fight's first frame is noted whatever the state (an odd one is skipped, never thrown)", () => {
    const memory = createScreenMemory("COMBAT");
    expect(() => noteFightStart(memory, { in_combat: true, run: { raw: null }, raw: {} } as never)).not.toThrow();
  });
});
