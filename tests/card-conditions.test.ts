/**
 * CARD_CONDITIONS (src/strategy/card-model.ts cardConditionOptions, default on): conditional card effects read on the solver's
 * simulated state when the card is played, not counted every time. Restlessness (心神不宁: 「如果你的手牌为空，则抽2张牌并获得
 * 2能量」) was planned as 2 cards and 2 energy whatever the hand; 95 logged plays, all with other cards in hand, drew nothing
 * and gained nothing (AKK09TEEEXKD F17 T10: "Strike, Defend, Restlessness, Strike, True Grit" on its 2 energy, then only
 * end turn, -7; the SL explore deviations repeated it). Spite's second hit after HP lost earlier this turn (Inferno's,
 * Crimson Mantle's at the turn's start, a card in an earlier decision), a Rage played in the line, Ashen Strike / Expect a
 * Fight / Tear Asunder with what the line exhausted / gained / lost before them. The boards are logged ones
 * (tests/logged-states/card-conditions/boards.json, states.jsonl lines as the mod sent them); the knowledge is the fixed test
 * data (tests/logged-states/game-data.json) plus the mod's entries it lacks (game-data-extra.json, as of 2026-10-04). No
 * model call, nothing written under logs/.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import type { Decision } from "../src/project/types.js";
import { hpLostSinceTurnStart, noteTurnStartExhaust, noteTurnStartHp, planCombatTurn } from "../src/screens/combat-plan.js";
import { cardConditionOptions, handConditionOf, modelHandCard, offHandCardModel, type CardModel } from "../src/strategy/card-model.js";
import { rolloutDecision, type EnemyTable, type FightMeta } from "../src/strategy/rollout.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { drawFirst, isFreeDraw, replaySteps, solveTap, solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput, type Step } from "../src/strategy/turn-solver.js";
import { loggedEnv } from "./logged.js";

type Raw = Record<string, unknown>;
const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, "logged-states", "card-conditions");
const data = JSON.parse(readFileSync(join(HERE, "logged-states", "game-data.json"), "utf8")) as Record<string, unknown[]>;
const extra = JSON.parse(readFileSync(join(DIR, "game-data-extra.json"), "utf8")) as Record<string, unknown[]>;
const knowledge = makeKnowledge(
  { ...data, cards: [...(data["cards"] ?? []), ...(extra["cards"] ?? [])], relics: [...(data["relics"] ?? []), ...(extra["relics"] ?? [])], monsters: [...(data["monsters"] ?? []), ...(extra["monsters"] ?? [])] },
  "cache",
);

/** A fresh copy of one logged state of the fixture. */
const board = (key: string): Raw => {
  const raw = JSON.parse(readFileSync(join(DIR, "boards.json"), "utf8")) as { states: Record<string, Raw> };
  const state = raw.states[key];
  if (!state) throw new Error(`boards.json has no state ${key}`);
  return state;
};
const handOf = (raw: Raw): Raw[] => (raw["combat"] as Raw)["hand"] as Raw[];
const entry = (key: string, cardId: string): Raw => handOf(board(key)).find((card) => card["card_id"] === cardId)!;

afterEach(() => {
  cardConditionOptions.enabled = true;
  rolloutLiveOptions.enabled = true;
  solveTap.onSolve = null;
});

/**
 * The planner on a logged board (its rollout off), the turn's first logged frame fed to the screen memory first as the live
 * loop saw it (`${key}_first`, when the fixture has it and `first` is not false): its decision, solver input and plans.
 */
