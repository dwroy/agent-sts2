/**
 * Enthralled (执迷, ENTHRALLED: 「如果这张牌在你的手牌中，你必须优先打出这张牌。 永恒。」, the Blood-Soaked Rose's 2-cost Eternal
 * curse): a "play me first" lock. While it is in hand the mod marks every other hand card blocked_by_hook with
 * unplayable_preventer_id ENTHRALLED; once it is played the lock is gone. The planner gave the solver only the mod's
 * playable cards, so Enthralled alone (2 energy for nothing) or end turn were the only lines (HYQW47E7CBSC F38 T4, 5 energy,
 * 13 HP lost). The boards are the logged ones (tests/logged-states/fix6/enthralled.json, states.jsonl lines as the mod sent
 * them); the knowledge is the fixed test data (tests/logged-states/game-data.json) plus Enthralled and the Rose as the
 * mod's game data has them. No model call, nothing written under logs/.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { planCombat } from "../src/screens/combat.js";
import { drawPileCards, phaseSetupCard, pileCardModels, planCombatTurn, stepFirst } from "../src/screens/combat-plan.js";
import { judgeEndTurn } from "../src/sl/judge.js";
import { modelHandCard, offHandCardModel, playFirstOptions, type CardModel } from "../src/strategy/card-model.js";
import { rolloutDecision, type EnemyTable, type FightMeta } from "../src/strategy/rollout.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { replaySteps, solveTap, solveTurn, type EnemySim, type Plan, type PlayerSim, type SolveResult, type SolverInput } from "../src/strategy/turn-solver.js";
import { loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;
const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, "logged-states", "fix6");

/** The mod's game data entries (the .cache collections as of 2026-10-03), not in the fixed subset. */
const ENTHRALLED = {
  id: "ENTHRALLED", name: "执迷", description: "如果这张牌在你的手牌中，你必须优先打出这张牌。 永恒。", description_raw: "如果这张牌在你的手牌中，你必须优先打出这张牌。", type: "Curse", rarity: "Curse",
  target: "None", cost: 2, is_x_cost: false, star_cost: null, is_x_star_cost: false, color: "curse", damage: null, block: null, keywords: ["Eternal"], tags: [], vars: [],
  upgrade: { description: "如果这张牌在你的手牌中，你必须优先打出这张牌。 永恒。" },
};
const ROSE = { id: "BLOOD_SOAKED_ROSE", name: "血染玫瑰", description: "拾起时，将[blue]1[/blue]张[red]执迷[/red]加入你的[gold]牌组[/gold]。在回合开始时获得{Energy:energyIcons()}。", rarity: "Ancient", pool: "relic_pool.event_relic_pool (25073465)", is_melted: false };
const data = JSON.parse(readFileSync(join(HERE, "logged-states", "game-data.json"), "utf8")) as Record<string, unknown[]>;
const knowledge = makeKnowledge({ ...data, cards: [...(data["cards"] ?? []), ENTHRALLED], relics: [...(data["relics"] ?? []), ROSE] }, "cache");

/** A fresh copy of one logged state of the fixture ({ source, states }). */
const fixture = (key: string, dir = DIR, file = "enthralled"): Raw => {
  const raw = JSON.parse(readFileSync(join(dir, `${file}.json`), "utf8")) as { states: Record<string, Raw> };
  const state = raw.states[key];
  if (!state) throw new Error(`${file} has no state ${key}`);
  return state;
};
const handOf = (raw: Raw): Raw[] => (raw["combat"] as Raw)["hand"] as Raw[];
const modelled = (raw: Raw): CardModel[] => handOf(raw).map((entry, i) => modelHandCard(entry, i, knowledge));
const env = (raw: Raw, over: Parameters<typeof loggedEnv>[1] = {}) => loggedEnv({ source: "", decision: { label: "", decider: "", chosen: null, rationale: "" }, state: raw }, { knowledge, ...over });

afterEach(() => {
  rolloutLiveOptions.enabled = true;
  solveTap.onSolve = null;
  playFirstOptions.enabled = true;
});

