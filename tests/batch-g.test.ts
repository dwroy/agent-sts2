/**
 * Fix batch G (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states/batch-g, out of the rollout-live / potion-mc sweeps), never the refreshing knowledge files.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision, DecisionEnv } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { planEvent } from "../src/screens/event.js";
import { planMap } from "../src/screens/map.js";
import { planRest } from "../src/screens/rest.js";
import { checkConsistency } from "../src/llm/consistency.js";
import { expectedEntryHp, giantKillRecord, giantKillText, setUnblockedSharesForTests, type GiantKillRow } from "../src/strategy/boss-clock.js";
import { projectPath, roomCostNote, type RoomCostModel } from "../src/strategy/route-projection.js";
import { parseGameState } from "../src/mod/schema.js";
import { discardSlotsOf } from "../src/screens/potion-discard.js";
import { logged, loggedEnv, type Logged } from "./logged.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { pileValue, solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";

type Raw = Record<string, unknown>;


function card(index: number, cardId: string, overrides: Partial<CardModel> = {}): CardModel {
  return {
    index,
    key: `c${index}`,
    cardId,
    name: cardId,
    type: "Attack",
    upgraded: false,
    cost: 1,
    xCost: false,
    playable: true,
    target: "single",
    validTargets: [0],
    damage: null,
    hits: 1,
    block: 0,
    vulnerable: 0,
    weak: 0,
    strength: 0,
    tempStrength: 0,
    enemyStrength: 0,
    enemyTempStrengthLoss: 0,
    hpLoss: 0,
    energyGain: 0,
    draw: 0,
    exhausts: false,
    special: null,
    known: true,
    flatValue: 0,
    heldPenalty: 0,
    text: "",
    ...overrides,
  };
}
const strike = (i: number, damage = 6) => card(i, "STRIKE_IRONCLAD", { name: "打击", damage, damageBase: damage });
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const enemy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });

const keysOf = (decision: AskDecision): string[] => {
  const question = decision.questions["pick"]!;
  return Object.keys(question.type === "choice" ? question.criteria ?? {} : {}).sort();
};
const criteriaOf = (decision: AskDecision, key: string): Raw => {
  const question = decision.questions["pick"]!;
  return JSON.parse(String(question.type === "choice" ? question.criteria[key] : "{}")) as Raw;
};
/** A DeepSeek answer as the loop hands it to resolve (its extra fields in raw). */
const deepseekPick = (key: string, raw: Raw = {}): AnswerSet => ({ pick: { type: "choice", choice: key, probabilities: { [key]: 1 }, confidence: 1, raw: { escalated: "deepseek", ...raw } } }) as AnswerSet;
const jevPick = (key: string, nouls: Record<string, number> = {}): AnswerSet =>
  ({
    pick: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} },
    ...Object.fromEntries(Object.entries(nouls).map(([question, noul]) => [question, { type: "noul", noul, raw: {} }])),
  }) as AnswerSet;