function planned(key: string, first = true, edit: (raw: Raw) => void = () => {}): { decision: Decision | null; input: SolverInput; plans: Plan[] } {
  const raw = board(key);
  edit(raw);
  const env = loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: raw }, { knowledge });
  const start = first ? (() => { try { return board(`${key}_first`); } catch { return null; } })() : null;
  if (start) {
    edit(start);
    noteTurnStartExhaust(env.screenMemory, parseGameState(start));
    noteTurnStartHp(env.screenMemory, parseGameState(start));
  }
  let captured: { input: SolverInput; plans: Plan[] } | null = null;
  solveTap.onSolve = (input, result) => {
    if (captured === null && input.firstKey === undefined) captured = { input, plans: result.plans };
  };
  rolloutLiveOptions.enabled = false;
  const decision = planCombatTurn(env);
  solveTap.onSolve = null;
  if (!captured) throw new Error(`the planner did not solve ${key}`);
  const { input, plans } = captured as { input: SolverInput; plans: Plan[] };
  return { decision, input, plans };
}

/** A plan's plays as "CARD>target,…". */
const steps = (plan: Pick<Plan, "steps">) => plan.steps.map((step) => `${step.cardId}${step.target !== null ? `>${step.target}` : ""}`).join(",");
/** "CARD>target,CARD" as steps on this input's hand (each card id taken from the hand in order, unused ones first). */
function line(input: SolverInput, text: string): Step[] {
  const used = new Set<number>();
  return text.split(",").map((part) => {
    const [cardId, target] = part.split(">");
    const card = input.hand.find((entry) => entry.cardId === cardId && !used.has(entry.index));
    if (!card) throw new Error(`no ${cardId} left in the hand`);
    used.add(card.index);
    return { cardIndex: card.index, cardId: card.cardId, upgraded: card.upgraded, cost: card.cost, name: card.name, target: target === undefined ? null : Number(target), targetName: null };
  });
}
const replayed = (input: SolverInput, text: string) => replaySteps(input, line(input, text));
/** Energy a plan's card plays cost on this input (Stomp at its shown cost; no energy gained). */
const spent = (input: SolverInput, plan: Plan) => plan.steps.filter((step) => !step.cardId.startsWith("POTION:")).reduce((sum, step) => sum + Math.max(0, input.hand.find((card) => card.index === step.cardIndex)?.cost ?? 0), 0);

const card = (index: number, cardId: string, over: Partial<CardModel> = {}): CardModel => ({
  index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0], damage: 6, hits: 1, block: 0,
  vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0, draw: 0, exhausts: false, special: null, known: true, flatValue: 0,
  heldPenalty: 0, text: "", ...over,
});
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const dummy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });
/** The logged Restlessness of a board, modelled at hand slot `index`. */
const restlessness = (key = "akk_t10_plan", index = 0) => modelHandCard({ ...entry(key, "RESTLESSNESS"), index }, index, knowledge);
const solve = (hand: CardModel[], over: Partial<PlayerSim> = {}, drawPile = 10) => {
  const input: SolverInput = { hand, player: player({ drawable: drawPile, ...over }), enemies: [dummy()], fightKind: "monster", turn: 2 };
  return { input, plans: solveTurn(input).plans };
};