/** The planner's decision and its solver input and result on a logged board (its rollout off). */
function planned(raw: Raw): { decision: Decision | null; input: SolverInput; result: SolveResult } {
  let captured: { input: SolverInput; result: SolveResult } | null = null;
  solveTap.onSolve = (input, result) => {
    captured ??= { input, result };
  };
  rolloutLiveOptions.enabled = false;
  const decision = planCombatTurn(env(raw));
  if (!captured) throw new Error("the planner did not solve the board");
  const { input, result } = captured;
  return { decision, input, result };
}

/** A plan's plays as "CARD>target,…" (no target: the card alone). */
const steps = (plan: { steps: { cardId: string; target: number | null }[] }) => plan.steps.map((step) => `${step.cardId}${step.target !== null ? `>${step.target}` : ""}`).join(",");
/** No line plays a card before Enthralled while it is in hand (a potion may come first). */
const enthralledFirst = (plan: Plan) => {
  const at = plan.steps.findIndex((step) => step.cardId === "ENTHRALLED");
  const cards = plan.steps.filter((step) => !step.cardId.startsWith("POTION:"));
  return cards.length === 0 || (at >= 0 && cards[0]!.cardId === "ENTHRALLED");
};

const card = (index: number, cardId: string, over: Partial<CardModel> = {}): CardModel => ({
  index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0], damage: 6, hits: 1, block: 0,
  vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0, draw: 0, exhausts: false, special: null, known: true, flatValue: 0,
  heldPenalty: 0, text: "", ...over,
});
const player = (over: Partial<PlayerSim> = {}): PlayerSim => ({ hp: 60, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0, ...over });
const dummy = (over: Partial<EnemySim> = {}): EnemySim => ({ index: 0, name: "Dummy", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [], ...over });
/** Enthralled as the rollout models a pile copy of it (offHandCardModel: the game data's cost 2). */
const enthralled = (index: number) => offHandCardModel(null, "ENTHRALLED", false, index, knowledge);

describe("1. the card model: Enthralled plays first, the cards it locks are playable after it (card-model afterPlayFirst)", () => {
  it("HYQW47E7CBSC F38 T4: the mod locks Bludgeon, Evil Eye, Bash and Strike (blocked_by_hook, preventer ENTHRALLED); the model has them playable, Enthralled first", () => {
    const raw = fixture("hyqw_t4");
    expect(handOf(raw).map((entry) => [entry["card_id"], entry["playable"], entry["unplayable_preventer_id"] ?? null])).toEqual([
      ["BLUDGEON", false, "ENTHRALLED"], ["EVIL_EYE", false, "ENTHRALLED"], ["BASH", false, "ENTHRALLED"], ["ENTHRALLED", true, null], ["STRIKE_IRONCLAD", false, "ENTHRALLED"],
    ]);
    const hand = modelled(raw);
    expect(hand.map((entry) => [entry.cardId, entry.playable, entry.playFirst ?? false])).toEqual([
      ["BLUDGEON", true, false], ["EVIL_EYE", true, false], ["BASH", true, false], ["ENTHRALLED", true, true], ["STRIKE_IRONCLAD", true, false],
    ]);
    // It does nothing itself, and that is modelled: not an unknown card (the SL judge's chance, the dominance filter).
    const it = hand[3]!;
    expect([it.cost, it.known, it.flatValue, it.damage, it.block, it.exhausts]).toEqual([2, true, 0, null, 0, false]);
  });

  it("0YG4ETM3MLHS F43 T9: a Burn it locks stays unplayable (raw 'HasUnplayableKeyword, BlockedByHook')", () => {
    const hand = modelled(fixture("0yg4_f43_burns"));
    expect(hand.filter((entry) => entry.cardId === "BURN").every((entry) => !entry.playable)).toBe(true);
    expect(hand.filter((entry) => entry.cardId !== "BURN").every((entry) => entry.playable)).toBe(true);
  });

  it("the Chains of Binding lock is unchanged (4JGPCH3WX6JV F48 T2: CHAINS_OF_BINDING_POWER, unplayable, no play-first card)", () => {
    const raw = fixture("t2_zero", join(HERE, "logged-states", "fix2"), "4jgp-f48-t2-chains");
    const hand = handOf(raw).map((entry, i) => modelHandCard(entry, i, loggedKnowledge));
    expect(hand.map((entry) => [entry.cardId, entry.playable, "playFirst" in entry])).toEqual([["RUPTURE", false, false], ["DEFEND_IRONCLAD", false, false]]);
    // A card locked by any other hook (Sloth, Smoggy, Ringing, Normality) is not unlocked by this rule either.
    for (const preventer of ["SLOTH_POWER", "SMOGGY_POWER", "RINGING_POWER", "NORMALITY"]) {
      const entry = { ...handOf(raw)[1]!, unplayable_reason: "blocked_by_hook", unplayable_reason_raw: "BlockedByHook", unplayable_preventer_id: preventer };
      expect(modelHandCard(entry, 1, loggedKnowledge).playable).toBe(false);
    }
  });

  it("tools only: the switch off gives the old model (Enthralled not first, the locked cards unplayable)", () => {
    playFirstOptions.enabled = false;
    expect(modelled(fixture("hyqw_t4")).map((entry) => [entry.playable, "playFirst" in entry])).toEqual([[false, false], [false, false], [false, false], [true, false], [false, false]]);
  });
});