describe("1. Tiny Mailbox: code no longer discards a potion on the map; the rest site offers \"discard, then heal\" to the decider (ZGZ0EQDDNJPT F10/F11)", () => {
  const deepseekEnv = (fx: Logged, over: Partial<DecisionEnv> = {}): DecisionEnv => ({ ...loggedEnv(fx), buildDecider: "deepseek", ...over });

  it("the logged F10 map (full belt, a rest site ahead, Tiny Mailbox): no map/discard-potion", () => {
    const fx = logged("batch-g/zgz0-f10-map-mailbox");
    const decision = planMap(loggedEnv(fx));
    expect(decision?.label).not.toBe("map/discard-potion");
    expect(decision && decision.kind === "act" ? decision.intent.action : "ask").not.toBe("discard_potion");
  });

  it("F11 rest, one free slot for the mailbox's two potions: heal, heal after a discard (the answer names the slot), smith", () => {
    const fx = logged("batch-g/zgz0-f11-rest-mailbox");
    const env = deepseekEnv(fx, { oneshot: "off" });
    const decision = planRest(env) as AskDecision;
    expect(decision.kind).toBe("ask");
    expect(decision.label).toBe("rest/choose");
    expect(keysOf(decision)).toEqual(["o0", "o0:discard", "o1"]);
    expect(String(criteriaOf(decision, "o0")["potion_slots"])).toMatch(/^1 potion this option gives has no free slot and is lost/);
    expect(criteriaOf(decision, "o0:discard")["discardable_potions"]).toMatchObject({ "1": expect.stringMatching(/^爆炸安瓿/), "2": expect.stringMatching(/^格挡药水/) });
    // The smith has no potions: no variant.
    expect(criteriaOf(decision, "o1")["potion_slots"]).toBeUndefined();
    // DeepSeek: heal after discarding the Block Potion (slot 2): the discard now, the heal next.
    const resolved = decision.resolve(deepseekPick("o0:discard", { discard: [2] }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 2 });
    resolved.apply?.();
    // Not landed yet: wait; landed: heal.
    expect(planRest({ ...deepseekEnv(fx, { oneshot: "off" }), screenMemory: env.screenMemory })).toBeNull();
    ((fx.state["run"] as Raw)["potions"] as Raw[])[2] = { index: 2, occupied: false, can_discard: false };
    expect(planRest({ ...deepseekEnv(fx, { oneshot: "off" }), screenMemory: env.screenMemory })).toMatchObject({ kind: "act", label: "rest/after-discard", intent: { action: "choose_rest_option", option_index: 0 } });
  });

  it("the plain heal key with a discard list is the variant; a slot that cannot go, or too many, is no answer", () => {
    const fx = logged("batch-g/zgz0-f11-rest-mailbox");
    const decision = planRest(deepseekEnv(fx, { oneshot: "off" })) as AskDecision;
    expect(decision.resolve(deepseekPick("o0", { discard: ["1"] })).intent).toEqual({ action: "discard_potion", option_index: 1 });
    expect(decision.resolve(deepseekPick("o0:discard", { discard: [0] }))).toMatchObject({ intent: null, fallback: true });
    expect(decision.resolve(deepseekPick("o0:discard", { discard: [1, 2] }))).toMatchObject({ intent: null, fallback: true });
    expect(decision.resolve(deepseekPick("o0:discard", {}))).toMatchObject({ intent: null, fallback: true });
    // Smithing discards nothing.
    expect(decision.resolve(deepseekPick("o1")).intent).toEqual({ action: "choose_rest_option", option_index: 1 });
  });

  it("the one-shot rest plan carries the variant too; Jev's question asks per slot and its yes picks the slot", () => {
    const fx = logged("batch-g/zgz0-f11-rest-mailbox");
    const oneshot = planRest(deepseekEnv(fx)) as AskDecision;
    expect(oneshot.label).toBe("rest/plan");
    expect(keysOf(oneshot)).toContain("o0:discard");
    const planned = oneshot.resolve(deepseekPick("o0:discard", { discard: [1] }));
    expect(planned.intent).toEqual({ action: "discard_potion", option_index: 1 });
    // Jev (BUILD_DECIDER=jev), at 30/80 (code's heal 10 leads its smith 6, but ties with the heal after a
    // discard: Jev is asked): the discard questions ride with the pick.
    (fx.state["run"] as Raw)["current_hp"] = 30;
    const env = loggedEnv(fx);
    const jev = planRest(env) as AskDecision;
    expect(jev.kind).toBe("ask");
    expect(Object.keys(jev.questions).sort()).toEqual(["discard_p1", "discard_p2", "pick"]);
    const resolved = jev.resolve(jevPick("o0:discard", { discard_p1: 0.2, discard_p2: 0.8 }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 2 });
    resolved.apply?.();
    expect(env.screenMemory.afterDiscard).toMatchObject({ place: "rest", option: 0, slot: 2, more: [] });
  });
});

describe("1b. The discard answer field and its consistency", () => {
  it("slot numbers read from numbers or strings; a conclusion on the option does not contradict its discard variant", () => {
    expect(discardSlotsOf([2, "1", "p0", "slot 3"])).toEqual([2, 1, 0, 3]);
    expect(discardSlotsOf("1")).toBeUndefined();
    const criteria = { o0: JSON.stringify({ option: "休息" }), "o0:discard": JSON.stringify({ option: "休息" }), o1: JSON.stringify({ option: "锻造" }) };
    expect(checkConsistency("o0:discard", "heal, drop the block potion", "Decision: o0.", criteria).ok).toBe(true);
    expect(checkConsistency("o0:discard", "heal", "Decision: o1.", criteria).ok).toBe(false);
  });
});

