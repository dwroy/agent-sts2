/**
 * Random potions by Monte Carlo (Dai 2026-09-28, src/strategy/potion-mc.ts): card-choice potions sample
 * offers from the real card pool, draw potions sample pile orders; every sample's line starts with the
 * drink; the option shows the distribution and says the turn is re-planned after the drink; unsimulated
 * potions carry no numbers; the samples are deterministic per board.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { AnswerSet } from "../src/jev/answers.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { MAX_OPTIONS, planCombatTurn, trimForPotionOptions } from "../src/screens/combat-plan.js";
import type { CardModel } from "../src/strategy/card-model.js";
import { beatsDryLine, MC_BEATS_DAMAGE, MC_BEATS_HP, MC_MIN_SAMPLES, MC_SAMPLES, potionMcCriteria, potionMcOptions, runPotionMc, samplePotion, seedOf, type PotionMcSource } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { solveTurn, type EnemySim, type Plan, type PlayerSim, type SolverInput } from "../src/strategy/turn-solver.js";
import { logged, loggedEnv } from "./logged.js";

afterEach(() => {
  rolloutLiveOptions.enabled = true;
  potionMcOptions.now = null;
  potionMcOptions.budgetMs = 400;
  potionMcOptions.samples = MC_SAMPLES;
});

const card = (index: number, cardId: string, o: Partial<CardModel> = {}): CardModel => ({
  index, key: `c${index}`, cardId, name: cardId, type: "Attack", upgraded: false, cost: 1, xCost: false, playable: true, target: "single", validTargets: [0],
  damage: null, hits: 1, block: 0, vulnerable: 0, weak: 0, strength: 0, tempStrength: 0, enemyStrength: 0, enemyTempStrengthLoss: 0, hpLoss: 0, energyGain: 0,
  draw: 0, exhausts: false, special: null, known: true, flatValue: 0, heldPenalty: 0, text: "", ...o,
});
const attack = (index: number, id: string, damage: number, cost = 0) => card(index, id, { damage, cost });
const defend = (index: number, block = 5) => card(index, "DEFEND", { type: "Skill", target: "self", validTargets: [], block });
const player: PlayerSim = { hp: 40, maxHp: 80, block: 0, energy: 3, weak: false, vulnerable: false, intangible: false, strengthNow: 0 };
const enemy = (hp: number, damage: number): EnemySim => ({ index: 0, name: "Jaw Worm", hp, maxHp: 44, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage, hits: 1 }] });
const input = (hand: CardModel[], hp = 30, damage = 10): SolverInput => ({ hand, player, enemies: [enemy(hp, damage)], fightKind: "monster", turn: 2 });
const drinksFirst = (plan: Plan | null, potionId: string) => plan !== null && plan.steps[0]!.cardId.startsWith(`POTION:${potionId}:`);
const pick = (key: string): AnswerSet => ({ plan: { type: "choice", choice: key, probabilities: { [key]: 0.9 }, confidence: 0.9, raw: {} } }) as AnswerSet;
const criteriaOf = (decision: Decision | null) => ((decision as AskDecision).jevView?.questions ?? (decision as AskDecision).questions)["plan"]!.criteria!;

describe("beats the best potion-free line only by a real margin (6189 F17 T1: Gambler's Brew +0.1 damage read 'beats 12/12')", () => {
  const outcome = (hpLoss: number, damageDealt: number, flags: { dies?: boolean; winsFight?: boolean } = {}) =>
    ({ steps: [], score: 0, outcome: { hpLoss, damageDealt, dies: flags.dies ?? false, winsFight: flags.winsFight ?? false } }) as unknown as Plan;

  it("the margin: MC_BEATS_HP HP saved, MC_BEATS_DAMAGE damage more, a mix worth as much, a win, or living where the dry line dies", () => {
    const dry = outcome(10, 24);
    expect(beatsDryLine(outcome(10, 25), dry)).toBe(false);
    expect(beatsDryLine(outcome(9, 24), dry)).toBe(false);
    expect(beatsDryLine(outcome(10 - MC_BEATS_HP, 24), dry)).toBe(true);
    expect(beatsDryLine(outcome(10, 24 + MC_BEATS_DAMAGE), dry)).toBe(true);
    expect(beatsDryLine(outcome(9, 24 + MC_BEATS_DAMAGE / 2), dry)).toBe(true);
    expect(beatsDryLine(outcome(12, 34), dry)).toBe(true);
    expect(beatsDryLine(outcome(10, 25, { winsFight: true }), dry)).toBe(true);
    expect(beatsDryLine(outcome(0, 90, { dies: true }), dry)).toBe(false);
    expect(beatsDryLine(outcome(30, 0), outcome(40, 0, { dies: true }))).toBe(true);
  });

  it("a potion that adds 1-2 damage at equal HP beats in no sample; the option shows the mean differences", () => {
    const pool = [attack(0, "ONE", 1), attack(0, "TWO", 2), attack(0, "ONE_B", 1), attack(0, "TWO_B", 2)];
    const source: PotionMcSource = { potionId: "ATTACK_POTION", name: "Attack Potion", slot: 0, text: "pick 1 of 3", kind: "choice", pools: { Attack: pool }, poolName: "test Attack" };
    const board = input([attack(1, "STRIKE", 6, 1), attack(2, "STRIKE", 6, 1), attack(3, "STRIKE", 6, 1), attack(4, "STRIKE", 6, 1)], 300, 10);
    const dryBest = solveTurn(board).plans[0]!;
    expect(dryBest.outcome.damageDealt).toBe(18);
    const mc = runPotionMc(board, source, dryBest, 11, 10_000);
    const lines = mc.plans.filter((plan): plan is Plan => plan !== null);
    // Every sample scores above the dry line (the old count), none by a real margin.
    expect(lines.every((plan) => plan.score > dryBest.score)).toBe(true);
    expect(mc.beats).toBe(0);
    expect(mc.vsDry!.hpSaved).toBe(0);
    expect(mc.vsDry!.damageGained).toBeGreaterThan(0);
    expect(mc.vsDry!.damageGained).toBeLessThanOrEqual(2);
    const criteria = potionMcCriteria(mc, dryBest, () => "", false);
    expect(criteria["beats_best_potion_free_line"]).toMatch(/^0\/12 samples/);
    expect(criteria["vs_best_potion_free_line"]).toMatch(/^mean HP saved \+0, mean damage \+\d/);
  });
});

describe("(a) card-choice potions: offers from the real pool, the best card of each taken", () => {
  const pool = [attack(0, "BIG", 40), attack(0, "MID", 12), attack(0, "SMALL", 4), attack(0, "TINY", 1), attack(0, "CHIP", 2)];
  const source: PotionMcSource = { potionId: "ATTACK_POTION", name: "Attack Potion", slot: 0, text: "pick 1 of 3", kind: "choice", pools: { Attack: pool }, poolName: "test Attack" };

  it("the solver tries each offered card (free) after the drink and keeps the best", () => {
    const offer = [attack(200, "TINY", 1), attack(201, "BIG", 40), attack(202, "MID", 12)].map((c, i) => ({ ...c, key: `g0.${i}` }));
    const potion = { ...samplePotion(source, [], () => 0.5), choices: offer };
    const plans = solveTurn({ ...input([defend(1)]), hand: [defend(1), potion], firstKey: potion.key }).plans.filter((plan) => plan.steps.length > 0);
    expect(plans.every((plan) => drinksFirst(plan, "ATTACK_POTION"))).toBe(true);
    expect(plans[0]!.steps[0]!.name).toBe("potion Attack Potion (take BIG)");
    expect(plans[0]!.outcome.winsFight).toBe(true);
  });

  it("each sample is 3 distinct pool cards; wins and beats are counted over the samples; the median line is one of them", () => {
    const mc = runPotionMc(input([defend(1)]), source, null, 7, 10_000);
    expect(mc.samples).toBe(MC_SAMPLES);
    expect(mc.plans.every((plan) => drinksFirst(plan, "ATTACK_POTION"))).toBe(true);
    // Replay the offers with the same seed: BIG (40) kills the 30-HP worm, nothing else does.
    const random = mulberry(7);
    const offers = Array.from({ length: MC_SAMPLES }, () => samplePotion(source, [defend(1)], random).choices!.map((c) => c.cardId));
    for (const offer of offers) expect(new Set(offer).size).toBe(3);
    expect(mc.wins).toBe(offers.filter((offer) => offer.includes("BIG")).length);
    expect(mc.plans.map((plan) => plan!.outcome.winsFight)).toEqual(offers.map((offer) => offer.includes("BIG")));
    expect(mc.damage.min).toBeLessThanOrEqual(mc.damage.mean);
    expect(mc.damage.mean).toBeLessThanOrEqual(mc.damage.max);
    expect(mc.plans).toContain(mc.median);
  });

  it("Orobic Acid takes one card of each type, all of them", () => {
    const orobic: PotionMcSource = { ...source, potionId: "OROBIC_ACID", name: "Orobic Acid", pools: { Attack: [attack(0, "A", 5)], Skill: [defend(0, 9)], Power: [card(0, "P", { type: "Power", target: "self", validTargets: [], flatValue: 8 })] } };
    const potion = samplePotion(orobic, [], mulberry(1));
    expect(potion.adds!.map((c) => c.cardId)).toEqual(["A", "DEFEND", "P"]);
    const best = solveTurn({ ...input([], 30, 12), hand: [potion], firstKey: potion.key }).plans[0]!;
    expect(best.outcome.damageDealt).toBe(5);
    expect(best.outcome.blockGained).toBe(9);
  });
});

describe("(b) draw potions: the known piles in a random order", () => {
  const pile = [attack(900, "STRIKE", 6, 1), attack(901, "STRIKE", 6, 1), defend(902, 5), defend(903, 5), attack(904, "HEAVY", 20, 1), card(905, "WOUND", { type: "Status", playable: false, target: "none", validTargets: [] })];
  const source = (potionId: string, name = potionId): PotionMcSource => ({ potionId, name, slot: 1, text: "", kind: "draw", piles: { draw: pile, discard: [] } });

  it("Swift Potion: 3 real cards from one shuffled order per sample, the drink first; the spread shows the luck", () => {
    const mc = runPotionMc(input([]), source("SWIFT_POTION"), null, 11, 10_000);
    expect(mc.plans.every((plan) => drinksFirst(plan, "SWIFT_POTION"))).toBe(true);
    expect(mc.plans.every((plan) => plan!.outcome.cardsDrawn === 3)).toBe(true);
    expect(mc.damage.max).toBeGreaterThan(mc.damage.min);
    // Drawn cards are played from the sample's order (indices 300+).
    expect(mc.plans.some((plan) => plan!.steps.some((step) => step.cardIndex >= 300))).toBe(true);
  });

  it("Snecko Oil: the hand and the drawn cards get random costs 0-3", () => {
    const potion = samplePotion(source("SNECKO_OIL"), [attack(0, "BASH", 8, 2)], mulberry(3));
    expect(potion.drawn!.length).toBe(6);
    const costs = Object.values(potion.sneckoCosts!);
    expect(Object.keys(potion.sneckoCosts!)).toContain("c0");
    expect(costs.every((cost) => cost >= 0 && cost <= 3 && Number.isInteger(cost))).toBe(true);
  });

  it("Gambler's Brew swaps the discarded cards for the next cards of the order; Glowwater exhausts the hand and draws", () => {
    const brew = samplePotion(source("GAMBLERS_BREW"), [], mulberry(5));
    const hand = [card(0, "USELESS", { type: "Skill", target: "self", validTargets: [], cost: 0 })];
    const plans = solveTurn({ ...input(hand), hand: [...hand, brew], firstKey: brew.key }).plans.filter((plan) => plan.steps.length > 0);
    const swap = plans.find((plan) => (plan.steps[0]!.discards ?? []).length === 1)!;
    expect(swap).toBeDefined();
    expect(swap.outcome.cardsDrawn).toBe(1);
    const glow = samplePotion(source("GLOWWATER_POTION"), [], mulberry(5));
    const best = solveTurn({ ...input(hand), hand: [...hand, glow], firstKey: glow.key }).plans[0]!;
    expect(best.steps.some((step) => step.cardId === "USELESS")).toBe(false);
    expect(best.outcome.cardsDrawn).toBe(pile.length);
  });

  it("Distilled Chaos plays the sample's top 3 cards for free; Bottled Potential shuffles the hand in", () => {
    const chaos = samplePotion(source("DISTILLED_CHAOS"), [], mulberry(9));
    const top = chaos.drawn!.slice(0, 3);
    const best = solveTurn({ ...input([], 100, 0), hand: [chaos], firstKey: chaos.key }).plans[0]!;
    expect(best.outcome.damageDealt).toBe(top.reduce((sum, c) => sum + (c.playable ? c.damage ?? 0 : 0), 0));
    const hand = [attack(0, "HAND_CARD", 3, 1)];
    const bottled = samplePotion(source("BOTTLED_POTENTIAL"), hand, mulberry(9));
    expect(bottled.drawn!.length).toBe(5);
    expect(bottled.drawn!.map((c) => c.cardId).concat(["?"]).length).toBeGreaterThan(0);
    const after = solveTurn({ ...input(hand), hand: [...hand, bottled], firstKey: bottled.key }).plans[0]!;
    expect(after.steps.filter((step) => step.cardIndex === 0).length).toBe(0);
  });
});

describe("determinism and the time budget", () => {
  const source: PotionMcSource = { potionId: "SWIFT_POTION", name: "Swift", slot: 0, text: "", kind: "draw", piles: { draw: [attack(900, "A", 6, 1), defend(901), attack(902, "B", 9, 1), defend(903), attack(904, "C", 3, 1)], discard: [] } };

  it("the same board and seed give the same samples; the seed comes from the board", () => {
    const a = runPotionMc(input([]), source, null, seedOf("run:F1:T2:SWIFT"), 10_000);
    const b = runPotionMc(input([]), source, null, seedOf("run:F1:T2:SWIFT"), 10_000);
    expect(b.plans.map((plan) => JSON.stringify(plan!.steps))).toEqual(a.plans.map((plan) => JSON.stringify(plan!.steps)));
    expect([b.hpLoss, b.damage, b.wins, b.beats]).toEqual([a.hpLoss, a.damage, a.wins, a.beats]);
    expect(seedOf("run:F1:T2:SWIFT")).not.toBe(seedOf("run:F1:T3:SWIFT"));
  });

  it("a slow clock cuts the samples, never below MC_MIN_SAMPLES, and says so", () => {
    let t = 0;
    potionMcOptions.now = () => (t += 100);
    const mc = runPotionMc(input([]), source, null, 1, 50);
    expect(mc.samples).toBe(MC_MIN_SAMPLES);
    expect(mc.degraded).toBe(true);
  });

  it("logged boards: the combat question is the same twice (the samples are seeded per board)", () => {
    rolloutLiveOptions.enabled = false;
    // (Only the wall-clock cut could differ between runs: no cut here.)
    potionMcOptions.budgetMs = 1e9;
    for (const name of ["x8r8-f17-t8", "k8tc-f17-t5", "77uj-f33-t5"]) {
      const a = criteriaOf(planCombatTurn(loggedEnv(logged(name))));
      const b = criteriaOf(planCombatTurn(loggedEnv(logged(name))));
      expect(b, name).toEqual(a);
    }
  }, 30_000);
});

describe("(a)/(b)/(d) on Jev's question: always an option, drink now then re-plan", () => {
  it("logged boards holding a random potion: its option has the distribution, the shares and the re-plan note", () => {
    rolloutLiveOptions.enabled = false;
    for (const [name, key] of [["x8r8-f17-t8", "p0"], ["77uj-f33-t5", "p0"], ["k8tc-f17-t5", "p1"], ["yg3h-f33-t1", "p0"], ["k7g9-f45-t1", "p1"]] as const) {
      const decision = planCombatTurn(loggedEnv(logged(name)));
      expect(decision?.kind, name).toBe("ask");
      const option = JSON.parse(String(criteriaOf(decision)[key])) as Record<string, string>;
      expect(option["plays"], name).toMatch(/^drink .+ now \(.+\), then re-plan the turn with the real cards; example, the median of \d+ samples: potion /);
      expect(option["result"], name).toBe("result unknown until drunk; after drinking you will see the actual cards and choose the rest of the turn again");
      expect(option["simulated"], name).toMatch(/^Monte Carlo, \d+ samples/);
      expect(option["hp_lost"], name).toMatch(/^mean [\d.]+ \[\d+-\d+\]$/);
      expect(option["damage_dealt"], name).toMatch(/^mean [\d.]+ \[\d+-\d+\]$/);
      expect(option["wins_fight_this_turn"], name).toMatch(/^\d+\/\d+ samples$/);
      expect(option["beats_best_potion_free_line"], name).toMatch(/^\d+\/\d+ samples \(/);
      // No plan line drinks it: the random potion is only this option.
      for (const [k, text] of Object.entries(criteriaOf(decision))) if (k.startsWith("plan")) expect(String(text), `${name} ${k}`).not.toContain(option["plays"]!.split(" now")[0]!.replace("drink ", "potion "));
    }
  }, 30_000);

  it("with the rollout on, the option's rollout facts are the median sample's line's", () => {
    const decision = planCombatTurn(loggedEnv(logged("x8r8-f17-t8")));
    const option = JSON.parse(String(criteriaOf(decision)["p0"])) as Record<string, string>;
    expect(option["rollout"]).toMatch(/^the median sample's line: /);
  }, 30_000);

  it("Jev's pick of it drinks now, drops any committed line, and the next board is planned afresh (the real cards)", () => {
    rolloutLiveOptions.enabled = false;
    const fx = logged("k7g9-f45-t1");
    const env = loggedEnv(fx);
    const decision = planCombatTurn(env) as AskDecision;
    const resolved = decision.resolve(pick("p1"));
    expect(resolved.intent).toEqual({ action: "use_potion", option_index: 1 });
    expect(resolved.fallback).toBe(false);
    resolved.apply?.();
    expect(env.screenMemory.combatPlan).toBeNull();
    expect((resolved.log?.potions as { random: { potion: string }[] }).random[0]!.potion).toBe("CLARITY");
    // After the drink: the potion is gone and a drawn card is in hand. The planner re-plans from it.
    const next = logged("k7g9-f45-t1");
    const run = next.state["run"] as Record<string, unknown>;
    run["potions"] = (run["potions"] as Record<string, unknown>[]).map((p) => (p["index"] === 1 ? { ...p, occupied: false, potion_id: null, can_use: false } : p));
    const combat = next.state["combat"] as Record<string, unknown>;
    const hand = combat["hand"] as Record<string, unknown>[];
    combat["hand"] = [...hand, { ...hand[0]!, index: hand.length }];
    const after = planCombatTurn(loggedEnv(next, { screenMemory: env.screenMemory }));
    expect(after?.label).not.toBe("combat/plan-continue");
    expect(JSON.stringify(after?.kind === "ask" ? criteriaOf(after) : {})).not.toContain("result unknown until drunk");
  }, 30_000);

  it("the 10-option cap keeps a slot for every potion option: plan lines make room, never the first or the only dry line", () => {
    const line = (name: string, potions: string[] = []): Plan =>
      ({ steps: [{ cardIndex: 0, cardId: name, upgraded: false, name, target: null }, ...potions.map((id) => ({ cardIndex: -1, cardId: `POTION:${id}:0`, upgraded: false, name: `potion ${id}`, target: null }))] }) as unknown as Plan;
    const plans = Array.from({ length: MAX_OPTIONS }, (_, i) => line(`L${i}`, i === 9 ? ["FIRE"] : []));
    const out = trimForPotionOptions(plans, 2, new Set());
    expect(out.length).toBe(MAX_OPTIONS - 2);
    expect(out[0]).toBe(plans[0]);
    expect(out).toContain(plans[9]); // the only Fire Potion line
    const kept = trimForPotionOptions([line("A"), line("B", ["FIRE"])], 10, new Set());
    expect(kept.length).toBe(2);
  });
});

describe("(c) unsimulated potions: offered with no invented numbers", () => {
  it("Entropic Brew (always an option): 'drink first: <text> (N random potions …), then re-plan', no hp/damage numbers", () => {
    rolloutLiveOptions.enabled = false;
    const fx = logged("k7g9-f45-t1");
    const run = fx.state["run"] as Record<string, unknown>;
    run["potions"] = (run["potions"] as Record<string, unknown>[]).map((p) => (p["index"] === 1 ? { ...p, potion_id: "ENTROPIC_BREW", name: "Entropic Brew", description: "在所有空药水栏位中获得随机药水。" } : p));
    const decision = planCombatTurn(loggedEnv(fx));
    const option = JSON.parse(String(criteriaOf(decision)["p1"])) as Record<string, string>;
    // What it gives is known (batch J): its own slot and the two empty ones filled with random potions.
    expect(option["plays"]).toBe("drink Entropic Brew first: 在所有空药水栏位中获得随机药水。 (3 random potions: its own slot and the 2 empty ones), then re-plan the turn with them");
    expect(option["hp_lost"]).toBeUndefined();
    expect(option["damage_dealt"]).toBeUndefined();
    expect(option["offered"]).toMatch(/^always/);
    expect(pickPotion(decision, "p1")).toEqual({ action: "use_potion", option_index: 1 });
  }, 30_000);
});

function pickPotion(decision: Decision | null, key: string) {
  return (decision as AskDecision).resolve(pick(key)).intent;
}

/** The Monte Carlo's PRNG (mulberry32), to replay a run's offers. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
