/**
 * Post-mortems of Z49J, 77UJ, EN55 and 77QX (notes/lessons.md, A8): route projection at the rooms'
 * median costs with per-fight survival, the Blood Potion, the boss clock of multi-part bosses, the rest
 * site's look past a treasure room, the optional-elite HP gate, event HP labels, Gambler's Brew and the
 * reserved potion in a lethal line, each replayed on the logged board of the cited floor.
 */

import { describe, expect, it } from "vitest";

import { awakeDamagePerTurn } from "../src/knowledge/move-model.js";
import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { pileCardModels, planCombatTurn } from "../src/screens/combat-plan.js";
import { eventHpEffect, planEvent } from "../src/screens/event.js";
import { hpPercent, optionalEliteBar, planMap, routeHealShare } from "../src/screens/map.js";
import { planRest, rememberMap } from "../src/screens/rest.js";
import { bossClockJson, bossDamagePerTurn, bossNeed, cappedBossNeed, deckBlockPerTurn } from "../src/strategy/boss-clock.js";
import { runPlanTrigger } from "../src/strategy/run-plan.js";
import { expectedDraw, modelPotion } from "../src/strategy/card-model.js";
import { fightHpCost, MEDIAN_OF_P75, roomHpCost, roomProjectedCost } from "../src/strategy/route-cost.js";
import { logged, loggedEnv, loggedKnowledge, questionOf, referencePick } from "./logged.js";

type Raw = Record<string, unknown>;

/** Code's reference pick on a logged map (the recorded run plan in force); Jev decides. */
const pick = (name: string): unknown => referencePick(planMap(loggedEnv(logged(name)))).intent;
/** Every option with its summary, with no code margin (the "card" planner asks Jev every time). */
function options(name: string, edit: (fx: ReturnType<typeof logged>) => void = () => {}): Raw[] {
  const fx = logged(name);
  edit(fx);
  const decision = planMap(loggedEnv(fx, { combatPlanner: "card" })) as Decision;
  expect(decision.kind).toBe("ask");
  const question = (decision as AskDecision).questions["pick"]!;
  if (question.type !== "choice") throw new Error("not a choice");
  return Object.values(question.criteria).map((value) => JSON.parse(value!) as Raw);
}
const at = (all: Raw[], position: string): Raw => all.find((option) => option["position"] === position)!;
const pctIn = (text: unknown, pattern: RegExp): number => Number(pattern.exec(String(text))?.[1]);
/** Code's best combat line: plan1's plays when Jev is asked, else the rationale of the act. */
function bestLine(name: string, over: Parameters<typeof loggedEnv>[1] = {}): string {
  const decision = planCombatTurn(loggedEnv(logged(name), over)) as Decision;
  if (decision.kind !== "ask") return decision.kind === "act" ? decision.rationale.replace(/^[^:]*: /, "") : "";
  const question = Object.values((decision as AskDecision).questions)[0]!;
  if (question.type !== "choice") return "";
  return String((JSON.parse(question.criteria["plan1"] ?? "{}") as Raw)["plays"] ?? "");
}
const survivalOf = (option: Raw): number => pctIn(option["route_survival"], /~(\d+)% of the time/);

describe("route projection at median room costs, survival fight by fight (Z49J, 77UJ, 77QX)", () => {
  it("rooms are projected at 0.6 of the priced p75 cost", () => {
    for (const act of [1, 2, 3]) {
      for (const type of ["Monster", "Elite", "Unknown"]) expect(roomProjectedCost(type, act)).toBeCloseTo(MEDIAN_OF_P75 * roomHpCost(type, act));
    }
    expect(roomProjectedCost("Monster", 2)).toBeLessThan(fightHpCost("Monster", 2));
  });

  it("Z49J F18: the boss arrival discriminates (was '~30% HP, alive ~0-8%' on both): (1,2) reaches the F33 boss at 45-65%", () => {
    expect(pick("z49j-map-f18")).toEqual({ action: "choose_map_node", option_index: 0 });
    const all = options("z49j-map-f18");
    const taken = at(all, "row 1, column 2");
    const other = at(all, "row 1, column 5");
    const bossHp = pctIn(taken["boss_arrival"], /^~(\d+)% HP at the F33 boss/);
    expect(bossHp).toBeGreaterThanOrEqual(45);
    expect(bossHp).toBeLessThanOrEqual(65);
    expect(pctIn(taken["boss_arrival"], /alive there ~(\d+)%/)).toBeGreaterThan(25);
    // The other line runs out of HP before its last rest: said so, not "~30% at the boss".
    expect(String(other["boss_arrival"])).toMatch(/^HP runs out at F\d+ on its safest path before the F33 boss/);
    expect(survivalOf(taken)).toBeGreaterThan(survivalOf(other));
  });

  it("77QX F18: (1,5), not five hallways in a row into the F24 rest (logged: (1,1) -17.8 vs (1,5) -36.4; died at F22)", () => {
    expect(pick("77qx-map-f18")).toEqual({ action: "choose_map_node", option_index: 1 });
    const all = options("77qx-map-f18");
    // Both over the same stretch (through the F28 forced elite of (1,5) to the rest after it).
    expect(String(at(all, "row 1, column 1")["route_survival"])).toMatch(/^alive through F28 at the F29 rest/);
    expect(survivalOf(at(all, "row 1, column 5"))).toBeGreaterThan(survivalOf(at(all, "row 1, column 1")));
  });

  it("77UJ F22 and F26: the same picks, and the boss arrivals no longer all read ~30%", () => {
    expect(pick("77uj-map-f22")).toEqual({ action: "choose_map_node", option_index: 0 });
    expect(pick("77uj-map-f26")).toEqual({ action: "choose_map_node", option_index: 0 });
    const arrivals = options("77uj-map-f22").map((option) => String(option["boss_arrival"]));
    expect(new Set(arrivals).size).toBe(arrivals.length);
    const f22 = options("77uj-map-f22");
    expect(pctIn(at(f22, "row 5, column 3")["boss_arrival"], /^~(\d+)% HP/)).toBeGreaterThan(pctIn(at(f22, "row 5, column 4")["boss_arrival"], /^~(\d+)% HP/));
  });
});

