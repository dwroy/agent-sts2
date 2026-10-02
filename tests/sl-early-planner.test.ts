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
const { judgeEndTurn, judgeLeastLossNow } = await import("../src/sl/judge.js");
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

describe("a random enemy with one enemy to hit is certain (ops 2026-10-02, X7BX5DYHFZ3N F48: Juggernaut against the lone Aeonglass)", () => {
  type Raw = Record<string, unknown>;
  /** A logged board's least-loss facts and early verdict with Juggernaut or Kusarigama added. */
  const factsWith = (raw: Raw, add: "juggernaut" | "kusarigama") => {
    if (add === "juggernaut") ((((raw["combat"] as Raw)["player"] as Raw)["powers"]) as Raw[]).push({ index: 9, power_id: "JUGGERNAUT_POWER", name: "势不可当", amount: 6, is_debuff: false });
    else ((raw["run"] as Raw)["relics"] as Raw[]).push({ index: 99, relic_id: "KUSARIGAMA", name: "锁镰", description: "你每在同一回合内打出[blue]{Cards}[/blue]张攻击牌，就随机对一名敌人造成[blue]{Damage}[/blue]点伤害。", stack: 0 });
    const state = parseGameState(raw);
    const env = { ...envOf("tmnf-f48-t8-wither"), state, brief: buildRunBrief(state, knowledge), screenMemory: createScreenMemory(state.screen) } as DecisionEnv;
    const decision = planCombatTurn(env);
    const facts = leastLossFactsOf(decision);
    return { decision, facts, early: judgeLeastLossNow(state, { revives: [], facts, knownDrawsJudge: true, addedToPile: false, knowledge }) };
  };
  /** TMNF F48 T8 (the Aeonglass alone, every line dying) with 2 energy and Bash playable: a line plays an Attack. */
  const lone = (): Raw => {
    const raw = structuredClone(board("tmnf-f48-t8-wither").state) as Raw;
    const combat = raw["combat"] as Raw;
    (combat["player"] as Raw)["energy"] = 2;
    const bash = (combat["hand"] as Raw[]).find((card) => card["card_id"] === "BASH")!;
    Object.assign(bash, { playable: true, can_play_result: true, unplayable_reason: null });
    raw["available_actions"] = [...(raw["available_actions"] as string[]), "play_card"];
    return raw;
  };

  it("one enemy: Juggernaut's and Kusarigama's hits are certain, nothing left to chance, the judge reloads early", () => {
    frozen();
    for (const add of ["juggernaut", "kusarigama"] as const) {
      const { decision, facts, early } = factsWith(lone(), add);
      expect(decision?.label).toBe("combat/least-loss");
      expect(facts?.line).toEqual(["痛击+ -> 永世沙漏"]);
      expect(facts?.chance, add).toBeNull();
      expect(early).toMatchObject({ certain: true, early: true });
    }
  }, 120_000);

  it("two enemies (P57H F22 T5, the Obscura and its Parafright): the same hits are chance, not early", () => {
    frozen();
    expect(factsWith(structuredClone(board("p57h-f22-t5-certain").state) as Raw, "juggernaut").facts?.chance).toBe("Juggernaut hits a random enemy");
    const { facts, early } = factsWith(structuredClone(board("p57h-f22-t5-certain").state) as Raw, "kusarigama");
    expect(facts?.chance).toBe("Kusarigama hits a random enemy");
    expect(early.reason).toBe("not before the line is played: chance in the verdict (Kusarigama hits a random enemy)");
  }, 120_000);
});

describe("the judge counts held cards' end-of-turn damage (TMNFVW6DRQ20 F48 T8, the end_turn it missed with 5 retries left)", () => {
  type Raw = Record<string, unknown>;
  const tmnf = () => structuredClone(board("tmnf-f48-t8-wither").state) as Raw;
  const judge = (raw: Raw) => judgeEndTurn(parseGameState(raw), { label: "combat/least-loss", revives: [], knowledge });

  it("15 HP + 28 block against the Aeonglass's 19x2 and a held Wither+'s 9: the mod does not flag it, our count does: certain", () => {
    const raw = tmnf();
    expect((raw["combat"] as Raw)["end_turn_will_kill_player"]).toBe(false);
    const verdict = judge(raw);
    expect(verdict).toMatchObject({ certain: true, tier: "rules", hp: 15, block: 28, incoming: 38, held: { damage: 9, loss: 0 }, ownCountDies: true });
    expect(verdict.reason).toBe("nothing left to play or drink; 38 incoming + held 凋萎+2: 9 damage (the mod does not count them) vs 15 HP + 28 block + 0 end-of-turn block");
  });

  it("without the held card: the mod's veto, as before", () => {
    const raw = tmnf();
    const combat = raw["combat"] as Raw;
    combat["hand"] = (combat["hand"] as Raw[]).filter((card) => card["card_id"] !== "WITHER");
    expect(judge(raw)).toMatchObject({ certain: false, reason: "the mod does not flag ending the turn as lethal" });
  });

  it("only the held cards make it lethal: anything that could cut the loss or kill an attacker first keeps it uncertain", () => {
    // Thorns 3 against the Aeonglass's 270 HP cannot stop its second hit: still certain. At 3 HP left it can: 19 + 9 < 28.
    const thorns = tmnf();
    ((((thorns["combat"] as Raw)["player"] as Raw)["powers"]) as Raw[]).push({ index: 9, power_id: "THORNS_POWER", name: "荆棘", amount: 3, is_debuff: false });
    expect(judge(thorns).certain).toBe(true);
    (((thorns["combat"] as Raw)["enemies"] as Raw[])[0]!)["current_hp"] = 3;
    expect(judge(thorns)).toMatchObject({ certain: false, ownCountDies: true, reason: "the enemies may be hit before they act: 永世沙漏 may die to our retaliation (3 a hit) after 1 of its 2 hits, and the rest's 19 does not kill" });
    // Tungsten Rod: the Wither's 9 and the first 19 into the 28 block, the second 19 through less 1: 18 lost, 15 HP's death;
    // at 19 HP not.
    const rod = tmnf();
    ((rod["run"] as Raw)["relics"] as Raw[]).push({ index: 99, relic_id: "TUNGSTEN_ROD", name: "钨合金棍", description: "你每次失去生命时，减少失去的生命值[blue]1[/blue]点。" });
    expect(judge(rod)).toMatchObject({ certain: true, reason: expect.stringMatching(/\(Tungsten Rod: each HP loss 1 less\)$/) });
    (((rod["combat"] as Raw)["player"]) as Raw)["current_hp"] = 18;
    expect(judge(rod).certain).toBe(true);
    (((rod["combat"] as Raw)["player"]) as Raw)["current_hp"] = 19;
    expect(judge(rod)).toMatchObject({ certain: false, reason: "the mod does not flag ending the turn as lethal" });
    const vague = tmnf();
    const wither = ((vague["combat"] as Raw)["hand"] as Raw[]).find((card) => card["card_id"] === "WITHER")!;
    wither["resolved_rules_text"] = "不能被打出。 在你的回合结束时，如果这张牌在你的手牌中，失去相当于手牌数量的生命。";
    expect(judge(vague)).toMatchObject({ certain: false, reason: "the mod does not flag ending the turn as lethal" });
  });
});