describe("1. the card model: Restlessness's draw and energy wait on an empty hand", () => {
  it("AKK09TEEEXKD F17 T10: the logged entry (Retain, Cards 2, Energy 2) has the hand condition; Restlessness+ (X7BX5DYHFZ3N F48 T3) 3 and 3", () => {
    const plain = restlessness();
    expect([plain.cost, plain.draw, plain.energyGain, plain.handCondition, plain.known]).toEqual([0, 2, 2, "empty", true]);
    const upgraded = restlessness("x7bx_f48_t3");
    expect([upgraded.upgraded, upgraded.draw, upgraded.energyGain, upgraded.handCondition]).toEqual([true, 3, 3, "empty"]);
    // A pile copy (the rollout's draws, the game data's template) reads the same condition.
    expect(offHandCardModel(null, "RESTLESSNESS", false, 9, knowledge).handCondition).toBe("empty");
    // Impatience (no logged hand): 「如果你的手牌中没有攻击牌，抽2张牌」.
    const impatience = offHandCardModel(null, "IMPATIENCE", false, 9, knowledge);
    expect([impatience.draw, impatience.handCondition]).toEqual([2, "noAttack"]);
    expect(handConditionOf("抽{Cards:diff()}张牌。")).toBeNull();
  });

  it("the switch off: no condition on any card (the old model: 2 cards and 2 energy every time)", () => {
    cardConditionOptions.enabled = false;
    const plain = restlessness();
    expect([plain.draw, plain.energyGain, "handCondition" in plain]).toEqual([2, 2, false]);
    for (const [key, id] of [["vsrg_f8_t4", "RAGE"], ["yuez_f27_t4", "ASHEN_STRIKE"], ["yvyz_f20_t1", "EXPECT_A_FIGHT"], ["f4k8_f37_t1", "TEAR_ASUNDER"]] as const) {
      const model = modelHandCard(entry(key, id), 0, knowledge);
      expect(["rageBlock", "perExhaustDamage", "perStrengthBlock", "hitPerHpLoss"].filter((field) => field in model)).toEqual([]);
    }
    // Rage stays the old 3-point unknown.
    const rage = modelHandCard(entry("vsrg_f8_t4", "RAGE"), 0, knowledge);
    expect([rage.known, rage.flatValue]).toEqual([false, 3]);
  });
});

