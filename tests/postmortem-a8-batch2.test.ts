/**
 * Post-mortems of RTF3, 9LSQ, N95W and EHJZ (notes/lessons.md, A8): unspent shop gold, the boss clock
 * counting Inferno, a Sandpit turn priced at the deck's damage, Pact's End with a short exhaust pile,
 * the Rock bowlbug's stun, Entrench, a block potion kept when a Defend covers the hit, the Infested
 * Prism dossier and avoid_elites against a plan that needs scaling. Each replayed on the logged board.
 */

import { describe, expect, it } from "vitest";

import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { damageGap, deckDamageParts, deckDamagePerTurn } from "../src/strategy/boss-clock.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planShop, unspentGoldCost } from "../src/screens/shop.js";
import { logged, loggedEnv, loggedKnowledge } from "./logged.js";

type Raw = Record<string, unknown>;

/** The options of a question: key -> parsed criteria. */
function optionsOf(decision: Decision | null): Record<string, Raw> {
  expect(decision?.kind).toBe("ask");
  const question = Object.values((decision as AskDecision).questions)[0]!;
  if (question.type !== "choice") throw new Error("not a choice");
  return Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value!) as Raw]));
}

describe("leaving a shop costs the gold no later shop can spend (CWU9, RTF3, EHJZ)", () => {
  it("the rule: nothing early in an act with shop-sized gold; all of it two floors before the boss", () => {
    expect(unspentGoldCost(150, 5)).toBe(0);
    expect(unspentGoldCost(277, 31)).toBeCloseTo(277 / 25);
    expect(unspentGoldCost(1237, 37)).toBeGreaterThan(unspentGoldCost(300, 37));
    expect(unspentGoldCost(5000, 20)).toBe(40);
  });

  it("EHJZ F31 (277 gold, belt empty, 2 floors before the boss): Jev picks among buys with the potions in view, no 'stop shopping' (logged: left at 0.24)", () => {
    const options = optionsOf(planShop(loggedEnv(logged("ehjz-shop-f31"), { combatPlanner: "turn" })));
    expect(options["leave"]).toBeUndefined();
    const potions = Object.keys(options).filter((key) => key.startsWith("buy_potion"));
    expect(potions.length).toBeGreaterThanOrEqual(2);
  });

  it("RTF3 F37 (1237 gold, a slot empty): no 'stop shopping'; the relics and the Explosive Ampoule are offered (logged: left at 0.26)", () => {
    const options = optionsOf(planShop(loggedEnv(logged("rtf3-shop-f37"), { combatPlanner: "turn" })));
    expect(options["leave"]).toBeUndefined();
    expect(Object.values(options).map((option) => option["buy"])).toEqual(expect.arrayContaining(["爆炸安瓿", "幽灵种子", "皇家枕头"]));
  });

  it("RTF3 F29 (511 gold, 4 floors before the boss): no 'stop shopping' either (logged: left at 0.21)", () => {
    const options = optionsOf(planShop(loggedEnv(logged("rtf3-shop-f29"), { combatPlanner: "turn" })));
    expect(options["leave"]).toBeUndefined();
    expect(Object.values(options).map((option) => option["buy"])).toEqual(expect.arrayContaining(["缚魂药水"]));
  });

  it("F20 with 60 gold and only potions affordable: leaving is still offered", () => {
    const fx = logged("ehjz-shop-f31");
    (fx.state["run"] as Raw)["floor"] = 20;
    (fx.state["run"] as Raw)["gold"] = 60;
    for (const potion of ((fx.state["shop"] as Raw)["potions"] as Raw[])) potion["enough_gold"] = (potion["price"] as number) <= 60;
    for (const card of ((fx.state["shop"] as Raw)["cards"] as Raw[])) card["enough_gold"] = false;
    for (const relic of ((fx.state["shop"] as Raw)["relics"] as Raw[])) relic["enough_gold"] = false;
    ((fx.state["shop"] as Raw)["card_removal"] as Raw)["enough_gold"] = false;
    (fx.state["run"] as Raw)["current_hp"] = 100;
    const options = optionsOf(planShop(loggedEnv(fx, { combatPlanner: "turn" })));
    expect(options["leave"]).toBeDefined();
  });
});