describe("6. An event's \"discard, then take it\": one option per event option, the answer names the slots (5 slots, 3 potions made 25 options)", () => {
  /** The logged Potion Courier with a full 5-slot belt. */
  const courier = (): Logged => {
    const fx = logged("yql8-f28-potion-courier");
    const run = fx.state["run"] as Raw;
    const [fairy, attack] = run["potions"] as Raw[];
    run["potions"] = [0, 1, 2, 3, 4].map((index) => ({ ...(index % 2 ? attack : fairy)!, index }));
    return fx;
  };

  it("DeepSeek: 拿走这批药水 (3 potions) and 洗劫 (1) each get one variant; three slots named are discarded in turn, then the option", () => {
    const fx = courier();
    const env: DecisionEnv = { ...loggedEnv(fx), buildDecider: "deepseek", oneshot: "off" };
    const decision = planEvent(env) as AskDecision;
    expect(keysOf(decision)).toEqual(["o0", "o0:discard", "o1", "o1:discard"]);
    expect(String(criteriaOf(decision, "o0:discard")["discard_first"])).toMatch(/discard 1 to 3 of discardable_potions/);
    // Four slots for 3 potions is more than needed: no answer (code does not trim it for the decider).
    expect(decision.resolve(deepseekPick("o0:discard", { discard: [0, 1, 2, 3] }))).toMatchObject({ intent: null, fallback: true });
    const resolved = decision.resolve(deepseekPick("o0:discard", { discard: [4, 0, 2] }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 4 });
    resolved.apply?.();
    const potions = (fx.state["run"] as Raw)["potions"] as Raw[];
    const again = () => planEvent({ ...loggedEnv(fx), buildDecider: "deepseek", oneshot: "off", screenMemory: env.screenMemory });
    potions[4] = { index: 4, occupied: false, can_discard: false };
    expect(again()).toMatchObject({ label: "event/discard-more", intent: { action: "discard_potion", option_index: 0 } });
    potions[0] = { index: 0, occupied: false, can_discard: false };
    expect(again()).toMatchObject({ label: "event/discard-more", intent: { action: "discard_potion", option_index: 2 } });
    potions[2] = { index: 2, occupied: false, can_discard: false };
    expect(again()).toMatchObject({ label: "event/after-discard", intent: { action: "choose_event_option", option_index: 0 } });
  });

  it("Jev: the same four options and one yes/no question per potion; its yeses (most sure first, at most the 3 needed) are the discards", () => {
    const fx = courier();
    const env = loggedEnv(fx);
    const decision = planEvent(env) as AskDecision;
    expect(keysOf(decision)).toEqual(["o0", "o0:discard", "o1", "o1:discard"]);
    expect(Object.keys(decision.questions).sort()).toEqual(["discard_p0", "discard_p1", "discard_p2", "discard_p3", "discard_p4", "pick"]);
    const resolved = decision.resolve(jevPick("o0:discard", { discard_p0: 0.1, discard_p1: 0.7, discard_p2: 0.2, discard_p3: 0.95, discard_p4: 0.6 }));
    expect(resolved.intent).toEqual({ action: "discard_potion", option_index: 3 });
    resolved.apply?.();
    expect(env.screenMemory.afterDiscard).toMatchObject({ place: "event:" + String((fx.state["event"] as Raw)["event_id"]), option: 0, slot: 3, more: [1, 4] });
  });
});