describe("2. Restlessness on logged boards", () => {
  it("AKK09TEEEXKD F17 T10 after Battle Trance+ (No Draw, 2 energy, 7 other cards): no line spends its 2 energy; Jev's logged line cannot be paid", () => {
    const { input, plans } = planned("akk_t10_after_bt");
    expect(input.hand.find((entry) => entry.cardId === "RESTLESSNESS")?.handCondition).toBe("empty");
    // The line Jev chose (the rollout's best, added): Restlessness's 2 energy paid for the second Strike and True Grit.
    const jev = "STRIKE_IRONCLAD>0,DEFEND_IRONCLAD,RESTLESSNESS,STRIKE_IRONCLAD>0,TRUE_GRIT";
    expect(replayed(input, jev)).toBeNull();
    // Played as logged (Strike, Defend, Restlessness, then nothing left to pay with): 0 energy left, nothing drawn, -7.
    const logged = replayed(input, "STRIKE_IRONCLAD>0,DEFEND_IRONCLAD,RESTLESSNESS")!;
    expect([logged.outcome.energyLeft, logged.outcome.cardsDrawn, logged.outcome.hpLoss]).toEqual([0, 0, 7]);
    for (const plan of plans) expect(spent(input, plan)).toBeLessThanOrEqual(2);
    expect(steps(plans[0]!)).toBe("STRIKE_IRONCLAD>0,TRUE_GRIT");
    // The old model: the same line paid, energy to spare.
    cardConditionOptions.enabled = false;
    const old = planned("akk_t10_after_bt");
    expect(replayed(old.input, jev)?.outcome.energyLeft).toBe(0);
    expect(replayed(old.input, "STRIKE_IRONCLAD>0,DEFEND_IRONCLAD,RESTLESSNESS")?.outcome.energyLeft).toBe(2);
    expect(steps(old.plans[0]!)).toBe("STRIKE_IRONCLAD>0,RESTLESSNESS,STRIKE_IRONCLAD>0,STOMP,TRUE_GRIT");
  });

  it("AKK09TEEEXKD F17 T10, the turn's code line (Battle Trance+, Strike, Defend, Restlessness, Defend: the last Defend on its energy) is no longer the plan", () => {
    const { decision, input, plans } = planned("akk_t10_plan");
    const code = "BATTLE_TRANCE,STRIKE_IRONCLAD>0,DEFEND_IRONCLAD,RESTLESSNESS,DEFEND_IRONCLAD";
    expect(replayed(input, code)).toBeNull();
    expect(plans.every((plan) => spent(input, plan) <= 2)).toBe(true);
    expect(decision?.label).not.toBe("combat/plan");
    cardConditionOptions.enabled = false;
    const old = planned("akk_t10_plan");
    expect(old.decision?.label).toBe("combat/plan");
    expect(steps(old.plans[0]!)).toBe(code);
  });

  it("BXAZV0R9ZHWK F15 T2 (Restlessness and a Defend at 1 energy; logged: Restlessness first, nothing): Defend first, then it fires", () => {
    const { input, plans } = planned("bxaz_f15_t2");
    const last = replayed(input, "DEFEND_IRONCLAD,RESTLESSNESS")!;
    expect([last.outcome.energyLeft, last.outcome.cardsDrawn]).toEqual([2, 2]);
    const first = replayed(input, "RESTLESSNESS,DEFEND_IRONCLAD")!;
    expect([first.outcome.energyLeft, first.outcome.cardsDrawn]).toEqual([0, 0]);
    // Every line that plays it plays it last among the cards (a potion may follow).
    for (const plan of plans) {
      const cards = plan.steps.filter((step) => !step.cardId.startsWith("POTION:")).map((step) => step.cardId);
      if (cards.includes("RESTLESSNESS")) expect(cards[cards.length - 1]).toBe("RESTLESSNESS");
    }
    // The old model counted it first: 2 cards, 2 energy.
    cardConditionOptions.enabled = false;
    const old = planned("bxaz_f15_t2");
    const oldFirst = replayed(old.input, "RESTLESSNESS,DEFEND_IRONCLAD")!;
    expect([oldFirst.outcome.energyLeft, oldFirst.outcome.cardsDrawn]).toEqual([2, 2]);
  });

  it("X7BX5DYHFZ3N F48 T3: Restlessness+ with Ascender's Bane (unplayable) in hand never fires; without the Bane it would draw 3 and gain 3", () => {
    const up = restlessness("x7bx_f48_t3", 0);
    const bane = modelHandCard({ ...entry("x7bx_f48_t3", "ASCENDERS_BANE"), index: 1 }, 1, knowledge);
    const defend = modelHandCard({ ...entry("x7bx_f48_t3", "DEFEND_IRONCLAD"), index: 2 }, 2, knowledge);
    expect(bane.playable).toBe(false);
    const withBane = solve([up, bane, defend], { energy: 1 });
    const blocked = replaySteps(withBane.input, line(withBane.input, "DEFEND_IRONCLAD,RESTLESSNESS"))!;
    expect([blocked.outcome.energyLeft, blocked.outcome.cardsDrawn]).toEqual([0, 0]);
    const alone = solve([up, defend], { energy: 1 });
    const fires = replaySteps(alone.input, line(alone.input, "DEFEND_IRONCLAD,RESTLESSNESS"))!;
    expect([fires.outcome.energyLeft, fires.outcome.cardsDrawn]).toEqual([3, 3]);
    // On the logged board no line counts its energy: the most any line spends is the 4 energy of the turn.
    const { input, plans } = planned("x7bx_f48_t3");
    expect(Math.max(...plans.map((plan) => spent(input, plan)))).toBeLessThanOrEqual(4);
  });
});