describe("2. the planner plays Enthralled first, then real cards (turn-solver play, combat-plan)", () => {
  it("HYQW47E7CBSC F38 T4 (5 energy, 18 HP, the Frog Knight's 19 into 7 block): every line opens with Enthralled, and the best beats ending the turn (-13)", () => {
    const { decision, input, result } = planned(fixture("hyqw_t4"));
    expect(input.hand.filter((entry) => entry.playable).map((entry) => entry.cardId)).toEqual(["BLUDGEON", "EVIL_EYE", "BASH", "ENTHRALLED", "STRIKE_IRONCLAD"]);
    expect(result.plans.every(enthralledFirst)).toBe(true);
    const end = result.plans.find((plan) => plan.steps.length === 0)!;
    expect(end.outcome.hpLoss).toBe(13);
    const best = result.plans[0]!;
    expect(steps(best)).toBe("ENTHRALLED,EVIL_EYE,BASH>0");
    // Evil Eye's 8 block: 5 lost, not 13; Bludgeon's 37 into the Knight's 17 block is a line too.
    expect(best.outcome.hpLoss).toBe(5);
    expect(result.plans.find((plan) => steps(plan) === "ENTHRALLED,BLUDGEON>0")?.outcome.damageDealt).toBe(20);
    // No longer "code plan (only line): end turn": a question between whole lines, each opening with Enthralled.
    expect(decision?.kind).toBe("ask");
    const criteria = ((decision as AskDecision).questions["plan"] as { criteria: Record<string, string | null> }).criteria;
    const plays = Object.entries(criteria).filter(([key]) => /^plan\d+$/.test(key)).map(([, text]) => String((JSON.parse(text ?? "{}") as Raw)["plays"] ?? ""));
    expect(plays.length).toBeGreaterThan(0);
    expect(plays.every((text) => text.startsWith("执迷"))).toBe(true);
  });

  it("the old model on the same board: only end turn (the logged 'code plan (only line): end turn; hp -13')", () => {
    playFirstOptions.enabled = false;
    const { decision, result } = planned(fixture("hyqw_t4"));
    expect(result.plans.map(steps)).toEqual([""]);
    expect(decision?.kind === "act" && decision.intent.action).toBe("end_turn");
  });

  it("YVWAWAPXJXGV F40 T1: the lines before Enthralled is played are the lines after it (logged: every lock gone, energy 8 -> 6), Enthralled first", () => {
    const before = planned(fixture("yvwa_f40_before")).result;
    const after = planned(fixture("yvwa_f40_after")).result;
    expect(before.plans.every(enthralledFirst)).toBe(true);
    const outcome = (plan: Plan) => `${plan.outcome.hpLoss}/${plan.outcome.damageDealt}`;
    const drop = (plan: Plan) => steps({ steps: plan.steps.filter((step) => step.cardId !== "ENTHRALLED") });
    const cardLines = (result: SolveResult, keep: (plan: Plan) => boolean) => result.plans.filter(keep).map((plan) => `${drop(plan)}=${outcome(plan)}`).sort();
    expect(cardLines(before, (plan) => plan.steps.some((step) => step.cardId === "ENTHRALLED"))).toEqual(cardLines(after, (plan) => plan.steps.length > 0));
  });

  it("0YG4ETM3MLHS F35 T2 (drawn at 1 energy): Enthralled cannot be paid, so nothing else is played (logged: no play_card offered)", () => {
    const raw = fixture("0yg4_f35_short");
    expect((raw["available_actions"] as string[]).includes("play_card")).toBe(false);
    const { decision, result } = planned(raw);
    expect(result.plans.every((plan) => plan.steps.every((step) => step.cardId.startsWith("POTION:")))).toBe(true);
    expect(decision?.kind === "act" && decision.intent.action).toBe("end_turn");
  });

  it("0YG4ETM3MLHS F43 T9 (drawn by Burning Pact, 3 energy): Enthralled, then Bloodletting's energy pays for three more", () => {
    const { result } = planned(fixture("0yg4_f43_burns"));
    expect(result.plans.every(enthralledFirst)).toBe(true);
    expect(steps(result.plans[0]!)).toMatch(/^ENTHRALLED,BLOODLETTING,/);
    expect(result.plans[0]!.steps.length).toBe(5);
  });

  it("the solver's rule: no card before Enthralled, a potion may come first; two copies both play first", () => {
    const potion = card(100, "POTION:BLOCK_POTION:0", { type: "Potion", cost: 0, damage: null, block: 12, target: "self", validTargets: [] });
    const defend = card(1, "DEFEND", { type: "Skill", damage: null, block: 5, target: "self", validTargets: [] });
    const input: SolverInput = { hand: [enthralled(0), defend, potion], player: player({ energy: 3 }), enemies: [dummy({ attacks: [{ damage: 20, hits: 1 }] })], fightKind: "monster" };
    const lines = solveTurn(input).plans.map(steps);
    expect(lines.some((line) => /DEFEND.*ENTHRALLED/.test(line) || line.startsWith("DEFEND"))).toBe(false);
    expect(lines.some((line) => line.includes("POTION") && line.includes("DEFEND"))).toBe(true);
    const at = (...order: CardModel[]) => replaySteps(input, order.map((entry) => ({ cardIndex: entry.index, cardId: entry.cardId, upgraded: false, cost: entry.cost, name: entry.name, target: null, targetName: null })));
    expect(at(potion, input.hand[0]!, defend)?.outcome.hpLoss).toBe(3);
    expect(at(potion, defend)).toBeNull();
    expect(at(defend)).toBeNull();
    // Two copies: both before any other card (4 energy, then the Defend at 0 left: not played).
    const two: SolverInput = { ...input, hand: [enthralled(0), enthralled(2), defend], player: player({ energy: 4 }) };
    expect(solveTurn(two).plans.every((plan) => !plan.steps.some((step) => step.cardId === "DEFEND"))).toBe(true);
    expect(solveTurn({ ...two, player: player({ energy: 5 }) }).plans.map(steps)).toContain("ENTHRALLED,ENTHRALLED,DEFEND");
  });
});