describe("heal potions count as route HP only when the fights model them (EN55 F7, F8)", () => {
  it("the Blood Potion is modelled and counts its 20%; an unmodelled heal potion does not", () => {
    expect(routeHealShare("BLOOD_POTION")).toBeCloseTo(0.2);
    expect(routeHealShare("AMBERGRIS")).toBe(0);
    const fx = logged("en55-map-f7");
    expect(hpPercent(loggedEnv(fx))).toBeCloseTo(41 / 80 + 0.2);
    expect(hpPercent(loggedEnv(fx), false)).toBeCloseTo(41 / 80);
    const regen = logged("en55-map-f7");
    for (const potion of (regen.state["run"] as Raw)["potions"] as Raw[]) if (potion["potion_id"] === "BLOOD_POTION") potion["potion_id"] = "AMBERGRIS";
    expect(hpPercent(loggedEnv(regen))).toBeCloseTo(41 / 80);
  });

  it("EN55 F8 T5 (18/80, the eel's CRASH coming): code's best line drinks the Blood Potion (logged: kept to T9 at 7 HP)", () => {
    expect(String(bestLine("en55-f8-t5"))).toMatch(/^(code plan[^:]*: )?potion 鲜血药水/);
  });
});

describe("boss clock: multi-part bosses hit with their parts (Z49J F32 Kaiser Crab, K8TC/VUV4 The Kin)", () => {
  const board = (name: string) => parseGameState(logged(name).state);

  it("the crab is its two claws, the Kin its priest and two followers", () => {
    expect(bossDamagePerTurn("KAISER_CRAB")!.perTurn).toBeCloseTo(awakeDamagePerTurn("CRUSHER")!.perTurn + awakeDamagePerTurn("ROCKET")!.perTurn);
    expect(bossDamagePerTurn("THE_KIN")!.perTurn).toBeCloseTo(awakeDamagePerTurn("KIN_PRIEST")!.perTurn + 2 * awakeDamagePerTurn("KIN_FOLLOWER")!.perTurn);
    expect(bossDamagePerTurn("KAISER_CRAB")!.sleepTurns).toBe(0);
  });

  it("Z49J F32 at 45/80: the clock is capped at the turns 45 HP lasts (was 8 turns, 'need 54, gap 19'; the Laser killed on T4)", () => {
    const state = board("z49j-map-f32");
    const need = cappedBossNeed(state, loggedKnowledge)!;
    const hit = bossDamagePerTurn("KAISER_CRAB")!.perTurn;
    expect(need.entryHp).toBe(45);
    expect(need.survivableTurns).toBeCloseTo(45 / Math.max(1, hit - deckBlockPerTurn(state, loggedKnowledge)), 1);
    expect(need.turns).toBeLessThan(bossNeed("KAISER_CRAB")!.turns);
    // 428 HP over those turns (the turns are shown to one decimal).
    expect(Math.abs(need.perTurn - 428 / need.turns)).toBeLessThan(0.05 * need.perTurn);
    expect(String(bossClockJson(state, loggedKnowledge)!["turns_note"])).toMatch(/capped at [\d.]+: the turns 45 HP survives/);
  });

  it("the crab lets about half of the deck's card damage through (M9PL 0.53, Z49J 0.36, EHJZ 0.78)", () => {
    expect(bossNeed("KAISER_CRAB")!.realised).toBeGreaterThan(0.35);
    expect(bossNeed("KAISER_CRAB")!.realised).toBeLessThan(0.8);
  });

  it("The Kin boards read the cap too (K8TC F3, VUV4 F12)", () => {
    for (const name of ["k8tc-map-f3", "vuv4-map-f12"]) expect(String(bossClockJson(board(name), loggedKnowledge)!["turns_note"])).toMatch(/^10 turns in the table, capped at/);
  });
});