describe("2. Hand-written facts from the data: the Giant's kill-turn record (A9 killed by T10 1/3 -> 2/4 after Y36HXZ80A8LL) and act-1 boss entry HP per ascension", () => {
  const row = (turn: number | null, won: boolean, extra: Partial<GiantKillRow> = {}): GiantKillRow => ({ turn, won, ...extra });
  /** The 10 logged A9 Giant fights as of 2026-09-29 19:30 (YQL8 T7 won, 5NFG T9, Y36H T9 won, 2ZCK T10, 1VX1 T11, 8V0H T12 won, 9Q7V T14, 7MDJ T19, HEAC and RHNE not killed). */
  const a9 = [
    row(7, true, { run: "YQL8", hp: 60, stacks: 35 }),
    row(9, false, { run: "5NFG", hp: 14, stacks: 41 }),
    row(9, true, { run: "Y36H", hp: 36, stacks: 41 }),
    row(10, false, { run: "2ZCK", hp: 20, stacks: 44 }),
    row(11, false),
    row(12, true),
    row(14, false),
    row(19, false),
    row(null, false),
    row(null, false),
  ];

  it("the record is counted from the fight rows: 3 of 10 won, by T10 2/4, the early-kill losses with HP and stacks", () => {
    expect(giantKillText(a9, 9, "zh")).toBe("A9 10 场赢 3 场（T7、T9、T12 击杀）：T10 前击杀赢 2/4、T11–T15 1/3、T16 后 0/1、没打死 0/2；T10 前击杀输的 5NFG（T9）、2ZCK（T10）击杀时只剩 14、20 血对 41、44 层，死于自爆");
    expect(giantKillText(a9, 9, "en")).toBe("A9 (10 fights): 3 won (kills on T7, T9, T12); killed by T10 2/4 won, T11-T15 1/3 won, T16 or later 0/1 won, not killed 0/2 won; lost after a kill by T10: 5NFG (T9) 14 HP against 41 stacks, 2ZCK (T10) 20 HP against 44 stacks, died to the blast");
  });

  it("the handbook's act-1 boss entry HP per ascension (the pooled 88%/81% came from 41 early fights; at A9 wins and losses both enter near 90%)", () => {
    const handbook = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "knowledge", "ds-handbook.md"), "utf8");
    expect(handbook).not.toContain("赢局平均 88%，输局 81%");
    expect(handbook).toContain("A8 90%/83%（141 场），A9 90%/88%（44 场）");
  });

  it("giantKillRecord reads the fight data at A9 from A9 up, A8's below", () => {
    setUnblockedSharesForTests({ WATERFALL_GIANT: { unblocked_share: 0.3, fights: 12, turns: 120, kills: { "8": [row(8, true), row(16, false)], "9": a9 } } });
    try {
      expect(giantKillRecord(9, "zh")).toContain("T10 前击杀赢 2/4");
      expect(giantKillRecord(10, "en")).toContain("killed by T10 2/4 won");
      expect(giantKillRecord(8, "zh")).toBe("A8 2 场赢 1 场（T8 击杀）：T10 前击杀赢 1/1、T16 后 0/1");
    } finally {
      setUnblockedSharesForTests(null);
    }
  });
});

describe("3. Mid-turn draws in the solver: Hellraiser plays a drawn Strike itself; Dark Embrace draws for each exhaust", () => {
  it("Hellraiser up: a potion's three drawn Strikes are played free at 0 energy (18), not left in hand", () => {
    const swift = card(0, "SWIFT_POTION", { name: "迅捷药水", type: "Potion", target: "self", validTargets: [], cost: 0, drawn: [strike(10), strike(11), strike(12)] });
    const input = (hellraiser: boolean): SolverInput => ({ hand: [swift], player: player({ energy: 0, ...(hellraiser ? { hellraiser } : {}) }), enemies: [enemy({ hp: 18, maxHp: 18 })], fightKind: "monster", turn: 2 });
    const up = solveTurn(input(true)).plans[0]!;
    expect(up.outcome.kills).toHaveLength(1);
    expect(up.steps.filter((step) => step.cardId === "STRIKE_IRONCLAD")).toHaveLength(3);
    const off = solveTurn(input(false)).plans[0]!;
    expect(off.outcome.kills).toHaveLength(0);
  });

  it("the expected draw of a pile of Strikes is worth a played card with no energy left under Hellraiser", () => {
    const pile = pileValue([{ playable: true, heldPenalty: 0, strike: true }, { playable: true, heldPenalty: 0 }], 1)!;
    expect(pile.strikeShare).toBe(0.5);
    // Burning Pact-like: exhaust a card, draw 2, at the last energy (nothing left to play the draws with).
    const draw2 = card(0, "DRAW_TWO", { type: "Skill", target: "self", validTargets: [], cost: 1, draw: 2 });
    const input = (hellraiser: boolean): SolverInput => ({ hand: [draw2], player: player({ energy: 1, ...(hellraiser ? { hellraiser } : {}) }), enemies: [enemy()], fightKind: "monster", turn: 2, drawPile: Array.from({ length: 10 }, () => ({ playable: true, heldPenalty: 0, strike: true })) });
    const scoreOf = (hellraiser: boolean) => solveTurn(input(hellraiser)).plans.find((plan) => plan.steps.length === 1)!.score;
    expect(scoreOf(true)).toBeGreaterThan(scoreOf(false));
  });

  it("Dark Embrace up: a card that exhausts draws one (the outcome's cards drawn), none without it", () => {
    const burn = card(0, "EXHAUSTING_SKILL", { type: "Skill", target: "self", validTargets: [], cost: 0, block: 3, exhausts: true });
    const drawn = (darkEmbrace: number) =>
      solveTurn({ hand: [burn], player: player({ energy: 1, darkEmbrace }), enemies: [enemy({ attacks: [{ damage: 10, hits: 1 }] })], fightKind: "monster", turn: 2 }).plans.find((plan) => plan.steps.some((step) => step.cardId === "EXHAUSTING_SKILL"))!.outcome.cardsDrawn;
    expect(drawn(1)).toBe(1);
    expect(drawn(0)).toBe(0);
  });
});

