/**
 * Post-mortems of RTF3, 9LSQ, N95W and EHJZ (notes/lessons.md, A8): unspent shop gold, the boss clock
 * counting Inferno, a Sandpit turn priced at the deck's damage, Pact's End with a short exhaust pile,
 * the Rock bowlbug's stun, Entrench, a block potion kept when a Defend covers the hit, the Infested
 * Prism dossier and avoid_elites against a plan that needs scaling. Each replayed on the logged board.
 */

import { describe, expect, it } from "vitest";

import { dossierFor } from "../src/knowledge/dossiers.js";
import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { damageGap, deckDamageParts, deckDamagePerTurn } from "../src/strategy/boss-clock.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { planSelection } from "../src/screens/selection.js";
import { planShop, unspentGoldCost } from "../src/screens/shop.js";
import { modelHandCard, thisTurnDamage } from "../src/strategy/card-model.js";
import { solveTurn } from "../src/strategy/turn-solver.js";
import { avoidElitesDisagreement } from "../src/strategy/plan-validator.js";
import { floorsToBoss, parseRunPlan } from "../src/strategy/run-plan.js";
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

describe("Pact's End deals nothing with fewer than 3 cards the exhaust pile can reach (9LSQ F17 T1, H1FA)", () => {
  it("the rule, on the logged card", () => {
    const fx = logged("9lsq-f17-t1-attack-potion");
    const card = ((fx.state["selection"] as Raw)["cards"] as Raw[]).find((entry) => entry["card_id"] === "PACTS_END")!;
    const model = modelHandCard(card, 2, loggedKnowledge);
    expect(thisTurnDamage(model, { exhaustReach: 2 })).toBe(0);
    expect(thisTurnDamage(model, { exhaustReach: 3 })).toBeGreaterThan(0);
    // Unknown piles: the card's own number.
    expect(thisTurnDamage(model)).toBeGreaterThan(0);
  });

  it("the Attack Potion takes Fight Me or Bully, not Pact's End, with the exhaust pile empty (logged: Pact's End 27 vs Fight Me 21, never played)", () => {
    const decision = planSelection(loggedEnv(logged("9lsq-f17-t1-attack-potion")));
    const text = decision?.kind === "act" ? decision.rationale : JSON.stringify(decision);
    expect(text).not.toMatch(/code: 契约终结/);
    if (decision?.kind === "act") expect(decision.intent).not.toEqual({ action: "select_deck_card", option_index: 2 });
  });
});

describe("Imbalanced: a fully blocked Rock Bowlbug is stunned for its next move (N95W F19 T3)", () => {
  it("38/80, Headbutt 15: 'Defend, Defend, True Grit' (17 block) is offered and says it stuns; the HP guard falls back to it (logged: 'Defend, Defend, Strike', -5, then -9 on T4)", () => {
    const fx = logged("n95w-f19-t3");
    const { lines } = combatLines(fx);
    const stun = lines.find((line) => line["stuns"] !== undefined)!;
    expect(String(stun["plays"])).toMatch(/防御, then 防御, then 坚毅/);
    expect(Number(stun["hp_lost"])).toBe(0);
    expect(String(stun["stuns"])).toMatch(/盛碗虫（石）: its attack fully blocked \(Imbalanced\)/);
    const decision = planCombatTurn(loggedEnv(fx)) as AskDecision;
    const rank1 = Object.keys((decision.questions["plan"] as { criteria: Record<string, string> }).criteria)[0]!;
    const resolved = decision.resolve({ plan: { type: "choice", choice: rank1, confidence: 0.9, probabilities: {}, raw: {} } } as never);
    // Whatever Jev picks, the turn's line blocks the Headbutt in full (the guard's fallback is the stun line).
    expect(resolved.rationale).toMatch(/Jev chose/);
    if (/HP guard/.test(resolved.rationale)) expect(resolved.rationale).toMatch(/防御, 防御, 坚毅/);
  });

  it("the dossier no longer says the Rock Bowlbug stuns itself after Headbutt", () => {
    const rock = dossierFor("BOWLBUG_ROCK")!;
    expect(rock.danger).not.toMatch(/之后一回合晕/);
    expect(rock.danger).toMatch(/完全格挡/);
  });
});

describe("Infested Prism dossier: A8 HP, need a turn, deaths and evidence (4th death, N95W)", () => {
  it("hp.a8 171, need 35, deaths 4 with N95W and KGR6 in the evidence", () => {
    const prism = dossierFor("INFESTED_PRISM")!;
    expect(prism.hp?.a8).toBe(171);
    expect(prism.need_damage_per_turn).toBe(35);
    expect(prism.deaths).toBeGreaterThanOrEqual(4);
    expect(prism.evidence).toEqual(expect.arrayContaining(["N95WHBGC4CG9", "KGR6WH5YJ743"]));
  });
});