describe("the judge: end-of-turn hits and Beating Remnant, exactly or not at all (Dai 2026-10-02)", () => {
  type Raw = Record<string, unknown>;
  const fx = (name: string) => structuredClone(board(name).state) as Raw;
  const judge = (raw: Raw, extra: { lostSoFar?: number } = {}) => judgeEndTurn(parseGameState(raw), { label: "combat/least-loss", revives: [], knowledge, ...extra });

  it("7DXA F23 T7: 3 HP + 13 block against 38, flagged lethal, but Stone Calendar's 52 can kill both enemies first: not certain", () => {
    const raw = fx("7dxa-f23-t7-calendar");
    expect((raw["combat"] as Raw)["end_turn_will_kill_player"]).toBe(true);
    expect(judge(raw)).toMatchObject({
      certain: false,
      reason: "the enemies may be hit before they act: 寄生惧魔 (历石 (52 to every enemy at the end of T7)) may die first, 胧光怪 (历石 (52 to every enemy at the end of T7)) may die first, and the rest's 0 does not kill",
    });
    // The same board on T6 (the calendar silent): certain (nothing left to play), as before.
    raw["turn"] = 6;
    for (const relic of (raw["run"] as Raw)["relics"] as Raw[]) if (relic["relic_id"] === "STONE_CALENDAR") relic["stack"] = 6;
    expect(judge(raw)).toMatchObject({ certain: true, tier: "rules" });
    // T7 with the Obscura out of reach (60 HP): the Parafright may die, the Obscura's 16 alone does not kill 3 HP + 13 block.
    const tough = fx("7dxa-f23-t7-calendar");
    const enemies = (tough["combat"] as Raw)["enemies"] as Raw[];
    enemies.find((enemy) => enemy["enemy_id"] === "THE_OBSCURA")!["current_hp"] = 60;
    expect(judge(tough).certain).toBe(false);
  });

  it("Stone Calendar's 52 kills nobody who matters: certain, the note says so", () => {
    const raw = fx("7dxa-f23-t7-calendar");
    const enemies = (raw["combat"] as Raw)["enemies"] as Raw[];
    for (const enemy of enemies) enemy["current_hp"] = 60;
    const verdict = judge(raw);
    expect(verdict.certain).toBe(true);
    expect(verdict.reason).not.toMatch(/may die/);
  });

  it("Y3XT F48 T7: Beating Remnant caps the turn at 20, 55 HP: our own count survives (the old count said 33)", () => {
    const verdict = judge(fx("y3xt-f48-t7-remnant"));
    expect(verdict.certain).toBe(false);
    expect(verdict.ownCountDies).toBeUndefined();
  });

  it("Beating Remnant at 20 HP or less: exact only with the HP lost so far this turn; with it, the cap less that", () => {
    const raw = fx("y3xt-f48-t7-remnant");
    const player = (raw["combat"] as Raw)["player"] as Raw;
    player["current_hp"] = 18;
    (raw["combat"] as Raw)["end_turn_will_kill_player"] = true;
    expect(judge(raw)).toMatchObject({ certain: false, reason: "own count not exact: Beating Remnant caps the HP lost this turn at 20 and the HP lost so far this turn is not known exactly" });
    // 2 lost so far: at most 18 more: exactly 18 HP's death; 3 lost so far: at most 17, 18 HP lives.
    expect(judge(raw, { lostSoFar: 2 }).ownCountDies).toBe(true);
    expect(judge(raw, { lostSoFar: 3 })).toMatchObject({ certain: false, reason: expect.stringMatching(/^own count survives: 17 HP lost \(Beating Remnant: at most 20 lost this turn, 3 lost so far\)/) });
  });
});
