/**
 * What a card a potion adds costs this turn (card-model potionCardCost): free, a relic's change on top. The logged rule
 * (2026-10-03, every drink in the logs): 549 drinks of the card potions (and 86 plays of cards adding a free card), the
 * added card at energy_cost 0 every time but once, A4PWRULKG2JT F46 T1, where Spiked Gauntlets (Powers cost 1 more) left the Power Potion's Demon Form at 1 with 0
 * energy: unplayable, discarded at the end of the turn. The planner had it at 0 and showed the drink's samples playing the
 * Power free (Inflame, "+7 HP lasting value"); Jev drank it at 0.67.
 *
 * - The helpers: free is 0; a Power under the relic 1; an X card keeps its X; the relic only (potionPowerExtraCost).
 * - The card potions' Monte Carlo pools, the modelled Power Potion's card, Liquid Memories' free pick: a Power at 1 under the
 *   relic, 0 without it (as before).
 * - The logged board (tests/potion-card-cost-data): the Power Potion's samples no longer play the Power at 0 energy; the
 *   option says so; without the relic (the same board, the relic taken out) the samples are as before.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type AskDecision, type DecisionEnv } from "../src/project/types.js";
import { planCombatTurn, poolCardModel, randomPotionSource, thiefTrace } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { modelHandCard, modelPotion, pileCardPick, potionCardCost, potionCardCostOptions, potionPowerExtraCost, type CardModel } from "../src/strategy/card-model.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";

type Raw = Record<string, unknown>;
const DATA = join(dirname(fileURLToPath(import.meta.url)), "potion-card-cost-data");
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
const board = (): { source: string; state: Raw } => JSON.parse(readFileSync(join(DATA, "a4pw-f46-t1-power-potion.json"), "utf8")) as { source: string; state: Raw };
const config = loadConfig({} as NodeJS.ProcessEnv);
/** The board without Spiked Gauntlets (everything else as logged). */
function withoutGauntlets(state: Raw): Raw {
  const out = structuredClone(state);
  const run = out["run"] as Raw;
  run["relics"] = (run["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "SPIKED_GAUNTLETS");
  return out;
}
function envOf(raw: Raw): DecisionEnv {
  const state = parseGameState(raw);
  return {
    state, knowledge, brief: buildRunBrief(state, knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false, strictJev: true,
    combatPlanner: "turn", screenMemory: createScreenMemory(state.screen), shopDiscardPotions: [], jevContext: "v1",
  };
}

afterEach(() => {
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
  thiefTrace.enabled = false;
  thiefTrace.last = null;
  potionCardCostOptions.relics = true;
});

describe("potionCardCost: free this turn, a relic's change on top", () => {
  it("0 for any card, a Power under Spiked Gauntlets 1, an X card its X", () => {
    expect(potionCardCost({ type: "Attack", xCost: false, cost: 3 })).toBe(0);
    expect(potionCardCost({ type: "Power", xCost: false, cost: 3 })).toBe(0);
    expect(potionCardCost({ type: "Power", xCost: false, cost: 3 }, 1)).toBe(1);
    expect(potionCardCost({ type: "Skill", xCost: false, cost: 2 }, 1)).toBe(0);
    expect(potionCardCost({ type: "Attack", xCost: true, cost: 0 }, 1)).toBe(0);
    expect(potionPowerExtraCost(["BURNING_BLOOD", "SPIKED_GAUNTLETS"])).toBe(1);
    expect(potionPowerExtraCost(["BURNING_BLOOD"])).toBe(0);
    potionCardCostOptions.relics = false;
    expect(potionPowerExtraCost(["SPIKED_GAUNTLETS"])).toBe(0);
  });

  it("the Monte Carlo pools, the modelled Power Potion's card, Liquid Memories' free pick", () => {
    const fx = board();
    const state = parseGameState(fx.state);
    const ctx = { enemyTargets: [0], strength: 0, weak: false };
    const demon = knowledge.card("DEMON_FORM")!;
    expect(poolCardModel(demon, knowledge, ctx).cost).toBe(0);
    expect(poolCardModel(demon, knowledge, { ...ctx, powerExtraCost: 1 }).cost).toBe(1);
    expect(poolCardModel(knowledge.card("INFLAME")!, knowledge, { ...ctx, powerExtraCost: 1 }).cost).toBe(1);
    expect(poolCardModel(knowledge.card("BASH")!, knowledge, { ...ctx, powerExtraCost: 1 }).cost).toBe(0);
    // The board's Power Potion (slot 0): its pool of Powers at 1 with the relic held, at 0 without it.
    const potion = { potion_id: "POWER_POTION", name: "能力药水", slot: 0, text: "", valid_targets: [], requires_target: false, can_use: true } as unknown as Parameters<typeof randomPotionSource>[0];
    const held = randomPotionSource(potion, state, knowledge, ctx, false)!;
    expect(held.powerExtraCost).toBe(1);
    expect(new Set(held.pools!["Power"]!.map((card) => card.cost))).toEqual(new Set([1]));
    const plain = randomPotionSource(potion, parseGameState(withoutGauntlets(fx.state)), knowledge, ctx, false)!;
    expect(plain).not.toHaveProperty("powerExtraCost");
    expect(new Set(plain.pools!["Power"]!.map((card) => card.cost))).toEqual(new Set([0]));
    // Colorless Potion: its Powers too; its Attacks and Skills free.
    const colorless = randomPotionSource({ ...potion, potion_id: "COLORLESS_POTION" }, state, knowledge, ctx, false)!;
    expect(new Set((colorless.pools!["Attack"] ?? []).filter((card) => !card.xCost).map((card) => card.cost))).toEqual(new Set([0]));
    expect(new Set((colorless.pools!["Power"] ?? []).map((card) => card.cost))).toEqual(new Set([1]));
    // The modelled Power Potion (the rollout's later turns): its card at 1 with the context's extra cost.
    expect(modelPotion("POWER_POTION", "能力药水", 0, [], { ...ctx, powerExtraCost: 1 })!.generates!.cost).toBe(1);
    expect(modelPotion("POWER_POTION", "能力药水", 0, [], ctx)!.generates!.cost).toBe(0);
    expect(modelPotion("ATTACK_POTION", "攻击药水", 0, [0], { ...ctx, powerExtraCost: 1 })!.generates!.cost).toBe(0);
    // Liquid Memories takes a Power from the discard pile: 1 under the relic, 0 without; any other card 0.
    const raw = { card_id: "DEMON_FORM", name: "恶魔形态", energy_cost: 4, playable: true, upgraded: false, index: 0, target_type: "Self", requires_target: false, dynamic_values: [], rules_text: "", resolved_rules_text: "" };
    const demonInPile: CardModel = modelHandCard(raw, 0, knowledge);
    expect(pileCardPick([demonInPile], 0, 1, true, {}, 1)!.cost).toBe(1);
    expect(pileCardPick([demonInPile], 0, 1, true)!.cost).toBe(0);
    expect(pileCardPick([demonInPile], 0, 1, false, {}, 1)!.cost).toBe(4);
  });
});

describe("A4PWRULKG2JT F46 T1 (logged): the Power Potion at 0 energy under Spiked Gauntlets", () => {
  it("its samples no longer play the Power free; without the relic, as before (Inflame played free)", () => {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    bossLinesOptions.enabled = false;
    thiefTrace.enabled = true;
    const fx = board();
    expect(((fx.state["combat"] as Raw)["player"] as Raw)["energy"]).toBe(0);
    const planned = (raw: Raw) => {
      thiefTrace.last = null;
      const decision = planCombatTurn(envOf(raw)) as AskDecision;
      expect(decision.kind).toBe("ask");
      const p0 = JSON.parse((decision.questions["plan"] as { criteria: Record<string, string> }).criteria["p0"]!) as Raw;
      const mc = thiefTrace.last!.mcShown!.find((entry) => entry.source.potionId === "POWER_POTION")!;
      return { p0, mc };
    };
    const now = planned(fx.state);
    // Every sample takes a Power it cannot play (1 energy, 0 left): the drink alone.
    expect(now.mc.median!.steps).toHaveLength(1);
    expect(now.mc.median!.steps[0]!.cardId.startsWith("POTION:POWER_POTION")).toBe(true);
    expect(String(now.p0["plays"])).toMatch(/free this turn \(a Power costs 1: Spiked Gauntlets\)/);
    expect(String(now.p0["vs_best_potion_free_line"])).not.toMatch(/lasting value/);
    // Without the relic (and with the relic's cost off: the planner before): the samples play the Power free.
    const plain = planned(withoutGauntlets(fx.state));
    expect(plain.mc.median!.steps.length).toBeGreaterThan(1);
    expect(String(plain.p0["plays"])).not.toMatch(/Spiked Gauntlets/);
    potionCardCostOptions.relics = false;
    const before = planned(fx.state);
    expect(before.mc.median!.steps.length).toBeGreaterThan(1);
    expect(String(before.p0["vs_best_potion_free_line"])).toMatch(/lasting value/);
  }, 120_000);
});
