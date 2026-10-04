/**
 * Fix batch G (notes/fix-queue.md): pure bugs. One describe per fix; boards are synthetic or logged fixtures
 * (tests/logged-states/batch-g, out of the rollout-live / potion-mc sweeps), never the refreshing knowledge files.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/reflex/jev/answers.js";
import type { AskDecision, DecisionEnv } from "../src/memory/types.js";
import { describePlan, planCombatTurn } from "../src/reflex/combat-plan.js";
import { ROLLOUT_BUDGET_MS, rolloutLiveOptions } from "../src/reflex/rollout-live.js";
import { potionMcOptions } from "../src/reflex/potion-mc.js";
import { planEvent } from "../src/hand/screens/event.js";
import { planMap } from "../src/hand/screens/map.js";
import { planRest } from "../src/hand/screens/rest.js";
import { checkConsistency } from "../src/brain/llm/consistency.js";
import { expectedEntryHp, fillGuideFacts, giantKillRecord, giantKillText, setUnblockedSharesForTests, type GiantKillRow } from "../src/sim/boss-clock.js";
import { projectPath, roomCostNote, type RoomCostModel } from "../src/sim/route-projection.js";
import { parseGameState } from "../src/hand/mod/schema.js";
import { discardSlotsOf } from "../src/hand/screens/potion-discard.js";
import { logged, loggedEnv, type Logged } from "./logged.js";
import type { CardModel } from "../src/reflex/card-model.js";
import { pileValue, solveTurn, type EnemySim, type PlayerSim, type SolverInput } from "../src/reflex/turn-solver.js";
import { rolloutDecision, type EnemyTable, type FightMeta } from "../src/reflex/rollout.js";
import { knowledgeFile } from "../src/knowledge/files.js";

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
    const handbook = readFileSync(knowledgeFile(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "knowledge"), "ds-handbook.md"), "utf8");
    expect(handbook).not.toContain("赢局平均 88%，输局 81%");
    // Knowledge check 2026-09-29: the per-ascension figures ("A8 90%/83%（141 场）…" when written) are filled from
    // the fight data (boss-damage.json by_asc) when the DeepSeek prompt is built.
    expect(handbook).not.toContain("A8 90%/83%（141 场）");
    expect(handbook).toContain("进一幕 boss 血量（赢局/输局平均）：{ACT1_ENTRY_HP}");
    const cell = (fights: number, won: number, winPct: number, lossPct: number) => ({ fights, won, entry_pct_won: winPct, entry_pct_lost: lossPct });
    setUnblockedSharesForTests({
      VANTOM: { unblocked_share: 0.4, fights: 3, turns: 30, by_asc: { "8": cell(2, 1, 90, 80), "9": cell(1, 0, 90, 70) } },
      SOUL_FYSH: { unblocked_share: 0.5, fights: 2, turns: 20, by_asc: { "8": cell(2, 2, 100, 0) } },
    });
    try {
      // Weighted by the won / lost fights: A8 won (90 + 100 + 100) / 3, lost 80.
      expect(fillGuideFacts("{ACT1_ENTRY_HP}")).toBe("A8 97%/80%（4 场），A9 —/70%（1 场）；灵魂异鱼 A8 100%/—（2 场），A9 还没有记录");
    } finally {
      setUnblockedSharesForTests(null);
    }
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

describe("7a. Rollout: an Imbalanced enemy is stunned by a fully blocked hit, never at random (KTRT1M2SVVL3 F23 T3, Bowlbug Rock)", () => {
  // The move model's Headbutt -> {Headbutt 7, STUNNED 3}: the stun is the Rock's Imbalanced, not chance.
  const ROCK: EnemyTable = { moves: { HEADBUTT_MOVE: { damage: 15, hits: 1, strength: 0, block: 0 }, STUNNED: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { HEADBUTT_MOVE: { HEADBUTT_MOVE: 7, STUNNED: 3 }, STUNNED: { HEADBUTT_MOVE: 1 } } };
  const META: FightMeta = { act: 2, t: 3, asc: 9, kind: "hallway", enc: "TEST_ROCK", deck: { n: 2, atk: 1, skl: 1, pow: 0, junk: 0, dmg: 6, blk: 20, up: 0 }, relics: 0, max_en: 1 };
  const wall = card(0, "WALL", { type: "Skill", target: "self", validTargets: [], block: 20 });
  const poke = card(1, "POKE", { damage: 1, damageBase: 1 });
  let t = 0;
  const run = (cardId: string) => {
    const solver: SolverInput = { hand: [wall, poke], player: player({ energy: 1 }), enemies: [enemy({ hp: 500, maxHp: 500, attacks: [{ damage: 15, hits: 1 }], imbalanced: 15 })], fightKind: "monster", turn: 3 };
    const plan = solveTurn(solver).plans.find((entry) => entry.steps.length === 1 && entry.steps[0]!.cardId === cardId)!;
    return rolloutDecision({
      solver,
      plans: [plan],
      enemies: [{ index: 0, id: "TEST_ROCK", move: "HEADBUTT_MOVE", strength: 0, powers: { IMBALANCED_POWER: 1 } }],
      tables: { TEST_ROCK: ROCK },
      // Nothing to block with later: the next turn's loss is the Rock's hit, or none when it is stunned.
      piles: { draw: Array.from({ length: 10 }, (_, i) => card(10 + i, "POKE", { damage: 1, damageBase: 1 })), discard: [], handBase: [wall, poke] },
      meta: META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 3, horizon: 2, samples: 40, now: () => (t += 0.01) },
    }).lines[0]!;
  };

  it("the hit fully blocked: stunned next turn in every sample; not blocked: it hits next turn in every sample", () => {
    const blocked = run("WALL");
    expect(blocked.plan.outcome.stuns).toHaveLength(1);
    expect(blocked.perTurn[0]!.loss.max).toBe(0);
    const open = run("POKE");
    expect(open.perTurn[0]!.loss.min).toBe(15);
  });
});

describe("7c. Rollout under a tight budget: the first wave shrinks to 3 turns on demand, and a finished wave is kept (ZGZ0EQDDNJPT boss: 3 of 5 questions fell back to 1 turn)", () => {
  const T: EnemyTable = { moves: { HIT: { damage: 8, hits: 1, strength: 0, block: 0 } }, next: { HIT: { HIT: 1 } } };
  const META: FightMeta = { act: 1, t: 1, asc: 9, kind: "hallway", enc: "X", deck: { n: 10, atk: 5, skl: 5, pow: 0, junk: 0, dmg: 6, blk: 5, up: 0 }, relics: 0, max_en: 3 };
  const hand = [0, 1, 2, 3, 4].map((i) => (i % 2 ? strike(i) : card(i, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 5 })));
  const solver: SolverInput = { hand, player: player(), enemies: [enemy({ hp: 300, maxHp: 300, attacks: [{ damage: 8, hits: 1 }] })], fightKind: "monster", turn: 1 };
  const plans = solveTurn(solver).plans.slice(0, 6);
  /** A clock that moves 1 ms on every reading: the time a rollout takes is the work it does. */
  const run = (budgetMs: number) => {
    let t = 0;
    return rolloutDecision({
      solver,
      plans,
      enemies: [{ index: 0, id: "X", move: "HIT", strength: 0, powers: {} }],
      tables: { X: T },
      piles: { draw: Array.from({ length: 20 }, (_, i) => ({ ...hand[i % 5]!, index: 10 + i, key: `c${10 + i}` })), discard: [], handBase: hand },
      meta: META,
      playerPowers: {},
      potions: 0,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs, seed: 1, now: () => (t += 1) },
    });
  };

  it("too little time for the full horizon: 3 turns for the rest of the first wave, not the 1-turn fallback", () => {
    const r = run(60);
    expect(r.degraded).not.toContain("1-turn");
    expect(r.degraded).toContain("first wave at 3 turns");
    expect(r.lines[0]!.horizon).toBe(3);
  });

  it("the first wave finished just past the budget: its sample is kept (horizon 5, 1 sample), not thrown away", () => {
    const r = run(100);
    expect(r.degraded).toEqual(["samples 1 (clock)"]);
    expect(r.lines[0]!.horizon).toBe(5);
    expect(r.lines[0]!.samples).toBe(1);
    // Enough time: as before.
    expect(run(4000).degraded).toEqual([]);
  });
});

