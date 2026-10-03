/**
 * Spiked Gauntlets' +1 on the Powers modelled off the hand (card-model pilePowerExtraCost). The hand and every pile line show
 * a Power at its cost + 1 under the relic (all 1,530 logged Power lines of the 6 runs holding it), the deck's entries at
 * the base cost, and the pile models took the deck's: the known draws, the rollout's later turns and the random potions'
 * piles (pileEntries), the hand's base cards back in the piles and the boss simulation's deck (deckModels), the deck as the
 * draw pool when the state has no piles (deckDrawPool), and the any-draw bound's cost floor (pileCardCost).
 *
 * The logged board A4PWRULKG2JT F46 T1 (tests/potion-card-cost-data; Cruelty [2费] and Pyre+ [3费] in the draw pile, the deck
 * at 1 and 2): every Power's model at its line's cost; without the relic, or with the switch off, the deck's cost as before.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { makeKnowledge } from "../src/knowledge/index.js";
import { parseGameState } from "../src/mod/schema.js";
import { buildRunBrief } from "../src/project/run-brief.js";
import { createScreenMemory, type DecisionEnv } from "../src/project/types.js";
import { deckDrawPool, pileCardCost, pileCardModels, pileEntries, planCombatTurn, rolloutPiles, thiefTrace } from "../src/screens/combat-plan.js";
import { bossLinesOptions } from "../src/sim/boss-lines.js";
import { potionMcOptions } from "../src/strategy/potion-mc.js";
import { rolloutLiveOptions } from "../src/strategy/rollout-live.js";
import { offHandCardModel, pileCostOptions, pilePowerExtraCost, withPowerExtraCost } from "../src/strategy/card-model.js";
import { deckModels } from "../src/strategy/rollout-live.js";
import { setMonsterDbForTests } from "../src/knowledge/monster-db.js";
import { syntheticBossStart } from "../src/sim/boss-start.js";
import { FIXTURE_DB, FIXTURE_MM } from "./boss-sim-build-fixture.js";

type Raw = Record<string, unknown>;
const POTION_DATA = join(dirname(fileURLToPath(import.meta.url)), "potion-card-cost-data");
const knowledge = makeKnowledge(JSON.parse(readFileSync(join(POTION_DATA, "game-data.json"), "utf8")), "cache");
const a4pw = (): Raw => (JSON.parse(readFileSync(join(POTION_DATA, "a4pw-f46-t1-power-potion.json"), "utf8")) as { state: Raw }).state;
const ctx = { enemyTargets: [0], strength: 0, weak: false };
/** The board without Spiked Gauntlets (everything else as logged). */
function withoutGauntlets(state: Raw): Raw {
  const out = structuredClone(state);
  const run = out["run"] as Raw;
  run["relics"] = (run["relics"] as Raw[]).filter((relic) => relic["relic_id"] !== "SPIKED_GAUNTLETS");
  return out;
}
const powerCosts = (cards: { type: string; cardId: string; upgraded: boolean; cost: number }[]): Record<string, number> =>
  Object.fromEntries(cards.filter((card) => card.type === "Power").map((card) => [`${card.cardId}${card.upgraded ? "+" : ""}`, card.cost]));
/** Every card's id and cost but the Powers'. */
const otherCosts = (cards: { type: string; cardId: string; cost: number }[]): string[] => cards.filter((card) => card.type !== "Power").map((card) => `${card.cardId} ${card.cost}`);

afterEach(() => {
  pileCostOptions.relics = true;
  rolloutLiveOptions.now = null;
  potionMcOptions.now = null;
  thiefTrace.enabled = false;
  thiefTrace.last = null;
});

describe("pilePowerExtraCost / withPowerExtraCost", () => {
  it("1 with the relic (the switch on), else 0; a Power only, not X, not unplayable", () => {
    expect(pilePowerExtraCost(["BURNING_BLOOD", "SPIKED_GAUNTLETS"])).toBe(1);
    expect(pilePowerExtraCost(["BURNING_BLOOD"])).toBe(0);
    pileCostOptions.relics = false;
    expect(pilePowerExtraCost(["SPIKED_GAUNTLETS"])).toBe(0);
    expect(withPowerExtraCost({ type: "Power", xCost: false, cost: 3 }, 1).cost).toBe(4);
    expect(withPowerExtraCost({ type: "Skill", xCost: false, cost: 1 }, 1).cost).toBe(1);
    expect(withPowerExtraCost({ type: "Power", xCost: true, cost: 0 }, 1).cost).toBe(0);
    expect(withPowerExtraCost({ type: "Power", xCost: false, cost: -1 }, 1).cost).toBe(-1);
    const same = { type: "Power", xCost: false, cost: 2 };
    expect(withPowerExtraCost(same, 0)).toBe(same);
  });

  it("offHandCardModel: the deck's cost + 1 for a Power; a line's own cost (a card not in the deck) as it reads", () => {
    const pyre = { cost: knowledge.card("PYRE")!.cost ?? 0 };
    expect(offHandCardModel(null, "PYRE", false, 900, knowledge, null, 1).cost).toBe(pyre.cost + 1);
    expect(offHandCardModel(null, "PYRE", false, 900, knowledge).cost).toBe(pyre.cost);
    expect(offHandCardModel(null, "PYRE", false, 900, knowledge, 3, 1).cost).toBe(3);
    expect(offHandCardModel(null, "BASH", false, 900, knowledge, null, 1).cost).toBe(knowledge.card("BASH")!.cost);
  });
});