describe("3. the hand condition on the simulated hand (turn-solver handConditionMet)", () => {
  it("a second play of it (Duplication) sees the cards the first drew: 2 energy, not 4", () => {
    const { plans } = solve([restlessness()], { energy: 0, duplicate: 1 });
    const best = plans.find((plan) => steps(plan) === "RESTLESSNESS")!;
    expect([best.outcome.energyLeft, best.outcome.cardsDrawn]).toEqual([2, 2]);
  });

  it("a card drawn earlier in the line (an expected-value draw) is a card in hand: not met; an empty pile draws nothing, so it is", () => {
    const pommel = card(1, "POMMEL_STRIKE", { draw: 1 });
    const drawn = solve([restlessness(), pommel], { energy: 1 });
    expect(replaySteps(drawn.input, line(drawn.input, "POMMEL_STRIKE>0,RESTLESSNESS"))?.outcome.energyLeft).toBe(0);
    const empty = solve([restlessness(), pommel], { energy: 1 }, 0);
    expect(replaySteps(empty.input, line(empty.input, "POMMEL_STRIKE>0,RESTLESSNESS"))?.outcome.energyLeft).toBe(2);
  });

  it("Soulbound cards Chains of Binding locked are still in hand", () => {
    const bound = (index: number) => card(index, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], damage: null, block: 5, soulbound: true });
    const { input } = solve([restlessness(), bound(1), bound(2)], { energy: 1 });
    expect(replaySteps(input, line(input, "DEFEND_IRONCLAD,RESTLESSNESS"))?.outcome.energyLeft).toBe(0);
    const free = solve([restlessness(), bound(1)], { energy: 1 });
    expect(replaySteps(free.input, line(free.input, "DEFEND_IRONCLAD,RESTLESSNESS"))?.outcome.energyLeft).toBe(2);
  });

  it("Impatience draws only with no Attack in hand (a Skill does not stop it)", () => {
    const impatience = { ...offHandCardModel(null, "IMPATIENCE", false, 0, knowledge), validTargets: [] };
    const skill = card(1, "DEFEND_IRONCLAD", { type: "Skill", target: "self", validTargets: [], damage: null, block: 5 });
    const withSkill = solve([impatience, skill], { energy: 1 });
    expect(replaySteps(withSkill.input, line(withSkill.input, "IMPATIENCE"))?.outcome.cardsDrawn).toBe(2);
    const withAttack = solve([impatience, card(1, "STRIKE_IRONCLAD")], { energy: 1 });
    expect(replaySteps(withAttack.input, line(withAttack.input, "IMPATIENCE"))?.outcome.cardsDrawn).toBe(0);
    expect(replaySteps(withAttack.input, line(withAttack.input, "STRIKE_IRONCLAD>0,IMPATIENCE"))?.outcome.cardsDrawn).toBe(2);
  });

  it("it is no free draw: drawFirst leaves it where the plan has it; off, it was moved first", () => {
    const strike = card(1, "STRIKE_IRONCLAD");
    const { input, plans } = solve([restlessness(), strike], { energy: 1 });
    expect(isFreeDraw(restlessness())).toBe(false);
    const best = plans[0]!;
    expect(steps(drawFirst(best, input))).toBe("STRIKE_IRONCLAD>0,RESTLESSNESS");
    cardConditionOptions.enabled = false;
    expect(isFreeDraw(restlessness())).toBe(true);
    expect(steps(solve([restlessness(), strike], { energy: 1 }).plans[0]!)).toBe("RESTLESSNESS,STRIKE_IRONCLAD>0");
  });

  it("after Headbutt only a Restlessness that would draw is barred (the next draw takes back the card put on top)", () => {
    const headbutt = card(1, "HEADBUTT", { putsOnTop: true });
    const blocked = solve([restlessness(), headbutt, card(2, "STRIKE_IRONCLAD")], { energy: 2 });
    // Strike left in hand: Restlessness draws nothing, so it may follow Headbutt.
    expect(replaySteps(blocked.input, line(blocked.input, "HEADBUTT>0,RESTLESSNESS"))).not.toBeNull();
    const fires = solve([restlessness(), headbutt], { energy: 1 });
    expect(replaySteps(fires.input, line(fires.input, "HEADBUTT>0,RESTLESSNESS"))).toBeNull();
  });
});