describe("a rest site looks two nodes ahead for a forced elite, through a treasure room (77QX F9)", () => {
  it("77QX F9 at 52/80: code's reference heals and the heal says the forced elite is next; Jev decides (logged: smithed at 65%, the F11 Terror Eel behind a treasure room took 52 -> 17)", () => {
    const env = loggedEnv(logged("77qx-rest-f9"));
    rememberMap(env.screenMemory, parseGameState(logged("77qx-map-f8").state));
    const decision = planRest(env)!;
    expect(decision.kind).toBe("ask");
    const { options } = questionOf(decision);
    const heal = Object.values(options).find((option) => option["kind"] === "HEAL")!;
    expect(heal["code_rank"]).toBe(1);
    expect(String(heal["heal_facts"])).toMatch(/boss or forced elite next/);
  });

  it("without the remembered map it cannot see the elite (the old next-node check alone)", () => {
    const decision = planRest(loggedEnv(logged("77qx-rest-f9")))!;
    const smith = Object.values(questionOf(decision).options).find((option) => option["kind"] === "SMITH")!;
    expect(smith["code_rank"]).toBe(1);
    expect(String(smith["upgrade_facts"])).toMatch(/^best upgrades: /);
  });
});

describe("an optional elite needs HP, heal potions out, of twice the act's elite cost (EN55 F7)", () => {
  /** EN55 F7 with a deck the act's elites do not outpace (6 energy), so only the HP bar can hold elites back. */
  const strongDeck = (hp: number) => (fx: ReturnType<typeof logged>) => Object.assign(fx.state["run"] as Raw, { max_energy: 6, current_hp: hp });
  const types = (hp: number) => options("en55-map-f7", strongDeck(hp)).map((option) => option["node_type"]);

  it("the bar: twice the act-1 elite cost; capped under full HP where twice is more", () => {
    expect(optionalEliteBar(1)).toBeCloseTo(2 * fightHpCost("Elite", 1));
    expect(optionalEliteBar(2)).toBeLessThan(1);
  });

  it("at 41/80 (51%, 71% with the Blood Potion) the optional elites are offered with the HP facts; at 64/80 too", () => {
    expect(types(41)).toContain("Elite");
    expect(types(41)).toContain("RestSite");
    expect(types(64)).toContain("Elite");
    const elite = options("en55-map-f7", strongDeck(41)).find((option) => option["node_type"] === "Elite")!;
    expect(String(elite["elite_hp"])).toMatch(/^HP 51% without heal potions \(71% counting them\); an elite this act costs ~\d+% \(p75\), and an optional elite usually wants ~7\d%\+/);
  });

  it("the logged board: the elite and the rest are both offered, each with its facts (logged: code took the Elite (7,6) 23.4 vs 5.06)", () => {
    const decision = planMap(loggedEnv(logged("en55-map-f7")));
    expect(decision?.kind).toBe("ask");
    const all = Object.values(questionOf(decision).options);
    expect(all.map((option) => option["node_type"])).toEqual(expect.arrayContaining(["Elite", "RestSite"]));
    for (const option of all) expect(option["why"]).toBeTruthy();
  });

  it("80% -> 51% asks for a new run plan (0.2875 was under the 0.3 drop)", () => {
    const fx = logged("en55-map-f7");
    expect(fx.runPlan!.hpPct).toBeCloseTo(0.8);
    expect(runPlanTrigger(fx.runPlan, parseGameState(fx.state))).toBe("hp_drop");
  });
});