describe("4. After Primal Force the expected hand holds Giant Rocks: the chosen line goes on (N01X6BBAYMHT F2 T2)", () => {
  afterEach(() => {
    rolloutLiveOptions.enabled = true;
  });
  /** The logged board, the Sludge Spinner at 100 HP (no lethal to short-cut the line). */
  const board = (name: string): Logged => {
    const fx = logged(`batch-g/${name}`);
    for (const enemy of (fx.state["combat"] as Raw)["enemies"] as Raw[]) {
      enemy["current_hp"] = 100;
      enemy["max_hp"] = 100;
    }
    return fx;
  };

  it("code's only distinct line \"原始力量, 巨石, 巨石\": on the next frame the hand shows two 巨石 for the two Strikes: continued, not re-planned", () => {
    rolloutLiveOptions.enabled = false;
    const ask = loggedEnv(board("n01x-f2-t2-primal-force"));
    const decision = planCombatTurn(ask);
    expect(decision).toMatchObject({ kind: "act", label: "combat/plan", intent: { action: "play_card" } });
    expect(decision?.kind === "act" ? decision.rationale : "").toMatch(/原始力量, 巨石 -> 淤泥旋螺, 巨石 -> 淤泥旋螺/);
    if (decision?.kind === "act") decision.apply?.();
    const next = planCombatTurn({ ...loggedEnv(board("n01x-f2-t2-rocks")), screenMemory: ask.screenMemory });
    expect(next?.label).toBe("combat/plan-continue");
    expect(next?.kind === "act" ? next.rationale : "").toMatch(/plan: 巨石/);
  });
});

describe("5. Pantograph's boss-start heal (+25) in the boss clock's entry HP and the route projection's HP at the boss (5NFGDU7BQPD3 F16)", () => {
  const withRelics = (hp: number, floor: number, pantograph: boolean) => {
    const fx = logged("batch-g/zgz0-f10-map-mailbox");
    const run = fx.state["run"] as Raw;
    run["current_hp"] = hp;
    run["floor"] = floor;
    if (pantograph) run["relics"] = [...(run["relics"] as unknown[]), { index: 9, relic_id: "PANTOGRAPH", name: "缩放仪" }];
    return parseGameState(fx.state);
  };

  it("entry HP: the pre-boss rest's heal, then +25 at the boss's start, capped at max", () => {
    // F10, 30/80, a rest ahead: 30 + 24 = 54; with Pantograph 79.
    expect(expectedEntryHp(withRelics(30, 10, false))).toBe(54);
    expect(expectedEntryHp(withRelics(30, 10, true))).toBe(79);
    expect(expectedEntryHp(withRelics(60, 10, true))).toBe(80);
    // No rest left before the boss (F16 map): the HP now, +25.
    expect(expectedEntryHp(withRelics(40, 16, false))).toBe(40);
    expect(expectedEntryHp(withRelics(40, 16, true))).toBe(65);
  });

  it("route projection: the HP a path reaches the boss with has the heal; the note says so", () => {
    const cost = (median: number) => ({ median, p75: median + 5, source: "test" });
    const model: RoomCostModel = { act: 1, maxHp: 80, monster: cost(10), elite: cost(25), unknown: cost(4) };
    const path = ["Monster", "Elite", "Boss"];
    expect(projectPath(path, 50, model).arrival[2]).toBe(15);
    const healed = { ...model, bossStartHeal: 25 };
    expect(projectPath(path, 50, healed).arrival[2]).toBe(40);
    expect(projectPath(path, 80, healed).arrival).toEqual([80, 70, 70]);
    // Dead before the boss stays dead.
    expect(projectPath(path, 30, healed).arrival[2]).toBe(-5);
    expect(roomCostNote(healed)).toContain("the boss fight starts with +25 HP (Pantograph)");
  });
});