describe("8. An unused free Attack (Unrelenting) kept into next turn is said in the line's facts, not scored", () => {
  it("\"Unrelenting\" alone: free_attacks_kept says 1 stays up; a line that spends it says nothing", () => {
    const unrelenting = card(0, "UNRELENTING", { cost: 2, damage: 12, damageBase: 12, special: "free_next_attack" });
    const solver: SolverInput = { hand: [unrelenting, strike(1)], player: player({ energy: 2 }), enemies: [enemy({ hp: 500, maxHp: 500 })], fightKind: "monster", turn: 2 };
    const plans = solveTurn(solver).plans;
    const alone = plans.find((plan) => plan.steps.length === 1 && plan.steps[0]!.cardId === "UNRELENTING")!;
    expect(String(describePlan(alone, 60)["free_attacks_kept"])).toMatch(/^1 free Attack \(Unrelenting\) left unused: it stays up into next turn/);
    const spent = plans.find((plan) => plan.steps.length === 2 && plan.steps[0]!.cardId === "UNRELENTING")!;
    expect(describePlan(spent, 60)["free_attacks_kept"]).toBeUndefined();
  });
});

describe("0. Powdered Demise is not \"no effect\": the drink's lasting effect counts, and the rollout ticks Demise every enemy turn (ARKG3JFT26HC F17 Soul Fysh, regression of 0dafcda)", () => {
  afterEach(() => {
    rolloutLiveOptions.budgetMs = ROLLOUT_BUDGET_MS;
    potionMcOptions.now = null;
  });

  it("the logged T2 board: the Demise line carries no potion_no_effect and reads its own rollout (the Fysh loses 9 a turn)", () => {
    rolloutLiveOptions.budgetMs = 1e9;
    potionMcOptions.now = () => 0;
    const decision = planCombatTurn(loggedEnv(logged("batch-g/arkg-f17-t2-demise")));
    if (decision?.kind !== "ask") throw new Error(`expected an ask, got ${decision?.kind}`);
    const question = decision.questions["plan"]!;
    const criteria = Object.values(question.type === "choice" ? question.criteria : {}).map((text) => JSON.parse(String(text)) as Raw);
    const demise = criteria.filter((line) => /消亡粉末/.test(String(line["plays"])));
    expect(demise.length).toBeGreaterThan(0);
    for (const line of demise) expect(line["potion_no_effect"]).toBeUndefined();
    const alone = demise.find((line) => String(line["plays"]) === "potion 消亡粉末 -> 灵魂异鱼")!;
    expect(String(alone["enemies_after"])).toContain("Demise 9");
    // The same cards without the drink (ending the turn): the Demise line's later turns deal 9 more each turn.
    const dry = criteria.find((line) => String(line["plays"]) === "end turn");
    if (dry) expect(alone["rollout_turns"]).not.toBe(dry["rollout_turns"]);
  });

  it("rollout: Demise 9 on a 30-HP enemy that no card touches ends the fight at the end of its fourth turn", () => {
    const demise = card(0, "POTION:POWDERED_DEMISE:0", { name: "potion 消亡粉末", type: "Potion", cost: 0, demise: 9 });
    const solver: SolverInput = { hand: [demise], player: player({ energy: 0 }), enemies: [enemy({ hp: 30, maxHp: 30 })], fightKind: "monster", turn: 1 };
    const plans = solveTurn(solver).plans;
    const drink = plans.find((plan) => plan.steps.length === 1)!;
    expect(drink.outcome.enemyHpAfter[0]!.demise).toBe(9);
    expect(drink.outcome.lastingDrinks).toBe(1);
    const WAIT: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    const META: FightMeta = { act: 1, t: 1, asc: 9, kind: "hallway", enc: "X", deck: { n: 5, atk: 0, skl: 5, pow: 0, junk: 0, dmg: 0, blk: 5, up: 0 }, relics: 0, max_en: 3 };
    let t = 0;
    const line = rolloutDecision({
      solver,
      plans: [drink],
      enemies: [{ index: 0, id: "X", move: "WAIT", strength: 0, powers: {} }],
      tables: { X: WAIT },
      piles: { draw: Array.from({ length: 10 }, (_, i) => card(10 + i, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], block: 5 })), discard: [], handBase: [demise] },
      meta: META,
      playerPowers: {},
      potions: 1,
      mm: {},
      model: null,
      gates: null,
      options: { budgetMs: 1e9, seed: 1, horizon: 5, samples: 4, now: () => (t += 0.01) },
    }).lines[0]!;
    expect(line.wins).toBe(4);
    expect(line.turnsToWin).toBe(4);
  });
});
