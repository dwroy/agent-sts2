/**
 * Post-mortems of 9VG8, 11LC, YG3H, 123Z and PKB0 (notes/lessons.md, A8): Fiend Fire counting the
 * cards drawn earlier in its line, Duplication already up, the card a pile-card potion's line takes,
 * the Regen Potion and Distilled Chaos in the solver, heal potions' HP labels, and the boss damage gap
 * in route scoring, each replayed on the logged board of the cited floor.
 */

import { describe, expect, it } from "vitest";

import { dossierFor } from "../src/knowledge/dossiers.js";
import { parseGameState } from "../src/mod/schema.js";
import type { AskDecision, Decision } from "../src/project/types.js";
import { planCombatTurn } from "../src/screens/combat-plan.js";
import { gapFightBonus, planMap } from "../src/screens/map.js";
import { planSelection } from "../src/screens/selection.js";
import { fightPlanInput } from "../src/strategy/fight-plan.js";
import { logged, loggedEnv, loggedKnowledge, questionOf, referencePick } from "./logged.js";

type Raw = Record<string, unknown>;

/** Every line offered to Jev on a logged combat board (plan1 first), or the act code took. */
function combatLines(fx: ReturnType<typeof logged>, over: Parameters<typeof loggedEnv>[1] = {}): { act: Decision | null; lines: Raw[] } {
  const decision = planCombatTurn(loggedEnv(fx, over)) as Decision;
  if (decision.kind !== "ask") return { act: decision, lines: [] };
  const question = Object.values((decision as AskDecision).questions)[0]!;
  if (question.type !== "choice") return { act: null, lines: [] };
  return { act: null, lines: Object.entries(question.criteria).filter(([key]) => key.startsWith("plan")).map(([, value]) => JSON.parse(value!) as Raw) };
}

describe("Fiend Fire counts the cards drawn earlier in its line (9VG8 F35 T6)", () => {
  it("22/80, Devoted Sculptor at 80: 'Offering+, Fiend Fire+' is code's lethal (logged: 44 damage shown for it, 4 hits; Jev took 55, died T7)", () => {
    const { act } = combatLines(logged("9vg8-f35-t6"));
    expect(act?.kind).toBe("act");
    if (act?.kind !== "act") return;
    expect(act.label).toBe("combat/lethal");
    expect(act.rationale).toMatch(/祭品\+.*恶魔之焰\+/);
  });

  it("with no cards in the draw or discard pile, Offering draws nothing and Fiend Fire is no kill", () => {
    const fx = logged("9vg8-f35-t6");
    const view = (fx.state["agent_view"] as Raw)["combat"] as Raw;
    view["draw"] = [];
    view["discard"] = [];
    const { act } = combatLines(fx);
    expect(act?.kind === "act" && act.label === "combat/lethal").toBe(false);
  });
});

describe("Duplication already up doubles the next card (11LC F17 T2)", () => {
  it("re-planned after the Duplicator: Bash+ first, Vulnerable 6 (logged: shown as Vulnerable 3, Jev duplicated a Strike)", () => {
    const { lines } = combatLines(logged("11lc-f17-t2-dup"));
    expect(String(lines[0]!["plays"])).toMatch(/^痛击\+/);
    expect(String(lines[0]!["enemies_after"])).toMatch(/Vulnerable 6/);
  });

  it("without DUPLICATION_POWER the same Bash+ is Vulnerable 3", () => {
    const fx = logged("11lc-f17-t2-dup");
    ((fx.state["combat"] as Raw)["player"] as Raw)["powers"] = [];
    const { lines } = combatLines(fx);
    const bash = lines.find((line) => String(line["plays"]).startsWith("痛击+"));
    expect(String(bash?.["enemies_after"])).toMatch(/Vulnerable 3/);
  });
});