describe("4. Spite: HP lost earlier this turn (PlayerSim.hpLostThisTurn)", () => {
  it("UJS25W5ARGBV F17 T3: Inferno up at the turn's first frame (its 1 HP as the turn started): Spite hits twice from the first card", () => {
    const { input, plans } = planned("ujs2_f17_t3");
    expect(input.player.hpLostThisTurn).toBe(true);
    const twice = replayed(input, "SPITE>0")!.outcome.damageDealt;
    expect([steps(plans[0]!), plans[0]!.outcome.damageDealt]).toEqual(["SPITE>0,BULLY>0,STRIKE_IRONCLAD>0", 71]);
    cardConditionOptions.enabled = false;
    const old = planned("ujs2_f17_t3");
    expect(old.input.player.hpLostThisTurn).toBeUndefined();
    expect(2 * replayed(old.input, "SPITE>0")!.outcome.damageDealt).toBe(twice);
    expect(old.plans[0]!.outcome.damageDealt).toBe(58);
  });

  it("MX8KZU7ABQBQ F3 T3: 51 HP at the turn's first frame, 49 now (Blood Wall): Spite deals 2 x 5; the decision frame alone (no earlier frame) does not know", () => {
    expect(replayed(planned("mx8k_f3_t3").input, "SPITE>0")?.outcome.damageDealt).toBe(10);
    const fresh = planned("mx8k_f3_t3", false);
    expect(fresh.input.player.hpLostThisTurn).toBeUndefined();
    expect(replayed(fresh.input, "SPITE>0")?.outcome.damageDealt).toBe(5);
  });

  it("Tungsten Rod takes Inferno's 1 off: no HP lost at the turn's start", () => {
    const rod = (raw: Raw) => {
      const run = raw["run"] as Raw;
      run["relics"] = [...(run["relics"] as Raw[]), { relic_id: "TUNGSTEN_ROD", name: "钨合金棍", stack: null }];
    };
    expect(planned("ujs2_f17_t3", true, rod).input.player.hpLostThisTurn).toBeUndefined();
  });

  it("hpLostSinceTurnStart: off with the switch off", () => {
    const env = loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: board("mx8k_f3_t3") }, { knowledge });
    noteTurnStartHp(env.screenMemory, parseGameState(board("mx8k_f3_t3_first")));
    expect(hpLostSinceTurnStart(env)).toBe(true);
    cardConditionOptions.enabled = false;
    expect(hpLostSinceTurnStart(env)).toBe(false);
  });
});

describe("5. effects that grow with the line: Rage, Ashen Strike, Expect a Fight, Tear Asunder", () => {
  it("VSRG9P80R1ZB F8 T4: Rage first gives each later Attack 3 Block (logged: exactly N per Attack under RAGE_POWER N); the old model had it a 3-point unknown, played after Bash", () => {
    const { decision, input, plans } = planned("vsrg_f8_t4");
    expect([steps(plans[0]!), plans[0]!.outcome.blockGained, plans[0]!.outcome.hpLoss]).toEqual(["RAGE,BASH>0,STRIKE_IRONCLAD>0", 6, 0]);
    expect(replayed(input, "BASH>0,RAGE,STRIKE_IRONCLAD>0")?.outcome.blockGained).toBe(3);
    expect(replayed(input, "BASH>0,STRIKE_IRONCLAD>0,RAGE")?.outcome.blockGained).toBe(0);
    expect(decision?.kind).toBe("act");
    cardConditionOptions.enabled = false;
    const old = planned("vsrg_f8_t4");
    expect([steps(old.plans[0]!), old.plans[0]!.outcome.blockGained, old.plans[0]!.outcome.hpLoss]).toEqual(["BASH>0,RAGE,STRIKE_IRONCLAD>0", 0, 6]);
  });

  it("YVYZ6QHA85FN F20 T1: Fight Me! (+3 Strength) then Expect a Fight: 15 + 5 x 3 Block; Expect a Fight first: 15", () => {
    const { input, plans } = planned("yvyz_f20_t1");
    expect(replayed(input, "FIGHT_ME>0,EXPECT_A_FIGHT")?.outcome.blockGained).toBe(30);
    expect(replayed(input, "EXPECT_A_FIGHT,FIGHT_ME>0")?.outcome.blockGained).toBe(15);
    expect(plans[0]!.outcome.hpLoss).toBe(0);
    cardConditionOptions.enabled = false;
    expect(replayed(planned("yvyz_f20_t1").input, "FIGHT_ME>0,EXPECT_A_FIGHT")?.outcome.blockGained).toBe(15);
  });

  it("YUEZ134LG9D3 F27 T4: Ashen Strike+ (18 shown, +4 per card in the exhaust pile) after Burning Pact exhausts one: 22", () => {
    const { input } = planned("yuez_f27_t4");
    const ashen = (text: string) => replayed(input, text)!.outcome.damageDealt;
    expect(ashen("ASHEN_STRIKE>0")).toBe(18);
    expect(ashen("BURNING_PACT,ASHEN_STRIKE>0")).toBe(22);
    // Toxic played is exhausted (its Exhaust keyword): one more card in the pile too.
    expect(ashen("TOXIC,ASHEN_STRIKE>0")).toBe(22);
    cardConditionOptions.enabled = false;
    expect(replayed(planned("yuez_f27_t4").input, "BURNING_PACT,ASHEN_STRIKE>0")!.outcome.damageDealt).toBe(18);
  });

  it("F4K88F267RCX F37 T1: Tear Asunder (1 hit shown: one HP loss so far this fight) after Hemokinesis's 2 HP: 2 hits", () => {
    const { input } = planned("f4k8_f37_t1");
    const tear = input.hand.find((entry) => entry.cardId === "TEAR_ASUNDER")!;
    expect([tear.hits, tear.hitPerHpLoss]).toEqual([1, true]);
    const alone = replayed(input, "TEAR_ASUNDER>0")!.outcome.damageDealt;
    const after = replayed(input, "HEMOKINESIS>0,TEAR_ASUNDER>0")!.outcome.damageDealt;
    const hemo = replayed(input, "HEMOKINESIS>0")!.outcome.damageDealt;
    expect(after - hemo).toBe(2 * alone);
    cardConditionOptions.enabled = false;
    const old = planned("f4k8_f37_t1").input;
    expect(replayed(old, "HEMOKINESIS>0,TEAR_ASUNDER>0")!.outcome.damageDealt - hemo).toBe(alone);
  });
});