describe("A4PWRULKG2JT F46 T1 (logged, Spiked Gauntlets): the pile Powers at their lines' cost", () => {
  it("pileEntries / pileCardModels / rolloutPiles: Cruelty 2, Pyre+ 3 (the deck 1, 2); every other card as before", () => {
    const state = parseGameState(a4pw());
    const deck = (a4pw()["run"] as Raw)["deck"] as Raw[];
    expect(deck.filter((card) => ["CRUELTY", "PYRE"].includes(String(card["card_id"]))).map((card) => card["energy_cost"])).toEqual([2, 1]);
    const entries = pileEntries(state, knowledge, "draw", ctx);
    const powers = entries.filter((entry) => entry.card.type === "Power");
    expect(powers.map((entry) => entry.line.split("：")[0])).toEqual(["残酷 [2费]", "薪火之源+ [3费]"]);
    // The model's cost is the line's, for the card and its raw (pre-Strength) model alike.
    for (const entry of powers) {
      expect(entry.card.cost).toBe(entry.lineCost);
      expect(entry.raw.cost).toBe(entry.lineCost);
    }
    expect(powerCosts(pileCardModels(state, knowledge, "draw", ctx))).toEqual({ CRUELTY: 2, "PYRE+": 3 });
    expect(powerCosts(rolloutPiles(state, knowledge, [0])!.draw)).toEqual({ CRUELTY: 2, "PYRE+": 3 });
    // Before (the switch off), and the same board without the relic: the deck's cost; the other cards never change.
    const others = otherCosts(pileCardModels(state, knowledge, "draw", ctx));
    pileCostOptions.relics = false;
    expect(powerCosts(pileCardModels(state, knowledge, "draw", ctx))).toEqual({ CRUELTY: 1, "PYRE+": 2 });
    expect(otherCosts(pileCardModels(state, knowledge, "draw", ctx))).toEqual(others);
    pileCostOptions.relics = true;
    const plain = parseGameState(withoutGauntlets(a4pw()));
    expect(powerCosts(pileCardModels(plain, knowledge, "draw", ctx))).toEqual({ CRUELTY: 1, "PYRE+": 2 });
    expect(JSON.stringify(rolloutPiles(plain, knowledge, [0]))).toBe(JSON.stringify((() => {
      pileCostOptions.relics = false;
      return rolloutPiles(plain, knowledge, [0]);
    })()));
  });

  it("deckModels (the hand's base cards, the boss simulation's deck) and deckDrawPool (no piles): a Power + 1", () => {
    const state = parseGameState(a4pw());
    expect(powerCosts(deckModels(state, knowledge))).toEqual({ "PYRE+": 3, CRUELTY: 2 });
    expect(otherCosts(deckModels(state, knowledge))).toEqual(otherCosts(deckModels(parseGameState(withoutGauntlets(a4pw())), knowledge)));
    expect(powerCosts(deckModels(parseGameState(withoutGauntlets(a4pw())), knowledge))).toEqual({ "PYRE+": 2, CRUELTY: 1 });
    // The state without its piles: the deck less the hand is the draw pool.
    const raw = a4pw();
    const view = (raw["agent_view"] as Raw)["combat"] as Raw;
    delete view["draw"];
    delete view["discard"];
    expect(powerCosts(deckDrawPool(parseGameState(raw), knowledge, ctx, []))).toEqual({ "PYRE+": 3, CRUELTY: 2 });
    pileCostOptions.relics = false;
    expect(powerCosts(deckDrawPool(parseGameState(raw), knowledge, ctx, []))).toEqual({ "PYRE+": 2, CRUELTY: 1 });
  });

  it("pileCardCost (the any-draw bound): no Power below the game data's cost + 1", () => {
    const state = parseGameState(a4pw());
    const relicIds = ((a4pw()["run"] as Raw)["relics"] as Raw[]).map((relic) => String(relic["relic_id"]));
    const cruelty = pileEntries(state, knowledge, "draw", ctx).find((entry) => entry.card.cardId === "CRUELTY")!;
    expect(pileCardCost(cruelty, knowledge, relicIds)).toBe(2);
    pileCostOptions.relics = false;
    const before = pileEntries(state, knowledge, "draw", ctx).find((entry) => entry.card.cardId === "CRUELTY")!;
    expect(pileCardCost(before, knowledge, relicIds)).toBe(1);
  });
});