describe("3. the other consumers", () => {
  it("the rollout's later turns: Enthralled drawn again takes 2 energy first (a pile copy is playFirst, cost 2)", () => {
    const pile = enthralled(1);
    expect([pile.playable, pile.playFirst, pile.cost, pile.known]).toEqual([true, true, 2, true]);
    // The board's own pile models (YVWA F40 T1 after the play: Enthralled in the discard pile).
    const discard = pileCardModels(parseGameState(fixture("yvwa_f40_after")), knowledge, "discard", { enemyTargets: [0], strength: 0, weak: false });
    expect(discard.filter((entry) => entry.cardId === "ENTHRALLED").map((entry) => [entry.playFirst, entry.cost])).toEqual([[true, 2]]);
    // A dummy at 24 HP, 3 energy a turn, Strikes 6: turn 0 plays one; the next hand is Enthralled and two Strikes, so one
    // Strike a turn while Enthralled comes back (two without the rule).
    const strike = card(0, "STRIKE_IRONCLAD", { damageBase: 6 });
    const solver: SolverInput = { hand: [strike], player: player({ energy: 1 }), enemies: [dummy({ hp: 24, maxHp: 24 })], fightKind: "monster", turn: 1 };
    const table: EnemyTable = { moves: { WAIT: { damage: 0, hits: 1, strength: 0, block: 0 } }, next: { WAIT: { WAIT: 1 } } };
    const meta: FightMeta = { act: 1, t: 1, asc: 8, kind: "hallway", enc: "TEST_DUMMY", deck: { n: 4, atk: 3, skl: 0, pow: 0, junk: 1, dmg: 18, blk: 0, up: 0 }, relics: 0, max_en: 3 };
    const run = () =>
      rolloutDecision({
        solver,
        plans: solveTurn(solver).plans,
        enemies: [{ index: 0, id: "TEST_DUMMY", move: "WAIT", strength: 0, powers: {} }],
        tables: { TEST_DUMMY: table },
        piles: { draw: [enthralled(1), card(2, "STRIKE_IRONCLAD", { damageBase: 6 }), card(3, "STRIKE_IRONCLAD", { damageBase: 6 })], discard: [], handBase: [strike] },
        meta,
        playerPowers: {},
        potions: 0,
        mm: {},
        model: null,
        gates: null,
        options: { budgetMs: 1e9, seed: 3, horizon: 4, samples: 2, now: (() => { let t = 0; return () => (t += 0.01); })() },
      }).lines.find((entry) => steps(entry.plan) === "STRIKE_IRONCLAD>0");
    // 6 now, then 6 a turn (Enthralled, cost 2, first every turn: the pile is reshuffled each turn): 24 on the 4th turn.
    expect(run()?.turnsToWin).toBe(4);
    // The switch off (the old model): the pile copy is an ordinary curse nobody plays, three Strikes on the 2nd turn.
    playFirstOptions.enabled = false;
    expect(enthralled(1).playFirst).toBeUndefined();
    expect(run()?.turnsToWin).toBe(2);
  });

  it("the least-loss reorders (draw first, Frantic Escape first) never put a card before Enthralled; without it, as before", () => {
    const hand = [enthralled(3), card(0, "POMMEL_STRIKE", { draw: 1 }), card(1, "STRIKE_IRONCLAD")];
    const step = (index: number, cardId: string) => ({ cardIndex: index, cardId, upgraded: false, cost: 1, name: cardId, target: null, targetName: null });
    const plan = { steps: [step(3, "ENTHRALLED"), step(1, "STRIKE_IRONCLAD"), step(0, "POMMEL_STRIKE")] };
    expect(steps(stepFirst(plan, 2, hand))).toBe("ENTHRALLED,POMMEL_STRIKE,STRIKE_IRONCLAD");
    expect(stepFirst(plan, 0, hand)).toBe(plan);
    // A potion before Enthralled stays first too; the moved card goes right after Enthralled.
    const drink = { steps: [step(100, "POTION:ENERGY_POTION:0"), step(3, "ENTHRALLED"), step(1, "STRIKE_IRONCLAD"), step(0, "POMMEL_STRIKE")] };
    expect(steps(stepFirst(drink, 3, hand))).toBe("POTION:ENERGY_POTION:0,ENTHRALLED,POMMEL_STRIKE,STRIKE_IRONCLAD");
    // No play-first card: the step goes to the very front, as before.
    const plain = { steps: [step(1, "STRIKE_IRONCLAD"), step(0, "POMMEL_STRIKE")] };
    expect(steps(stepFirst(plain, 1, hand.slice(1)))).toBe("POMMEL_STRIKE,STRIKE_IRONCLAD");
  });

  it("a boss phase's setup turn: Enthralled first when a setup card is left for after it", () => {
    const power = card(1, "INFLAME", { type: "Power", cost: 1, damage: null, target: "self", validTargets: [] });
    expect(phaseSetupCard([enthralled(0), power], 3, false)?.card.cardId).toBe("ENTHRALLED");
    expect(phaseSetupCard([enthralled(0), power], 2, false)).toBeNull();
    expect(phaseSetupCard([power], 3, false)?.card.cardId).toBe("INFLAME");
  });

  it("a drawn Enthralled has no draw value (it plays nothing and locks the hand): the draw pile line is not playable", () => {
    const pile = drawPileCards(fixture("0yg4_f35_short"));
    const raw = ((fixture("0yg4_f35_short")["agent_view"] as Raw)["combat"] as Raw)["draw"] as Raw[];
    const at = raw.findIndex((entry) => (entry["card_ids"] as string[]).includes("ENTHRALLED"));
    if (at >= 0) expect(pile![at]!.playable).toBe(false);
    const parsed = drawPileCards({ agent_view: { combat: { draw: [{ line: "执迷 [2费]：如果这张牌在你的手牌中，你必须优先打出这张牌。 永恒。", card_ids: ["ENTHRALLED"] }, { line: "打击 [1费]：造成6点伤害。", card_ids: ["STRIKE_IRONCLAD"] }] } } });
    expect(parsed!.map((entry) => entry.playable)).toEqual([false, true]);
  });

  it("the SL judge's rules tier: a locked hand with Enthralled playable is not 'nothing playable'; with it unpaid and no potion it is", () => {
    const lethal = (raw: Raw, hp: number) => {
      const combat = raw["combat"] as Raw;
      (combat["player"] as Raw)["current_hp"] = hp;
      (combat["player"] as Raw)["block"] = 0;
      combat["end_turn_will_kill_player"] = true;
      (raw["run"] as Raw)["potions"] = [];
      return parseGameState(raw);
    };
    const playable = judgeEndTurn(lethal(fixture("hyqw_t4"), 5), { label: "combat/plan", revives: [] });
    expect(playable.certain).toBe(false);
    expect(playable.reason).toMatch(/^1 playable card/);
    const unpaid = judgeEndTurn(lethal(fixture("0yg4_f35_short"), 10), { label: "combat/plan", revives: [] });
    expect([unpaid.certain, unpaid.tier]).toEqual([true, "rules"]);
  });

  it("the SL judge's least-loss tier: a drawing card Enthralled locks (Pommel Strike) vetoes it like a playable one", () => {
    const board = () => {
      const raw = fixture("yvwa_f40_before");
      const combat = raw["combat"] as Raw;
      (combat["player"] as Raw)["current_hp"] = 5;
      combat["end_turn_will_kill_player"] = true;
      (raw["run"] as Raw)["potions"] = [];
      return parseGameState(raw);
    };
    const verdict = judgeEndTurn(board(), { label: "combat/least-loss", revives: [] });
    expect(verdict.certain).toBe(false);
    expect(verdict.reason).toMatch(/剑柄打击 draws/);
    // Before: the locked Pommel Strike was not seen, and the verdict was certain.
    playFirstOptions.enabled = false;
    expect(judgeEndTurn(board(), { label: "combat/least-loss", revives: [] }).certain).toBe(true);
  });

  it("the per-card fallback: the Enthralled option names what it unlocks and is worth the best of it (it beats ending the turn with nothing incoming)", () => {
    const raw = fixture("hyqw_t4");
    // Nothing incoming: ending the turn scores +10, Enthralled alone 0 (the old fallback ended the turn).
    for (const enemy of (raw["combat"] as Raw)["enemies"] as Raw[]) enemy["intents"] = [{ index: 0, intent_type: "Buff", label: null, damage: null, hits: null, total_damage: null, status_card_count: null }];
    const decision = planCombat(env(raw, { combatPlanner: "card", strictJev: false })) as AskDecision;
    const criteria = (decision.questions["play"] as { criteria: Record<string, string | null> }).criteria;
    const option = JSON.parse(criteria["c3"] ?? "{}") as Raw;
    expect(option["unlocks"]).toBe("nothing else can be played while it is in the hand; once it is played: 重锤, 邪眼, 痛击+, 打击 (3 energy left)");
    const fallback = decision.resolve({} as AnswerSet);
    expect(fallback.intent).toEqual({ action: "play_card", card_index: 3 });
  });
});