describe("the Regen Potion and Distilled Chaos are lines with numbers (PKB0 F17 T4, YG3H F33 T1)", () => {
  it("PKB0 F17 T4 at 35/80: code's best line drinks the Regen Potion and says the heal in HP (logged: 'fits hp ... in no line's numbers', left at 0.05)", () => {
    const { lines } = combatLines(logged("pkb0-f17-t4a"));
    const regen = lines.find((line) => String(line["plays"]).includes("再生药水"));
    expect(regen).toBeDefined();
    expect(String(lines[0]!["plays"])).toMatch(/再生药水/);
    expect(String(regen!["heal_potion"])).toMatch(/^\+5 HP at this turn's end .*Regen 5.*: 35\/80 \(44%\) -> 40\/80 \(50%\)/);
    // Its heal is in the line's HP: 5 less lost than the same cards without it.
    const dry = lines.find((line) => String(line["plays"]) === String(regen!["plays"]).replace(/^potion 再生药水, then /, ""));
    if (dry) expect(Number(dry["hp_lost"]) - Number(regen!["hp_lost"])).toBe(5);
  });

  it("PKB0 F17 T4, energy spent: code's reference drinks it rather than end the turn (logged: Jev ended the turn at 0.05)", () => {
    const decision = planCombatTurn(loggedEnv(logged("pkb0-f17-t4"))) as Decision;
    expect(referencePick(decision).intent).toEqual({ action: "use_potion", option_index: 0 });
  });

  it("YG3H F33 T1 (LIQUIFY_GROUND, no attack in hand): a line drinks Distilled Chaos for the draw pile's expected damage (logged: 'neutral: unclassified', drunk T7 at 7 HP)", () => {
    const { act, lines } = combatLines(logged("yg3h-f33-t1"));
    const text = act?.kind === "act" ? act.rationale : String(lines[0]?.["plays"]);
    expect(text).toMatch(/potion 精炼混沌/);
    if (act?.kind === "act") expect(Number(/dmg (\d+)/.exec(act.rationale)?.[1])).toBeGreaterThan(10);
  });
});

describe("a pile-card potion's pick follows the line that drank it (11LC F17 T1)", () => {
  it("the Droplet of Precognition line counted Bash+: code takes Bash+ on the screen (logged: asked blind, Jev took Setup Strike at 0.26)", () => {
    const combat = loggedEnv(logged("11lc-f17-t1"));
    const decision = planCombatTurn(combat) as Decision;
    // Code's reference line drinks the Droplet for Bash+; Jev picks it and the loop applies it.
    const { key } = referencePick(decision);
    if (decision.kind === "act") expect(decision.rationale).toMatch(/potion 预知之滴, 痛击\+ from 预知之滴/);
    else {
      expect(String(questionOf(decision).options[key!]!["plays"])).toMatch(/potion 预知之滴, then 痛击\+ from 预知之滴/);
      decision.resolve({ plan: { type: "choice", choice: key!, confidence: 0.9, probabilities: {}, raw: {} } }).apply?.();
    }
    // The loop hands the committed plan's remaining steps to the selection screen (planBeforeSelection).
    const remaining = combat.screenMemory.combatPlan?.remaining ?? combat.screenMemory.plannedAfter?.steps;
    const pick = loggedEnv(logged("11lc-f17-t1-pick"));
    pick.screenMemory.planBeforeSelection = remaining;
    const selection = planSelection(pick) as Decision;
    expect(selection.kind).toBe("act");
    if (selection.kind === "act") {
      expect(selection.label).toBe("selection/plan-card");
      expect(selection.intent).toEqual({ action: "select_deck_card", option_index: 5 });
    }
  });

  it("a card potion's line (no named card): the offered card doing most this turn is marked as the plan's card for Jev", () => {
    const pick = loggedEnv(logged("11lc-f17-t1-pick"));
    pick.screenMemory.planBeforeSelection = [{ cardIndex: 201, cardId: "GEN:ATTACK_POTION:1", upgraded: false, name: "card from 攻击药水", target: 0, targetName: "瀑布巨兽" }];
    const selection = planSelection(pick) as Decision;
    expect(selection.kind).toBe("ask");
    const question = Object.values((selection as AskDecision).questions)[0]!;
    if (question.type !== "choice") throw new Error("not a choice");
    const marked = Object.values(question.criteria).filter((value) => String(value).includes("plan_card"));
    expect(marked).toHaveLength(1);
  });

  it("with no plan behind the screen it is still a question", () => {
    expect(planSelection(loggedEnv(logged("11lc-f17-t1-pick")))?.kind).toBe("ask");
  });
});

describe("the act boss's damage gap makes a hallway fight worth more than a '?' (11LC F3-F5)", () => {
  /** route_value by node type on a logged map (the "card" planner always asks: every option shown). */
  function routeValues(name: string): Record<string, number> {
    const decision = planMap(loggedEnv(logged(name), { combatPlanner: "card" })) as Decision;
    const question = (decision as AskDecision).questions["pick"]!;
    if (question.type !== "choice") throw new Error("not a choice");
    const out: Record<string, number> = {};
    for (const value of Object.values(question.criteria)) {
      const option = JSON.parse(value!) as Raw;
      out[String(option["node_type"])] = Number(option["route_value"]);
    }
    return out;
  }

  it("F3 and F5 (gap 13 of 28-30 a turn, 60-62% HP): the hallway is level with the '?' and says why (logged: '?' 28.9 vs 26.4, 27.4 vs 20.0)", () => {
    for (const name of ["11lc-map-f3", "11lc-map-f5"]) {
      const values = routeValues(name);
      expect(values["Monster"]).toBeGreaterThan(values["Unknown"]! - 0.5);
      const decision = planMap(loggedEnv(logged(name))) as Decision;
      const monster = Object.values(questionOf(decision).options).find((option) => option["node_type"] === "Monster");
      expect(String(monster?.["boss_gap"])).toMatch(/^a card reward toward the act boss gap/);
    }
  });

  it("the bonus grows with the gap's share of the need and with HP safety; none in act 3 or under a quarter", () => {
    const gap = (share: number) => ({ boss: "WATERFALL_GIANT", need: 28, deck: 28 * (1 - share), gap: 28 * share });
    expect(gapFightBonus(gap(0.2), 0.9, 1)).toBe(0);
    expect(gapFightBonus(gap(0.3), 0.9, 1)).toBeLessThan(gapFightBonus(gap(0.45), 0.9, 1));
    expect(gapFightBonus(gap(0.45), 0.55, 1)).toBeLessThan(gapFightBonus(gap(0.45), 0.7, 1));
    expect(gapFightBonus(gap(0.45), 0.45, 1)).toBe(0);
    expect(gapFightBonus(gap(0.6), 0.95, 3)).toBe(0);
    expect(gapFightBonus(null, 0.95, 1)).toBe(0);
  });
});

describe("dossiers from the logged fights: Slimed Berserker, Terror Eel, Devoted Sculptor (123Z, PKB0/77QX, 9VG8)", () => {
  const enemyOf = (name: string, id: string) =>
    (((logged(name).state["combat"] as Raw)["enemies"] as Raw[]).find((enemy) => enemy["enemy_id"] === id))!;

  it("each A8 HP is the logged board's max HP", () => {
    for (const [name, id] of [["123z-f38-t1", "SLIMED_BERSERKER"], ["pkb0-f13-t1", "TERROR_EEL"], ["9vg8-f35-t6", "DEVOTED_SCULPTOR"]] as const) {
      expect(dossierFor(id)?.hp?.a8).toBe(Number(enemyOf(name, id)["max_hp"]));
    }
  });

  it("123Z F38: the fight plan's input carries the Slimed Berserker dossier (logged: none, DeepSeek read 'doesn't scale much')", () => {
    const state = parseGameState(logged("123z-f38-t1").state);
    const enemies = fightPlanInput(state, loggedKnowledge, "monster", {})["enemies"] as Raw[];
    const dossier = enemies.find((enemy) => enemy["enemy_id"] === "SLIMED_BERSERKER")?.["dossier"] as Raw | undefined;
    expect(dossier?.["kind"]).toBe("hallway");
    expect(Number(dossier?.["need_damage_per_turn"])).toBeGreaterThan(0);
    expect(String(dossier?.["danger"])).toMatch(/SMOTHER/);
  });

  it("the Terror Eel has a need and its deaths, the Sculptor its two deaths", () => {
    expect(dossierFor("TERROR_EEL")?.need_damage_per_turn).toBeGreaterThan(0);
    expect(dossierFor("TERROR_EEL")?.evidence).toEqual(expect.arrayContaining(["EN55E3C1WLHP", "77QXNB8RFSQQ", "PKB0Z630CLXT"]));
    expect(dossierFor("DEVOTED_SCULPTOR")?.deaths).toBe(2);
    expect(dossierFor("DEVOTED_SCULPTOR")?.evidence).toEqual(expect.arrayContaining(["NX48MBG3SPRJ", "9VG86DYJH4CS"]));
  });
});