describe("the boss simulation's start (B3, the thief's card): the deck's Powers + 1 under the relic", () => {
  it("syntheticBossStart from the A4PW run: its draw pile's Pyre+ 3, Cruelty 2; without the relic 2, 1", () => {
    setMonsterDbForTests(FIXTURE_DB);
    try {
      const start = (raw: Raw) => syntheticBossStart(parseGameState(raw), knowledge, "SOUL_FYSH_BOSS", 60, { db: FIXTURE_DB, mm: FIXTURE_MM }).input.piles.draw;
      expect(powerCosts(start(a4pw()))).toEqual({ "PYRE+": 3, CRUELTY: 2 });
      expect(powerCosts(start(withoutGauntlets(a4pw())))).toEqual({ "PYRE+": 2, CRUELTY: 1 });
    } finally {
      setMonsterDbForTests(null);
    }
  });
});

describe("G1Z0X3WBH4XQ F36 T1 (logged, Spiked Gauntlets, 1 energy): the Swift Potion's samples draw the pile's Powers", () => {
  // Logged: code's end turn (the only line then). Replayed before this fix (tools/pile-cost-replay.ts, the live potion
  // table): asked with the drink, 1 sample of 12 beating ending the turn, the one playing the Inflame it drew at the
  // deck's 1; after it, 0 of 12, and code ends the turn. Here (no potion table, as every test): the samples themselves.
  const DATA = join(dirname(fileURLToPath(import.meta.url)), "pile-power-cost-data");
  const g1z0Knowledge = makeKnowledge(JSON.parse(readFileSync(join(DATA, "game-data.json"), "utf8")), "cache");
  const g1z0 = (): Raw => (JSON.parse(readFileSync(join(DATA, "g1z0-f36-t1-swift-potion.json"), "utf8")) as { state: Raw }).state;
  const config = loadConfig({} as NodeJS.ProcessEnv);
  const envOf = (raw: Raw): DecisionEnv => {
    const state = parseGameState(raw);
    return {
      state, knowledge: g1z0Knowledge, brief: buildRunBrief(state, g1z0Knowledge), thresholds: config.thresholds, runStart: "auto", characterPreference: null, allowFtueModals: false,
      strictJev: true, combatPlanner: "turn", screenMemory: createScreenMemory("COMBAT"), shopDiscardPotions: [], jevContext: "v1",
    };
  };
  /** The Swift Potion's Monte Carlo on the board: its pile's Powers and each sample's line. */
  const swift = () => {
    thiefTrace.last = null;
    planCombatTurn(envOf(g1z0()));
    const mc = (thiefTrace as { last: (typeof thiefTrace)["last"] }).last!.mcShown!.find((entry) => entry.source.potionId === "SWIFT_POTION")!;
    const playsPower = (plan: (typeof mc.plans)[number]) => plan !== null && plan.steps.some((step) => g1z0Knowledge.card(step.cardId)?.type === "Power");
    return { powers: powerCosts(mc.source.piles!.draw), samples: mc.plans.length, playingPower: mc.plans.filter(playsPower).length, lasting: mc.vsDry!.lastingGained };
  };

  it("the draw pile's Unmovable 3, Demon Form 4, Inflame 2: no sample plays a Power at 1 energy (one played Inflame at 1)", () => {
    rolloutLiveOptions.now = () => 0;
    potionMcOptions.now = () => 0;
    bossLinesOptions.enabled = false;
    thiefTrace.enabled = true;
    expect(((g1z0()["combat"] as Raw)["player"] as Raw)["energy"]).toBe(1);
    const now = swift();
    expect(now.powers).toEqual({ UNMOVABLE: 3, DEMON_FORM: 4, INFLAME: 2 });
    expect(now.playingPower).toBe(0);
    expect(now.lasting).toBe(0);
    pileCostOptions.relics = false;
    const before = swift();
    expect(before.powers).toEqual({ UNMOVABLE: 2, DEMON_FORM: 3, INFLAME: 1 });
    expect(before.samples).toBe(now.samples);
    expect(before.playingPower).toBe(1);
    expect(before.lasting).toBeGreaterThan(0);
  }, 120_000);
});