describe("Entrench doubles the block up when played; at 0 block it is worth 0 (RTF3 F17 T1, F28 T4)", () => {
  const entrenchOf = (name: string) => {
    const fx = logged(name);
    const hand = (fx.state["combat"] as Raw)["hand"] as Raw[];
    const index = hand.findIndex((card) => card["card_id"] === "ENTRENCH");
    return modelHandCard(hand[index]!, index, loggedKnowledge);
  };

  it("modelled: no flat unmodelled value; the solver doubles block, 0 stays 0", () => {
    const entrench = entrenchOf("rtf3-f17-t1-draw");
    expect(entrench.special).toBe("double_block");
    expect(entrench.flatValue).toBe(0);
    const input = (block: number) => ({
      hand: [{ ...entrench, index: 0, cost: 0 }],
      player: { hp: 60, maxHp: 80, block, energy: 3, weak: false, vulnerable: false, intangible: false },
      enemies: [{ index: 0, name: "x", hp: 100, maxHp: 100, block: 0, vulnerable: 0, weak: 0, artifact: 0, intangible: false, attacks: [{ damage: 30, hits: 1 }] }],
      fightKind: "monster" as const,
    });
    const played = (block: number) => solveTurn(input(block)).plans.find((plan) => plan.steps.some((step) => step.cardId === "ENTRENCH"));
    expect(played(12)?.outcome.blockGained).toBe(12);
    const atZero = played(0);
    if (atZero) expect(atZero.outcome.blockGained).toBe(0);
  });

  it("F17 T1 after Production (0 block): no line plays Entrench as code's pick or 'sets up a power' (logged: plan1 'Production, Entrench', 0 damage, lasting 7)", () => {
    const { act, lines } = combatLines(logged("rtf3-f17-t1-draw"));
    if (act?.kind === "act") expect(act.rationale).not.toMatch(/巩固/);
    else {
      expect(String(lines[0]!["plays"])).not.toMatch(/巩固/);
      for (const line of lines) if (/巩固/.test(String(line["plays"]))) expect(String(line["lasting_value"] ?? "")).not.toMatch(/sets up a power/);
    }
  });

  it("F28 T4 (0 block): Entrench is not in code's rank 1 (logged: 'Entrench, Setup Strike' rank 1 at -28)", () => {
    const { act, lines } = combatLines(logged("rtf3-f28-t4"));
    const top = act?.kind === "act" ? act.rationale : String(lines[0]!["plays"]);
    expect(top).not.toMatch(/巩固/);
  });
});

describe("a block potion is kept when a Defend in hand takes the hit and next turn's hit reaches our HP (N95W F25 T4)", () => {
  it("12/80, Pulsate 8, Jab next: Defend + the attacks, the Block Potion kept (logged: Block Potion + Flex + attacks, Defend unplayed; T5 Jab 19 met 5 block)", () => {
    const { act, lines } = combatLines(logged("n95w-f25-t4"));
    const top = act?.kind === "act" ? act.rationale : String(lines[0]!["plays"]);
    expect(top).not.toMatch(/格挡药水/);
    expect(top).toMatch(/防御/);
  });
});

describe("avoid_elites against a plan that needs scaling is logged as a disagreement (9LSQ F18 v7)", () => {
  it("v7 at 91%: avoid_elites, needs strength, gap ~39 of ~49: disagreement kept, route_risk untouched", () => {
    const fx = logged("9lsq-map-f18");
    const state = parseGameState(fx.state);
    const plan = fx.runPlan!;
    expect(plan.routeRisk).toBe("avoid_elites");
    const note = avoidElitesDisagreement(plan, damageGap(state, loggedKnowledge), { hpPct: 73 / 80, toBoss: floorsToBoss(18) });
    expect(note).toMatch(/^disagreement \(kept\): route_risk avoid_elites while the plan needs strength/);
    expect(plan.routeRisk).toBe("avoid_elites");
  });

  it("a re-plan keeping avoid_elites carries it in disagreements, not in the validator's repairs", () => {
    const fx = logged("9lsq-map-f18");
    const state = parseGameState(fx.state);
    const plan = parseRunPlan({ route_risk: "avoid_elites", hp_policy: "preserve", needs: ["strength", "multi_hit"], summary: "skip elites" }, state, loggedKnowledge, "review", fx.runPlan!);
    expect(plan.routeRisk).toBe("avoid_elites");
    expect(plan.disagreements?.join(" ")).toMatch(/route_risk avoid_elites while the plan needs strength/);
    expect(plan.validator.join(" ")).not.toMatch(/disagreement/);
  });

  it("no note when the plan does not avoid elites, or the deck is close to the boss's need", () => {
    const fx = logged("9lsq-map-f18");
    const gap = damageGap(parseGameState(fx.state), loggedKnowledge)!;
    expect(avoidElitesDisagreement({ ...fx.runPlan!, routeRisk: "normal" }, gap, { hpPct: 0.9, toBoss: 15 })).toBeNull();
    expect(avoidElitesDisagreement(fx.runPlan!, { ...gap, gap: 2 }, { hpPct: 0.9, toBoss: 15 })).toBeNull();
    expect(avoidElitesDisagreement(fx.runPlan!, gap, { hpPct: 0.9, toBoss: 1 })).toBeNull();
  });
});