describe("boss clock: Inferno is per-turn damage, the crab's realised share is on the cards only (EHJZ F32)", () => {
  const state = () => parseGameState(logged("ehjz-rest-f32").state);

  it("two Infernos with five self-damage cards count (logged: deck 14/turn; the fight dealt 38, ~72 of 190 Inferno)", () => {
    const parts = deckDamageParts(state(), loggedKnowledge)!;
    expect(parts.powers).toBeGreaterThan(8);
    const deck = deckDamagePerTurn(state(), loggedKnowledge);
    expect(deck).toBeGreaterThanOrEqual(28);
    expect(deck).toBeLessThanOrEqual(45);
    expect(damageGap(state(), loggedKnowledge)!.deck).toBe(deck);
  });

  it("the realised share leaves the Inferno part whole", () => {
    const parts = deckDamageParts(state(), loggedKnowledge)!;
    expect(parts.realised).toBeLessThan(1);
    const raw = deckDamagePerTurn(state(), loggedKnowledge, { realised: false });
    const real = deckDamagePerTurn(state(), loggedKnowledge);
    expect(raw - real).toBeCloseTo(parts.cards * (1 - parts.realised), 0);
  });

  it("without Inferno in the deck there is no power part", () => {
    const fx = logged("ehjz-rest-f32");
    const run = fx.state["run"] as Raw;
    run["deck"] = (run["deck"] as Raw[]).filter((card) => card["card_id"] !== "INFERNO");
    expect(deckDamageParts(parseGameState(fx.state), loggedKnowledge)!.powers).toBe(0);
  });
});

/** Code's act, or every line offered to Jev (plan1 first). */
function combatLines(fx: ReturnType<typeof logged>, over: Parameters<typeof loggedEnv>[1] = {}): { act: Decision | null; lines: Raw[] } {
  const decision = planCombatTurn(loggedEnv(fx, over)) as Decision;
  if (decision.kind !== "ask") return { act: decision, lines: [] };
  const question = Object.values((decision as AskDecision).questions)[0]!;
  if (question.type !== "choice") return { act: null, lines: [] };
  return { act: null, lines: Object.entries(question.criteria).filter(([key]) => key.startsWith("plan")).map(([, value]) => JSON.parse(value!) as Raw) };
}

describe("a Sandpit turn is worth the deck's turn, and only while our HP lasts past the pit (9LSQ F33)", () => {
  it("T2: an Escape is labelled at the deck's damage a turn, not the clock's 49", () => {
    const { lines } = combatLines(logged("9lsq-f33-t2"));
    const label = lines.map((line) => String(line["intent_fit"])).find((text) => /Sandpit turn, ~\d+ damage each/.test(text))!;
    const each = Number(/~(\d+) damage each/.exec(label)![1]);
    expect(each).toBeLessThan(40);
    expect(each).toBeGreaterThanOrEqual(20);
  });

  it("T3 after the draw (70 HP, pit 4): no 0-damage turn of two Escapes (logged: 'Escape, Burn+, Escape, Weak Potion', 0 damage, -21)", () => {
    const { act, lines } = combatLines(logged("9lsq-f33-t3-draw"));
    const plays = act?.kind === "act" ? act.rationale : String(lines[0]!["plays"]);
    const escapes = (plays.match(/狂乱逃离/g) ?? []).length;
    expect(escapes).toBeLessThan(2);
    if (act?.kind === "act") expect(act.rationale).not.toMatch(/dmg 0\b/);
    else expect(Number(lines[0]!["damage_dealt"])).toBeGreaterThan(0);
  });
});