describe("6. the rollout's later turns", () => {
  it("Spite after Inferno's turn-start loss: every later turn's solver input has HP lost this turn; off, none", () => {
    const spite = (index: number) => card(index, "SPITE", { cost: 0, damage: 5, special: "spite" });
    const solver: SolverInput = { hand: [spite(0)], player: player({ energy: 3, inferno: 6, infernoCopies: 1, startTurnHpLoss: 1 }), enemies: [dummy({ hp: 300, maxHp: 300 })], fightKind: "monster", turn: 1 };
    const table: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    const meta: FightMeta = { act: 1, t: 1, asc: 8, kind: "hallway", enc: "TEST_DUMMY", deck: { n: 4, atk: 4, skl: 0, pow: 0, junk: 0, dmg: 20, blk: 0, up: 0 }, relics: 0, max_en: 3 };
    const later = (): (boolean | undefined)[] => {
      const seen: (boolean | undefined)[] = [];
      solveTap.onSolve = (input) => {
        if (input.turn !== 1) seen.push(input.player.hpLostThisTurn);
      };
      rolloutDecision({
        solver,
        plans: solveTurn(solver).plans,
        enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
        tables: { TEST_DUMMY: table },
        piles: { draw: [spite(1), spite(2), spite(3)], discard: [], handBase: [spite(0)] },
        meta,
        playerPowers: { INFERNO_POWER: 6 },
        potions: 0,
        mm: {},
        model: null,
        gates: null,
        options: { budgetMs: 1e9, seed: 3, horizon: 3, samples: 1, now: (() => { let t = 0; return () => (t += 0.01); })() },
      });
      solveTap.onSolve = null;
      return seen;
    };
    const on = later();
    expect(on.length).toBeGreaterThan(0);
    expect(on.every((value) => value === true)).toBe(true);
    cardConditionOptions.enabled = false;
    expect(later().every((value) => value === undefined)).toBe(true);
  });
});