describe("event options carry their HP effect; under the entry target a pure heal is code's reference, Jev decides (77UJ F22)", () => {
  const criteria = (decision: Decision | null): Record<string, Raw> => {
    if (decision?.kind !== "ask") throw new Error("expected an ask");
    const question = Object.values((decision as AskDecision).questions)[0]!;
    if (question.type !== "choice") throw new Error("not a choice");
    return Object.fromEntries(Object.entries(question.criteria).map(([key, value]) => [key, JSON.parse(value!) as Raw]));
  };

  it("Spirit Grafter at 53/80 under entry_hp 85%: Let It In (+25 HP) is code's reference and fits the entry target (logged: Jev took Rejection, -10 HP, at 0.04)", () => {
    const decision = planEvent(loggedEnv(logged("77uj-event-f22")))!;
    expect(decision.kind).toBe("ask");
    expect(referencePick(decision).intent).toEqual({ action: "choose_event_option", option_index: 0 });
    expect(String(criteria(decision)["o0"]!["tempo"])).toMatch(/fits DeepSeek's entry_hp 85%: heals 25 with no HP cost/);
    expect(String(criteria(decision)["o0"]!["why"])).toMatch(/\+25 HP heal/);
  });

  it("with no entry target Jev is asked, and each option says what it does to HP", () => {
    const fx = logged("77uj-event-f22");
    const shown = criteria(planEvent(loggedEnv(fx, { runPlan: { ...fx.runPlan!, entryHp: null } })));
    expect(shown["o0"]!["hp_effect"]).toBe("+25 HP: 66% -> 98%");
    expect(shown["o1"]!["hp_effect"]).toBe("-10 HP: 66% -> 54%");
  });

  it("above the entry target the labels say where each option leaves it", () => {
    const fx = logged("77uj-event-f22");
    const shown = criteria(planEvent(loggedEnv(fx, { runPlan: { ...fx.runPlan!, entryHp: 0.6 } })));
    expect(shown["o0"]!["hp_effect"]).toMatch(/, at entry_hp 60%$/);
    expect(shown["o1"]!["hp_effect"]).toMatch(/, drops below entry_hp 60%$/);
  });

  it("the HP effect in words, against the entry target", () => {
    expect(eventHpEffect(25, { hp: 0, maxHp: 0 }, 53, 80, 0.85)).toBe("+25 HP: 66% -> 98%, reaches entry_hp 85%");
    expect(eventHpEffect(0, { hp: 6, maxHp: 0 }, 31, 80, 0.85)).toBe("-6 HP: 39% -> 31%, further below entry_hp 85%");
  });
});

describe("Gambler's Brew: an expected-value draw from the draw pile, as a line (77UJ F33 T5, EN55 F8 T9)", () => {
  it("the expected draw is the pile's mean card", () => {
    const pile = [
      { ...modelPotion("BLOCK_POTION", "b", 0, [], 0)!, type: "Skill", cost: 1, block: 6, playable: true },
      { ...modelPotion("FIRE_POTION", "f", 1, [0], 0)!, type: "Attack", cost: 1, damage: 10, playable: true },
    ];
    const draw = expectedDraw(pile, 0)!;
    expect(draw.block).toBe(3);
    expect(draw.damage).toBe(5);
    expect(draw.cost).toBe(1);
  });

  it("the draw pile counts each line's copies (77UJ F33 T5: 8 cards, Pommel Strike x2)", () => {
    const pile = pileCardModels(parseGameState(logged("77uj-f33-t5").state), loggedKnowledge, "draw", { enemyTargets: [0], strength: 0, weak: false });
    expect(pile).toHaveLength(8);
    expect(pile.filter((card) => card.cardId === "POMMEL_STRIKE")).toHaveLength(2);
  });

  it("77UJ F33 T5 at 9 HP against 14: code's lines drink it after the Defend (logged: carried to the death, every line died)", () => {
    const line = bestLine("77uj-f33-t5");
    expect(line).toMatch(/potion 赌徒特酿/);
    expect(line.indexOf("防御")).toBeLessThan(line.indexOf("potion 赌徒特酿"));
    const decision = planCombatTurn(loggedEnv(logged("77uj-f33-t5")));
    // A line that survives in expectation is offered: no longer the per-card "every line dies" question.
    expect(decision?.label).not.toBe("combat/play");
  });

  it("EN55 F8 T9 at 7 HP: its line drinks it too, with the Blood Potion (logged: carried to the death)", () => {
    expect(bestLine("en55-f8-t9")).toMatch(/potion 鲜血药水.*potion 赌徒特酿/);
  });
});

describe("a lethal line keeps the reserved potion when another lethal does not need it (Z49J F24 T4)", () => {
  it("Battle Trance first, the Strength Potion kept for the crab (logged: drank it for the hallway lethal)", () => {
    const fx = logged("z49j-f24-t4");
    expect(fx.runPlan!.reserve).toContain("strength");
    const decision = planCombatTurn(loggedEnv(fx))!;
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") {
      expect(decision.label).toBe("combat/lethal");
      expect(decision.rationale).not.toMatch(/力量药水/);
      expect(decision.intent.action).toBe("play_card");
    }
  });

  it("with nothing reserved code takes the best-scoring lethal as before", () => {
    const fx = logged("z49j-f24-t4");
    const decision = planCombatTurn(loggedEnv(fx, { runPlan: { ...fx.runPlan!, reserve: [] } }))!;
    // Unreserved, code is free to take whichever lethal scores best.
    expect(decision.kind).toBe("act");
    if (decision.kind === "act") expect(decision.label).toBe("combat/lethal");
  });
});
